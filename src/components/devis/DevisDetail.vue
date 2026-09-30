<script setup>
/**
 * Affichage d'un devis détaillé (réponse de devis) : matériaux,
 * main-d'œuvre, autres frais et total à payer.
 *
 * Tous les montants viennent de l'API (calculés par le backend, source de
 * vérité financière) : ce composant n'additionne jamais rien lui-même.
 * Un devis antérieur au format détaillé (est_detaille = false) n'affiche
 * que son total.
 */
import { computed } from 'vue'

// Props : la réponse de devis et le nom du service.
const props = defineProps({
  reponse: { type: Object, required: true },
  // Nom du service, quand la réponse ne le porte pas elle-même.
  service: { type: String, default: '' },
})

// Met un montant au format "12 500 FCFA".
function fcfa(valeur) {
  return `${Number(valeur || 0).toLocaleString('fr-FR')} FCFA`
}

// Met une quantité au format français.
function quantite(valeur) {
  return Number(valeur || 0).toLocaleString('fr-FR')
}

// Met une date au format "12 mars 2026" (avec l'heure si demandé).
function formatDate(valeur, avecHeure = false) {
  if (!valeur) return ''
  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(avecHeure ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// Les lignes de matériaux, le nom du service, et la présence de frais.
const lignes = computed(() => props.reponse?.lignes_materiaux || [])
const nomService = computed(() => props.service || props.reponse?.demande_service_nom || 'Prestation')
const aDesFrais = computed(() => Number(props.reponse?.montant_frais || 0) > 0)
</script>

<template>
  <div class="rounded-2xl border border-mimosy-border bg-mimosy-surface">
    <!-- En-tête du devis -->
    <div class="flex flex-wrap items-start justify-between gap-3 border-b border-mimosy-border p-4 sm:p-5">
      <div class="min-w-0">
        <p class="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Devis</p>
        <p class="mt-1 font-serif text-lg leading-6 text-mimosy-text">{{ nomService }}</p>
        <p v-if="reponse.prestataire_nom" class="mt-0.5 font-sans text-sm text-mimosy-secondary">{{ reponse.prestataire_nom }}</p>
      </div>
      <dl class="grid gap-1 text-right font-sans text-xs text-mimosy-secondary">
        <div v-if="reponse.date_creation">
          <dt class="inline">Émis le </dt>
          <dd class="inline font-bold text-mimosy-text">{{ formatDate(reponse.date_creation) }}</dd>
        </div>
        <div>
          <dt class="inline">Valable jusqu'au </dt>
          <dd class="inline font-bold" :class="reponse.est_expire ? 'text-[#A85148]' : 'text-mimosy-text'">
            {{ reponse.date_validite ? formatDate(reponse.date_validite) : 'sans limite' }}
            <span v-if="reponse.est_expire">(expiré)</span>
          </dd>
        </div>
        <div v-if="reponse.delai_estime">
          <dt class="inline">Délai estimé : </dt>
          <dd class="inline font-bold text-mimosy-text">{{ reponse.delai_estime }} jour(s)</dd>
        </div>
      </dl>
    </div>

    <div v-if="reponse.est_detaille" class="divide-y divide-mimosy-border font-sans text-sm">
      <!-- Matériaux -->
      <section class="p-4 sm:p-5">
        <h4 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Matériaux</h4>
        <p v-if="!lignes.length" class="mt-2 text-mimosy-secondary">Aucun matériau prévu.</p>
        <ul v-else class="mt-3 grid gap-2.5">
          <li v-for="ligne in lignes" :key="ligne.id" class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-mimosy-text">{{ ligne.designation }}</p>
              <p class="text-xs text-mimosy-secondary">
                {{ quantite(ligne.quantite) }}<span v-if="ligne.unite"> {{ ligne.unite }}</span> × {{ fcfa(ligne.prix_unitaire) }}
              </p>
            </div>
            <p class="shrink-0 font-bold text-mimosy-text">{{ fcfa(ligne.montant) }}</p>
          </li>
        </ul>
        <div class="mt-3 flex items-center justify-between border-t border-dashed border-mimosy-border pt-3">
          <span class="text-mimosy-secondary">Total matériaux</span>
          <span class="font-bold text-mimosy-text">{{ fcfa(reponse.total_materiaux) }}</span>
        </div>
      </section>

      <!-- Main-d'œuvre -->
      <section class="flex items-center justify-between gap-3 p-4 sm:p-5">
        <h4 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Main-d'œuvre</h4>
        <span class="font-bold text-mimosy-text">{{ fcfa(reponse.montant_main_oeuvre) }}</span>
      </section>

      <!-- Autres frais -->
      <section class="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div class="min-w-0">
          <h4 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Autres frais</h4>
          <p v-if="aDesFrais && reponse.description_frais" class="mt-1 text-xs text-mimosy-secondary">{{ reponse.description_frais }}</p>
        </div>
        <span class="shrink-0 font-bold text-mimosy-text">{{ aDesFrais ? fcfa(reponse.montant_frais) : 'Aucun' }}</span>
      </section>
    </div>

    <p v-else class="border-b border-mimosy-border p-4 font-sans text-xs text-mimosy-secondary sm:p-5">
      Ce devis a été envoyé avant le détail matériaux / main-d'œuvre : seul son total est disponible.
    </p>

    <!-- Total -->
    <div class="flex items-center justify-between gap-3 rounded-b-2xl bg-mimosy-primaryBg p-4 sm:p-5">
      <span class="font-sans text-xs font-bold uppercase tracking-[0.12em] text-mimosy-primary">Total à payer</span>
      <span class="font-serif text-2xl leading-8 text-mimosy-primary">{{ fcfa(reponse.prix_propose) }}</span>
    </div>

    <div v-if="reponse.conditions || reponse.description" class="grid gap-3 border-t border-mimosy-border p-4 font-sans text-sm sm:p-5">
      <div v-if="reponse.description">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Précisions</p>
        <p class="mt-1 whitespace-pre-line leading-6 text-mimosy-text">{{ reponse.description }}</p>
      </div>
      <div v-if="reponse.conditions">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Conditions</p>
        <p class="mt-1 whitespace-pre-line leading-6 text-mimosy-text">{{ reponse.conditions }}</p>
      </div>
    </div>
  </div>
</template>
