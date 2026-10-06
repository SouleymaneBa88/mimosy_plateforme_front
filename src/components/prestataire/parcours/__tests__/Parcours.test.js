// Parcours « Vérifier mon profil professionnel » : page, assistant, documents, entretien.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/parcoursService', () => ({
  getParcours: vi.fn(),
  getAssistant: vi.fn(),
  commencerEntretien: vi.fn(),
  recupererVoix: vi.fn(),
  transcrireAudio: vi.fn(),
  repondreAssistant: vi.fn(),
  calculerCoherence: vi.fn(),
  soumettreDossier: vi.fn(),
  demarrerEntretien: vi.fn(),
  repondreEntretien: vi.fn(),
  terminerEntretien: vi.fn(),
}))
vi.mock('@/services/verificationService', () => ({ soumettreDocument: vi.fn() }))
// La mise en page (barre latérale, temps réel) n'est pas l'objet de ces tests.
vi.mock('@/components/layout/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))

import * as parcoursService from '@/services/parcoursService'
import * as verificationService from '@/services/verificationService'
import Parcours from '@/views/prestataire/Parcours.vue'
import AssistantProfil from '../AssistantProfil.vue'
import EtapeDocument from '../EtapeDocument.vue'
import EntretienIA from '../EntretienIA.vue'

const CLES = ['profil', 'identite', 'competences', 'coherence', 'entretien', 'validation']

function etat({ statut = 'PROFIL_A_COMPLETER', faites = 0, ...autres } = {}) {
  return {
    statut,
    etapes: CLES.map((cle, i) => ({
      cle,
      libelle: cle,
      titre: `Titre ${cle}`,
      pourquoi: `Pourquoi ${cle}`,
      duree: '1 minute',
      numero: i + 1,
      etat: i < faites ? 'termine' : i === faites ? 'en_cours' : 'a_faire',
    })),
    etape_courante: CLES[Math.min(faites, 5)],
    numero_etape: Math.min(faites, 5) + 1,
    nombre_etapes: 6,
    pourcentage: Math.round((faites * 100) / 6),
    documents_en_analyse: false,
    peut_soumettre: false,
    motif_decision: '',
    documents: { identite: null, justificatif: null },
    coherence: null,
    entretien_disponible: false,
    ...autres,
  }
}

const ETAT_ASSISTANT = {
  conversation: [
    { role: 'assistant', texte: 'Bonjour, bienvenue sur MIMOSY.' },
    { role: 'assistant', texte: 'Quel est votre métier ?', champ: 'metier' },
  ],
  question: { champ: 'metier', texte: 'Quel est votre métier ?', pourquoi: 'Les clients le verront.', type: 'texte', options: [] },
  resume: { metier: '', domaine: null, services: [], experience: null, zone_intervention: '', disponibilites: '', description: '' },
  compte: { nom: 'Awa Ndiaye', email: 'awa@test.sn', telephone: '771111111' },
  termine: false,
  questions: { metier: { texte: 'Quel est votre métier ?', type: 'texte' } },
  options: { domaine: [], services: [] },
}

function fausseVoix() {
  return { parler: vi.fn().mockResolvedValue(), taire: vi.fn() }
}
function fausseEcoute(texte = 'Je suis électricien depuis 7 ans') {
  return {
    disponible: true,
    ecouter: vi.fn((onPartiel) => {
      onPartiel(texte)
      return Promise.resolve(texte)
    }),
    arreter: vi.fn(),
  }
}
const monterAssistant = (dependances = { voix: fausseVoix(), ecoute: fausseEcoute() }) =>
  mount(AssistantProfil, { props: { dependances } })

async function monterPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/prestataire/parcours', name: 'prestataire-parcours', component: Parcours },
      { path: '/prestataire/services', name: 'prestataire-services', component: { template: '<div />' } },
    ],
  })
  router.push('/prestataire/parcours')
  await router.isReady()
  const wrapper = mount(Parcours, {
    global: { plugins: [router], stubs: { ClientHeader: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  parcoursService.getAssistant.mockResolvedValue(ETAT_ASSISTANT)
})

describe('page du parcours', () => {
  it('affiche la progression et l’étape en cours', async () => {
    parcoursService.getParcours.mockResolvedValue(etat({ statut: 'DOCUMENTS_A_FOURNIR', faites: 2 }))

    const wrapper = await monterPage()

    expect(wrapper.find('[data-test="numero-etape"]').text()).toBe('Étape 3 sur 6')
    expect(wrapper.text()).toContain('Pourquoi competences')
    expect(wrapper.find('[data-test="etape-profil"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="etape-entretien"]').attributes('disabled')).toBeDefined()
  })

  it('reprise après interruption : « Bienvenue à nouveau » et pourcentage', async () => {
    parcoursService.getParcours.mockResolvedValue(etat({ statut: 'ENTRETIEN_A_FAIRE', faites: 4 }))

    const wrapper = await monterPage()

    expect(wrapper.find('[data-test="reprise"]').text()).toContain('Votre parcours est à 67 %')
  })

  it('calcule la cohérence automatiquement quand les documents sont analysés', async () => {
    parcoursService.getParcours.mockResolvedValue(etat({ statut: 'COHERENCE_A_VERIFIER', faites: 3 }))
    parcoursService.calculerCoherence.mockResolvedValue(
      etat({
        statut: 'ENTRETIEN_A_FAIRE',
        faites: 3,
        coherence: {
          incoherences: [],
          points_a_verifier: ['Justificatif à lire par un administrateur.'],
          resume: '',
          conclusion_justificatif: { etat: 'VERIFICATION_NECESSAIRE', profil: 'Plombier', domaine: 'Plomberie', justificatif: 'Électricité', message: 'Les informations semblent nécessiter une vérification humaine.' },
        },
      }),
    )

    const wrapper = await monterPage()

    expect(parcoursService.calculerCoherence).toHaveBeenCalled()
    expect(wrapper.find('[data-test="coherence"]').text()).toContain('Vérification nécessaire')
    expect(wrapper.text()).toContain('Électricité')
    expect(wrapper.text()).toContain('ne constitue pas une décision')
  })

  it('dossier renvoyé « À vérifier » : motif affiché', async () => {
    parcoursService.getParcours.mockResolvedValue(
      etat({ statut: 'A_VERIFIER', faites: 2, motif_decision: 'Le justificatif est illisible.' }),
    )

    const wrapper = await monterPage()

    expect(wrapper.find('[data-test="a-verifier"]').text()).toContain('Le justificatif est illisible.')
  })

  it('dossier en revue, puis validé', async () => {
    parcoursService.getParcours.mockResolvedValue(etat({ statut: 'DOSSIER_EN_REVUE', faites: 5 }))
    let wrapper = await monterPage()
    expect(wrapper.find('[data-test="validation"]').text()).toContain('Dossier en revue')

    parcoursService.getParcours.mockResolvedValue(etat({ statut: 'VALIDE', faites: 6 }))
    wrapper = await monterPage()
    expect(wrapper.find('[data-test="valide"]').exists()).toBe(true)
  })
})

describe('assistant de profil', () => {
  it('pose une question à la fois avec sa raison, et transmet la réponse', async () => {
    parcoursService.repondreAssistant.mockResolvedValue({
      ...ETAT_ASSISTANT,
      question: { champ: 'experience', texte: "Depuis combien d'années ?", pourquoi: 'Pour rassurer.', type: 'nombre', options: [] },
    })
    const wrapper = monterAssistant()
    await flushPromises()

    expect(wrapper.text()).toContain('Quel est votre métier ?')
    expect(wrapper.text()).toContain('Pourquoi cette question ? Les clients le verront.')
    await wrapper.find('[data-test="reponse-texte"]').setValue('Électricien')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(parcoursService.repondreAssistant).toHaveBeenCalledWith('metier', 'Électricien')
    // La nouvelle question arrive dans la conversation ; sa raison s'affiche sous la saisie.
    expect(wrapper.text()).toContain('Pourquoi cette question ? Pour rassurer.')
  })

  it('affiche l’explication du backend quand une réponse est refusée', async () => {
    parcoursService.repondreAssistant.mockRejectedValue(
      Object.assign(new Error('x'), { data: { champ: 'metier', detail: 'Indiquez votre métier en quelques mots.' } }),
    )
    const wrapper = monterAssistant()
    await flushPromises()

    await wrapper.find('[data-test="reponse-texte"]').setValue('x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="erreur-assistant"]').text()).toBe('Indiquez votre métier en quelques mots.')
  })
})

describe('assistant de profil : voix et conversation', () => {
  it('Aby, assistante IA, lit la question à voix haute avec la voix du serveur', async () => {
    const voix = fausseVoix()
    const wrapper = monterAssistant({ voix, ecoute: fausseEcoute() })
    await flushPromises()

    expect(wrapper.find('[data-test="nom-agent"]').text()).toBe('Aby · Assistante IA de MIMOSY')

    expect(voix.parler).toHaveBeenCalledWith({
      texte: 'Quel est votre métier ?',
      source: { source: 'assistant', index: 1 },
    })
  })

  it('répondre à la voix : la transcription remplit la réponse, à relire avant envoi', async () => {
    const original = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [], getAudioTracks: () => [] }) },
      configurable: true,
    })
    const wrapper = monterAssistant()
    await flushPromises()

    await wrapper.find('[data-test="micro"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="reponse-texte"]').element.value).toBe('Je suis électricien depuis 7 ans')
    expect(parcoursService.repondreAssistant).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true })
  })

  it('suggestions du catalogue cliquables pour le domaine', async () => {
    parcoursService.getAssistant.mockResolvedValue({
      ...ETAT_ASSISTANT,
      question: { champ: 'domaine', texte: 'Dans quel domaine ?', type: 'texte_ou_choix', options: [{ id: 'c1', libelle: 'Électricité' }] },
    })
    parcoursService.repondreAssistant.mockResolvedValue(ETAT_ASSISTANT)
    const wrapper = monterAssistant()
    await flushPromises()

    await wrapper.find('[data-test="suggestions"] button').trigger('click')

    expect(parcoursService.repondreAssistant).toHaveBeenCalledWith('domaine', 'c1')
  })

  it('les informations du compte sont affichées comme déjà connues', async () => {
    const wrapper = monterAssistant()
    await flushPromises()

    expect(wrapper.find('[data-test="compte"]').text()).toContain('awa@test.sn')
    expect(wrapper.find('[data-test="compte"]').text()).toContain('771111111')
  })
})

