<script setup>
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

import AppLayout from '@/components/layout/AppLayout.vue'
import ErrorState from '@/components/common/ErrorState.vue'

import * as adminService from '@/services/adminService'

/* ================================================================== */
/* CONSTANTES                                                          */
/* ================================================================== */

const INTERVALLE_AUTO_REFRESH = 60_000
const INTERVALLE_HORLOGE = 30_000
const NB_A_TRAITER = 3
const NB_ACTIVITE = 4
const JOURS_DEFAUT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const mouvementReduit =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ================================================================== */
/* ICÔNES & NOMBRE ANIMÉ                                               */
/* ================================================================== */

const ICONES = {
  hausse: 'M12 19V5 M6 11l6-6 6 6',
  baisse: 'M12 5v14 M6 13l6 6 6-6',
  lieu: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  service: 'M4 7h16v12H4z M9 7V5h6v2',
  personne: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0',
  bouclier: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z M9 12l2 2 4-4',
  alerte: 'M12 8v5 M12 16.5h.01 M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
}

const Icone = defineComponent({
  props: {
    nom: { type: String, required: true },
    taille: { type: Number, default: 12 },
    epaisseur: { type: Number, default: 2.2 },
  },
  setup(props) {
    return () =>
      h(
        'svg',
        {
          width: props.taille,
          height: props.taille,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': props.epaisseur,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
        },
        [h('path', { d: ICONES[props.nom] })],
      )
  },
})

const formateurNombre = new Intl.NumberFormat('fr-FR')

function formaterValeur(n, padding) {
  if (padding && n >= 0 && n < 10) return `0${n}`
  return formateurNombre.format(n)
}

const NombreAnime = defineComponent({
  props: {
    valeur: { type: Number, default: 0 },
    padding: { type: Boolean, default: false },
  },
  setup(props) {
    const affiche = ref(0)
    let frame = null

    watch(
      () => props.valeur,
      (cible, precedent) => {
        cancelAnimationFrame(frame)
        const depart = Number(precedent ?? 0)
        const arrivee = Number(cible ?? 0)
        if (mouvementReduit || depart === arrivee) {
          affiche.value = arrivee
          return
        }
        const debut = performance.now()
        const etape = (t) => {
          const p = Math.min((t - debut) / 700, 1)
          affiche.value = Math.round(depart + (arrivee - depart) * (1 - Math.pow(1 - p, 3)))
          if (p < 1) frame = requestAnimationFrame(etape)
        }
        frame = requestAnimationFrame(etape)
      },
      { immediate: true },
    )

    onBeforeUnmount(() => cancelAnimationFrame(frame))

    return () => h('span', { class: 'chiffres' }, formaterValeur(affiche.value, props.padding))
  },
})

/* ================================================================== */
/* ÉTAT                                                                */
/* ================================================================== */

const router = useRouter()

const loading = ref(true)
const rafraichissement = ref(false)
const errorMessage = ref('')
const erreurRafraichissement = ref('')

const stats = ref(null)
const activite = ref([])

const listeDocuments = ref([])
const listeAvis = ref([])
const listeRetraits = ref([])

const documentsAVerifier = ref(0)
const avisEnAttente = ref(0)
const retraitsEnAttente = ref(0)
const paiementsReussis = ref(0)

const valeursPrecedentes = ref(null)
const derniereMiseAJour = ref(null)
const maintenant = ref(Date.now())
const activiteDepliee = ref(false)
const pointSurvole = ref(null)

let minuteurRefresh = null
let minuteurHorloge = null

/* ================================================================== */
/* CHARGEMENT                                                          */
/* ================================================================== */

async function charger({ silencieux = false } = {}) {
  const dejaCharge = stats.value !== null

  if (silencieux && dejaCharge) rafraichissement.value = true
  else loading.value = true

  errorMessage.value = ''
  erreurRafraichissement.value = ''

  try {
    const [dashboard, activiteData, documents, avis, retraits] = await Promise.all([
      adminService.getDashboardStats(),
      adminService.getActiviteRecente(12),
      adminService.listDocumentsAVerifier(),
      adminService.listAvisEnAttente(),
      adminService.listRetraits('EN_ATTENTE'),
    ])

    if (dejaCharge) {
      valeursPrecedentes.value = Object.fromEntries(
        statistiquesPrincipales.value.map((s) => [s.type, s.valeur]),
      )
    }

    stats.value = dashboard
    activite.value = activiteData?.resultats ?? []

    listeDocuments.value = Array.isArray(documents) ? documents : []
    listeAvis.value = Array.isArray(avis) ? avis : []
    listeRetraits.value = Array.isArray(retraits) ? retraits : []

    documentsAVerifier.value = documents?.length ?? 0
    avisEnAttente.value = avis?.length ?? 0
    retraitsEnAttente.value = retraits?.length ?? 0
    paiementsReussis.value = dashboard?.paiements?.reussis ?? 0

    derniereMiseAJour.value = Date.now()
    maintenant.value = Date.now()
  } catch (error) {
    const message = error?.message || 'Impossible de charger le tableau de bord.'
    if (dejaCharge) erreurRafraichissement.value = message
    else errorMessage.value = message
  } finally {
    loading.value = false
    rafraichissement.value = false
  }
}

