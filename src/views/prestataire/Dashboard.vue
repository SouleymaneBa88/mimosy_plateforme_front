<!--
  Tableau de bord du PRESTATAIRE.

  Pensé pour être compris en un coup d'œil :
    1. « À faire maintenant » : les actions qui attendent le prestataire ;
    2. sa vérification (étape actuelle, progression) ;
    3. ses chiffres clés (demandes, prestations, rendez-vous, revenus, note) ;
    4. l'évolution de son activité (Chart.js) ;
    5. ses dernières demandes, prochains rendez-vous et derniers avis.
  Les statistiques viennent de GET /api/profil/prestataire/tableau-de-bord/
  (agrégées par le serveur) ; revenus = montants réellement libérés.
-->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChartNoAxesColumn,
  CheckCheck,
  CircleCheck,
  ClipboardList,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  UserPen,
  Wallet,
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ChartPanel from '@/components/charts/ChartPanel.vue'
import RepartitionAnneau from '@/components/charts/RepartitionAnneau.vue'
import {
  SERIES,
  STATUTS,
  aDesValeurs,
  formaterCompact,
  formaterMontant,
  formaterNombre,
  libelleMois,
  optionsCartesiennes,
  serieBarres,
} from '@/components/charts/chartTheme'
import ActiviteTimeline from '@/components/dashboard/ActiviteTimeline.vue'
import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { MBadge, MButton, MStatusBadge } from '@/components/ui'

import { useAuthStore } from '@/stores/auth'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { useRendezVousStore } from '@/stores/rendezVous'
import * as parcoursService from '@/services/parcoursService'
import * as prestataireService from '@/services/prestataireService'
import * as reviewService from '@/services/reviewService'

const router = useRouter()
const authStore = useAuthStore()
const demandeStore = useDemandePrestationStore()
const rendezVousStore = useRendezVousStore()

const chargement = ref(true)
const erreur = ref('')
const offres = ref([])
const avis = ref([])
const profil = ref(null)
const tableau = ref(null)
const parcours = ref(null)

/* ---------------------------------------------------------- en-tête */
const prenom = computed(() => authStore.user?.first_name || 'Prestataire')
const dateDuJour = computed(() => {
  const texte = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return texte.charAt(0).toUpperCase() + texte.slice(1)
})

/* ---------------------------------------------------------- vérification */
const statutVerification = computed(() => tableau.value?.statut_verification || profil.value?.statut_verification || '')
const verifie = computed(() => statutVerification.value === 'VERIFIE')
const etapeCourante = computed(() => parcours.value?.etapes?.find((e) => e.cle === parcours.value.etape_courante))

const verification = computed(() => {
  const p = parcours.value
  if (verifie.value) {
    return { ton: 'verified', titre: 'Votre profil est vérifié', texte: 'Les clients voient que votre profil a été validé par l’équipe MIMOSY.' }
  }
  if (p?.decision === 'REJETE' || statutVerification.value === 'REJETE') {
    return { ton: 'danger', titre: 'Votre dossier n’a pas été retenu', texte: p?.motif_decision || 'Consultez votre parcours pour en savoir plus.' }
  }
  if (p?.decision === 'A_VERIFIER') {
    return { ton: 'warning', titre: 'L’équipe MIMOSY vous demande de compléter votre dossier', texte: p.motif_decision || '' }
  }
  if (p?.statut === 'DOSSIER_EN_REVUE') {
    return { ton: 'info', titre: 'Votre dossier est en cours d’examen', texte: 'Un administrateur va le consulter. Vous serez prévenu de sa décision.' }
  }
  return {
    ton: 'warning',
    titre: 'Votre vérification n’est pas terminée',
    texte: etapeCourante.value ? `Prochaine étape : ${etapeCourante.value.titre}.` : 'Terminez votre parcours de vérification pour être visible des clients.',
  }
})