describe('documents', () => {
  function choisir(wrapper, fichier) {
    const champ = wrapper.find('[data-test="champ-fichier"]')
    Object.defineProperty(champ.element, 'files', { value: [fichier], configurable: true })
    return champ.trigger('change')
  }

  it('refuse un mauvais format ou un fichier trop volumineux avant l’envoi', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:apercu')
    const wrapper = mount(EtapeDocument, { props: { sorte: 'identite' } })

    await choisir(wrapper, new File(['%PDF'], 'cni.pdf', { type: 'application/pdf' }))
    expect(wrapper.find('[data-test="erreur-document"]').text()).toContain('JPEG ou PNG')

    const gros = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'cni.png', { type: 'image/png' })
    await choisir(wrapper, gros)
    expect(wrapper.find('[data-test="erreur-document"]').text()).toContain('5 Mo')
    expect(verificationService.soumettreDocument).not.toHaveBeenCalled()
  })

  it('aperçu, retrait avant envoi, puis envoi', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:apercu')
    globalThis.URL.revokeObjectURL = vi.fn()
    verificationService.soumettreDocument.mockResolvedValue({})
    const wrapper = mount(EtapeDocument, { props: { sorte: 'justificatif' } })

    await choisir(wrapper, new File(['%PDF'], 'diplome.pdf', { type: 'application/pdf' }))
    expect(wrapper.find('[data-test="fichier-choisi"]').text()).toContain('diplome.pdf')
    await wrapper.find('[data-test="retirer-document"]').trigger('click')
    expect(wrapper.find('[data-test="fichier-choisi"]').exists()).toBe(false)

    await choisir(wrapper, new File(['img'], 'certif.png', { type: 'image/png' }))
    await wrapper.find('[data-test="envoyer-document"]').trigger('click')
    await flushPromises()

    expect(verificationService.soumettreDocument).toHaveBeenCalledWith(expect.any(File), 'DIPLOME')
    expect(wrapper.emitted('envoye')).toBeTruthy()
  })
})