function actualiser() {
  if (loading.value || rafraichissement.value) return
  charger({ silencieux: true })
}

function surVisibilite() {
  if (document.visibilityState !== 'visible') return
  maintenant.value = Date.now()
  if (Date.now() - (derniereMiseAJour.value ?? 0) > INTERVALLE_AUTO_REFRESH) actualiser()
}

/* ================================================================== */
/* OUTILS DE LECTURE DES DONNÉES                                       */
/* ================================================================== */

/* Renvoie la première valeur non vide parmi plusieurs chemins ("a.b.c") */
function lire(objet, ...chemins) {
  for (const chemin of chemins) {
    const valeur = chemin.split('.').reduce((o, cle) => o?.[cle], objet)
    if (valeur !== undefined && valeur !== null && valeur !== '') return valeur
  }
  return null
}

function nomPersonne(objet, ...racines) {
  for (const racine of racines) {
    const p = racine ? lire(objet, racine) : objet
    if (!p) continue
    if (typeof p === 'string') return p
    const complet = lire(p, 'nom_complet', 'full_name', 'nom_affiche')
    if (complet) return complet
    const prenomNom = [lire(p, 'prenom', 'first_name'), lire(p, 'nom', 'last_name')]
      .filter(Boolean)
      .join(' ')
    if (prenomNom) return prenomNom
  }
  return null
}

function extraireDate(objet) {
  return lire(objet, 'date_creation', 'created_at', 'date_soumission', 'date_demande', 'date', 'updated_at')
}

function horodatage(date) {
  const t = new Date(date ?? NaN).getTime()
  return Number.isNaN(t) ? 0 : t
}

/* ================================================================== */
/* KPI                                                                 */
/* ================================================================== */

const nombreLitiges = computed(
  () => (stats.value?.litiges?.en_attente ?? 0) + (stats.value?.litiges?.en_cours ?? 0),
)

const montantPaiements = computed(() => {
  const m = lire(stats.value, 'paiements.montant_total', 'paiements.montant', 'paiements.total_montant')
  return m !== null && Number.isFinite(Number(m)) ? Number(m) : null
})

const statistiquesPrincipales = computed(() => [
  {
    type: 'demande',
    label: 'Demandes en attente',
    valeur: stats.value?.demandes?.en_attente ?? 0,
    suffixe: '',
  },
  {
    type: 'verification',
    label: 'Vérifications',
    valeur: documentsAVerifier.value,
    suffixe: 'Prestataires',
  },
  {
    type: 'litige',
    label: 'Litiges ouverts',
    valeur: nombreLitiges.value,
    suffixe: nombreLitiges.value > 0 ? 'Critique' : 'Aucun',
    critique: nombreLitiges.value > 0,
  },
  {
    type: 'paiement',
    label: 'Paiements réussis',
    // si le backend fournit un montant, on l'affiche en k FCFA comme sur la maquette
    valeur: montantPaiements.value !== null ? Math.round(montantPaiements.value / 1000) : paiementsReussis.value,
    suffixe: montantPaiements.value !== null ? 'k FCFA' : 'Transactions',
    mis_en_avant: true,
  },
])

function variation(type, valeur) {
  const avant = valeursPrecedentes.value?.[type]
  if (avant === undefined || avant === valeur) return 0
  return valeur - avant
}

/* ================================================================== */
/* À TRAITER : éléments réels, du plus récent au plus ancien           */
/* ================================================================== */

