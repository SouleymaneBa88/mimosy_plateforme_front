<!--
  Tableau de bord ADMIN : vision globale de l'activité MIMOSY.

  Hiérarchie de lecture :
    1. quatre indicateurs principaux, avec leur évolution réelle
       (30 derniers jours contre les 30 précédents) et leur tendance ;
    2. une bande d'indicateurs secondaires ;
    3. « À traiter » (files d'attente réelles) et l'activité récente ;
    4. l'évolution mensuelle (Chart.js), calculée par le serveur.
  Aucune valeur n'est estimée : un mois sans activité vaut 0.
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  ClipboardList,
  CreditCard,
  FileText,
  FileWarning,
  Flag,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShieldX,
  Star,
  UserPlus,
  Users,
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
  serieLigne,
} from '@/components/charts/chartTheme'
import ActiviteTimeline from '@/components/dashboard/ActiviteTimeline.vue'
import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { MButton, MErrorState, MTabs } from '@/components/ui'
import * as adminService from '@/services/adminService'

const INTERVALLE_ACTUALISATION = 120_000

const PERIODES = [
  { value: 6, label: '6 mois' },
  { value: 12, label: '12 mois' },
]

const chargement = ref(true)
const actualisation = ref(false)
const erreur = ref('')
const erreurPartielle = ref('')

const stats = ref(null)
const tendances = ref(null)
const activite = ref([])
const compteursDossiers = ref(null)
const retraitsEnAttente = ref(0)
const periode = ref(12)
const derniereMiseAJour = ref(null)

let minuteur = null

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

async function charger({ silencieux = false } = {}) {
  if (silencieux && stats.value) actualisation.value = true
  else chargement.value = true
  erreur.value = ''
  erreurPartielle.value = ''

  // allSettled : une source indisponible n'empêche pas d'afficher les autres.
  const [resStats, resTendances, resActivite, resCompteurs, resRetraits] = await Promise.allSettled([
    adminService.getDashboardStats(),
    adminService.getTendances(periode.value),
    adminService.getActiviteRecente(30),
    adminService.getCompteursDossiers(),
    adminService.listRetraits('EN_ATTENTE'),
  ])

  if (resStats.status === 'rejected') {
    if (!stats.value) erreur.value = resStats.reason?.message || 'Impossible de charger le tableau de bord.'
    else erreurPartielle.value = resStats.reason?.message || "L'actualisation a échoué."
  } else {
    stats.value = resStats.value
  }
  if (resTendances.status === 'fulfilled') tendances.value = resTendances.value
  if (resActivite.status === 'fulfilled') activite.value = resActivite.value?.resultats ?? []
  if (resCompteurs.status === 'fulfilled') compteursDossiers.value = resCompteurs.value
  if (resRetraits.status === 'fulfilled') {
    const liste = resRetraits.value
    retraitsEnAttente.value = Array.isArray(liste) ? liste.length : liste?.count ?? liste?.results?.length ?? 0
  }
  const echecs = [resTendances, resActivite, resCompteurs, resRetraits].filter((r) => r.status === 'rejected')
  if (!erreur.value && echecs.length) erreurPartielle.value = 'Certaines données sont momentanément indisponibles.'

  derniereMiseAJour.value = new Date()
  chargement.value = false
  actualisation.value = false
}

async function changerPeriode() {
  try {
    tendances.value = await adminService.getTendances(periode.value)
  } catch (e) {
    erreurPartielle.value = e.message
  }
}

function actualiser() {
  if (!chargement.value && !actualisation.value) charger({ silencieux: true })
}

watch(periode, changerPeriode)

/* ------------------------------------------------------------------ */
/* Indicateurs                                                         */
/* ------------------------------------------------------------------ */

const u = computed(() => stats.value?.utilisateurs ?? {})
const d = computed(() => stats.value?.demandes ?? {})
const evolutions = computed(() => tendances.value?.evolutions ?? {})
const litigesOuverts = computed(() => (stats.value?.litiges?.en_attente ?? 0) + (stats.value?.litiges?.en_cours ?? 0))
const somme = (a = [], b = []) => a.map((v, i) => v + (b[i] ?? 0))

