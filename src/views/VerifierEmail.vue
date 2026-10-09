<!--
  Page de vérification de l'adresse e-mail (/verifier-email).

  Trois usages :
    - /verifier-email?token=...  → ouverte depuis le lien de l'e-mail : la page
      envoie le jeton au backend (POST /api/auth/verify-email/) et affiche le
      résultat (vérifiée, expirée, invalide, déjà utilisée, erreur serveur) ;
    - juste après l'inscription   → « Vérifiez votre adresse e-mail » ;
    - utilisateur CONNECTÉ dont l'adresse n'est pas vérifiée → le routeur
      l'amène ici tant que la vérification n'est pas faite (voir router/index.js).

  Le jeton est retiré de la barre d'adresse dès sa lecture, pour qu'il ne
  reste ni dans l'historique ni dans un éventuel en-tête Referer.
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import * as authService from "@/services/authService";
import { getHomeRouteName } from "@/config/navigator";
import { erreurEmail, extraireErreursApi, normaliserEmail } from "@/utils/validation";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Clés où la page d'inscription laisse l'adresse à vérifier et le résultat
// de l'envoi (jamais dans l'URL).
const CLE_EMAIL_A_VERIFIER = "mimosy_email_a_verifier";
const CLE_ENVOI_ECHOUE = "mimosy_envoi_verification_echoue";

// "attente" (après inscription ou connexion), "chargement", "succes",
// "token_expire", "token_invalide", "token_deja_utilise" ou "erreur".
const etat = ref("attente");

// Connecté : le backend identifie le compte par le jeton JWT, pas besoin de saisir l'adresse.
const connecte = computed(() => authStore.isAuthenticated);
const emailInscription = sessionStorage.getItem(CLE_EMAIL_A_VERIFIER) || "";
// Adresse affichée / utilisée pour le renvoi.
const email = ref(authStore.user?.email || emailInscription);
// L'envoi du premier lien a échoué à l'inscription (Brevo indisponible...).
const envoiInitialEchoue = sessionStorage.getItem(CLE_ENVOI_ECHOUE) === "1";

const renvoiEnCours = ref(false);
const rafraichissementEnCours = ref(false);
const messageRenvoi = ref("");
const erreurRenvoi = ref("");

// Après un renvoi, le bouton reste bloqué pendant le délai anti-spam
// (EMAIL_VERIFICATION_DELAI_RENVOI_SECONDES, renvoyé par le serveur).
// Ce n'est qu'un confort : le backend applique son propre délai.
const DELAI_RENVOI_PAR_DEFAUT = 60;
const secondesAvantRenvoi = ref(0);
let minuteur = null;

