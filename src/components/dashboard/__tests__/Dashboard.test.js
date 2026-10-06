import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ClipboardList } from 'lucide-vue-next'

import ActiviteTimeline from '../ActiviteTimeline.vue'
import KpiCard from '../KpiCard.vue'
import MStatusBadge from '@/components/ui/MStatusBadge.vue'

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
const monter = (composant, props) => mount(composant, { props, global: { plugins: [router] } })

describe('KpiCard', () => {
  it("n'affiche aucune évolution sans donnée de comparaison", () => {
    const wrapper = monter(KpiCard, { label: 'Demandes', value: 12 })
    expect(wrapper.text()).toContain('12')
    expect(wrapper.find('.kpi__tendance').exists()).toBe(false)
  })

  it('calcule le pourcentage sur deux périodes réelles', () => {
    const wrapper = monter(KpiCard, { label: 'Demandes', value: 12, evolution: { actuel: 6, precedent: 4 } })
    expect(wrapper.text()).toContain('+50 %')
    expect(wrapper.find('.kpi__pastille--positif').exists()).toBe(true)
  })

  it("ne fabrique jamais de pourcentage depuis zéro", () => {
    const wrapper = monter(KpiCard, { label: 'Demandes', value: 3, evolution: { actuel: 3, precedent: 0 } })
    expect(wrapper.text()).toContain('+3')
    expect(wrapper.text()).not.toContain('%')
  })

  it('une hausse de litiges est signalée comme défavorable', () => {
    const wrapper = monter(KpiCard, { label: 'Litiges', value: 5, evolution: { actuel: 4, precedent: 2 }, baisseFavorable: true })
    expect(wrapper.find('.kpi__pastille--negatif').exists()).toBe(true)
  })

  it('aucune activité : état neutre explicite', () => {
    const wrapper = monter(KpiCard, { label: 'Paiements', value: 0, evolution: { actuel: 0, precedent: 0 } })
    expect(wrapper.text()).toContain('Aucune activité sur les 30 derniers jours')
  })
})

describe('ActiviteTimeline', () => {
  const types = { NOUVELLE_DEMANDE: { libelle: 'Nouvelle demande', icone: ClipboardList, ton: 'info', categorie: 'prestations' } }

  it("regroupe par jour et affiche l'état vide", () => {
    const maintenant = new Date().toISOString()
    const avantHier = new Date(Date.now() - 3 * 86400000).toISOString()
    const wrapper = monter(ActiviteTimeline, {
      types,
      items: [
        { type: 'NOUVELLE_DEMANDE', message: 'Demande de Awa', date: maintenant },
        { type: 'NOUVELLE_DEMANDE', message: 'Demande de Moussa', date: avantHier },
      ],
    })
    expect(wrapper.text()).toContain("Aujourd'hui")
    expect(wrapper.findAll('h3')).toHaveLength(2)
    expect(wrapper.text()).toContain('Demande de Moussa')

    const vide = monter(ActiviteTimeline, { types, items: [], messageVide: 'Rien à signaler.' })
    expect(vide.text()).toContain('Rien à signaler.')
  })
})

describe('MStatusBadge', () => {
  it('porte toujours un libellé lisible et une icône', () => {
    const wrapper = monter(MStatusBadge, { status: 'EN_ATTENTE' })
    expect(wrapper.text()).toBe('En attente')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(monter(MStatusBadge, { status: 'LITIGE' }).text()).toBe('En litige')
  })
})