const indicateursPrincipaux = computed(() => [
  {
    label: 'Demandes de prestation',
    value: formaterNombre(d.value.total ?? 0),
    icon: Briefcase,
    evolution: evolutions.value.demandes,
    serie: tendances.value?.demandes?.total,
    hint: `${formaterNombre(d.value.en_attente ?? 0)} en attente de réponse`,
    to: '/admin/demandes',
  },
  {
    label: 'Utilisateurs inscrits',
    value: formaterNombre(u.value.total ?? 0),
    icon: Users,
    evolution: evolutions.value.inscriptions,
    serie: somme(tendances.value?.inscriptions?.clients, tendances.value?.inscriptions?.prestataires),
    hint: `${formaterNombre(u.value.clients ?? 0)} clients · ${formaterNombre(u.value.prestataires ?? 0)} prestataires`,
    to: '/admin/utilisateurs',
  },
  {
    label: 'Paiements encaissés',
    value: formaterMontant(stats.value?.paiements?.montant_total ?? 0),
    icon: CreditCard,
    evolution: evolutions.value.paiements,
    formater: (n) => formaterMontant(n),
    serie: tendances.value?.paiements?.montant,
    hint: `${formaterNombre(stats.value?.paiements?.reussis ?? 0)} paiements réussis`,
    to: '/admin/paiements',
    accent: true,
  },
  {
    label: 'Litiges ouverts',
    value: formaterNombre(litigesOuverts.value),
    icon: Scale,
    evolution: evolutions.value.litiges,
    baisseFavorable: true,
    serie: tendances.value?.litiges?.ouverts,
    hint: `${formaterNombre(stats.value?.litiges?.total ?? 0)} litiges au total`,
    to: '/admin/litiges',
  },
])

// Bande secondaire : chiffres utiles mais moins prioritaires.
// Séparateurs : grille 2×2 sur mobile, une ligne de 4 sur grand écran.
const SEPARATEURS = ['border-r border-b lg:border-b-0', 'border-b lg:border-b-0 lg:border-r', 'border-r', '']
const tauxVerifies = computed(() => (u.value.prestataires ? Math.round(((u.value.prestataires_verifies ?? 0) / u.value.prestataires) * 100) : 0))
const indicateursSecondaires = computed(() => {
  const parStatut = stats.value?.rendez_vous_par_statut ?? {}
  return [
    {
      label: 'Prestataires vérifiés',
      value: `${formaterNombre(u.value.prestataires_verifies ?? 0)} / ${formaterNombre(u.value.prestataires ?? 0)}`,
      sous: `${formaterNombre(u.value.prestataires_en_attente ?? 0)} en attente · ${formaterNombre(u.value.prestataires_rejetes ?? 0)} rejetés`,
      progression: tauxVerifies.value,
      icon: BadgeCheck,
      to: '/admin/dossiers',
    },
    {
      label: 'Prestations terminées',
      value: formaterNombre(d.value.terminees ?? 0),
      sous: d.value.total ? `${Math.round(((d.value.terminees ?? 0) / d.value.total) * 100)} % des demandes` : 'Aucune demande',
      icon: CircleCheck,
      to: '/admin/demandes',
    },
    {
      label: 'Rendez-vous',
      value: formaterNombre(stats.value?.rendez_vous?.total ?? 0),
      sous: `${formaterNombre((parStatut.EN_ATTENTE ?? 0) + (parStatut.CONFIRME ?? 0))} en attente ou confirmés`,
      icon: CalendarDays,
      to: '/admin/rendez-vous',
    },
    {
      label: 'Avis clients',
      value: formaterNombre(stats.value?.avis?.total ?? 0),
      sous: `${formaterNombre(stats.value?.avis?.en_attente ?? 0)} en attente de modération`,
      icon: Star,
      to: '/admin/avis',
    },
  ]
})