/* ---------------------------------------------------------- à faire */
const demandesEnAttente = computed(() => demandeStore.demandes.filter((d) => d.statut === 'EN_ATTENTE').length)
const rdvAConfirmer = computed(() =>
  rendezVousStore.rendezVous.filter((r) => r.statut === 'EN_ATTENTE' && new Date(r.date_heure_debut) >= new Date()).length,
)
const completion = computed(() => profil.value?.completion || null)
const offresActives = computed(() => offres.value.filter((o) => o.disponible))

const aFaire = computed(() => {
  const actions = []
  const p = parcours.value
  if (!verifie.value && p && p.statut !== 'DOSSIER_EN_REVUE' && p.decision !== 'REJETE') {
    actions.push({
      cle: 'verification',
      icone: ShieldCheck,
      titre: p.decision === 'A_VERIFIER' ? 'Compléter mon dossier de vérification' : 'Continuer ma vérification',
      texte: etapeCourante.value ? `Étape ${p.numero_etape} sur ${p.nombre_etapes} : ${etapeCourante.value.libelle}` : 'Votre parcours de vérification',
      to: '/prestataire/parcours',
      important: true,
    })
  }
  if (demandesEnAttente.value) {
    actions.push({
      cle: 'demandes',
      icone: ClipboardList,
      titre: `Répondre à ${demandesEnAttente.value} demande${demandesEnAttente.value > 1 ? 's' : ''}`,
      texte: 'Des clients attendent votre réponse',
      to: '/prestataire/demandes',
      important: true,
    })
  }
  if (rdvAConfirmer.value) {
    actions.push({
      cle: 'rdv',
      icone: CalendarDays,
      titre: `Confirmer ${rdvAConfirmer.value} rendez-vous`,
      texte: 'Rendez-vous en attente de votre confirmation',
      to: '/prestataire/rendez-vous',
    })
  }
  if (completion.value && !completion.value.est_publiable) {
    actions.push({
      cle: 'profil',
      icone: UserPen,
      titre: 'Compléter mon profil',
      texte: `Profil complété à ${completion.value.pourcentage} %`,
      to: '/prestataire/profil',
    })
  }
  if (!offresActives.value.length) {
    actions.push({
      cle: 'services',
      icone: Briefcase,
      titre: 'Ajouter mes services',
      texte: 'Sans service, les clients ne peuvent pas vous trouver',
      to: '/prestataire/services',
    })
  }
  return actions
})

/* ---------------------------------------------------------- chiffres clés */
const parStatut = computed(() => tableau.value?.demandes?.par_statut || {})
const totalDemandes = computed(() => Object.values(parStatut.value).reduce((s, n) => s + n, 0))
const devise = computed(() => tableau.value?.revenus?.devise || 'FCFA')
const noteMoyenne = computed(() => tableau.value?.avis?.note_moyenne)

const evolutions = computed(() => tableau.value?.evolutions ?? {})

