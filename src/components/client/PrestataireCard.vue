<script setup>
/**
 * Carte prestataire de l'accueil CLIENT.
 * Structure et style repris de
 * front_mimosy/src/components/clients/CartePrestataireDemande.vue, mais
 * branchée sur les vraies offres renvoyées par /api/recherche/ (voir
 * HomeClient.vue) : aucune note/avis/zone inventés quand l'API ne les
 * fournit pas encore, aucune photo par défaut externe (pravatar...).
 *
 * "Demander" ne mène jamais à une fausse modale locale : comme le reste de
 * MIMOSY, la demande de prestation se fait depuis la page de détail du
 * prestataire (PrestataireProfil.vue), qui contient déjà les vrais
 * formulaires (prestation / devis / rendez-vous).
 */
import { computed } from 'vue'
import { BadgeCheck, MapPin, Star, UserRound } from 'lucide-vue-next'
import { formaterDistanceKm } from '@/utils/format'

const props = defineProps({
  prestataire: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['view-profile'])

// Heuristique de couleur par catégorie, reprise du principe de
// front_mimosy/src/components/clients/CarteDemande.vue, mais généralisée
// puisque les catégories MIMOSY sont réelles et dynamiques (pas une liste
// figée de 3-4 noms) : correspondance par mot-clé, repli neutre sinon.
const stylesCategorie = [
  { mots: ['électric', 'electric'], fond: 'var(--color-mimosy-yellowBg)', texte: 'var(--color-mimosy-yellow)' },
  { mots: ['plomb'], fond: 'var(--color-mimosy-blueBg)', texte: 'var(--color-mimosy-blue)' },
  { mots: ['nettoy', 'ménage', 'menage'], fond: 'var(--color-mimosy-tealBg)', texte: 'var(--color-mimosy-teal)' },
]

const styleCategorie = computed(() => {
  const nom = (props.prestataire.entreprise || '').toLowerCase()
  const trouve = stylesCategorie.find((style) => style.mots.some((mot) => nom.includes(mot)))
  return trouve || { fond: 'var(--color-mimosy-grayBg)', texte: 'var(--color-mimosy-gray)' }
})

const prix = computed(() => (props.prestataire.prix != null ? Number(props.prestataire.prix).toLocaleString('fr-FR') : null))
const distance = computed(() => (props.prestataire.distance != null ? formaterDistanceKm(props.prestataire.distance) : null))

function voirProfil() {
  emit('view-profile', props.prestataire)
}
</script>

<template>
  <article class="group w-full overflow-hidden rounded-[24px] border border-mimosy-border bg-mimosy-surface">
    <!-- Image -->
    <button type="button" class="relative block h-[200px] w-full overflow-hidden bg-mimosy-page sm:h-[220px]" @click="voirProfil">
      <img
        v-if="prestataire.image"
        :src="prestataire.image"
        :alt="`Photo de ${prestataire.nom}`"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      />
      <div v-else class="flex h-full w-full items-center justify-center bg-mimosy-page">
        <UserRound :size="40" :stroke-width="1.4" class="text-mimosy-secondary" />
      </div>

      <!-- Catégorie -->
      <div v-if="prestataire.entreprise" class="absolute left-4 top-4 rounded-full px-3 py-1" :style="{ backgroundColor: styleCategorie.fond, color: styleCategorie.texte }">
        <span class="font-sans text-[10px] font-bold uppercase leading-[15px]">{{ prestataire.entreprise }}</span>
      </div>
    </button>

    <!-- Contenu -->
    <div class="flex flex-col gap-2 p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <button type="button" class="min-w-0 text-left" @click="voirProfil">
          <h3 class="truncate font-serif text-[22px] font-normal leading-[28px] text-mimosy-text">
            {{ prestataire.nom }}
          </h3>
          <p v-if="prestataire.service" class="font-sans text-[13px] font-medium leading-[19.5px] text-mimosy-secondary">
            {{ prestataire.service }}
          </p>
        </button>

        <!-- Note (seulement si réellement fournie par l'API) -->
        <div v-if="prestataire.note != null" class="shrink-0 text-right">
          <div class="flex items-center justify-end gap-1">
            <Star :size="14" :stroke-width="1.8" class="fill-[color:var(--color-mimosy-star)] text-[color:var(--color-mimosy-star)]" />
            <span class="font-sans text-sm font-bold leading-[21px]" style="color: var(--color-mimosy-star)">{{ prestataire.note }}</span>
          </div>
          <span v-if="prestataire.avis != null" class="font-sans text-[10px] font-normal leading-[15px] text-mimosy-secondary">
            {{ prestataire.avis }} avis
          </span>
        </div>
      </div>

      <!-- Badges -->
      <div class="flex flex-wrap gap-2 pb-2">
        <span v-if="prestataire.verifie" class="flex items-center gap-1.5 rounded-full bg-mimosy-primaryBg px-2.5 py-1">
          <BadgeCheck :size="10" :stroke-width="2" class="text-mimosy-primary" />
          <span class="font-sans text-[10px] font-bold uppercase leading-[15px] tracking-[0.07px] text-mimosy-primary">Vérifié</span>
        </span>

        <span class="rounded-full px-2.5 py-1" :class="prestataire.disponible ? 'bg-mimosy-page' : 'bg-mimosy-grayBg'">
          <span class="font-sans text-[10px] font-bold uppercase leading-[15px]" :class="prestataire.disponible ? 'text-mimosy-primary' : 'text-mimosy-secondary'">
            {{ prestataire.disponible ? 'Disponible' : 'Indisponible' }}
          </span>
        </span>
      </div>

      <!-- Séparation -->
      <div class="flex items-center justify-between gap-3 border-t border-mimosy-border pt-4">
        <div class="flex min-w-0 flex-col gap-1">
          <div v-if="prestataire.zone || distance" class="flex items-center gap-1.5">
            <MapPin :size="12" :stroke-width="1.8" class="shrink-0 text-mimosy-secondary" />
            <span class="truncate font-sans text-xs font-normal leading-[18px] text-mimosy-secondary">
              {{ [prestataire.zone, distance].filter(Boolean).join(' · ') }}
            </span>
          </div>
          <p v-if="prix" class="font-sans text-sm font-bold leading-[21px] text-mimosy-text">
            À partir de {{ prix }} FCFA
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-xl bg-mimosy-primary px-4 py-2 font-sans text-xs font-bold leading-[18px] tracking-[0.07px] text-white transition hover:opacity-90"
          @click="voirProfil"
        >
          Demander
        </button>
      </div>
    </div>
  </article>
</template>