/* ------------------------------------------------------------------ */
/* À traiter : uniquement des files d'attente réelles                   */
/* ------------------------------------------------------------------ */

const aTraiter = computed(() =>
  [
    { cle: 'dossiers', libelle: 'Dossiers à décider', detail: 'Dossiers complets transmis', nombre: compteursDossiers.value?.par_statut?.DOSSIER_EN_REVUE ?? 0, icon: ShieldCheck, to: { path: '/admin/dossiers', query: { statut: 'DOSSIER_EN_REVUE' } } },
    { cle: 'documents', libelle: 'Documents à vérifier', detail: 'Décision humaine requise', nombre: compteursDossiers.value?.documents_a_verifier ?? 0, icon: FileWarning, to: '/admin/verifications' },
    { cle: 'litiges', libelle: 'Litiges en attente', detail: 'Pas encore pris en charge', nombre: stats.value?.litiges?.en_attente ?? 0, icon: Scale, to: '/admin/litiges', critique: true },
    { cle: 'retraits', libelle: 'Retraits à traiter', detail: 'Demandes des prestataires', nombre: retraitsEnAttente.value, icon: Wallet, to: '/admin/paiements' },
    { cle: 'avis', libelle: 'Avis à modérer', detail: 'En attente de modération', nombre: stats.value?.avis?.en_attente ?? 0, icon: Star, to: '/admin/avis' },
    { cle: 'signalements', libelle: 'Signalements', detail: 'En attente de traitement', nombre: stats.value?.signalements?.en_attente ?? 0, icon: Flag, to: '/admin/signalements' },
  ].sort((a, b) => b.nombre - a.nombre),
)
const totalATraiter = computed(() => aTraiter.value.reduce((s, item) => s + item.nombre, 0))
const aTraiterActifs = computed(() => aTraiter.value.filter((item) => item.nombre > 0))
const aTraiterVides = computed(() => aTraiter.value.filter((item) => !item.nombre))

/* ------------------------------------------------------------------ */
/* Activité récente                                                    */
/* ------------------------------------------------------------------ */

const versDossier = (item) => (item.objet_id ? { name: 'admin-dossier', params: { id: item.objet_id } } : '/admin/dossiers')
const TYPES_ACTIVITE = {
  NOUVEL_UTILISATEUR: { libelle: 'Nouvelle inscription', icone: UserPlus, ton: 'neutral', categorie: 'comptes', lien: () => '/admin/utilisateurs' },
  NOUVELLE_DEMANDE: { libelle: 'Nouvelle demande', icone: ClipboardList, ton: 'info', categorie: 'prestations', lien: () => '/admin/demandes' },
  NOUVEAU_DEVIS: { libelle: 'Demande de devis', icone: FileText, ton: 'info', categorie: 'prestations', lien: () => '/admin/devis' },
  NOUVEAU_RENDEZ_VOUS: { libelle: 'Nouveau rendez-vous', icone: CalendarDays, ton: 'info', categorie: 'prestations', lien: () => '/admin/rendez-vous' },
  PRESTATION_TERMINEE: { libelle: 'Prestation terminée', icone: CheckCheck, ton: 'brand', categorie: 'prestations', lien: () => '/admin/demandes' },
  PAIEMENT_REUSSI: { libelle: 'Paiement reçu', icone: CreditCard, ton: 'brand', categorie: 'paiements', lien: () => '/admin/paiements' },
  NOUVEL_AVIS: { libelle: 'Nouvel avis', icone: Star, ton: 'neutral', categorie: 'avis', lien: () => '/admin/avis' },
  NOUVEAU_SIGNALEMENT: { libelle: 'Signalement', icone: Flag, ton: 'warning', categorie: 'litiges', lien: () => '/admin/signalements' },
  NOUVEAU_LITIGE: { libelle: 'Litige ouvert', icone: Scale, ton: 'danger', categorie: 'litiges', lien: () => '/admin/litiges' },
  VERIFICATION_SOUMISE: { libelle: 'Dossier à examiner', icone: ShieldCheck, ton: 'warning', categorie: 'verifications', lien: versDossier },
  VERIFICATION_VALIDEE: { libelle: 'Prestataire validé', icone: BadgeCheck, ton: 'brand', categorie: 'verifications', lien: versDossier },
  VERIFICATION_REJETEE: { libelle: 'Dossier rejeté', icone: ShieldX, ton: 'danger', categorie: 'verifications', lien: versDossier },
  VERIFICATION_RENVOYEE: { libelle: 'Dossier renvoyé', icone: RotateCcw, ton: 'info', categorie: 'verifications', lien: versDossier },
}
const CATEGORIES_ACTIVITE = [
  { value: 'prestations', label: 'Prestations' },
  { value: 'paiements', label: 'Paiements' },
  { value: 'verifications', label: 'Vérifications' },
  { value: 'litiges', label: 'Litiges' },
  { value: 'avis', label: 'Avis' },
  { value: 'comptes', label: 'Inscriptions' },
]

