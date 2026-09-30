<script setup>
/**
 * Facture d'un paiement confirmé.
 *
 * Toutes les données viennent de GET /api/wallet/mes-paiements/<id>/facture/,
 * qui ne répond qu'une fois le paiement confirmé par PayDunya (REUSSI) :
 * aucun montant, aucune référence ni aucun statut « Payé » n'est produit
 * par cette page. Imprimable (ou enregistrable en PDF) via le navigateur.
 */
// Outils Vue, routeur et icônes.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Printer } from 'lucide-vue-next'

// La mise en page client et les appels à l'API du wallet.
import ClientLayout from '@/components/layout/ClientLayout.vue'
import * as walletService from '@/services/walletService'

// La route (pour lire l'id du paiement) et le routeur.
const route = useRoute()
const router = useRouter()

// La facture, le message d'erreur et l'état de chargement.
const facture = ref(null)
const erreur = ref('')
const chargement = ref(true)

// Met un montant au format "12 500 FCFA".
function fcfa(valeur) {
  return `${Number(valeur || 0).toLocaleString('fr-FR')} FCFA`
}

// Met une quantité au format français.
function quantite(valeur) {
  return Number(valeur || 0).toLocaleString('fr-FR')
}

// Met une date au format "12 mars 2026, 14:30".
function formatDate(valeur) {
  if (!valeur) return ''
  return new Date(valeur).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Le détail du devis (s'il existe) et la présence de frais.
const detail = computed(() => facture.value?.detail || null)
const aDesFrais = computed(() => Number(detail.value?.montant_frais || 0) > 0)

// Ouvre la fenêtre d'impression du navigateur (permet aussi d'enregistrer en PDF).
function imprimer() {
  window.print()
}

// Ouvre la page de la demande liée à la facture.
function voirLaDemande() {
  if (facture.value?.prestation?.id) router.push({ name: 'detais.demande', params: { id: facture.value.prestation.id } })
}

onMounted(async () => {
  // À l'impression, seule la facture est gardée (navigation, pied de page masqués).
  document.body.classList.add('impression-facture')
  // On charge la facture depuis le serveur.
  try {
    facture.value = await walletService.getFacture(route.params.id)
  } catch (error) {
    erreur.value = error?.message || 'Facture indisponible.'
  } finally {
    chargement.value = false
  }
})

// En quittant la page, on retire la classe spéciale d'impression.
onBeforeUnmount(() => document.body.classList.remove('impression-facture'))
</script>

<template>
  <ClientLayout>
    <div class="mx-auto w-full max-w-[800px] px-4 py-10 sm:px-8 sm:py-12">
      <!-- Boutons du haut : retour et impression (cachés à l'impression). -->
      <div class="facture-actions mb-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" class="flex items-center gap-1.5 font-sans text-sm font-medium text-mimosy-secondary transition hover:text-mimosy-text" @click="router.back()">
          <ArrowLeft :size="16" :stroke-width="1.8" />
          Retour
        </button>
        <button
          v-if="facture"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary"
          @click="imprimer"
        >
          <Printer :size="16" />
          Imprimer / PDF
        </button>
      </div>

      <!-- États : chargement, erreur, ou facture. -->
      <div v-if="chargement" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-10 text-center font-sans text-sm font-bold text-mimosy-secondary">
        Chargement de la facture…
      </div>

      <div v-else-if="erreur" class="rounded-[24px] border border-[#E7B8B2] bg-[#FFF0EE] p-8 text-center font-sans text-sm font-bold text-[#A85148]">
        {{ erreur }}
      </div>

      <article v-else-if="facture" class="facture rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 font-sans text-sm text-mimosy-text sm:p-8">
        <!-- En-tête -->
        <header class="flex flex-wrap items-start justify-between gap-4 border-b border-mimosy-border pb-6">
          <div>
            <p class="font-serif text-2xl tracking-wide text-mimosy-primary">MIMOSY</p>
            <h1 class="mt-3 font-serif text-[28px] leading-8">Facture</h1>
          </div>
          <dl class="grid gap-1 text-left sm:text-right">
            <div>
              <dt class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Référence</dt>
              <dd class="break-all font-mono text-xs">{{ facture.reference }}</dd>
            </div>
            <div class="mt-2">
              <dt class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Date de paiement</dt>
              <dd class="font-bold">{{ formatDate(facture.date_paiement) }}</dd>
            </div>
          </dl>
        </header>

        <!-- Parties -->
        <section class="grid gap-6 border-b border-mimosy-border py-6 sm:grid-cols-2">
          <div>
            <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Client</h2>
            <p class="mt-2 font-bold">{{ facture.client.nom }}</p>
            <p v-if="facture.client.telephone" class="text-mimosy-secondary">{{ facture.client.telephone }}</p>
            <p v-if="facture.client.email" class="break-all text-mimosy-secondary">{{ facture.client.email }}</p>
          </div>
          <div>
            <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Prestataire</h2>
            <p class="mt-2 font-bold">{{ facture.prestataire.nom }}</p>
            <p v-if="facture.prestataire.telephone" class="text-mimosy-secondary">{{ facture.prestataire.telephone }}</p>
            <p class="mt-1 text-mimosy-secondary">Service : <span class="font-semibold text-mimosy-text">{{ facture.prestation.service || '—' }}</span></p>
          </div>
        </section>

        <!-- Détail -->
        <section class="border-b border-mimosy-border py-6">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Détail</h2>

          <template v-if="detail">
            <ul v-if="detail.lignes_materiaux.length" class="mt-4 grid gap-2.5">
              <li v-for="(ligne, index) in detail.lignes_materiaux" :key="index" class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold">{{ ligne.designation }}</p>
                  <p class="text-xs text-mimosy-secondary">
                    {{ quantite(ligne.quantite) }}<span v-if="ligne.unite"> {{ ligne.unite }}</span> × {{ fcfa(ligne.prix_unitaire) }}
                  </p>
                </div>
                <p class="shrink-0 font-semibold">{{ fcfa(ligne.montant) }}</p>
              </li>
            </ul>
            <dl class="mt-4 grid gap-2 border-t border-dashed border-mimosy-border pt-4">
              <div class="flex justify-between gap-3">
                <dt>Matériaux</dt>
                <dd class="font-semibold">{{ fcfa(detail.total_materiaux) }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Main-d'œuvre</dt>
                <dd class="font-semibold">{{ fcfa(detail.montant_main_oeuvre) }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Autres frais<span v-if="aDesFrais && detail.description_frais" class="text-mimosy-secondary"> ({{ detail.description_frais }})</span></dt>
                <dd class="font-semibold">{{ fcfa(detail.montant_frais) }}</dd>
              </div>
            </dl>
          </template>
          <dl v-else class="mt-4">
            <div class="flex justify-between gap-3">
              <dt>Prestation · {{ facture.prestation.service || 'Service' }}</dt>
              <dd class="font-semibold">{{ fcfa(facture.total) }}</dd>
            </div>
          </dl>

          <div class="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-mimosy-primaryBg px-4 py-4">
            <span class="text-xs font-bold uppercase tracking-[0.12em] text-mimosy-primary">Total</span>
            <span class="font-serif text-2xl text-mimosy-primary">{{ fcfa(facture.total) }}</span>
          </div>
        </section>

        <!-- Paiement et prestation -->
        <section class="grid gap-6 pt-6 sm:grid-cols-2">
          <div>
            <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Paiement</h2>
            <dl class="mt-2 grid gap-1">
              <div class="flex gap-2"><dt class="text-mimosy-secondary">Statut :</dt><dd class="font-bold text-mimosy-primary">{{ facture.paiement.statut_libelle }}</dd></div>
              <div v-if="facture.paiement.moyen" class="flex gap-2"><dt class="text-mimosy-secondary">Moyen :</dt><dd class="font-semibold">{{ facture.paiement.moyen }}</dd></div>
              <div class="flex gap-2"><dt class="text-mimosy-secondary">Traité par :</dt><dd class="font-semibold">{{ facture.paiement.fournisseur }}</dd></div>
              <div v-if="facture.paiement.reference_externe" class="flex flex-wrap gap-x-2">
                <dt class="text-mimosy-secondary">Référence paiement :</dt>
                <dd class="break-all font-mono text-xs">{{ facture.paiement.reference_externe }}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Statut de la prestation</h2>
            <p class="mt-2 font-bold">{{ facture.prestation.statut_libelle }}</p>
            <p v-if="!facture.fonds_liberes" class="mt-1 text-xs leading-5 text-mimosy-secondary">
              Les fonds sont sécurisés par MIMOSY : ils ne seront versés au prestataire qu'après la validation de la prestation.
            </p>
          </div>
        </section>

        <div class="facture-actions mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-5 py-3 text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="voirLaDemande">
            Voir la demande
          </button>
        </div>
      </article>
    </div>
  </ClientLayout>
</template>

<style>
/* Non scopé volontairement, mais actif uniquement quand cette page est
   ouverte (classe posée sur <body> au montage, retirée au démontage). */
@media print {
  body.impression-facture header:not(.facture header),
  body.impression-facture footer,
  body.impression-facture nav,
  body.impression-facture .facture-actions {
    display: none !important;
  }
  body.impression-facture .facture {
    border: none;
    padding: 0;
  }
}
</style>