const elementsATraiter = computed(() => {
  const elements = []

  for (const doc of listeDocuments.value) {
    const nom = nomPersonne(doc, 'prestataire', 'utilisateur', 'user', '') || 'Prestataire'
    const metier = lire(doc, 'prestataire.metier', 'prestataire.categorie', 'metier', 'categorie', 'type_document')
    elements.push({
      id: `doc-${lire(doc, 'id') ?? elements.length}`,
      categorie: 'Vérification identité',
      titre: metier ? `${nom} — Prestataire ${metier}` : `${nom} — Prestataire`,
      meta: lire(doc, 'prestataire.localisation', 'prestataire.ville', 'localisation', 'ville', 'adresse') || 'Documents à vérifier',
      icone: 'lieu',
      date: extraireDate(doc),
      route: 'admin-verifications',
    })
  }

  for (const retrait of listeRetraits.value) {
    const montant = Number(lire(retrait, 'montant', 'amount'))
    const nom = nomPersonne(retrait, 'prestataire', 'utilisateur', 'user')
    elements.push({
      id: `ret-${lire(retrait, 'id') ?? elements.length}`,
      categorie: 'Retrait en attente',
      titre: Number.isFinite(montant)
        ? `Retrait demandé — ${formateurNombre.format(montant)} FCFA`
        : 'Retrait demandé',
      meta: nom ? `Prestataire: ${nom}` : 'Paiements',
      icone: 'personne',
      date: extraireDate(retrait),
      route: 'admin-paiements',
    })
  }

  for (const avis of listeAvis.value) {
    const note = lire(avis, 'note', 'rating')
    const nom = nomPersonne(avis, 'client', 'auteur', 'utilisateur')
    elements.push({
      id: `avis-${lire(avis, 'id') ?? elements.length}`,
      categorie: 'Avis à modérer',
      titre: lire(avis, 'commentaire', 'contenu') || (note ? `Avis ${note}/5` : 'Nouvel avis'),
      meta: nom ? `Client: ${nom}` : 'Modération',
      icone: 'personne',
      date: extraireDate(avis),
      route: 'admin-avis',
    })
  }

  elements.sort((a, b) => horodatage(b.date) - horodatage(a.date))

  // Les litiges ne sont connus qu'en nombre : ils passent en priorité
  if (nombreLitiges.value > 0) {
    elements.unshift({
      id: 'litiges',
      categorie: 'Litige client',
      titre: `${nombreLitiges.value} litige${nombreLitiges.value > 1 ? 's' : ''} ouvert${nombreLitiges.value > 1 ? 's' : ''}`,
      meta: 'Centre des litiges',
      icone: 'service',
      date: null,
      route: 'admin-litiges',
    })
  }

  return elements
})

const elementsATraiterAffiches = computed(() => elementsATraiter.value.slice(0, NB_A_TRAITER))

const systemeOperationnel = computed(() => !errorMessage.value && !erreurRafraichissement.value)

/* ================================================================== */
/* ACTIVITÉ                                                            */
/* ================================================================== */

const libellesActivite = {
  NOUVEL_UTILISATEUR: 'Nouvel utilisateur',
  NOUVELLE_DEMANDE: 'Nouvelle demande',
  NOUVEAU_DEVIS: 'Nouveau devis',
  NOUVEL_AVIS: 'Nouvel avis',
  NOUVEAU_SIGNALEMENT: 'Signalement',
  NOUVEAU_LITIGE: 'Litige',
  PAIEMENT_REUSSI: 'Paiement réussi',
}

const typesSensibles = ['NOUVEAU_LITIGE', 'NOUVEAU_SIGNALEMENT']

function libelleActivite(type) {
  return libellesActivite[type] || type || 'Activité'
}

function acteurEvenement(e) {
  return nomPersonne(e, 'acteur', 'utilisateur', 'client', 'prestataire') || '—'
}

function avatarEvenement(e) {
  return lire(e, 'avatar', 'photo', 'acteur.avatar', 'acteur.photo', 'utilisateur.avatar', 'utilisateur.photo')
}

function initiales(nom) {
  if (!nom || nom === '—') return '·'
  return nom.trim().split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase() ?? '').join('')
}

const activiteAffichee = computed(() =>
  activiteDepliee.value ? activite.value : activite.value.slice(0, NB_ACTIVITE),
)

/* ================================================================== */
/* REVENUS                                                             */
/* ================================================================== */

const historiqueRevenus = computed(() => {
  const source =
    lire(stats.value, 'revenus.historique', 'revenus_hebdomadaires') ??
    (Array.isArray(stats.value?.revenus) ? stats.value.revenus : [])

  if (!Array.isArray(source)) return []

  return source
    .map((p, i) => ({
      label: p.label ?? p.jour ?? libelleJour(p.date) ?? JOURS_DEFAUT[i] ?? `${i + 1}`,
      valeur: Number(p.montant ?? p.total ?? p.valeur ?? 0),
      objectif: p.objectif !== undefined && p.objectif !== null ? Number(p.objectif) : null,
    }))
    .filter((p) => Number.isFinite(p.valeur))
})