/* ------------------------------------------------------------------ */
/* Graphiques                                                          */
/* ------------------------------------------------------------------ */

const labels = computed(() => (tendances.value?.mois ?? []).map(libelleMois))
const libellePeriode = computed(() => `sur ${periode.value} mois`)
const total = (serie = []) => serie.reduce((s, v) => s + (v || 0), 0)

function tableauMensuel(colonnes, ...series) {
  return { colonnes: ['Mois', ...colonnes], lignes: labels.value.map((mois, i) => [mois, ...series.map((serie) => serie(i))]) }
}

const demandesSeries = computed(() => {
  const s = tendances.value?.demandes ?? { total: [], terminees: [], annulees: [] }
  const enCours = s.total.map((t, i) => Math.max(t - (s.terminees[i] ?? 0) - (s.annulees[i] ?? 0), 0))
  return { ...s, enCours }
})
const graphiqueDemandes = computed(() => ({
  labels: labels.value,
  datasets: [
    serieBarres('Terminées', demandesSeries.value.terminees, SERIES[0], { empile: true }),
    serieBarres('En cours', demandesSeries.value.enCours, SERIES[1], { empile: true }),
    serieBarres('Annulées ou refusées', demandesSeries.value.annulees, SERIES[2], { empile: true }),
  ],
}))
const optionsDemandes = optionsCartesiennes({ empile: true })

const graphiqueInscriptions = computed(() => ({
  labels: labels.value,
  datasets: [
    serieLigne('Clients', tendances.value?.inscriptions?.clients ?? [], SERIES[1]),
    serieLigne('Prestataires', tendances.value?.inscriptions?.prestataires ?? [], SERIES[0]),
  ],
}))
const optionsLignes = optionsCartesiennes()

const graphiquePaiements = computed(() => ({
  labels: labels.value,
  datasets: [serieBarres('Montant encaissé', tendances.value?.paiements?.montant ?? [], SERIES[0])],
}))
const optionsPaiements = (() => {
  const options = optionsCartesiennes({ formatY: formaterCompact, entiers: false })
  options.plugins.legend.display = false
  options.plugins.tooltip.callbacks.label = (c) => ` ${formaterMontant(c.parsed.y)}`
  return options
})()

const graphiqueLitiges = computed(() => ({
  labels: labels.value,
  datasets: [serieLigne('Litiges ouverts', tendances.value?.litiges?.ouverts ?? [], SERIES[2], { remplir: true })],
}))
const optionsLitiges = (() => {
  const options = optionsCartesiennes()
  options.plugins.legend.display = false
  return options
})()

