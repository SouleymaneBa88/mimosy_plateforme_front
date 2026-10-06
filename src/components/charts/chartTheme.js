/**
 * Thème Chart.js commun aux tableaux de bord MIMOSY.
 *
 * - Enregistre une seule fois les éléments Chart.js utilisés (tree-shaking).
 * - Palette catégorielle validée (lisibilité, daltonisme, contraste sur
 *   la surface #FAFAF8) : l'ordre des couleurs fait partie de la validation,
 *   on attribue toujours les séries dans cet ordre, jamais en boucle.
 * - Couleurs de statut réservées aux états (validé / en attente / rejeté),
 *   toujours accompagnées d'un libellé.
 */
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

Chart.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

// Couleurs des séries, dans l'ordre d'attribution.
export const SERIES = ['#1F8A5B', '#3567A8', '#C8682A', '#7A4FB0', '#9A7200']

// Couleurs d'état (tokens --mimosy-success / warning / danger / info / neutral).
export const STATUTS = {
  succes: '#2D6A4F',
  attente: '#B7791F',
  danger: '#A4443A',
  info: '#2F5F66',
  neutre: '#A3ABA6',
}

const ENCRE = '#1C2420'
const ENCRE_DOUCE = '#4F5A54'
const GRILLE = '#ECEEE9'
const SURFACE = '#FAFAF8'

const reduireMouvement =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

Chart.defaults.font.family = "'DM Sans', ui-sans-serif, system-ui, sans-serif"
Chart.defaults.font.size = 12
Chart.defaults.color = ENCRE_DOUCE
Chart.defaults.animation = reduireMouvement ? false : { duration: 500, easing: 'easeOutCubic' }

const nombre = new Intl.NumberFormat('fr-FR')

export function formaterNombre(valeur) {
  return valeur === null || valeur === undefined ? '—' : nombre.format(valeur)
}

export function formaterMontant(valeur, devise = 'FCFA') {
  return valeur === null || valeur === undefined ? '—' : `${nombre.format(Math.round(valeur))} ${devise}`
}

// Montant compact pour les axes : 12 500 → « 12,5 k ».
export function formaterCompact(valeur) {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(valeur)
}

// « 2026-10-01 » → « oct. 26 ».
export function libelleMois(iso) {
  const [annee, mois] = String(iso).split('-').map(Number)
  if (!annee || !mois) return iso
  const texte = new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'short' })
  return `${texte} ${String(annee).slice(2)}`
}

// Vrai si au moins une valeur est non nulle : sinon la page affiche un état vide.
export function aDesValeurs(...series) {
  return series.some((serie) => Array.isArray(serie) && serie.some((v) => v !== null && v !== undefined && v !== 0))
}

// Options de base partagées par les graphiques cartésiens (ligne, barres).
export function optionsCartesiennes({ empile = false, formatY = formaterNombre, entiers = true } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 4 } },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 16, color: ENCRE },
      },
      tooltip: {
        backgroundColor: ENCRE,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { weight: '600' },
        callbacks: {
          label: (contexte) => ` ${contexte.dataset.label} : ${formatY(contexte.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        stacked: empile,
        grid: { display: false },
        border: { color: GRILLE },
        ticks: { maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        stacked: empile,
        beginAtZero: true,
        grid: { color: GRILLE },
        border: { display: false },
        ticks: { precision: entiers ? 0 : undefined, callback: (v) => formatY(v), maxTicksLimit: 5 },
      },
    },
  }
}

// Jeu de données « ligne » : trait fin, points visibles au survol uniquement.
export function serieLigne(label, data, couleur, { remplir = false } = {}) {
  return {
    label,
    data,
    borderColor: couleur,
    backgroundColor: remplir ? `${couleur}14` : couleur,
    fill: remplir ? 'origin' : false,
    borderWidth: 2,
    tension: 0.3,
    pointRadius: data.length <= 1 ? 4 : 0,
    pointHoverRadius: 5,
    pointHitRadius: 12,
    pointBackgroundColor: couleur,
    pointBorderColor: SURFACE,
    pointBorderWidth: 2,
    spanGaps: true,
  }
}

// Jeu de données « barres » : extrémités arrondies, espace de 2px entre barres.
export function serieBarres(label, data, couleur, { empile = false } = {}) {
  return {
    label,
    data,
    backgroundColor: couleur,
    hoverBackgroundColor: couleur,
    borderColor: SURFACE,
    borderWidth: empile ? { top: 2 } : 0,
    borderRadius: 4,
    borderSkipped: 'start',
    maxBarThickness: 28,
    categoryPercentage: 0.7,
    barPercentage: 0.9,
  }
}

// Options d'un anneau (répartition) : la légende vit dans la page (liste chiffrée).
export function optionsAnneau() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ENCRE,
        padding: 10,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          label: (contexte) => {
            const total = contexte.dataset.data.reduce((somme, v) => somme + v, 0)
            const part = total ? Math.round((contexte.parsed / total) * 100) : 0
            return ` ${contexte.label} : ${formaterNombre(contexte.parsed)} (${part} %)`
          },
        },
      },
    },
  }
}

export function serieAnneau(data, couleurs) {
  return {
    data,
    backgroundColor: couleurs,
    hoverBackgroundColor: couleurs,
    borderColor: SURFACE,
    borderWidth: 2,
    hoverOffset: 4,
  }
}