const objectifGlobal = computed(() => {
  const o = lire(stats.value, 'revenus.objectif')
  return o !== null && Number.isFinite(Number(o)) ? Number(o) : null
})

const aObjectif = computed(
  () => objectifGlobal.value !== null || historiqueRevenus.value.some((p) => p.objectif !== null),
)

const echelle = computed(() => {
  const valeurs = historiqueRevenus.value.flatMap((p) => [p.valeur, p.objectif ?? 0])
  if (objectifGlobal.value !== null) valeurs.push(objectifGlobal.value)
  const max = Math.max(...valeurs, 0)

  if (!max) return { max: 80000, graduations: [80000, 60000, 40000, 20000, 0] }

  const brut = max / 4
  const puissance = Math.pow(10, Math.floor(Math.log10(brut)))
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut)
  return { max: pas * 4, graduations: [4, 3, 2, 1, 0].map((i) => i * pas) }
})

function formaterK(valeur) {
  if (valeur >= 1000) return `${formateurNombre.format(Math.round(valeur / 1000))}k`
  return `${formateurNombre.format(valeur)}`
}

const points = computed(() => {
  const liste = historiqueRevenus.value
  const n = liste.length
  return liste.map((p, i) => {
    const obj = p.objectif ?? objectifGlobal.value
    return {
      ...p,
      x: n === 1 ? 50 : (i / (n - 1)) * 100,
      y: 100 - (p.valeur / echelle.value.max) * 100,
      yObjectif: obj !== null ? 100 - (obj / echelle.value.max) * 100 : null,
    }
  })
})

const etiquettesX = computed(() =>
  points.value.length
    ? points.value.map((p) => ({ label: p.label, x: p.x }))
    : JOURS_DEFAUT.map((label, i) => ({ label, x: (i / 6) * 100 })),
)

const cheminLigne = computed(() =>
  points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '),
)

const cheminAire = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  return `${cheminLigne.value} L${pts[pts.length - 1].x},100 L${pts[0].x},100 Z`
})

const cheminObjectif = computed(() =>
  points.value
    .filter((p) => p.yObjectif !== null)
    .map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.yObjectif}`)
    .join(' '),
)

/* ================================================================== */
/* TEMPS                                                               */
/* ================================================================== */

function tempsRelatif(date) {
  const t = horodatage(date)
  if (!t) return ''
  const s = Math.round((maintenant.value - t) / 1000)
  if (s < 60) return "À l'instant"
  if (s < 3600) return `Il y a ${Math.round(s / 60)} min`
  if (s < 86400) return `Il y a ${Math.round(s / 3600)}h`
  const jours = Math.round(s / 86400)
  return jours === 1 ? 'Hier' : `Il y a ${jours} j`
}

function formaterHeure(date) {
  const t = horodatage(date)
  if (!t) return ''
  const valeur = new Date(t)
  const heure = valeur.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const aujourdhui = new Date(maintenant.value)
  const hier = new Date(maintenant.value)
  hier.setDate(hier.getDate() - 1)

  if (valeur.toDateString() === aujourdhui.toDateString()) return heure
  if (valeur.toDateString() === hier.toDateString()) return `Hier, ${heure}`

  const jour = valeur.getDate()
  const mois = valeur.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${jour} ${mois.charAt(0).toUpperCase()}${mois.slice(1)}, ${heure}`
}

function libelleJour(date) {
  const t = horodatage(date)
  if (!t) return null
  const j = new Date(t).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
  return j.charAt(0).toUpperCase() + j.slice(1)
}

function ouvrirSection(route) {
  if (route) router.push({ name: route })
}

/* ================================================================== */
/* CYCLE DE VIE                                                        */
/* ================================================================== */

onMounted(() => {
  charger()
  minuteurHorloge = setInterval(() => (maintenant.value = Date.now()), INTERVALLE_HORLOGE)
  minuteurRefresh = setInterval(() => {
    if (document.visibilityState === 'visible') actualiser()
  }, INTERVALLE_AUTO_REFRESH)
  document.addEventListener('visibilitychange', surVisibilite)
})