const partsVerification = computed(() => [
  { libelle: 'Vérifiés', valeur: u.value.prestataires_verifies ?? 0, couleur: STATUTS.succes, to: { path: '/admin/dossiers', query: { statut: 'VALIDE' } } },
  { libelle: 'En attente', valeur: u.value.prestataires_en_attente ?? 0, couleur: STATUTS.attente, to: '/admin/dossiers' },
  { libelle: 'Rejetés', valeur: u.value.prestataires_rejetes ?? 0, couleur: STATUTS.danger, to: { path: '/admin/dossiers', query: { statut: 'REJETE' } } },
])

const partsCategories = computed(() =>
  (tendances.value?.categories ?? []).map((ligne, i) => ({
    libelle: ligne.categorie,
    valeur: ligne.nombre,
    couleur: ligne.categorie === 'Autres' ? STATUTS.neutre : SERIES[i % SERIES.length],
  })),
)

/* ------------------------------------------------------------------ */
/* En-tête et cycle de vie                                             */
/* ------------------------------------------------------------------ */

const dateDuJour = (() => {
  const texte = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return texte.charAt(0).toUpperCase() + texte.slice(1)
})()
const heureMiseAJour = computed(() => derniereMiseAJour.value?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '')

function surVisibilite() {
  if (document.visibilityState === 'visible' && Date.now() - (derniereMiseAJour.value?.getTime() ?? 0) > INTERVALLE_ACTUALISATION) actualiser()
}

onMounted(() => {
  charger()
  minuteur = setInterval(() => document.visibilityState === 'visible' && actualiser(), INTERVALLE_ACTUALISATION)
  document.addEventListener('visibilitychange', surVisibilite)
})