function demarrerDelai(secondes = DELAI_RENVOI_PAR_DEFAUT) {
  secondesAvantRenvoi.value = secondes;
  clearInterval(minuteur);
  minuteur = setInterval(() => {
    secondesAvantRenvoi.value -= 1;
    if (secondesAvantRenvoi.value <= 0) clearInterval(minuteur);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(minuteur));

// Textes affichés pour chaque état.
const CONTENUS = {
  attente: {
    titre: "Vérifiez votre adresse e-mail",
    texte: "Un lien de vérification a été envoyé à votre adresse e-mail. Vérifiez votre boîte de réception (et vos courriers indésirables) puis cliquez sur le lien reçu.",
  },
  non_verifie: {
    titre: "Adresse e-mail non vérifiée",
    texte: "Votre adresse e-mail n'est pas encore vérifiée. Nous avons envoyé un lien de confirmation à votre adresse e-mail. Vérifiez votre boîte de réception puis cliquez sur le lien reçu.",
  },
  envoi_echoue: {
    titre: "Vérifiez votre adresse e-mail",
    texte: "Votre compte a été créé, mais l'e-mail de vérification n'a pas pu être envoyé pour le moment. Demandez un nouveau lien ci-dessous.",
  },
  chargement: {
    titre: "Vérification en cours…",
    texte: "Nous vérifions votre lien.",
  },
  succes: {
    titre: "Adresse e-mail vérifiée",
    texte: "Votre adresse e-mail a été vérifiée. Vous pouvez maintenant utiliser toutes les fonctionnalités de MIMOSY.",
  },
  token_expire: {
    titre: "Lien expiré",
    texte: "Le lien de vérification est expiré. Demandez-en un nouveau ci-dessous.",
  },
  token_invalide: {
    titre: "Lien invalide",
    texte: "Le lien de vérification est invalide ou a déjà été utilisé. Utilisez le dernier e-mail reçu, ou demandez un nouveau lien.",
  },
  token_deja_utilise: {
    titre: "Lien déjà utilisé",
    texte: "Le lien de vérification est invalide ou a déjà été utilisé. Si vous l'avez utilisé vous-même, votre adresse est déjà vérifiée.",
  },
  erreur: {
    titre: "Une erreur est survenue",
    texte: "Nous n'avons pas pu vérifier votre lien pour le moment. Réessayez dans quelques instants.",
  },
};

// En attente, le texte dépend de la situation (connecté, envoi échoué...).
const cleContenu = computed(() => {
  if (etat.value !== "attente") return etat.value;
  if (envoiInitialEchoue) return "envoi_echoue";
  return connecte.value && !emailInscription ? "non_verifie" : "attente";
});
const contenu = computed(() => CONTENUS[cleContenu.value]);
const estErreur = computed(() =>
  ["token_expire", "token_invalide", "erreur"].includes(etat.value)
);
// Le renvoi n'a de sens que si l'adresse n'est pas (encore) vérifiée.
const afficherRenvoi = computed(() =>
  ["attente", "token_expire", "token_invalide"].includes(etat.value)
);
// Adresse affichée sous le texte (inscription ou compte connecté).
const emailAffiche = computed(() => (etat.value === "attente" ? email.value : ""));

function oublierInscription() {
  sessionStorage.removeItem(CLE_EMAIL_A_VERIFIER);
  sessionStorage.removeItem(CLE_ENVOI_ECHOUE);
}

// Envoie le jeton au backend et affiche le résultat.
async function confirmer(token) {
  etat.value = "chargement";
  try {
    const reponse = await authService.verifyEmail(token);
    etat.value = "succes";
    oublierInscription();
    authStore.marquerEmailVerifie(reponse?.email);
  } catch (error) {
    const code = error.data?.code;
    etat.value = CONTENUS[code] && error.status === 400 ? code : "erreur";
  }
}

// Redemande un lien de vérification.
async function renvoyerLien() {
  messageRenvoi.value = "";
  erreurRenvoi.value = "";
  if (!connecte.value) {
    const erreur = erreurEmail(email.value);
    if (erreur) {
      erreurRenvoi.value = erreur;
      return;
    }
  }
  if (renvoiEnCours.value || secondesAvantRenvoi.value > 0) return;

  renvoiEnCours.value = true;
  try {
    const reponse = await authService.resendVerificationEmail(normaliserEmail(email.value), {
      connecte: connecte.value,
    });
    messageRenvoi.value = reponse?.detail || "Un nouveau lien vient d'être envoyé.";
    sessionStorage.removeItem(CLE_ENVOI_ECHOUE);
    demarrerDelai(reponse?.retry_after || DELAI_RENVOI_PAR_DEFAUT);
  } catch (error) {
    const { champs, general } = extraireErreursApi(
      error.data,
      "Impossible d'envoyer l'e-mail pour le moment. Veuillez réessayer plus tard.",
    );
    if (error.data?.code === "email_deja_verifie") {
      await verifierEtat();
      return;
    }
    if (error.status === 429) {
      // Délai indiqué par le backend ; sinon (throttle DRF) message générique.
      if (error.data?.retry_after) demarrerDelai(error.data.retry_after);
      erreurRenvoi.value = error.data?.code ? general : "Trop de demandes. Patientez avant de redemander un lien.";
    } else {
      erreurRenvoi.value = champs.email || general;
    }
  } finally {
    renvoiEnCours.value = false;
  }
}

// « J'ai vérifié mon adresse » : relit l'état au serveur (lien cliqué
// depuis un autre appareil, par exemple).
async function verifierEtat() {
  rafraichissementEnCours.value = true;
  erreurRenvoi.value = "";
  try {
    if (await authStore.rafraichirUtilisateur()) {
      etat.value = "succes";
      oublierInscription();
    } else {
      erreurRenvoi.value = "Votre adresse e-mail n'est pas encore vérifiée. Cliquez sur le lien reçu par e-mail.";
    }
  } catch {
    erreurRenvoi.value = "Impossible de vérifier l'état de votre compte pour le moment.";
  } finally {
    rafraichissementEnCours.value = false;
  }
}

// Bouton principal après une vérification réussie.
function continuer() {
  if (authStore.isAuthenticated) {
    router.push({ name: getHomeRouteName(authStore.role) });
  } else {
    router.push({ name: "login" });
  }
}

async function seDeconnecter() {
  await authStore.logout();
  router.push({ name: "login" });
}

onMounted(() => {
  const token = route.query.token;
  if (typeof token === "string" && token) {
    // On retire le jeton de l'URL avant même d'appeler le backend.
    router.replace({ name: "verifier-email" });
    confirmer(token);
  }
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5 py-10">
    <div class="w-full max-w-[460px] rounded-[18px] border border-[#E6E8E3] bg-white p-8 text-center">
      <router-link to="/" class="mx-auto mb-6 inline-flex" aria-label="Retour à l'accueil">
        <img
          src="/images/mimosy_logo_transparent.png"
          alt="MIMOSY"
          class="h-auto w-[150px] object-contain"
        />
      </router-link>

      <div
        class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        :class="
          etat === 'succes'
            ? 'bg-[#E4EDE7] text-[#2D6A4F]'
            : estErreur
              ? 'bg-[#F8E8E4] text-[#A4443A]'
              : 'bg-[#F1F5F1] text-[#2D6A4F]'
        "
        aria-hidden="true"
      >
        <span v-if="etat === 'succes'">✓</span>
        <span v-else-if="estErreur">!</span>
        <span v-else-if="etat === 'chargement'" class="animate-pulse">…</span>
        <span v-else>✉</span>
      </div>

      <h1 class="font-sans text-[24px] font-[800] text-[#051F20]">{{ contenu.titre }}</h1>
      <p class="mt-3 text-[15px] leading-6 text-[#4F5A54]" role="status" data-test="texte-etat">
        {{ contenu.texte }}
      </p>
      <p v-if="emailAffiche" class="mt-3 text-[15px] text-[#4F5A54]">
        Adresse :
        <strong class="break-all text-[#051F20]" data-test="email-inscription">{{ emailAffiche }}</strong>
      </p>

      <button
        v-if="etat === 'succes' || etat === 'token_deja_utilise'"
        type="button"
        class="mt-7 h-12 w-full rounded-xl bg-[#2D6A4F] font-bold text-white transition hover:bg-[#3E8064]"
        data-test="bouton-continuer"
        @click="continuer"
      >
        {{ authStore.isAuthenticated ? "Accéder à mon espace" : "Se connecter" }}
      </button>

      <button
        v-if="etat === 'erreur'"
        type="button"
        class="mt-7 h-12 w-full rounded-xl border border-[#D3D7D0] font-bold text-[#051F20] transition hover:bg-[#F1F5F1]"
        @click="router.push({ name: 'login' })"
      >
        Retour à la connexion
      </button>

      <form
        v-if="afficherRenvoi"
        class="mt-7 flex flex-col gap-3 border-t border-[#E6E8E3] pt-6 text-left"
        @submit.prevent="renvoyerLien"
      >
        <template v-if="!connecte">
          <label for="email-renvoi" class="text-sm font-bold text-[#051F20]">
            Vous n'avez rien reçu ?
          </label>
          <input
            id="email-renvoi"
            v-model.trim="email"
            type="email"
            autocomplete="email"
            placeholder="exemple@domaine.sn"
            maxlength="254"
            class="h-12 w-full rounded-xl border border-[#EFE5E0] bg-white px-4 text-[15px] text-[#051F20] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10"
          />
        </template>
        <p v-else class="text-sm font-bold text-[#051F20]">Vous n'avez rien reçu ?</p>

        <button
          type="submit"
          class="h-12 w-full rounded-xl bg-[#2D6A4F] font-bold text-white transition hover:bg-[#3E8064] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="renvoiEnCours || secondesAvantRenvoi > 0"
          data-test="bouton-renvoi"
        >
          {{
            renvoiEnCours
              ? "Envoi en cours…"
              : secondesAvantRenvoi > 0
                ? `Renvoyer le lien (${secondesAvantRenvoi} s)`
                : "Renvoyer le lien"
          }}
        </button>

        <button
          v-if="connecte"
          type="button"
          class="h-12 w-full rounded-xl border border-[#D3D7D0] font-bold text-[#051F20] transition hover:bg-[#F1F5F1] disabled:opacity-60"
          :disabled="rafraichissementEnCours"
          data-test="bouton-deja-verifie"
          @click="verifierEtat"
        >
          {{ rafraichissementEnCours ? "Vérification…" : "J'ai vérifié mon adresse" }}
        </button>

        <p v-if="messageRenvoi" class="text-sm text-[#2D6A4F]" role="status">{{ messageRenvoi }}</p>
        <p v-if="erreurRenvoi" class="text-sm text-[#A4443A]" role="alert" data-test="erreur-renvoi">
          {{ erreurRenvoi }}
        </p>
      </form>

      <p v-if="etat === 'attente' && connecte" class="mt-6 text-sm text-[#68716C]">
        Mauvais compte ?
        <button type="button" class="font-bold text-[#2D6A4F] hover:underline" @click="seDeconnecter">
          Se déconnecter
        </button>
      </p>
      <p v-else-if="etat === 'attente'" class="mt-6 text-sm text-[#68716C]">
        Déjà vérifiée ?
        <router-link to="/login" class="font-bold text-[#2D6A4F] hover:underline">Se connecter</router-link>
      </p>
    </div>
  </main>
</template>