onBeforeUnmount(() => {
  clearInterval(minuteurRefresh)
  clearInterval(minuteurHorloge)
  document.removeEventListener('visibilitychange', surVisibilite)
})
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="page">
      <!-- ========================= EN-TÊTE ========================= -->
      <header class="entete">
        <h1 class="titre-page">Tableau de bord</h1>
        <p class="sous-titre">Vue d'ensemble de l'activité MIMOSY</p>
      </header>

      <!-- ========================= CHARGEMENT ========================= -->
      <template v-if="loading && !stats">
        <div class="rangee-kpi" aria-busy="true" aria-label="Chargement">
          <div v-for="n in 4" :key="n" class="carte squelette" style="height: 138px" />
        </div>
        <div class="rangee-principale">
          <div class="carte squelette" style="height: 480px" />
          <div class="carte squelette" style="height: 480px" />
        </div>
      </template>

      <!-- ========================= ERREUR ========================= -->
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />

      <template v-else>
        <div v-if="erreurRafraichissement" class="bandeau-erreur" role="alert">
          <span>L'actualisation a échoué : {{ erreurRafraichissement }}</span>
          <button type="button" class="lien-souligne lien-rouge" @click="actualiser">Réessayer</button>
        </div>

        <!-- ========================= KPI ========================= -->
        <section class="rangee-kpi" :class="{ attenue: rafraichissement }" aria-label="Indicateurs principaux">
          <article
            v-for="s in statistiquesPrincipales"
            :key="s.type"
            class="carte carte-kpi rounded-2xl"
            :class="{ 'carte-verte': s.mis_en_avant }"
          >
            <p class="etiquette" :class="s.mis_en_avant ? 'etiquette-claire' : ''">{{ s.label }}</p>

            <div class="ligne-valeur">
              <span class="valeur" :class="{ 'texte-rouge': s.critique, 'texte-blanc': s.mis_en_avant }">
                <NombreAnime :valeur="s.valeur" :padding="!s.mis_en_avant" />
              </span>

              <span
                v-if="variation(s.type, s.valeur) !== 0"
                class="variation"
                :class="
                  s.mis_en_avant ? 'texte-blanc' : variation(s.type, s.valeur) > 0 ? 'texte-vert' : 'texte-rouge'
                "
                title="Depuis la dernière actualisation"
              >
                <Icone :nom="variation(s.type, s.valeur) > 0 ? 'hausse' : 'baisse'" :taille="11" :epaisseur="2.6" />
                {{ variation(s.type, s.valeur) > 0 ? '+' : '' }}{{ variation(s.type, s.valeur) }}
              </span>

              <span
                v-else-if="s.suffixe"
                class="suffixe"
                :class="{ 'suffixe-rouge': s.critique, 'suffixe-blanc': s.mis_en_avant, 'suffixe-grand': s.suffixe === 'k FCFA' }"
              >
                {{ s.suffixe }}
              </span>
            </div>
          </article>
        </section>

        <!-- ========================= À TRAITER + ACTIVITÉ ========================= -->
        <section class="rangee-principale" :class="{ attenue: rafraichissement }">
          <!-- À TRAITER -->
          <article class="carte carte-section rounded-2xl">
            <div class="entete-section">
              <h2 class="titre-section">À traiter</h2>
              <span class="etiquette opacite-40">
                {{ elementsATraiter.length ? 'Priorité haute' : 'À jour' }}
              </span>
            </div>

            <ol v-if="elementsATraiterAffiches.length" class="timeline">
              <li
                v-for="(el, index) in elementsATraiterAffiches"
                :key="el.id"
                class="item-timeline"
                :class="{
                  'item-actif': index === 0,
                  'item-dernier': index === elementsATraiterAffiches.length - 1,
                }"
              >
                <button type="button" class="bouton-item" @click="ouvrirSection(el.route)">
                  <span class="point" aria-hidden="true" />
                  <span class="item-haut">
                    <span class="etiquette" :class="index === 0 ? 'texte-vert' : 'opacite-40'">{{ el.categorie }}</span>
                    <span class="item-temps">{{ tempsRelatif(el.date) }}</span>
                  </span>
                  <span class="item-titre">{{ el.titre }}</span>
                  <span class="item-meta">
                    <Icone :nom="el.icone" :taille="12" />
                    {{ el.meta }}
                  </span>
                </button>
              </li>
            </ol>

            <p v-else class="vide">Aucun élément en attente. Tout est à jour.</p>

            <div class="bloc-statut">
              <div class="statut">
                <span class="statut-icone" :class="{ 'statut-icone-rouge': !systemeOperationnel }">
                  <Icone :nom="systemeOperationnel ? 'bouclier' : 'alerte'" :taille="16" :epaisseur="2" />
                </span>
                <div>
                  <p class="statut-titre">Statut système</p>
                  <p class="statut-texte">
                    {{ systemeOperationnel ? 'Tous les services sont opérationnels' : 'Certaines données sont indisponibles' }}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <!-- ACTIVITÉ RÉCENTE -->
          <article class="carte carte-section carte-activite rounded-2xl">
            <div class="entete-section">
              <h2 class="titre-section">Activité récente</h2>
              <button
                v-if="activite.length > NB_ACTIVITE"
                type="button"
                class="lien-souligne"
                :aria-expanded="activiteDepliee"
                @click="activiteDepliee = !activiteDepliee"
              >
                {{ activiteDepliee ? 'Réduire' : 'Voir tout' }}
              </button>
            </div>

            <p v-if="!activite.length" class="vide">Aucune activité récente.</p>

            <div v-else class="tableau" role="table" aria-label="Activité récente">
              <div class="ligne ligne-entete" role="row">
                <span class="etiquette" role="columnheader">Événement</span>
                <span class="etiquette col-acteur" role="columnheader">Acteur</span>
                <span class="etiquette aligne-droite" role="columnheader">Heure</span>
              </div>

              <div
                v-for="(ev, index) in activiteAffichee"
                :key="ev.id || `${ev.type}-${index}`"
                class="ligne ligne-donnee"
                :class="{ 'sans-bordure': index === activiteAffichee.length - 1 }"
                role="row"
              >
                <div class="cellule-evenement" role="cell">
                  <p class="evenement-titre">{{ libelleActivite(ev.type) }}</p>
                  <p class="evenement-detail" :class="{ 'texte-rouge opacite-100': typesSensibles.includes(ev.type) }">
                    {{ ev.message || 'Aucun détail disponible' }}
                  </p>
                </div>

                <div class="col-acteur cellule-acteur" role="cell">
                  <img
                    v-if="avatarEvenement(ev)"
                    :src="avatarEvenement(ev)"
                    alt=""
                    class="avatar"
                  />
                  <span v-else class="avatar avatar-initiales" aria-hidden="true">
                    {{ initiales(acteurEvenement(ev)) }}
                  </span>
                  <span class="acteur-nom">{{ acteurEvenement(ev) }}</span>
                </div>

                <time class="heure" :datetime="ev.date" role="cell">{{ formaterHeure(ev.date) }}</time>
              </div>
            </div>
          </article>
        </section>

        <!-- ========================= REVENUS ========================= -->
        <section class="carte carte-revenus rounded-2xl" :class="{ attenue: rafraichissement }">
          <div class="entete-section">
            <h2 class="titre-revenus">Croissance des revenus</h2>
            <div class="legende">
              <span class="legende-item">
                <span class="legende-point" />
                <span class="legende-texte">Revenus (k FCFA)</span>
              </span>
              <span v-if="aObjectif || !points.length" class="legende-item opacite-30">
                <span class="legende-point legende-point-noir" />
                <span class="legende-texte">Objectif</span>
              </span>
            </div>
          </div>

          <div class="graphique">
            <!-- Axe Y -->
            <span
              v-for="(g, i) in echelle.graduations"
              :key="g"
              class="axe-y"
              :style="{ top: `calc(10px + ${(i / 4) * 160}px)` }"
            >
              {{ formaterK(g) }}
            </span>

            <!-- Zone de tracé -->
            <div class="zone-trace">
              <svg class="svg-trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path v-if="cheminAire" :d="cheminAire" fill="rgba(45, 106, 79, 0.05)" />
                <path
                  v-if="cheminObjectif"
                  :d="cheminObjectif"
                  fill="none"
                  stroke="#1A1C1A"
                  stroke-opacity="0.3"
                  stroke-width="1.5"
                  stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                />
                <path
                  v-if="cheminLigne"
                  :d="cheminLigne"
                  fill="none"
                  stroke="#2D6A4F"
                  stroke-width="3"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  vector-effect="non-scaling-stroke"
                />
              </svg>

              <button
                v-for="(p, i) in points"
                :key="i"
                type="button"
                class="point-graphique"
                :class="{ survole: pointSurvole === i }"
                :style="{ left: p.x + '%', top: p.y + '%' }"
                :aria-label="`${p.label} : ${formateurNombre.format(p.valeur)} FCFA`"
                @mouseenter="pointSurvole = i"
                @mouseleave="pointSurvole = null"
                @focus="pointSurvole = i"
                @blur="pointSurvole = null"
              />

              <div
                v-if="pointSurvole !== null && points[pointSurvole]"
                class="infobulle"
                :style="{ left: points[pointSurvole].x + '%', top: points[pointSurvole].y + '%' }"
              >
                <span class="infobulle-jour">{{ points[pointSurvole].label }}</span>
                <span>{{ formateurNombre.format(points[pointSurvole].valeur) }} FCFA</span>
              </div>

              <p v-if="!points.length" class="graphique-vide">
                Historique des revenus indisponible
              </p>
            </div>

            <!-- Axe X -->
            <span
              v-for="e in etiquettesX"
              :key="e.label + e.x"
              class="axe-x"
              :style="{ left: `calc(40px + (100% - 40px) * ${e.x / 100})` }"
            >
              {{ e.label }}
            </span>
          </div>
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Instrument+Serif&family=Inter:wght@400&display=swap');
</style>