const indicateurs = computed(() => [
  {
    label: 'Demandes reçues',
    value: formaterNombre(totalDemandes.value),
    hint: `${formaterNombre(parStatut.value.EN_ATTENTE ?? 0)} en attente de réponse`,
    icon: ClipboardList,
    evolution: evolutions.value.demandes,
    serie: tableau.value?.demandes?.serie?.recues,
    to: '/prestataire/demandes',
  },
  {
    label: 'Prestations terminées',
    value: formaterNombre(parStatut.value.TERMINEE ?? 0),
    hint: `${formaterNombre(parStatut.value.ACCEPTEE ?? 0)} acceptées en cours`,
    icon: CircleCheck,
    evolution: evolutions.value.terminees,
    serie: tableau.value?.demandes?.serie?.terminees,
    to: '/prestataire/demandes',
  },
  {
    label: 'Rendez-vous à venir',
    value: formaterNombre(tableau.value?.rendez_vous?.a_venir ?? 0),
    hint: 'En attente ou confirmés',
    icon: CalendarDays,
    to: '/prestataire/rendez-vous',
  },
  {
    label: 'Revenus reçus',
    value: formaterMontant(tableau.value?.revenus?.total_libere ?? 0, devise.value),
    hint: `Disponible : ${formaterMontant(tableau.value?.revenus?.solde_disponible ?? 0, devise.value)}`,
    icon: Wallet,
    evolution: evolutions.value.revenus,
    formater: (n) => formaterMontant(n, devise.value),
    serie: tableau.value?.revenus?.serie?.montant,
    to: '/prestataire/wallet',
    accent: true,
  },
  {
    label: 'Note moyenne',
    value: noteMoyenne.value != null ? `${String(noteMoyenne.value.toFixed(1)).replace('.', ',')} / 5` : null,
    hint: `${formaterNombre(tableau.value?.avis?.nombre ?? 0)} avis publiés`,
    icon: Star,
    to: '/prestataire/avis',
  },
])

/* ---------------------------------------------------------- graphiques */
// Aucune demande, aucun avis, aucun revenu : pas de graphiques vides.
const sansActivite = computed(
  () => !totalDemandes.value && !(tableau.value?.avis?.nombre) && !(tableau.value?.revenus?.total_libere),
)
const labels = computed(() => (tableau.value?.mois ?? []).map(libelleMois))
const serieDemandes = computed(() => tableau.value?.demandes?.serie ?? { recues: [], terminees: [] })
const serieRevenus = computed(() => tableau.value?.revenus?.serie?.montant ?? [])

const graphiquePrestations = computed(() => ({
  labels: labels.value,
  datasets: [
    serieBarres('Demandes reçues', serieDemandes.value.recues, SERIES[1]),
    serieBarres('Terminées', serieDemandes.value.terminees, SERIES[0]),
  ],
}))
const optionsPrestations = optionsCartesiennes()

const graphiqueRevenus = computed(() => ({
  labels: labels.value,
  datasets: [serieBarres('Revenus reçus', serieRevenus.value, SERIES[0])],
}))
const optionsRevenus = (() => {
  const options = optionsCartesiennes({ formatY: formaterCompact, entiers: false })
  options.plugins.legend.display = false
  options.plugins.tooltip.callbacks.label = (c) => ` ${formaterMontant(c.parsed.y)}`
  return options
})()

function tableauMensuel(colonnes, ...series) {
  return { colonnes: ['Mois', ...colonnes], lignes: labels.value.map((mois, i) => [mois, ...series.map((s) => s(i))]) }
}

const LIBELLES_STATUT = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptées',
  REALISEE: 'Réalisées (validation client)',
  TERMINEE: 'Terminées',
  REFUSEE: 'Refusées',
  ANNULEE: 'Annulées',
}
const COULEURS_STATUT = {
  EN_ATTENTE: STATUTS.attente,
  ACCEPTEE: SERIES[1],
  REALISEE: STATUTS.info,
  TERMINEE: STATUTS.succes,
  REFUSEE: STATUTS.neutre,
  ANNULEE: STATUTS.danger,
}
const partsDemandes = computed(() =>
  Object.keys(LIBELLES_STATUT)
    .map((statut) => ({ libelle: LIBELLES_STATUT[statut], valeur: parStatut.value[statut] ?? 0, couleur: COULEURS_STATUT[statut] }))
    .filter((part) => part.valeur > 0),
)

// Répartition des notes : de 5 à 1 étoile(s).
const repartitionNotes = computed(() => {
  const repartition = tableau.value?.avis?.repartition || {}
  const total = Object.values(repartition).reduce((s, n) => s + n, 0)
  return [5, 4, 3, 2, 1].map((note) => ({ note, nombre: repartition[note] ?? 0, part: total ? ((repartition[note] ?? 0) / total) * 100 : 0 }))
})

