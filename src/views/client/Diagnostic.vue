<script setup>
/**
 * Diagnostic intelligent : aide à identifier le type de professionnel
 * à contacter à partir d'une description en langage naturel.
 *
 * Ce n'est pas une IA générative (voir apps.diagnosis.services côté
 * backend) : jamais présenté comme un diagnostic technique définitif,
 * toujours avec l'avertissement renvoyé par le backend. La recherche
 * de prestataires elle-même réutilise entièrement le moteur existant
 * de l'accueil (HomeClient.vue, qui interroge /api/recherche/) : ce
 * diagnostic ne fait qu'y renvoyer avec les critères déjà identifiés.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Sparkles, TriangleAlert } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import Loader from '@/components/common/Loader.vue'
import * as diagnosisService from '@/services/diagnosisService'

const router = useRouter()

const description = ref('')
const resultat = ref(null)
const loading = ref(false)
const errorMessage = ref('')

async function analyser() {
  if (!description.value.trim()) {
    errorMessage.value = 'Décrivez votre problème avant de lancer l\'analyse.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  resultat.value = null
  try {
    resultat.value = await diagnosisService.diagnostiquer(description.value.trim())
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// Renvoie vers la liste complète des prestataires (résultats non tronqués,
// avec pagination), avec les critères déjà identifiés par le diagnostic
// pré-remplis — l'aperçu de l'accueil (6 cartes) masquerait des résultats.
function voirPrestataires() {
  router.push({
    name: 'client-prestataires',
    query: {
      q: description.value.trim(),
      ...(resultat.value?.domaine ? { categorie: resultat.value.domaine } : {}),
    },
  })
}
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <router-link :to="{ name: 'client-home' }" class="flex items-center gap-1.5 font-sans text-sm font-medium text-mimosy-secondary transition hover:text-mimosy-text">
        <ArrowLeft :size="16" :stroke-width="1.8" />
        Retour à l'accueil
      </router-link>

      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Diagnostic intelligent</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Décrivez votre problème, MIMOSY vous oriente vers le bon professionnel.</p>
      </div>

      <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
        <label class="font-sans text-sm font-bold text-mimosy-text" for="diagnostic-description">
          Décrivez votre problème
        </label>
        <textarea
          id="diagnostic-description"
          v-model="description"
          rows="4"
          placeholder="Ex. Mon installation disjoncte dès que je branche le four."
          class="mt-2 w-full rounded-xl border border-mimosy-border px-3 py-2.5 font-sans text-sm text-mimosy-text outline-none transition focus:border-mimosy-primary"
        />
        <p v-if="errorMessage" class="mt-2 font-sans text-sm text-[#A85148]">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-3 flex items-center gap-2 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          :disabled="loading"
          @click="analyser"
        >
          <Sparkles class="h-4 w-4" />
          {{ loading ? 'Analyse...' : 'Analyser mon besoin' }}
        </button>
      </div>

      <Loader v-if="loading" />

      <div v-if="resultat" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-sans font-extrabold text-mimosy-text">Résultat du diagnostic</h2>
          <span
            class="rounded-full px-3 py-1 font-sans text-xs font-bold"
            :class="resultat.criticite === 'Élevée' ? 'bg-[#FFF0EE] text-[#A85148]' : 'bg-mimosy-grayBg text-mimosy-gray'"
          >
            Criticité : {{ resultat.criticite }}
          </span>
        </div>

        <template v-if="resultat.status === 'identifie'">
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <div v-if="resultat.domaine">
              <dt class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Domaine identifié</dt>
              <dd class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ resultat.domaine }}</dd>
            </div>
            <div v-if="resultat.service_recommande">
              <dt class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Besoin identifié</dt>
              <dd class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ resultat.service_recommande }}</dd>
            </div>
            <div v-if="resultat.competence_recommandee">
              <dt class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Compétence recommandée</dt>
              <dd class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ resultat.competence_recommandee }}</dd>
            </div>
          </dl>

          <button type="button" class="mt-5 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="voirPrestataires">
            Voir les prestataires disponibles
          </button>
        </template>

        <template v-else>
          <p class="mt-3 font-sans text-sm text-mimosy-secondary">
            Nous n'avons pas identifié de domaine précis à partir de votre description. Vous pouvez tout de même
            consulter directement les prestataires disponibles.
          </p>
          <button type="button" class="mt-3 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="voirPrestataires">
            Parcourir les prestataires
          </button>
        </template>

        <div v-if="resultat.warnings?.length" class="mt-5 flex items-start gap-2.5 rounded-xl bg-mimosy-yellowBg p-3.5">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-mimosy-yellow" />
          <div>
            <p v-for="(avertissement, index) in resultat.warnings" :key="index" class="font-sans text-xs text-mimosy-yellow">
              {{ avertissement }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </ClientLayout>
</template>
