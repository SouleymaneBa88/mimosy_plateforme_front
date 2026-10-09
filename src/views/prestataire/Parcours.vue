<!--
  Parcours « Vérifier mon profil professionnel » (/prestataire/parcours).

  Profil → Identité → Compétences → Cohérence → Entretien → Validation

  Le backend calcule l'étape courante (GET /api/verification/parcours/) :
  cette page l'affiche, explique pourquoi chaque étape est demandée et
  combien de temps elle prend, et permet de reprendre après une interruption.
  Un prestataire non validé est ramené ici par le routeur.
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Clock, Info, RotateCcw } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import { MButton } from '@/components/ui'
import StepperParcours from '@/components/prestataire/parcours/StepperParcours.vue'
import AssistantProfil from '@/components/prestataire/parcours/AssistantProfil.vue'
import EtapeDocument from '@/components/prestataire/parcours/EtapeDocument.vue'
import EntretienIA from '@/components/prestataire/parcours/EntretienIA.vue'
import * as parcoursService from '@/services/parcoursService'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const parcours = ref(null)
const chargement = ref(true)
const erreur = ref('')
const action = ref(false)
// Étape affichée : l'étape courante, ou une étape terminée rouverte pour correction.
const etapeChoisie = ref('')
// Message « Bienvenue à nouveau » : seulement si le parcours était déjà commencé.
const reprise = ref(false)
let rafraichissement = null

const etapeAffichee = computed(() => etapeChoisie.value || parcours.value?.etape_courante)
const etape = computed(() => parcours.value?.etapes.find((e) => e.cle === etapeAffichee.value))
const statut = computed(() => parcours.value?.statut)

async function charger({ silencieux = false } = {}) {
  if (!silencieux) chargement.value = true
  try {
    parcours.value = await parcoursService.getParcours()
    erreur.value = ''
    // Décision prise depuis la dernière connexion : on met la session à jour.
    if (parcours.value.statut === 'VALIDE' && authStore.prestataireNonValide) {
      await authStore.rafraichirUtilisateur()
    }
    planifierRafraichissement()
    await lancerCoherenceSiPrete()
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargement.value = false
  }
}

// Pendant l'analyse des documents, on relit l'état toutes les 5 secondes.
function planifierRafraichissement() {
  clearTimeout(rafraichissement)
  if (parcours.value?.documents_en_analyse) {
    rafraichissement = setTimeout(() => charger({ silencieux: true }), 5000)
  }
}

// Dès que les documents sont analysés, la cohérence est calculée automatiquement.
async function lancerCoherenceSiPrete() {
  if (statut.value !== 'COHERENCE_A_VERIFIER' && !(statut.value === 'A_VERIFIER' && parcours.value.etape_courante === 'coherence')) return
  if (parcours.value.documents_en_analyse || action.value) return
  action.value = true
  try {
    parcours.value = await parcoursService.calculerCoherence()
  } catch (e) {
    erreur.value = e.message
  } finally {
    action.value = false
  }
}

async function apresModification() {
  etapeChoisie.value = ''
  await charger({ silencieux: true })
}

async function soumettre() {
  action.value = true
  try {
    parcours.value = await parcoursService.soumettreDossier()
  } catch (e) {
    erreur.value = e.message
  } finally {
    action.value = false
  }
}

async function finEntretien() {
  await charger({ silencieux: true })
}

function choisirEtape(cle) {
  etapeChoisie.value = cle === parcours.value?.etape_courante ? '' : cle
}

async function allerAuxServices() {
  await authStore.rafraichirUtilisateur()
  router.push({ name: 'prestataire-services' })
}