/* ---------------------------------------------------------- activité */
// Construite uniquement à partir de ses propres demandes, rendez-vous et avis.
const TYPES_ACTIVITE = {
  DEMANDE_RECUE: { libelle: 'Nouvelle demande', icone: ClipboardList, ton: 'info', categorie: 'demandes', lien: () => '/prestataire/demandes' },
  PRESTATION_TERMINEE: { libelle: 'Prestation terminée', icone: CheckCheck, ton: 'brand', categorie: 'demandes', lien: () => '/prestataire/demandes' },
  RENDEZ_VOUS: { libelle: 'Rendez-vous pris', icone: CalendarDays, ton: 'info', categorie: 'rendez_vous', lien: () => '/prestataire/rendez-vous' },
  AVIS_RECU: { libelle: 'Nouvel avis', icone: Star, ton: 'neutral', categorie: 'avis', lien: () => '/prestataire/avis' },
}
const CATEGORIES_ACTIVITE = [
  { value: 'demandes', label: 'Demandes' },
  { value: 'rendez_vous', label: 'Rendez-vous' },
  { value: 'avis', label: 'Avis' },
]
const activite = computed(() => {
  const items = []
  for (const d of demandeStore.demandes) {
    if (d.date_creation) items.push({ type: 'DEMANDE_RECUE', date: d.date_creation, message: `${d.client_nom || 'Un client'} · ${d.service_nom || 'Service'}` })
    if (d.statut === 'TERMINEE' && d.date_validation) {
      items.push({ type: 'PRESTATION_TERMINEE', date: d.date_validation, message: `${d.service_nom || 'Prestation'} pour ${d.client_nom || 'un client'}` })
    }
  }
  for (const r of rendezVousStore.rendezVous) {
    if (r.date_creation) items.push({ type: 'RENDEZ_VOUS', date: r.date_creation, message: `${r.client_nom || 'Un client'} · ${formatDateHeure(r.date_heure_debut)}` })
  }
  for (const a of avis.value) {
    if (a.statut === 'PUBLIE' && a.date_creation) items.push({ type: 'AVIS_RECU', date: a.date_creation, message: `${a.note}/5${a.commentaire ? ` — ${a.commentaire}` : ''}` })
  }
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30)
})