<style scoped>
/* ================================================================ */
/* Valeurs reprises telles quelles de la maquette                    */
/* ================================================================ */

.page {
  --encre: #1a1c1a;
  --vert: #2d6a4f;
  --rouge: #991b1b;
  --bordure: #e5e7e2;
  --carte: #fafaf8;
  --gris-clair: #f2f3f0;

  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 40px;
  min-height: 100%;
  background: #fffdf9;
  color: var(--encre);
  font-family: 'DM Sans', system-ui, sans-serif;
}

/* ---------- Typo ---------- */

.entete {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.titre-page {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 48px;
  font-weight: 400;
  line-height: 48px;
}

.sous-titre {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  opacity: 0.6;
}

.etiquette {
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.titre-section {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 36px;
}

.titre-revenus {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 30px;
}

.chiffres {
  font-variant-numeric: tabular-nums;
}

.opacite-30 { opacity: 0.3; }
.opacite-40 { opacity: 0.4; }
.opacite-100 { opacity: 1 !important; }
.texte-vert { color: var(--vert); }
.texte-rouge { color: var(--rouge); }
.texte-blanc { color: #fff; }

/* ---------- Cartes ---------- */

.carte {
  background: var(--carte);
  outline: 1px solid var(--bordure);
  outline-offset: -1px;
}

.carte-verte {
  background: var(--vert);
}

.attenue {
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

/* ---------- KPI ---------- */

.rangee-kpi {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 32px;
  transition: opacity 0.3s ease;
}

.carte-kpi {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
}

.carte-kpi .etiquette {
  line-height: 16px;
  opacity: 0.5;
}

.carte-kpi .etiquette-claire {
  color: #f2f3f0;
  opacity: 0.7;
}

.ligne-valeur {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-height: 40px;
}

.valeur {
  font-size: 36px;
  line-height: 40px;
  font-weight: 400;
}

.variation {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  line-height: 21px;
  letter-spacing: 0.75px;
}

.suffixe {
  font-size: 14px;
  line-height: 21px;
  opacity: 0.4;
}

.suffixe-rouge {
  color: var(--rouge);
  opacity: 0.6;
}

.suffixe-blanc {
  color: #fff;
  opacity: 1;
}

.suffixe-grand {
  font-size: 18px;
  line-height: 27px;
  margin-left: -8px;
}

/* ---------- Rangée principale ---------- */

.rangee-principale {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 40px;
  align-items: start;
  transition: opacity 0.3s ease;
}

.carte-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px;
}

.carte-activite {
  padding-bottom: 86px;
}

.entete-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.lien-souligne {
  padding: 0 0 4px;
  border: 0;
  border-bottom: 1px solid var(--encre);
  background: none;
  color: var(--encre);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  transition: color 0.2s, border-color 0.2s;
}

.lien-souligne:hover {
  color: var(--vert);
  border-color: var(--vert);
}

.lien-rouge {
  color: var(--rouge);
  border-color: var(--rouge);
}

.vide {
  margin: 0;
  font-size: 14px;
  line-height: 21px;
  opacity: 0.5;
}

/* ---------- Timeline À traiter ---------- */

.timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-timeline {
  position: relative;
  padding-bottom: 24px;
  padding-left: 32px;
  border-left: 2px solid var(--bordure);
}

.item-timeline.item-dernier {
  padding-bottom: 0;
}

.item-timeline.item-actif {
  border-left-color: var(--vert);
}

.bouton-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.point {
  position: absolute;
  top: 4px;
  left: -5px;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--bordure);
}

.item-actif .point {
  background: var(--vert);
}

.item-haut {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

.item-temps {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 18px;
  opacity: 0.4;
}

.item-titre {
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bouton-item:hover .item-titre {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.item-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-top: 4px;
  font-size: 12px;
  line-height: 18px;
  opacity: 0.6;
}

/* ---------- Statut système ---------- */

.bloc-statut {
  padding-top: 24px;
  border-top: 1px solid var(--bordure);
}

.statut {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--gris-clair);
}

.statut-icone {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 2px;
  background: var(--vert);
  color: #fff;
}

.statut-icone-rouge {
  background: var(--rouge);
}

.statut-titre {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
}

.statut-texte {
  margin: 0;
  font-size: 14px;
  line-height: 21px;
  opacity: 0.7;
}

/* ---------- Tableau Activité ---------- */

.tableau {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ligne {
  display: grid;
  grid-template-columns: minmax(0, 186fr) minmax(0, 140fr) minmax(0, 140fr);
  align-items: center;
  border-bottom: 1px solid var(--bordure);
}

.ligne-entete {
  padding: 16px 0;
  opacity: 0.4;
}

.ligne-donnee {
  padding: 20px 0;
}

.ligne-donnee.sans-bordure {
  border-bottom: 0;
}

.aligne-droite {
  text-align: right;
}

.cellule-evenement {
  min-width: 0;
  padding-right: 12px;
}

.evenement-titre {
  margin: 0;
  font-size: 14px;
  line-height: 21px;
}

.evenement-detail {
  margin: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.6;
}

.cellule-acteur {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 1px solid var(--bordure);
  border-radius: 9999px;
  object-fit: cover;
}

.avatar-initiales {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gris-clair);
  color: var(--vert);
  font-size: 9px;
  font-weight: 700;
}

.acteur-nom {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heure {
  font-size: 12px;
  line-height: 18px;
  text-align: right;
  opacity: 0.6;
}

/* ---------- Revenus ---------- */

.carte-revenus {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  transition: opacity 0.3s ease;
}

.legende {
  display: flex;
  gap: 16px;
}

.legende-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legende-point {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--vert);
}

.legende-point-noir {
  background: var(--encre);
}

.legende-texte {
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.graphique {
  position: relative;
  height: 200px;
}

.axe-y,
.axe-x {
  position: absolute;
  color: #999;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  line-height: 12px;
}

.axe-y {
  left: 0;
  width: 32px;
  text-align: right;
  transform: translateY(-50%);
}

.axe-x {
  top: 173px;
  transform: translateX(-50%);
}

.zone-trace {
  position: absolute;
  top: 10px;
  left: 40px;
  right: 0;
  height: 160px;
  border-bottom: 1px solid var(--bordure);
}

.svg-trace {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.point-graphique {
  position: absolute;
  width: 10px;
  height: 10px;
  padding: 0;
  border: 2px solid var(--carte);
  border-radius: 9999px;
  background: var(--vert);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease;
}

.point-graphique::before {
  content: '';
  position: absolute;
  inset: -10px;
}

.point-graphique.survole,
.point-graphique:focus-visible {
  transform: translate(-50%, -50%) scale(1.5);
  outline: none;
}

.infobulle {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  background: var(--encre);
  color: #fff;
  font-size: 14px;
  line-height: 21px;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 14px));
}

.infobulle-jour {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.6;
}

.graphique-vide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.5;
}

/* ---------- États ---------- */

.bandeau-erreur {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: -16px;
  padding: 16px 20px;
  background: rgba(153, 27, 27, 0.05);
  outline: 1px solid rgba(153, 27, 27, 0.25);
  outline-offset: -1px;
  color: var(--rouge);
  font-size: 14px;
}

.squelette {
  background: linear-gradient(100deg, #fafaf8 30%, #f2f3f0 50%, #fafaf8 70%);
  background-size: 300% 100%;
  animation: reflet 1.6s ease-in-out infinite;
}

@keyframes reflet {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

button:focus-visible {
  outline: 2px solid var(--vert);
  outline-offset: 2px;
}

/* ---------- Responsive ---------- */

@media (max-width: 1280px) {
  .rangee-kpi {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }
}

@media (max-width: 1024px) {
  .rangee-principale {
    grid-template-columns: 1fr;
  }
  .carte-activite {
    padding-bottom: 32px;
  }
}

@media (max-width: 640px) {
  .page {
    gap: 32px;
    padding: 24px 20px;
  }
  .titre-page {
    font-size: 40px;
    line-height: 40px;
  }
  .rangee-kpi {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .carte-kpi,
  .carte-section,
  .carte-revenus {
    padding: 24px;
  }
  .entete-section {
    flex-wrap: wrap;
  }
  .ligne {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .col-acteur {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .squelette {
    animation: none;
  }
  .attenue,
  .rangee-kpi,
  .rangee-principale,
  .carte-revenus,
  .point-graphique {
    transition: none;
  }
}
</style>