onMounted(async () => {
  await charger()
  reprise.value = Boolean(parcours.value && parcours.value.pourcentage > 0 && parcours.value.pourcentage < 100)
})
onBeforeUnmount(() => clearTimeout(rafraichissement))
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <ClientHeader
        title="Vérifier mon profil professionnel"
        subtitle="MIMOSY vous accompagne étape par étape pour créer et vérifier votre profil avant de le présenter aux clients."
      />

      <p v-if="chargement" class="text-sm text-[#4F5A54]">Chargement de votre parcours…</p>
      <p v-else-if="erreur && !parcours" class="bg-[#F8E8E4] p-4 text-sm text-[#A4443A]" role="alert">{{ erreur }}</p>

      <template v-else-if="parcours">
        <!-- Profil validé -->
        <section v-if="statut === 'VALIDE'" class="flex flex-col gap-3 border border-[#E5E7E2] bg-white p-6" data-test="valide">
          <p class="flex items-center gap-2 text-lg font-bold text-[#2D6A4F]">
            <CheckCircle2 class="h-5 w-5" aria-hidden="true" /> Votre profil professionnel est validé
          </p>
          <p class="text-sm text-[#4F5A54]">Vous pouvez maintenant publier vos services et vos disponibilités.</p>
          <MButton class="self-start" @click="allerAuxServices">Publier mes services</MButton>
        </section>

        <!-- Dossier refusé -->
        <section v-else-if="statut === 'REJETE'" class="flex flex-col gap-2 border border-[#E5E7E2] bg-white p-6" data-test="rejete">
          <p class="text-lg font-bold text-[#A4443A]">Votre dossier n'a pas été retenu</p>
          <p class="text-sm text-[#1C2420]">Motif : {{ parcours.motif_decision }}</p>
          <p class="text-sm text-[#4F5A54]">Pour toute question, contactez l'équipe MIMOSY.</p>
        </section>

        <template v-else>
          <!-- Reprise après interruption -->
          <section v-if="reprise" class="flex flex-wrap items-center justify-between gap-3 border border-[#E5E7E2] bg-white p-4" data-test="reprise">
            <p class="text-sm text-[#1C2420]">
              <strong>Bienvenue à nouveau.</strong> Votre parcours est à {{ parcours.pourcentage }} %.
            </p>
            <MButton size="sm" :icon="RotateCcw" @click="reprise = false; etapeChoisie = ''">Reprendre</MButton>
          </section>

          <!-- Dossier renvoyé par l'administrateur -->
          <section v-if="statut === 'A_VERIFIER'" class="border border-[#E5C88F] bg-[#F8EDD8] p-4 text-sm text-[#8A5A12]" role="status" data-test="a-verifier">
            <strong>L'équipe MIMOSY vous demande de compléter votre dossier.</strong>
            <p class="mt-1">{{ parcours.motif_decision }}</p>
          </section>

          <StepperParcours :etapes="parcours.etapes" :etape-affichee="etapeAffichee" @choisir="choisirEtape" />

          <p v-if="parcours.ia" class="text-xs text-[#68716C]" data-test="etat-ia">
            {{
              parcours.ia.active
                ? "Deux assistantes IA vous accompagnent : Aby pour votre profil, puis Fassa pour l'entretien professionnel. Ce sont des intelligences artificielles : elles aident l'équipe MIMOSY, qui prend la décision finale."
                : "Les assistantes IA sont momentanément indisponibles : le parcours continue avec des questions guidées, et vos documents seront examinés par l'équipe MIMOSY."
            }}
          </p>

          <div v-if="etape" class="flex flex-col gap-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-[#68716C]" data-test="numero-etape">
              Étape {{ etape.numero }} sur {{ parcours.nombre_etapes }}
            </p>
            <h2 class="text-xl font-bold text-[#051F20]">{{ etape.titre }}</h2>
            <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4F5A54]">
              <span class="flex items-center gap-1"><Info class="h-4 w-4" aria-hidden="true" /> {{ etape.pourquoi }}</span>
              <span class="flex items-center gap-1"><Clock class="h-4 w-4" aria-hidden="true" /> {{ etape.duree }}</span>
            </p>
          </div>

          <p v-if="erreur" class="bg-[#F8E8E4] p-3 text-sm text-[#A4443A]" role="alert">{{ erreur }}</p>

          <!-- Étape 1 : profil -->
          <AssistantProfil v-if="etapeAffichee === 'profil'" @profil-modifie="(termine) => termine && apresModification()" />

          <!-- Étapes 2 et 3 : documents -->
          <EtapeDocument
            v-else-if="etapeAffichee === 'identite'"
            sorte="identite"
            :document="parcours.documents.identite"
            @envoye="apresModification"
          />
          <EtapeDocument
            v-else-if="etapeAffichee === 'competences'"
            sorte="justificatif"
            :document="parcours.documents.justificatif"
            @envoye="apresModification"
          />

          <!-- Étape 4 : cohérence -->
          <section v-else-if="etapeAffichee === 'coherence'" class="flex flex-col gap-4 border border-[#E5E7E2] bg-white p-5 sm:p-6" data-test="coherence">
            <p v-if="parcours.documents_en_analyse" class="text-sm text-[#4F5A54]">
              Vos documents sont en cours d'analyse. Cette page se met à jour automatiquement.
            </p>
            <p v-else-if="action" class="text-sm text-[#4F5A54]">Vérification de cohérence en cours…</p>
            <template v-else-if="parcours.coherence">
              <div v-if="parcours.coherence.conclusion_justificatif" class="rounded-lg bg-[#FAFAF8] p-4 text-sm">
                <p class="font-bold" :class="parcours.coherence.conclusion_justificatif.etat === 'COHERENCE_APPARENTE' ? 'text-[#2D6A4F]' : 'text-[#8A5A12]'">
                  {{ parcours.coherence.conclusion_justificatif.etat === 'COHERENCE_APPARENTE' ? 'Cohérence apparente' : 'Vérification nécessaire' }}
                </p>
                <dl class="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-[#1C2420]">
                  <dt class="text-[#68716C]">Profil</dt><dd>{{ parcours.coherence.conclusion_justificatif.profil || '—' }}</dd>
                  <dt class="text-[#68716C]">Domaine</dt><dd>{{ parcours.coherence.conclusion_justificatif.domaine || '—' }}</dd>
                  <dt class="text-[#68716C]">Justificatif</dt><dd>{{ parcours.coherence.conclusion_justificatif.justificatif || '—' }}</dd>
                </dl>
                <p class="mt-2 text-[#4F5A54]">{{ parcours.coherence.conclusion_justificatif.message }}</p>
              </div>
              <div v-if="parcours.coherence.incoherences.length">
                <p class="text-sm font-bold text-[#1C2420]">Différences relevées</p>
                <ul class="mt-1 list-disc pl-5 text-sm text-[#4F5A54]">
                  <li v-for="item in parcours.coherence.incoherences" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div v-if="parcours.coherence.points_a_verifier.length">
                <p class="text-sm font-bold text-[#1C2420]">Points qui seront vérifiés par l'équipe MIMOSY</p>
                <ul class="mt-1 list-disc pl-5 text-sm text-[#4F5A54]">
                  <li v-for="item in parcours.coherence.points_a_verifier" :key="item">{{ item }}</li>
                </ul>
              </div>
              <p class="text-xs text-[#68716C]">
                Cette analyse automatique aide l'équipe MIMOSY ; elle ne constitue pas une décision. Si une
                information est erronée, corrigez votre profil ou vos documents depuis les étapes précédentes.
              </p>
            </template>
          </section>

          <!-- Étape 5 : entretien -->
          <EntretienIA
            v-else-if="etapeAffichee === 'entretien' && parcours.entretien_disponible"
            :langue="parcours.langue"
            :langues="parcours.langues || []"
            @termine="finEntretien"
            @langue-modifiee="(langue) => (parcours.langue = langue)"
          />
          <p v-else-if="etapeAffichee === 'entretien'" class="border border-[#E5E7E2] bg-white p-5 text-sm text-[#4F5A54]">
            L'entretien sera disponible une fois les étapes précédentes terminées.
          </p>

          <!-- Étape 6 : validation -->
          <section v-else-if="etapeAffichee === 'validation'" class="flex flex-col gap-3 border border-[#E5E7E2] bg-white p-5 sm:p-6" data-test="validation">
            <template v-if="parcours.peut_soumettre">
              <p class="text-sm text-[#1C2420]">Votre dossier est complet. Transmettez-le à l'équipe MIMOSY.</p>
              <MButton class="self-start" :loading="action" data-test="soumettre" @click="soumettre">Transmettre mon dossier</MButton>
            </template>
            <template v-else>
              <p class="font-bold text-[#1C2420]">Dossier en revue</p>
              <p class="text-sm text-[#4F5A54]">
                Votre dossier complet a été transmis. Un administrateur MIMOSY le consulte et prend la décision
                finale. Vous serez notifié dès qu'elle sera prise.
              </p>
            </template>
          </section>
        </template>
      </template>
    </div>
  </AppLayout>
</template>