/* ---------------------------------------------------------- listes */
const demandesRecentes = computed(() => demandeStore.demandes.slice(0, 5))
const prochainsRendezVous = computed(() =>
  rendezVousStore.rendezVous
    .filter((r) => ['EN_ATTENTE', 'CONFIRME'].includes(r.statut) && new Date(r.date_heure_debut) >= new Date())
    .sort((a, b) => new Date(a.date_heure_debut) - new Date(b.date_heure_debut))
    .slice(0, 3),
)
const avisRecents = computed(() =>
  avis.value
    .filter((a) => a.statut === 'PUBLIE')
    .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
    .slice(0, 3),
)

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'
}
function formatDateHeure(date) {
  return date ? new Date(date).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

/* ---------------------------------------------------------- chargement */
async function charger() {
  chargement.value = true
  erreur.value = ''
  const liste = (data) => (Array.isArray(data) ? data : data?.results || [])
  const resultats = await Promise.allSettled([
    prestataireService.getMonTableauDeBord(6),
    prestataireService.listMyServiceOffers(),
    reviewService.listReviews(),
    prestataireService.getMyProviderProfile(),
    parcoursService.getParcours(),
    demandeStore.chargerDemandes(true),
    rendezVousStore.chargerRendezVous(),
  ])
  const [resTableau, resOffres, resAvis, resProfil, resParcours] = resultats
  if (resTableau.status === 'fulfilled') tableau.value = resTableau.value
  if (resOffres.status === 'fulfilled') offres.value = liste(resOffres.value)
  if (resAvis.status === 'fulfilled') avis.value = liste(resAvis.value)
  if (resProfil.status === 'fulfilled') profil.value = resProfil.value
  // Le parcours peut être indisponible (ex. e-mail non vérifié) : le tableau de bord reste utilisable.
  if (resParcours.status === 'fulfilled') parcours.value = resParcours.value
  if (resTableau.status === 'rejected' && resProfil.status === 'rejected') {
    erreur.value = resTableau.reason?.message || 'Une erreur est survenue lors du chargement de votre tableau de bord.'
  }
  chargement.value = false
}

onMounted(charger)
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="flex flex-col gap-8">
      <!-- En-tête -->
      <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm text-muted">{{ dateDuJour }}</p>
          <h1 class="font-serif text-[36px] leading-10 text-ink sm:text-[44px] sm:leading-[48px]">Bonjour {{ prenom }},</h1>
          <p class="mt-1 text-base text-ink-soft">Voici où en est votre activité.</p>
        </div>
        <MButton :icon="Plus" @click="router.push('/prestataire/services')">Ajouter un service</MButton>
      </section>

      <!-- Chargement -->
      <div v-if="chargement" class="flex flex-col gap-6" aria-busy="true">
        <span class="sr-only">Chargement de votre activité…</span>
        <div class="h-40 animate-pulse rounded-card bg-sunken motion-reduce:animate-none" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div v-for="n in 5" :key="n" class="h-28 animate-pulse rounded-card bg-sunken motion-reduce:animate-none" />
        </div>
      </div>

      <!-- Erreur -->
      <div v-else-if="erreur" class="flex flex-col gap-4 rounded-card border border-[#E8C9C3] bg-danger-soft p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
        <p class="text-sm text-danger">{{ erreur }}</p>
        <MButton variant="outline" size="sm" :icon="RefreshCw" @click="charger">Réessayer</MButton>
      </div>

      <template v-else>
        <!-- À faire + vérification -->
        <div class="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section class="rounded-card border border-line bg-surface p-5 sm:p-6" aria-labelledby="titre-a-faire">
            <h2 id="titre-a-faire" class="font-serif text-2xl leading-8 text-ink">À faire maintenant</h2>
            <div v-if="!aFaire.length" class="mt-4 flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-4 text-sm text-brand">
              <CircleCheck :size="20" aria-hidden="true" />
              <span><strong>Tout est à jour.</strong> Aucune action ne vous attend pour le moment.</span>
            </div>
            <ul v-else class="mt-4 flex flex-col gap-2.5">
              <li v-for="action in aFaire" :key="action.cle">
                <router-link
                  :to="action.to"
                  class="group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors"
                  :class="action.important ? 'border-brand/30 bg-raised hover:border-brand' : 'border-line bg-raised hover:border-line-strong'"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="action.important ? 'bg-brand text-white' : 'bg-sunken text-ink-soft'" aria-hidden="true">
                    <component :is="action.icone" :size="18" :stroke-width="1.8" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[15px] font-semibold text-ink">{{ action.titre }}</span>
                    <span class="block text-sm text-ink-soft">{{ action.texte }}</span>
                  </span>
                  <ArrowRight :size="18" class="shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </router-link>
              </li>
            </ul>
          </section>

          <section class="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6" aria-labelledby="titre-verification">
            <div class="flex items-center justify-between gap-3">
              <h2 id="titre-verification" class="font-serif text-2xl leading-8 text-ink">Ma vérification</h2>
              <BadgeCheck v-if="verifie" :size="22" class="text-brand" aria-hidden="true" />
            </div>
            <div>
              <MBadge :variant="verification.ton" dot>{{ verification.titre }}</MBadge>
              <p v-if="verification.texte" class="mt-2 text-sm text-ink-soft">{{ verification.texte }}</p>
            </div>
            <div v-if="parcours?.etapes?.length">
              <div class="mb-2 flex items-center justify-between text-xs text-ink-soft">
                <span>Progression</span>
                <span class="tabular font-semibold">{{ parcours.pourcentage }} %</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" :aria-valuenow="parcours.pourcentage" aria-valuemin="0" aria-valuemax="100" aria-label="Progression de la vérification">
                <div class="h-full rounded-full bg-brand transition-[width] duration-700 motion-reduce:transition-none" :style="{ width: `${parcours.pourcentage}%` }" />
              </div>
              <ol class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                <li v-for="etape in parcours.etapes" :key="etape.cle" class="flex items-center gap-1.5 text-xs" :class="etape.etat === 'a_faire' ? 'text-muted' : 'text-ink'">
                  <span
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    :class="etape.etat === 'termine' ? 'bg-brand text-white' : etape.etat === 'en_cours' ? 'border-2 border-warning' : 'border border-line-strong'"
                    aria-hidden="true"
                  >{{ etape.etat === 'termine' ? '✓' : '' }}</span>
                  {{ etape.libelle }}
                </li>
              </ol>
            </div>
            <MButton v-if="!verifie" variant="outline" size="sm" :icon-right="ArrowRight" to="/prestataire/parcours" class="self-start">Voir mon parcours</MButton>
          </section>
        </div>

        <!-- Chiffres clés -->
        <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6" aria-label="Mes chiffres clés">
          <KpiCard
            v-for="(item, index) in indicateurs"
            :key="item.label"
            v-bind="item"
            :jours="evolutions.jours || 30"
            class="animate-rise"
            :class="index < 3 ? 'lg:col-span-2' : index === 4 ? 'col-span-2 lg:col-span-3' : 'lg:col-span-3'"
            :style="{ '--reveal-delay': `${index * 50}ms` }"
          />
        </section>

        <!-- Graphiques : seulement quand il y a quelque chose à montrer -->
        <section v-if="sansActivite" class="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center animate-rise" data-test="statistiques-vides">
          <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden="true"><ChartNoAxesColumn :size="20" /></span>
          <h2 class="font-serif text-2xl leading-8 text-ink">Vos statistiques arrivent bientôt</h2>
          <p class="max-w-md text-sm text-ink-soft">
            Dès votre première demande, vous suivrez ici vos prestations, vos revenus et vos avis, mois par mois.
          </p>
        </section>

        <div v-else class="grid gap-6 xl:grid-cols-2">
          <ChartPanel
            titre="Mes prestations"
            description="Demandes reçues et prestations terminées, mois par mois (6 derniers mois)."
            :vide="!aDesValeurs(serieDemandes.recues, serieDemandes.terminees)"
            message-vide="Vous n'avez pas encore reçu de demande. Vos prestations apparaîtront ici."
            :tableau="tableauMensuel(['Reçues', 'Terminées'], (i) => serieDemandes.recues[i], (i) => serieDemandes.terminees[i])"
          >
            <Bar :data="graphiquePrestations" :options="optionsPrestations" aria-label="Demandes reçues et terminées par mois" />
          </ChartPanel>

          <ChartPanel
            titre="Mes revenus"
            description="Argent versé sur votre portefeuille après chaque prestation terminée (commission déduite)."
            :vide="!aDesValeurs(serieRevenus)"
            message-vide="Aucun revenu reçu pour le moment. Vos gains s'afficheront ici après vos premières prestations."
            :tableau="tableauMensuel([`Revenus (${devise})`], (i) => formaterNombre(serieRevenus[i]))"
          >
            <Bar :data="graphiqueRevenus" :options="optionsRevenus" aria-label="Revenus reçus par mois" />
          </ChartPanel>

          <ChartPanel
            titre="Mes demandes par statut"
            description="Où en sont toutes les demandes que vous avez reçues."
            :vide="!partsDemandes.length"
            message-vide="Aucune demande pour le moment."
            :hauteur="200"
          >
            <RepartitionAnneau :parts="partsDemandes" libelle-total="demandes" />
          </ChartPanel>

          <ChartPanel
            titre="Mes avis clients"
            description="Votre note moyenne et la répartition des notes publiées."
            :vide="!(tableau?.avis?.nombre)"
            message-vide="Vous n'avez pas encore d'avis. Après chaque prestation, vos clients pourront vous noter."
            :hauteur="200"
          >
            <div class="grid h-full items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div class="text-center sm:pr-4">
                <p class="tabular font-serif text-5xl leading-none text-ink">{{ noteMoyenne != null ? String(noteMoyenne.toFixed(1)).replace('.', ',') : '—' }}</p>
                <p class="mt-1 flex items-center justify-center gap-0.5 text-star" aria-hidden="true">
                  <Star v-for="n in 5" :key="n" :size="14" :fill="noteMoyenne != null && n <= Math.round(noteMoyenne) ? 'currentColor' : 'none'" />
                </p>
                <p class="mt-1 text-xs text-muted">{{ formaterNombre(tableau?.avis?.nombre ?? 0) }} avis</p>
              </div>
              <ul class="flex flex-col gap-2" aria-label="Répartition des notes">
                <li v-for="ligne in repartitionNotes" :key="ligne.note" class="grid grid-cols-[3.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
                  <span class="text-ink-soft">{{ ligne.note }} étoile{{ ligne.note > 1 ? 's' : '' }}</span>
                  <span class="h-2 overflow-hidden rounded-full bg-sunken"><span class="block h-full rounded-full bg-star" :style="{ width: `${ligne.part}%` }" /></span>
                  <span class="tabular text-right font-semibold text-ink">{{ ligne.nombre }}</span>
                </li>
              </ul>
            </div>
          </ChartPanel>
        </div>

        <!-- Activité + agenda -->
        <div class="grid items-start gap-6 xl:grid-cols-3">
          <DashboardSection class="xl:col-span-2" titre="Activité récente" description="Vos dernières demandes, rendez-vous et avis." :ordre="2">
            <ActiviteTimeline
              :items="activite"
              :types="TYPES_ACTIVITE"
              :categories="CATEGORIES_ACTIVITE"
              :limite="6"
              message-vide="Votre activité apparaîtra ici dès votre première demande."
            />
          </DashboardSection>

          <div class="flex flex-col gap-6">
            <section class="rounded-card border border-line bg-surface p-5 sm:p-6">
              <div class="mb-3 flex items-center justify-between gap-3">
                <h2 class="font-serif text-2xl leading-8 text-ink">Prochains rendez-vous</h2>
                <router-link v-if="prochainsRendezVous.length" to="/prestataire/rendez-vous" class="text-sm font-semibold text-brand hover:underline">Voir tout</router-link>
              </div>
              <p v-if="!prochainsRendezVous.length" class="text-sm text-ink-soft">Aucun rendez-vous à venir.</p>
              <ul v-else class="divide-y divide-line">
                <li v-for="rdv in prochainsRendezVous" :key="rdv.id" class="py-3">
                  <p class="truncate text-sm font-semibold text-ink">{{ rdv.client_nom || 'Client' }}</p>
                  <p class="truncate text-xs text-ink-soft">{{ rdv.service_nom || 'Service' }} · {{ formatDateHeure(rdv.date_heure_debut) }}</p>
                  <MBadge class="mt-1.5" :variant="rdv.statut === 'CONFIRME' ? 'success' : 'warning'" size="sm">{{ rdv.statut === 'CONFIRME' ? 'Confirmé' : 'À confirmer' }}</MBadge>
                </li>
              </ul>
            </section>

            <section class="rounded-card border border-line bg-surface p-5 sm:p-6">
              <div class="mb-3 flex items-center justify-between gap-3">
                <h2 class="font-serif text-2xl leading-8 text-ink">Derniers avis</h2>
                <router-link v-if="avisRecents.length" to="/prestataire/avis" class="text-sm font-semibold text-brand hover:underline">Voir tout</router-link>
              </div>
              <p v-if="!avisRecents.length" class="text-sm text-ink-soft">Aucun avis publié pour le moment.</p>
              <ul v-else class="divide-y divide-line">
                <li v-for="item in avisRecents" :key="item.id" class="py-3">
                  <p class="flex items-center gap-0.5 text-star" :aria-label="`${item.note} sur 5`">
                    <Star v-for="n in 5" :key="n" :size="12" :fill="n <= item.note ? 'currentColor' : 'none'" aria-hidden="true" />
                  </p>
                  <p v-if="item.commentaire" class="mt-1 line-clamp-2 text-sm text-ink">{{ item.commentaire }}</p>
                  <p class="mt-1 text-xs text-muted">{{ formatDate(item.date_creation) }}</p>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <!-- Dernières demandes -->
        <DashboardSection titre="Mes dernières demandes" description="Les 5 demandes les plus récentes de vos clients." :ordre="3">
          <template v-if="demandesRecentes.length" #actions>
            <MButton variant="ghost" size="sm" :icon-right="ArrowRight" to="/prestataire/demandes">Toutes mes demandes</MButton>
          </template>
          <p v-if="!demandesRecentes.length" class="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-soft">
            Les demandes de vos clients apparaîtront ici.
          </p>
          <template v-else>
            <!-- Grand écran : tableau -->
            <div class="hidden overflow-hidden rounded-xl border border-line md:block">
              <table class="w-full text-left text-sm">
                <thead class="bg-sunken text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th class="px-4 py-2.5" scope="col">Client</th>
                    <th class="px-4 py-2.5" scope="col">Service</th>
                    <th class="px-4 py-2.5" scope="col">Reçue le</th>
                    <th class="px-4 py-2.5" scope="col">Date souhaitée</th>
                    <th class="px-4 py-2.5 text-right" scope="col">Statut</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line bg-raised">
                  <tr v-for="demande in demandesRecentes" :key="demande.id" class="cursor-pointer transition-colors hover:bg-brand-mist" @click="router.push('/prestataire/demandes')">
                    <td class="px-4 py-3">
                      <span class="flex items-center gap-2.5">
                        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden="true">{{ (demande.client_nom || 'C').charAt(0).toUpperCase() }}</span>
                        <span class="font-semibold text-ink">{{ demande.client_nom || 'Client' }}</span>
                      </span>
                    </td>
                    <td class="px-4 py-3 text-ink">{{ demande.service_nom || '—' }}</td>
                    <td class="px-4 py-3 text-ink-soft">{{ formatDate(demande.date_creation) }}</td>
                    <td class="px-4 py-3 text-ink-soft">{{ formatDateHeure(demande.date_souhaitee) }}</td>
                    <td class="px-4 py-3 text-right"><MStatusBadge :status="demande.statut" size="sm" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Petit écran : cartes -->
            <ul class="flex flex-col gap-2.5 md:hidden">
              <li v-for="demande in demandesRecentes" :key="demande.id">
                <router-link to="/prestataire/demandes" class="flex flex-col gap-2 rounded-xl border border-line bg-raised p-3.5">
                  <span class="flex items-center justify-between gap-2">
                    <span class="truncate font-semibold text-ink">{{ demande.client_nom || 'Client' }}</span>
                    <MStatusBadge :status="demande.statut" size="sm" />
                  </span>
                  <span class="text-sm text-ink-soft">{{ demande.service_nom || 'Service' }}</span>
                  <span class="text-xs text-muted">Reçue le {{ formatDate(demande.date_creation) }} · souhaitée {{ formatDateHeure(demande.date_souhaitee) }}</span>
                </router-link>
              </li>
            </ul>
          </template>
        </DashboardSection>
      </template>
    </div>
  </AppLayout>
</template>
