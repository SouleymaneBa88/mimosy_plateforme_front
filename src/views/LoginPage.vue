<!--
  Page de connexion (/login).
  L'utilisateur saisit son email et son mot de passe ; après connexion,
  il est envoyé vers son espace selon son rôle (client, prestataire, admin).
-->
<script setup>
// Outils Vue, routeur, store de connexion et géolocalisation.
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useLocation } from "@/composables/useLocation";
// Le routeur, le store de connexion et les fonctions de localisation.
const router = useRouter();
const authStore = useAuthStore();
const { requestLocation, memoriserPositionSiLocalisationExiste } = useLocation();

/*
|--------------------------------------------------------------------------
| Formulaire
|--------------------------------------------------------------------------
*/

// Les champs du formulaire, l'affichage du mot de passe, le chargement et l'erreur.
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

/*
|--------------------------------------------------------------------------
| Regex
|--------------------------------------------------------------------------
*/

/*
 * E-mail :
 * exemple@domaine.sn
 * nom.prenom@gmail.com
 */
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/*
 * Mot de passe : à la connexion, on vérifie seulement qu'il est saisi.
 * Les règles de création (voir utils/validation.js) ne s'appliquent qu'à
 * l'inscription : c'est le backend qui dit si le mot de passe est correct,
 * et un ancien mot de passe ne doit jamais être bloqué par le navigateur.
 */

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

// L'email a-t-il un format valide ?
const emailIsValid = computed(() => {
  return emailRegex.test(email.value.trim());
});

// Un mot de passe a-t-il été saisi ?
const passwordIsValid = computed(() => password.value.length > 0);

/*
|--------------------------------------------------------------------------
| Messages d'erreur
|--------------------------------------------------------------------------
*/

// Message d'erreur sous le champ email (vide si tout va bien).
const emailError = computed(() => {
  if (!email.value) {
    return "";
  }

  if (!emailIsValid.value) {
    return "Veuillez saisir une adresse e-mail valide.";
  }

  return "";
});

// Pas de message sous le champ mot de passe : aucune règle à respecter à la connexion.
const passwordError = computed(() => "");

/*
|--------------------------------------------------------------------------
| Formulaire valide
|--------------------------------------------------------------------------
*/

// Le formulaire est valide si les deux champs sont remplis et corrects.
const formIsValid = computed(() => {
  return (
    email.value.trim() !== "" &&
    password.value !== "" &&
    emailIsValid.value &&
    passwordIsValid.value
  );
});

/*
|--------------------------------------------------------------------------
| Actions
|--------------------------------------------------------------------------
*/

// Afficher / masquer le mot de passe.
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

// Aller à la page d'inscription.
const goToRegister = () => {
  router.push("/register");
};

// redirection vers apres connection
const goToHome = () => {
  router.push("/client");
};

/*
|--------------------------------------------------------------------------
| Connexion classique
|--------------------------------------------------------------------------
*/

// Connexion : on vérifie les champs, on appelle le serveur, puis on redirige selon le rôle.
const handleLogin = async () => {
  errorMessage.value = "";

  /*
   * Vérification e-mail
   */

  if (!email.value.trim()) {
    errorMessage.value = "Veuillez renseigner votre adresse e-mail.";
    return;
  }

  if (!emailIsValid.value) {
    errorMessage.value = "Veuillez saisir une adresse e-mail valide.";
    return;
  }

  /*
   * Vérification mot de passe
   */

  if (!password.value) {
    errorMessage.value = "Veuillez renseigner votre mot de passe.";
    return;
  }

  isLoading.value = true;

  try {
    await authStore.login({
      email: email.value.trim(),
      password: password.value,
    });

    const destination = {
      CLIENT: "/client",
      PRESTATAIRE: "/prestataire",
      ADMIN: "/admin",
    }[authStore.role] || "/";

    // Adresse e-mail pas encore vérifiée : la connexion reste possible, mais
    // l'utilisateur est d'abord dirigé vers la page de vérification.
    router.push(
      authStore.emailNonVerifie
        ? { name: "verifier-email" }
        : authStore.prestataireNonValide
          ? { name: "prestataire-parcours" }
          : destination,
    );

    // Demander la localisation après une connexion réussie, SANS bloquer la
    // redirection : tant que l'utilisateur n'a pas répondu à la demande
    // d'autorisation du navigateur, getCurrentPosition ne rend pas la main
    // (le timeout de 10 s ne compte pas ce temps d'attente), et la connexion
    // semblait figée. Si une localisation existe déjà pour ce compte, ses
    // coordonnées GPS sont mises à jour ; sinon, on ne crée rien (voir useLocation.js).
    requestLocation()
      .then((position) =>
        memoriserPositionSiLocalisationExiste(position.latitude, position.longitude)
      )
      .catch((error) => {
        console.warn("Localisation non disponible :", error);
      });
  } catch (error) {
      // 401 : identifiants refusés (le message de SimpleJWT est en anglais).
      errorMessage.value =
        error.status === 401 || !error.message
          ? "Adresse e-mail ou mot de passe incorrect."
          : error.status === 429
            ? "Trop de tentatives. Patientez une minute avant de réessayer."
            : error.message;
    } finally {
      isLoading.value = false;
    }
  };