onBeforeUnmount(() => {
  clearInterval(minuteur)
  document.removeEventListener('visibilitychange', surVisibilite)
})
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="flex flex-col gap-6 lg:gap-8">
      <!-- En-tête -->
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm text-muted">{{ dateDuJour }}</p>
          <h1 class="font-serif text-[38px] leading-[44px] text-ink sm:text-[46px] sm:leading-[52px]">Tableau de bord</h1>
          <p class="mt-1 text-sm text-ink-soft">L'activité de MIMOSY, calculée sur les données réelles de la plateforme.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <MTabs v-model="periode" :tabs="PERIODES" label="Période des graphiques" variant="pill" />
          <MButton variant="outline" size="sm" :icon="RefreshCw" :loading="actualisation" data-test="actualiser" @click="actualiser">Actualiser</MButton>
          <span v-if="heureMiseAJour" class="w-full text-right text-xs text-muted md:w-auto">Mis à jour à {{ heureMiseAJour }}</span>
        </div>
      </header>

      <!-- Chargement : squelettes à la forme du contenu final -->
      <div v-if="chargement" class="flex flex-col gap-6" aria-busy="true">
        <span class="sr-only">Chargement du tableau de bord…</span>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="n in 4" :key="n" class="h-[172px] animate-pulse rounded-card bg-[#E9EBE6] motion-reduce:animate-none" />
        </div>
        <div class="h-[92px] animate-pulse rounded-card bg-[#E9EBE6] motion-reduce:animate-none" />
        <div class="grid gap-6 xl:grid-cols-5">
          <div class="h-[340px] animate-pulse rounded-card bg-[#E9EBE6] motion-reduce:animate-none xl:col-span-2" />
          <div class="h-[340px] animate-pulse rounded-card bg-[#E9EBE6] motion-reduce:animate-none xl:col-span-3" />
        </div>
      </div>

      <MErrorState v-else-if="erreur" :message="erreur" @retry="charger" />

      <template v-else>
        <div v-if="erreurPartielle" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8C9C3] bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          <span>{{ erreurPartielle }}</span>
          <button type="button" class="cursor-pointer font-semibold underline underline-offset-4" @click="actualiser">Réessayer</button>
        </div>

        <!-- 1. Indicateurs principaux -->
        <section aria-label="Indicateurs principaux" class="grid grid-cols-2 gap-3 sm:gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4" :class="{ 'opacity-60': actualisation }">
          <KpiCard
            v-for="(item, index) in indicateursPrincipaux"
            :key="item.label"
            v-bind="item"
            :jours="evolutions.jours || 30"
            class="animate-rise"
            :style="{ '--reveal-delay': `${index * 50}ms` }"
          />
        </section>

        <!-- 2. Indicateurs secondaires -->
        <section aria-label="Indicateurs secondaires" class="animate-rise grid grid-cols-2 overflow-hidden rounded-card border border-line bg-surface lg:grid-cols-4" style="--reveal-delay: 200ms">
          <router-link
            v-for="(item, index) in indicateursSecondaires"
            :key="item.label"
            :to="item.to"
            class="group flex flex-col gap-1 border-line p-4 transition-colors hover:bg-raised sm:p-5"
            :class="SEPARATEURS[index]"
          >
            <span class="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <component :is="item.icon" :size="14" :stroke-width="1.9" class="text-brand" aria-hidden="true" />
              {{ item.label }}
            </span>
            <span class="tabular font-serif text-[26px] leading-8 text-ink">{{ item.value }}</span>
            <span v-if="item.progression !== undefined" class="h-1 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
              <span class="block h-full rounded-full bg-brand transition-[width] duration-700" :style="{ width: `${item.progression}%` }" />
            </span>
            <span class="truncate text-xs text-muted">{{ item.sous }}</span>
          </router-link>
        </section>

        <!-- 3. À traiter + activité -->
        <div class="grid items-start gap-6 xl:grid-cols-5">
          <DashboardSection
            class="xl:col-span-2"
            titre="À traiter"
            :description="totalATraiter ? `${formaterNombre(totalATraiter)} élément${totalATraiter > 1 ? 's' : ''} attendent une action` : 'Aucune file d’attente : tout est à jour'"
            :ordre="4"
            data-test="a-traiter"
          >
            <ul v-if="aTraiterActifs.length" class="flex flex-col gap-2">
              <li v-for="item in aTraiterActifs" :key="item.cle">
                <router-link :to="item.to" class="group flex items-center gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-brand/40">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="item.critique ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'" aria-hidden="true">
                    <component :is="item.icon" :size="17" :stroke-width="1.8" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-ink">{{ item.libelle }}</span>
                    <span class="block truncate text-xs text-muted">{{ item.detail }}</span>
                  </span>
                  <span class="tabular rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-white">{{ item.nombre }}</span>
                  <ArrowRight :size="15" class="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </router-link>
              </li>
            </ul>
            <div v-else class="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-4 text-sm text-brand">
              <CircleCheck :size="20" aria-hidden="true" />
              <span><strong>Tout est à jour.</strong> Aucune décision ni validation en attente.</span>
            </div>
            <div v-if="aTraiterVides.length" class="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
              <router-link v-for="item in aTraiterVides" :key="item.cle" :to="item.to" class="flex items-center gap-1.5 text-xs text-muted hover:text-brand">
                <CircleCheck :size="12" aria-hidden="true" /> {{ item.libelle }} : 0
              </router-link>
            </div>
          </DashboardSection>

          <DashboardSection class="xl:col-span-3" titre="Activité récente" description="Ce qui vient de se passer sur la plateforme." :ordre="5">
            <ActiviteTimeline :items="activite" :types="TYPES_ACTIVITE" :categories="CATEGORIES_ACTIVITE" :limite="7" />
          </DashboardSection>
        </div>

        <!-- 4. Évolution -->
        <div class="flex flex-wrap items-baseline justify-between gap-2 pt-2">
          <h2 class="font-serif text-[28px] leading-9 text-ink">Évolution de l'activité</h2>
          <p class="text-sm text-muted">{{ periode }} derniers mois, mois en cours inclus</p>
        </div>

        <div class="grid gap-6 xl:grid-cols-2" :class="{ 'opacity-60': actualisation }">
          <ChartPanel
            titre="Demandes de prestation"
            description="Demandes créées chaque mois, selon leur statut actuel."
            :chiffre="formaterNombre(total(demandesSeries.total))"
            :chiffre-libelle="`demandes ${libellePeriode}`"
            :vide="!aDesValeurs(demandesSeries.total)"
            message-vide="Aucune demande de prestation sur la période."
            :tableau="tableauMensuel(['Terminées', 'En cours', 'Annulées/refusées', 'Total'], (i) => demandesSeries.terminees[i], (i) => demandesSeries.enCours[i], (i) => demandesSeries.annulees[i], (i) => demandesSeries.total[i])"
            :ordre="6"
          >
            <Bar :data="graphiqueDemandes" :options="optionsDemandes" aria-label="Demandes de prestation par mois" />
          </ChartPanel>

          <ChartPanel
            titre="Inscriptions"
            description="Nouveaux comptes clients et prestataires par mois."
            :chiffre="formaterNombre(total(tendances?.inscriptions?.clients) + total(tendances?.inscriptions?.prestataires))"
            :chiffre-libelle="`inscriptions ${libellePeriode}`"
            :vide="!aDesValeurs(tendances?.inscriptions?.clients, tendances?.inscriptions?.prestataires)"
            message-vide="Aucune inscription sur la période."
            :tableau="tableauMensuel(['Clients', 'Prestataires'], (i) => tendances.inscriptions.clients[i], (i) => tendances.inscriptions.prestataires[i])"
            :ordre="7"
          >
            <Line :data="graphiqueInscriptions" :options="optionsLignes" aria-label="Inscriptions par mois" />
          </ChartPanel>

          <ChartPanel
            titre="Vérification des prestataires"
            description="Statut de vérification actuel de chaque prestataire inscrit."
            :vide="!(u.prestataires ?? 0)"
            message-vide="Aucun prestataire inscrit pour le moment."
            :hauteur="200"
            :ordre="8"
          >
            <RepartitionAnneau :parts="partsVerification" libelle-total="prestataires" />
            <template #pied>
              <router-link to="/admin/dossiers" class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                Ouvrir les vérifications <ArrowRight :size="14" aria-hidden="true" />
              </router-link>
            </template>
          </ChartPanel>

          <ChartPanel
            titre="Catégories de services demandées"
            description="Répartition de toutes les demandes par catégorie."
            :vide="!partsCategories.length"
            message-vide="Aucune demande n'a encore été passée."
            :hauteur="200"
            :ordre="9"
          >
            <RepartitionAnneau :parts="partsCategories" libelle-total="demandes" />
          </ChartPanel>

          <ChartPanel
            titre="Paiements encaissés"
            description="Montant des paiements réussis par mois."
            :chiffre="formaterMontant(total(tendances?.paiements?.montant))"
            :chiffre-libelle="libellePeriode"
            :vide="!aDesValeurs(tendances?.paiements?.montant)"
            message-vide="Aucun paiement réussi sur la période."
            :tableau="tableauMensuel(['Paiements', 'Montant (FCFA)'], (i) => tendances.paiements.nombre[i], (i) => formaterNombre(tendances.paiements.montant[i]))"
            :ordre="10"
          >
            <Bar :data="graphiquePaiements" :options="optionsPaiements" aria-label="Montant des paiements réussis par mois" />
          </ChartPanel>

          <ChartPanel
            titre="Litiges ouverts"
            description="Nouveaux litiges déclarés chaque mois."
            :chiffre="formaterNombre(total(tendances?.litiges?.ouverts))"
            :chiffre-libelle="`litiges ${libellePeriode}`"
            :vide="!aDesValeurs(tendances?.litiges?.ouverts)"
            message-vide="Aucun litige ouvert sur la période."
            :tableau="tableauMensuel(['Litiges ouverts'], (i) => tendances.litiges.ouverts[i])"
            :ordre="11"
          >
            <Line :data="graphiqueLitiges" :options="optionsLitiges" aria-label="Litiges ouverts par mois" />
          </ChartPanel>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