describe('entretien professionnel avec Fassa', () => {
  const ecouteFactice = { disponible: true, ecouter: vi.fn(), arreter: vi.fn() }

  it('Fassa se présente comme une IA ; test caméra/micro puis consentement J’accepte / Annuler', async () => {
    const enregistreur = { ouvrir: vi.fn().mockResolvedValue(null), demarrer: vi.fn(), arreter: vi.fn(), fermer: vi.fn() }
    parcoursService.demarrerEntretien.mockClear()
    const wrapper = mount(EntretienIA, {
      props: { compatible: true, dependances: { enregistreur, ecoute: ecouteFactice, voix: { parler: vi.fn(), taire: vi.fn() } } },
    })

    expect(wrapper.find('[data-test="titre-entretien"]').text()).toBe('Entretien professionnel — 5:00')
    expect(wrapper.text()).toContain('Fassa')
    expect(wrapper.text()).toContain('pas une personne')
    const commencer = () => wrapper.find('[data-test="commencer"]')
    expect(commencer().attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="tester-materiel"]').trigger('click')
    await flushPromises()
    expect(commencer().attributes('disabled')).toBeUndefined()

    // Commencer ouvre la demande de consentement ; rien ne démarre avant « J'accepte ».
    await commencer().trigger('click')
    expect(wrapper.find('[data-test="consentement"]').text()).toContain(
      "Cet entretien sera enregistré afin de permettre à l'équipe MIMOSY de vérifier votre dossier professionnel.",
    )
    await wrapper.find('[data-test="annuler"]').trigger('click')
    expect(wrapper.find('[data-test="consentement"]').exists()).toBe(false)
    expect(parcoursService.demarrerEntretien).not.toHaveBeenCalled()
    expect(enregistreur.demarrer).not.toHaveBeenCalled()
  })

  it('appel en cours : assistant, chronomètre, voix ou écrit, numéro de question', async () => {
    const enregistreur = { ouvrir: vi.fn().mockResolvedValue(null), demarrer: vi.fn(), arreter: vi.fn(), fermer: vi.fn(), flux: null }
    parcoursService.demarrerEntretien.mockResolvedValue({
      id: 'e1', question_numero: 1, nombre_questions: 6, duree_max_secondes: 300,
      agent: { code: 'fassa', nom: 'Fassa', role: 'Assistante IA de vérification professionnelle', est_ia: true },
      segments: [{ index: 0, texte: 'Bonjour.' }, { index: 1, texte: 'Présentez votre activité ?' }],
    })
    parcoursService.commencerEntretien.mockResolvedValue({})
    parcoursService.repondreEntretien.mockResolvedValue({ action: 'question', question_numero: 2, segments: [{ index: 3, texte: 'Question 2 ?' }] })
    const wrapper = mount(EntretienIA, {
      props: { compatible: true, dependances: { enregistreur, ecoute: ecouteFactice, voix: { parler: vi.fn().mockResolvedValue(), taire: vi.fn() } } },
    })
    await wrapper.find('[data-test="tester-materiel"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="commencer"]').trigger('click')
    await wrapper.find('[data-test="accepter"]').trigger('click')
    await flushPromises()

    expect(parcoursService.demarrerEntretien).toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-test="appel"]').text()).toContain('Fassa')
    expect(wrapper.find('[data-test="appel"]').text()).toContain('Entretien IA')
    expect(wrapper.find('[data-test="chrono"]').text()).toBe('Temps restant : 05:00')
    expect(wrapper.find('[data-test="texte-ia"]').text()).toContain('Présentez votre activité ?')
    expect(wrapper.find('[data-test="numero-question"]').text()).toBe('Question 1 sur 6')
    expect(wrapper.find('[data-test="repondre-voix"]').exists()).toBe(true)

    await wrapper.find('[data-test="mode-ecrit"]').trigger('click')
    await wrapper.find('[data-test="reponse-ecrite"]').setValue('Je suis électricien.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(parcoursService.repondreEntretien).toHaveBeenCalledWith('e1', 1, 'Je suis électricien.', 'TEXTE')
    expect(wrapper.find('[data-test="numero-question"]').text()).toBe('Question 2 sur 6')
    // Transcription : Fassa puis « Vous », avec le mode de réponse.
    const echanges = wrapper.findAll('[data-test="echange"]').map((e) => e.text())
    expect(echanges[0]).toContain('Fassa')
    expect(echanges).toContainEqual(expect.stringContaining('Vous · par écrit'))
    expect(echanges.at(-1)).toContain('Question 2 ?')
  })

  it('voix de Fassa indisponible : bandeau visible avec « Réécouter », la phrase reste affichée', async () => {
    const enregistreur = { ouvrir: vi.fn().mockResolvedValue(null), demarrer: vi.fn(), arreter: vi.fn(), fermer: vi.fn(), flux: null }
    parcoursService.demarrerEntretien.mockResolvedValue({
      id: 'e1', question_numero: 1, nombre_questions: 6, duree_max_secondes: 300,
      agent: { code: 'fassa', nom: 'Fassa', role: 'Assistante IA de vérification professionnelle', est_ia: true },
      segments: [{ index: 0, texte: 'Dalal ak jamm.' }, { index: 1, texte: 'Laaj bu jëkk ?' }],
    })
    parcoursService.commencerEntretien.mockResolvedValue({})
    const voix = {
      parler: vi.fn()
        .mockResolvedValueOnce({ statut: 'serveur' })
        .mockResolvedValueOnce({ statut: 'indisponible', raison: 'quota' })
        .mockResolvedValue({ statut: 'serveur' }),
      taire: vi.fn(),
    }
    const wrapper = mount(EntretienIA, { props: { compatible: true, dependances: { enregistreur, ecoute: ecouteFactice, voix } } })
    await wrapper.find('[data-test="tester-materiel"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="commencer"]').trigger('click')
    await wrapper.find('[data-test="accepter"]').trigger('click')
    await flushPromises()

    const bandeau = wrapper.find('[data-test="voix-indisponible"]')
    expect(bandeau.exists()).toBe(true)
    expect(bandeau.text()).toContain('La voix de Fassa est momentanément indisponible')
    expect(wrapper.find('[data-test="texte-ia"]').text()).toContain('Laaj bu jëkk ?')

    await wrapper.find('[data-test="reecouter"]').trigger('click')
    await flushPromises()

    expect(voix.parler).toHaveBeenLastCalledWith({ texte: 'Laaj bu jëkk ?', source: { source: 'entretien', entretien: 'e1', index: 1 } })
    expect(wrapper.find('[data-test="voix-indisponible"]').exists()).toBe(false)
  })

  it('navigateur incompatible : message clair, pas de démarrage possible', () => {
    const wrapper = mount(EntretienIA, { props: { compatible: false } })

    expect(wrapper.find('[data-test="incompatible"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="commencer"]').exists()).toBe(false)
  })

  it('caméra/micro refusés : message explicite', async () => {
    const enregistreur = { ouvrir: vi.fn().mockRejectedValue(new Error('NotAllowedError')), fermer: vi.fn(), arreter: vi.fn() }
    const wrapper = mount(EntretienIA, { props: { compatible: true, dependances: { enregistreur, ecoute: ecouteFactice } } })

    await wrapper.find('[data-test="tester-materiel"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain("Impossible d'accéder à votre caméra ou à votre micro")
  })
})