/*
|--------------------------------------------------------------------------
| Connexion Google
|--------------------------------------------------------------------------
*/

/*
 * Cette URL doit être celle de ton endpoint Django OAuth.
 *
 * Avec django-allauth et sa configuration standard :
 *
 * http://localhost:8000/accounts/google/login/
 *
 * Si tu as créé ta propre route :
 *
 * http://localhost:8000/auth/google/
 */
const GOOGLE_LOGIN_URL = "http://localhost:8000/accounts/google/login/";

// Redirige vers la connexion Google du serveur.
const handleGoogleLogin = () => {
  window.location.href = GOOGLE_LOGIN_URL;
};
</script>

<template>
  <main class="min-h-screen bg-[#FFFDF9]">
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- ===================================================== -->
      <!-- PARTIE GAUCHE -->
      <!-- ===================================================== -->

      <section class="relative hidden min-h-screen overflow-hidden lg:flex">
        <!-- Image -->

        <img
          src="/medias/mimosynet.jpeg"
          alt="MIMOSY"
          class="absolute inset-0 h-full w-full object-cover"
        />

        <!-- Overlay -->

        <div class="absolute inset-0 bg-[#0F172A]/65"></div>
        <h1 class="mt-2 font-['Instrument_Serif'] text-[28px] text-[#1C2420]">
          Content de vous revoir
        </h1>
        <!-- Contenu -->

        <div
          class="relative z-10 flex min-h-screen w-full flex-col justify-between p-16"
        >
          <!-- Logo -->

          <div class="flex items-center justify-between px-8 py-8">
      <button
        type="button"
        class="flex items-center rounded-md transition hover:opacity-80"
        aria-label="Retour à l'accueil"
        title="Retour à l'accueil"
        @click="goHome"
      >
        <img
          src="/images/mimosy_logo_transparent.png"
          alt="MIMOSY"
          class="h-auto w-[175px] object-contain"
        />
      </button>
    </div>

          <!-- Message -->

          <div class="max-w-[520px]">
            <h1
              class="font-sans text-4xl font-[800] leading-[1.2] text-white"
            >
              La clé d'un service réussi et sans tracas au Sénégal.
            </h1>

            <p class="mt-4 text-base leading-6 text-white/80">
              Connectez-vous pour suivre vos demandes de prestations, consulter
              vos devis ou gérer vos interventions en cours.
            </p>
          </div>

          <!-- Footer -->

          <div class="text-sm text-white/60">Sénégal · Dakar · Mimosy 2026</div>
        </div>
      </section>

      <!-- ===================================================== -->
      <!-- PARTIE DROITE -->
      <!-- ===================================================== -->

      <section
        class="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-16"
      >
        <div class="w-full max-w-[420px]">
          <!-- Logo mobile -->

          <!-- <button
            type="button"
            class="mx-auto mb-8 flex items-center gap-2 lg:hidden"
            aria-label="Accueil MIMOSY"
            @click="goToHome"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#2F6250] font-sans text-[20px] font-[800] text-white"
            >
              M
            </span>

            <span
              class="font-sans text-[22px] font-[800] text-[#051F20]"
            >
              MIMOSY
            </span>
          </button> -->

          <!-- ================================================= -->
          <!-- EN-TÊTE -->
          <!-- ================================================= -->

          <div class="flex flex-col items-center text-center">
            <div class="flex items-center justify-between px-8 py-8">
      <button
        type="button"
        class="flex items-center rounded-md transition hover:opacity-80"
        aria-label="Retour à l'accueil"
        title="Retour à l'accueil"
        @click=""
      >
        <img
          src="/images/mimosy_logo_transparent.png"
          alt="MIMOSY"
          class="h-auto w-[175px] object-contain"
        />
      </button>
    </div>

            <h2
              class="mt-3 font-sans text-[28px] font-[800] text-[#051F20]"
            >
              Se connecter
            </h2>

            <p class="mt-1 text-[15px] text-[#64748B]">
              Accédez à votre espace sécurisé
            </p>
          </div>

          <!-- ================================================= -->
          <!-- FORMULAIRE -->
          <!-- ================================================= -->

          <form class="mt-8 flex flex-col gap-5" @submit.prevent="handleLogin">
            <!-- Email -->

            <div>
              <label
                for="email"
                class="mb-2 block text-sm font-bold text-[#051F20]"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
                v-model.trim="email"
                type="email"
                autocomplete="email"
                placeholder="exemple@domaine.sn"
                maxlength="100"
                class="h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-[#051F20] outline-none transition placeholder:text-[#94A3B8] focus:ring-4"
                :class="
                  emailError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : emailIsValid
                      ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                      : 'border-[#EFE5E0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                "
              />

              <p
                v-if="emailError"
                class="mt-2 text-xs font-medium text-red-500"
              >
                {{ emailError }}
              </p>

              <p
                v-else-if="emailIsValid"
                class="mt-2 text-xs font-medium text-[#2F6250]"
              >
                Adresse e-mail valide.
              </p>
            </div>

            <!-- Mot de passe -->

            <div>
              <div class="mb-2 flex items-center justify-between">
                <label for="password" class="text-sm font-bold text-[#051F20]">
                  Mot de passe
                </label>

                <button
                  type="button"
                  class="text-[13px] font-bold text-[#2F6250] transition hover:text-[#245443]"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  maxlength="128"
                  class="h-12 w-full rounded-xl border bg-white px-4 pr-20 text-[15px] text-[#051F20] outline-none transition placeholder:text-[#94A3B8] focus:ring-4"
                  :class="
                    passwordError
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : passwordIsValid
                        ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                        : 'border-[#EFE5E0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                  "
                />

                <button
                  type="button"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#2F6250] transition hover:text-[#245443]"
                  @click="togglePassword"
                >
                  {{ showPassword ? "Masquer" : "Afficher" }}
                </button>
              </div>

              <div class="mt-2 flex items-center justify-between">
                <p
                  v-if="passwordError"
                  class="text-xs font-medium text-red-500"
                >
                  {{ passwordError }}
                </p>
              </div>
            </div>

            <!-- Message général -->

            <div
              v-if="errorMessage"
              class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600"
            >
              {{ errorMessage }}
            </div>

            <!-- ================================================= -->
            <!-- BOUTON CONNEXION -->
            <!-- ================================================= -->

            <button
              type="submit"
              :disabled="!formIsValid || isLoading"
              class="flex h-14 w-full items-center justify-center rounded-[10px] bg-[#2F6250] px-8 text-base font-bold text-white transition hover:bg-[#245443] disabled:cursor-not-allowed disabled:bg-[#A8B6AF]"
            >
              <span v-if="!isLoading"> Se connecter </span>

              <span v-else class="flex items-center gap-2">
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                ></span>

                Connexion...
              </span>
            </button>
          </form>

          <!-- ================================================= -->
          <!-- SÉPARATEUR -->
          <!-- ================================================= -->

          <!-- <div class="my-7 flex items-center gap-4">
            <div class="h-px flex-1 bg-[#E2E8F0]"></div>

            <span class="text-sm text-[#64748B]"> ou </span>

            <div class="h-px flex-1 bg-[#E2E8F0]"></div>
          </div> -->

          <!-- ================================================= -->
          <!-- GOOGLE -->
          <!-- ================================================= -->

          <!-- <button
            type="button"
            class="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#EFE5E0] bg-[#FFFDF9] px-4 text-sm font-bold text-[#051F20] transition hover:border-[#2F6250] hover:bg-white"
            @click="handleGoogleLogin"
          >
            <!-- Google

            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.805 12.23c0-.79-.07-1.55-.225-2.28H12v4.315h5.49a4.69 4.69 0 0 1-2.04 3.078v2.557h3.3c1.93-1.78 3.055-4.4 3.055-7.67Z"
                fill="#4285F4"
              />

              <path
                d="M12 22c2.76 0 5.075-.915 6.767-2.48l-3.3-2.557c-.915.615-2.08.98-3.467.98-2.665 0-4.92-1.8-5.73-4.215h-3.41v2.635A10.23 10.23 0 0 0 12 22Z"
                fill="#34A853"
              />

              <path
                d="M6.27 13.728A6.15 6.15 0 0 1 5.95 12c0-.6.105-1.18.32-1.728V7.637H2.86A10.23 10.23 0 0 0 1.77 12c0 1.65.395 3.205 1.09 4.363l3.41-2.635Z"
                fill="#FBBC05"
              />

              <path
                d="M12 6.057c1.5 0 2.845.515 3.905 1.525l2.93-2.93C17.07 3.01 14.76 2 12 2A10.23 10.23 0 0 0 2.86 7.637l3.41 2.635C7.08 7.857 9.335 6.057 12 6.057Z"
                fill="#EA4335"
              />
            </svg>

            Continuer avec Google
          </button> -->

          <!-- ================================================= -->
          <!-- INSCRIPTION -->
          <!-- ================================================= -->

          <div class="mt-7 flex items-center justify-center gap-1.5 text-sm">
            <span class="text-[#64748B]"> Pas encore de compte ? </span>

            <button
              type="button"
              class="font-bold text-[#2F6250] transition hover:text-[#245443]"
              @click="goToRegister"
            >
              Créer un compte
            </button>
          </div>

          <!-- Lien de confirmation d'e-mail perdu ou expiré. -->
          <div class="mt-3 text-center text-sm">
            <router-link
              :to="{ name: 'verifier-email' }"
              class="font-medium text-[#64748B] transition hover:text-[#2F6250]"
            >
              Renvoyer l'e-mail de confirmation
            </router-link>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
button,
input {
  font-family: inherit;
}
</style>
