// Langue de communication avec Aby et Fassa (fr, en, wo) : choix, changement, entretien.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/services/parcoursService', () => ({
  getAssistant: vi.fn(),
  repondreAssistant: vi.fn(),
  definirLangue: vi.fn(),
  recupererVoix: vi.fn(),
  transcrireAudio: vi.fn(),
  demarrerEntretien: vi.fn(),
  commencerEntretien: vi.fn(),
  repondreEntretien: vi.fn(),
  terminerEntretien: vi.fn(),
}))

import * as parcoursService from '@/services/parcoursService'
import AssistantProfil from '../AssistantProfil.vue'
import EntretienIA from '../EntretienIA.vue'

const LANGUES = [
  { code: 'fr', libelle: 'Français', bcp47: 'fr-FR', dictee_navigateur: true, voix_navigateur: true },
  { code: 'en', libelle: 'English', bcp47: 'en-US', dictee_navigateur: true, voix_navigateur: true },
  { code: 'wo', libelle: 'Wolof (Sénégal)', bcp47: 'wo-SN', dictee_navigateur: false, voix_navigateur: false },
]
const RESUME = { metier: '', domaine: null, services: [], experience: null, zone_intervention: '', disponibilites: '', description: '' }
const QUESTION_LANGUE = {
  champ: 'langue',
  texte: 'Comment souhaitez-vous communiquer avec moi ? · How would you like to talk with me?',
  pourquoi: '',
  type: 'texte_ou_choix',
  options: LANGUES.map((l) => ({ id: l.code, libelle: l.libelle })),
}

function etatAssistant(autres = {}) {
  return {
    conversation: [{ role: 'assistant', texte: QUESTION_LANGUE.texte, champ: 'langue' }],
    question: QUESTION_LANGUE,
    resume: RESUME,
    compte: {},
    termine: false,
    langue: null,
    langues: LANGUES,
    questions: {},
    options: { domaine: [], services: [] },
    ...autres,
  }
}

const ETAT_WOLOF = etatAssistant({
  conversation: [{ role: 'assistant', texte: 'Lan mooy seen métier?', champ: 'metier', langue: 'wo' }],
  question: { champ: 'metier', texte: 'Lan mooy seen métier?', pourquoi: '', type: 'texte', options: [] },
  langue: LANGUES[2],
})

const fausseVoix = () => ({ parler: vi.fn().mockResolvedValue(), taire: vi.fn() })
const fausseEcoute = () => ({ disponible: true, ecouter: vi.fn().mockResolvedValue(''), arreter: vi.fn() })
const monterAssistant = () => mount(AssistantProfil, { props: { dependances: { voix: fausseVoix(), ecoute: fausseEcoute() } } })

beforeEach(() => vi.clearAllMocks())

describe('Aby : français par défaut, autre langue sur demande', () => {
  it('commence en français, sans question de langue ; le sélecteur reste disponible', async () => {
    parcoursService.getAssistant.mockResolvedValue(
      etatAssistant({
        conversation: [
          { role: 'assistant', texte: "Bonjour, je m'appelle Aby." },
          { role: 'assistant', texte: 'Quel est votre métier ?', champ: 'metier' },
        ],
        question: { champ: 'metier', texte: 'Quel est votre métier ?', pourquoi: '', type: 'texte', options: [] },
        langue: LANGUES[0],
      }),
    )
    const wrapper = monterAssistant()
    await flushPromises()

    expect(wrapper.text()).toContain('Quel est votre métier ?')
    expect(wrapper.find('[data-test="suggestions"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="langue"]').element.value).toBe('fr')
    expect(wrapper.find('[data-test="note-langue"]').exists()).toBe(false)
  })

  it('« Parle-moi en wolof » : la réponse d’Aby passe en wolof', async () => {
    parcoursService.getAssistant.mockResolvedValue(
      etatAssistant({
        conversation: [{ role: 'assistant', texte: 'Quel est votre métier ?', champ: 'metier' }],
        question: { champ: 'metier', texte: 'Quel est votre métier ?', pourquoi: '', type: 'texte', options: [] },
        langue: LANGUES[0],
      }),
    )
    parcoursService.repondreAssistant.mockResolvedValue(ETAT_WOLOF)
    const wrapper = monterAssistant()
    await flushPromises()

    await wrapper.find('[data-test="reponse-texte"]').setValue('Parle-moi en wolof')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(parcoursService.repondreAssistant).toHaveBeenCalledWith('metier', 'Parle-moi en wolof')
    expect(wrapper.text()).toContain('Lan mooy seen métier?')
    expect(wrapper.find('[data-test="langue"]').element.value).toBe('wo')
    expect(wrapper.find('[data-test="note-langue"]').text()).toContain('enregistrées en français')
  })

  it('changement de langue depuis l’en-tête', async () => {
    parcoursService.getAssistant.mockResolvedValue(ETAT_WOLOF)
    parcoursService.definirLangue.mockResolvedValue(
      etatAssistant({
        conversation: [{ role: 'assistant', texte: 'Quel est votre métier ?', champ: 'metier' }],
        question: { champ: 'metier', texte: 'Quel est votre métier ?', pourquoi: '', type: 'texte', options: [] },
        langue: LANGUES[0],
      }),
    )
    const wrapper = monterAssistant()
    await flushPromises()

    await wrapper.find('[data-test="langue"]').setValue('fr')
    await flushPromises()

    expect(parcoursService.definirLangue).toHaveBeenCalledWith('fr')
    expect(wrapper.text()).toContain('Quel est votre métier ?')
    expect(wrapper.find('[data-test="note-langue"]').exists()).toBe(false)
  })
})

describe('Fassa : langue de l’entretien', () => {
  it('rappelle la langue choisie avec Aby et permet de la changer avant de commencer', async () => {
    parcoursService.definirLangue.mockResolvedValue({ langue: LANGUES[1] })
    const wrapper = mount(EntretienIA, {
      props: { compatible: true, langue: LANGUES[2], langues: LANGUES, dependances: { voix: fausseVoix(), ecoute: fausseEcoute() } },
    })

    const choix = wrapper.find('[data-test="langue-entretien"] select')
    expect(choix.element.value).toBe('wo')
    expect(wrapper.find('[data-test="langue-entretien"]').text()).toContain('rédigé en français')

    await choix.setValue('en')
    await flushPromises()

    expect(parcoursService.definirLangue).toHaveBeenCalledWith('en')
    expect(wrapper.emitted('langue-modifiee')[0]).toEqual([LANGUES[1]])
  })
})
