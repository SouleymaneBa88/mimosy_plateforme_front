// Parcours client Mimo : accueil → Mimo → question → photo → pré-diagnostic →
// recherche MIMOSY → profil → demande pré-remplie (envoyée seulement par le client).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/diagnosisService', () => ({
  converserAvecMimo: vi.fn(),
  diagnostiquer: vi.fn(),
  recupererVoixMimo: vi.fn(),
  transcrireAudioMimo: vi.fn(),
  confirmerActionMimo: vi.fn(() => Promise.resolve({ statut: 'CONFIRMEE' })),
}))
vi.mock('@/services/demandePrestationService', () => ({
  createRequest: vi.fn(),
  listRequests: vi.fn(() => Promise.resolve([])),
  retirerPieceJointe: vi.fn(() => Promise.resolve(null)),
  recupererApercuPieceJointe: vi.fn(() => Promise.resolve('blob:photo')),
}))
vi.mock('@/services/catalogueService', () => ({
  searchOffers: vi.fn(() => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  searchIntelligente: vi.fn(() => Promise.resolve({ results: [], pagination: { count: 0 }, interpretation: null })),
  fetchSearchPage: vi.fn(),
  listCategories: vi.fn(() => Promise.resolve([])),
  listServices: vi.fn(() => Promise.resolve([])),
  listProviders: vi.fn(() => Promise.resolve([])),
  getProvider: vi.fn(),
}))
// La mise en page et la carte ne sont pas l'objet de ces tests, mais le layout
// doit inclure le lanceur flottant Mimo pour couvrir le parcours réel.
vi.mock('@/components/layout/ClientLayout.vue', () => ({
  default: {
    template: `
      <div>
        <slot />
        <button data-testid="mimo-launcher" type="button" @click="open = !open">Mimo</button>
        <div v-if="open" data-testid="mimo-panel">Mimo panel</div>
      </div>
    `,
    mounted() {
      window.addEventListener('mimo:ouvrir', this.ouvrir)
    },
    beforeUnmount() {
      window.removeEventListener('mimo:ouvrir', this.ouvrir)
    },
    data() {
      return { open: false }
    },
    methods: {
      ouvrir() {
        this.open = true
      },
    },
  },
}))
vi.mock('@/components/client/ProvidersMap.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/layout/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/composables/useEvenementTempsReel', () => ({ useEvenementTempsReel: vi.fn() }))

import * as diagnosisService from '@/services/diagnosisService'
import * as demandeService from '@/services/demandePrestationService'
import * as catalogueService from '@/services/catalogueService'
import HomeClient from '@/views/client/HomeClient.vue'
import Diagnostic from '@/views/client/Diagnostic.vue'
import Prestataires from '@/views/client/Prestataires.vue'
import PrestataireProfil from '@/views/client/PrestataireProfil.vue'
import PiecesJointesDemande from '@/components/demandes/PiecesJointesDemande.vue'
import DemandesPrestataire from '@/views/prestataire/Demandes.vue'
import { useMimoStore } from '@/stores/mimo'

const AVERTISSEMENT =
  "Ce diagnostic aide seulement à identifier le type de professionnel à contacter. Il ne constitue pas un diagnostic technique définitif : seul un professionnel qualifié peut évaluer précisément la situation."

function reponseMimo(champs = {}) {
  return {
    status: 'identifie',
    criticite: 'Normale',
    domaine: 'Électricité',
    service_recommande: 'Dépannage électrique',
    warnings: [AVERTISSEMENT],
    requires_human_review: true,
    etape: 'question',
    message: '',
    pre_diagnostic: '',
    resume_besoin: 'Une prise électrique ne fonctionne plus.',
    recherche: { categorie: 'Électricité', service: 'Dépannage électrique', q: '' },
    session_id: 'session-mimo-1',
    action: { id: 'action-mimo-1', statut: 'PRETE_A_CONFIRMER' },
    pieces_jointes: [],
    ...champs,
  }
}

const PHOTO = { id: 'pj-1', nom: 'prise.jpg', url: '/api/pieces-jointes-demande/pj-1/fichier/' }

function creerRouter() {
  const vide = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/client', name: 'client-home', component: vide },
      { path: '/client/diagnostic', name: 'client-diagnostic', component: vide },
      { path: '/client/prestataires', name: 'client-prestataires', component: vide },
      { path: '/client/prestataires/:id', name: 'client.prestataire', component: vide },
    ],
  })
}

async function monter(composant, router, chemin = '/client') {
  await router.push(chemin)
  // Les modales sont téléportées dans <body> : rendues sur place pour les tests.
  const wrapper = mount(composant, { global: { plugins: [router], stubs: { teleport: true } }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

// Simule une conversation Mimo complète (question, photo, pré-diagnostic).
async function converserJusquAuPreDiagnostic(wrapper) {
  diagnosisService.converserAvecMimo
    .mockResolvedValueOnce(reponseMimo({ etape: 'question', message: 'Est-ce une seule prise ou plusieurs ?' }))
    .mockResolvedValueOnce(reponseMimo({ etape: 'photo', message: 'Pouvez-vous envoyer une photo de la prise ?' }))
    .mockResolvedValueOnce(
      reponseMimo({
        etape: 'pre_diagnostic',
        pre_diagnostic: 'Le problème pourrait être lié à la prise. Un professionnel confirmera sur place.',
        message: 'Le problème pourrait être lié à la prise. Un professionnel confirmera sur place.',
        pieces_jointes: [PHOTO],
      }),
    )

  await wrapper.get('[data-testid="mimo-saisie"]').setValue('Ma prise électrique ne fonctionne plus.')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.text()).toContain('Est-ce une seule prise ou plusieurs ?')

  await wrapper.get('[data-testid="mimo-saisie"]').setValue('Une seule.')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.find('[data-testid="mimo-bouton-photo"]').exists()).toBe(true)

  const fichier = new File(['jpeg'], 'prise.jpg', { type: 'image/jpeg' })
  const champ = wrapper.get('[data-testid="mimo-champ-photo"]')
  Object.defineProperty(champ.element, 'files', { value: [fichier], configurable: true })
  await champ.trigger('change')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  return fichier
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  setActivePinia(createPinia())
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:apercu')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('Accueil client', () => {
  it('conserve la recherche classique et le lanceur Mimo', async () => {
    const router = creerRouter()
    const wrapper = await monter(HomeClient, router)

    expect(wrapper.find('input, [type="search"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="mimo-launcher"]').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('client-home')
  })

  it('affiche un lanceur Mimo flottant qui ouvre le panneau latéral', async () => {
    const router = creerRouter()
    const wrapper = await monter(HomeClient, router)

    const launcher = wrapper.get('[data-testid="mimo-launcher"]')
    expect(launcher.text()).toContain('Mimo')

    await launcher.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="mimo-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Mimo')
  })
})

describe('Conversation Mimo (/client/diagnostic)', () => {
  it('interrompt immédiatement la voix serveur quand le client active le micro', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponseMimo({
      message: 'D’accord, explique-moi ce qui se passe.',
      message_id: 'parole-mimo-1',
    }))
    diagnosisService.recupererVoixMimo.mockResolvedValueOnce('blob:mimo-audio')
    const pause = vi.fn()
    vi.stubGlobal('Audio', class {
      constructor(src) { this.src = src }
      play() { return Promise.resolve() }
      pause() { pause() }
    })
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('J’ai un problème avec mon robinet.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(diagnosisService.recupererVoixMimo).toHaveBeenCalledWith('parole-mimo-1')
    await wrapper.get('[aria-label="Parler à Mimo"]').trigger('click')
    expect(pause).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('reprend la session serveur et accepte un nouveau tour après la synthèse', async () => {
    diagnosisService.converserAvecMimo
      .mockResolvedValueOnce(reponseMimo({ etape: 'pre_diagnostic', session_id: 'session-reprise', langue: 'en' }))
      .mockResolvedValueOnce(reponseMimo({ etape: 'question', message: 'Since when?', session_id: 'session-reprise', langue: 'en' }))
    const store = useMimoStore()

    await store.envoyer('Mon robinet fuit.')
    await store.envoyer('La fuite continue quand il est fermé.')

    expect(diagnosisService.converserAvecMimo).toHaveBeenCalledTimes(2)
    expect(diagnosisService.converserAvecMimo.mock.calls[1][0].sessionId).toBe('session-reprise')
    expect(JSON.parse(sessionStorage.getItem('mimosy_mimo')).sessionId).toBe('session-reprise')
    expect(store.langueCommunication).toBe('en')
    expect(JSON.parse(sessionStorage.getItem('mimosy_mimo')).langueCommunication).toBe('en')
  })

  it('message → question → photo → pré-diagnostic prudent → recherche MIMOSY', async () => {
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')

    const fichier = await converserJusquAuPreDiagnostic(wrapper)

    // L'historique envoyé est la conversation précédente ; la photo part avec le 3e message.
    const appels = diagnosisService.converserAvecMimo.mock.calls
    expect(appels).toHaveLength(3)
    expect(appels[0][0]).toMatchObject({ message: 'Ma prise électrique ne fonctionne plus.', historique: [] })
    expect(appels[1][0].historique).toEqual([
      { role: 'client', texte: 'Ma prise électrique ne fonctionne plus.' },
      { role: 'mimo', texte: 'Est-ce une seule prise ou plusieurs ?' },
    ])
    expect(appels[2][0].photo).toBe(fichier)

    // Mimo n'envoie jamais de demande lui-même.
    expect(demandeService.createRequest).not.toHaveBeenCalled()

    const pre = wrapper.get('[data-testid="mimo-pre-diagnostic"]')
    expect(pre.text()).toContain('Pré-diagnostic')
    expect(pre.text()).toContain('pourrait être lié')
    expect(pre.text()).toContain('diagnostic technique définitif')
    expect(wrapper.get('[data-testid="mimo-orientation"]').text()).toBe('Électricité')
    // La conversation reste ouverte après la synthèse.
    expect(wrapper.find('[data-testid="mimo-saisie"]').exists()).toBe(true)

    const bouton = wrapper.get('[data-testid="mimo-voir-prestataires"]')
    expect(bouton.text()).toBe('Oui, chercher un professionnel')
    expect(wrapper.text().toLowerCase()).not.toContain('meilleur')
    await bouton.trigger('click')
    await flushPromises()
    expect(diagnosisService.confirmerActionMimo).toHaveBeenCalledWith('session-mimo-1', 'action-mimo-1')
    expect(router.currentRoute.value.name).toBe('client-prestataires')
    expect(router.currentRoute.value.query).toEqual({
      categorie: 'Électricité',
      service: 'Dépannage électrique',
      source: 'mimo',
      mimo: '1',
    })
  })

  it('pré-diagnostic immédiat : le client peut encore ajouter une photo pour le professionnel', async () => {
    diagnosisService.converserAvecMimo
      .mockResolvedValueOnce(reponseMimo({ etape: 'pre_diagnostic', pre_diagnostic: 'Cela pourrait être lié à la prise.', message: 'Cela pourrait être lié à la prise.' }))
      .mockResolvedValueOnce(reponseMimo({ etape: 'pre_diagnostic', pre_diagnostic: 'Cela pourrait être lié à la prise.', message: 'Cela pourrait être lié à la prise.', pieces_jointes: [PHOTO] }))
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Ma prise grésille quand je branche le frigo.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="mimo-ajouter-photo"]').exists()).toBe(true)
    const fichier = new File(['jpeg'], 'prise.jpg', { type: 'image/jpeg' })
    const champ = wrapper.get('[data-testid="mimo-champ-photo"]')
    Object.defineProperty(champ.element, 'files', { value: [fichier], configurable: true })
    await champ.trigger('change')
    await flushPromises()

    expect(diagnosisService.converserAvecMimo).toHaveBeenCalledTimes(2)
    expect(diagnosisService.converserAvecMimo.mock.calls[1][0].photo).toBe(fichier)
    expect(wrapper.text()).toContain('1 photo pourra être jointe à votre demande.')
    expect(demandeService.createRequest).not.toHaveBeenCalled()
  })

  it('envoie une courte vidéo au backend dans la même conversation', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponseMimo({
      etape: 'pre_diagnostic',
      media: { type: 'video', analyse_effectuee: true, audio_analyse: false },
      analyse_media: 'Le ventilateur tourne avec une vibration visible.',
      pre_diagnostic: 'La panne pourrait venir du moteur.',
      message: 'La panne pourrait venir du moteur.',
    }))
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Mon ventilateur vibre.')
    const fichier = new File(['video'], 'ventilateur.webm', { type: 'video/webm' })
    const champ = wrapper.get('[data-testid="mimo-champ-photo"]')
    Object.defineProperty(champ.element, 'files', { value: [fichier], configurable: true })
    await champ.trigger('change')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(diagnosisService.converserAvecMimo.mock.calls[0][0].photo).toBe(fichier)
    expect(wrapper.text()).toContain('Le ventilateur tourne avec une vibration visible.')
    expect(wrapper.text()).toContain('ventilateur.webm')
  })

  it('affiche uniquement les fourchettes tarifaires réellement fournies par le backend', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponseMimo({
      etape: 'pre_diagnostic',
      tarifs: [{ unite: 'prestation', minimum_fcfa: '12000.00', maximum_fcfa: '18000.00', nb_offres: 2 }],
      pre_diagnostic: 'Le problème pourrait venir du joint.',
    }))
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Mon robinet fuit.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="mimo-tarifs"]').text()).toContain('12 000 à 18 000 FCFA / prestation')
    expect(wrapper.get('[data-testid="mimo-tarifs"]').text()).toContain('2 offres')
  })

  it('refuse une photo dans un format non accepté sans appeler le serveur', async () => {
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')
    const champ = wrapper.get('[data-testid="mimo-champ-photo"]')
    Object.defineProperty(champ.element, 'files', {
      value: [new File(['gif'], 'x.gif', { type: 'image/gif' })],
      configurable: true,
    })
    await champ.trigger('change')

    expect(wrapper.text()).toContain('Formats acceptés')
    expect(diagnosisService.converserAvecMimo).not.toHaveBeenCalled()
  })

  it('affiche l’erreur du serveur et permet de renvoyer le message', async () => {
    diagnosisService.converserAvecMimo.mockRejectedValueOnce(new Error('Service momentanément indisponible.'))
    const router = creerRouter()
    const wrapper = await monter(Diagnostic, router, '/client/diagnostic')

    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Fuite sous l’évier')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Service momentanément indisponible.')
    expect(wrapper.findAll('[data-testid="mimo-message-client"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="mimo-saisie"]').element.value).toBe('Fuite sous l’évier')
  })
})

describe('Résultats : la recherche MIMOSY existante', () => {
  it('transmet catégorie et service à /api/recherche/ et rappelle l’orientation', async () => {
    const router = creerRouter()
    const diagnostic = await monter(Diagnostic, router, '/client/diagnostic')
    await converserJusquAuPreDiagnostic(diagnostic)
    diagnostic.unmount()

    const wrapper = await monter(
      Prestataires,
      router,
      '/client/prestataires?categorie=%C3%89lectricit%C3%A9&service=D%C3%A9pannage%20%C3%A9lectrique&source=mimo',
    )

    expect(catalogueService.searchOffers).toHaveBeenCalledWith(
      expect.objectContaining({ categorie: 'Électricité', service: 'Dépannage électrique' }),
    )
    expect(catalogueService.searchIntelligente).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="orientation-mimo"]').text()).toContain('Dépannage électrique')
    expect(wrapper.text()).toContain('Prestataires correspondant à votre besoin')
    expect(wrapper.text()).toContain('Mimo ne choisit aucun prestataire')
    expect(wrapper.text().toLowerCase()).not.toContain('meilleur')
  })

  it('sans orientation, le texte passe par la recherche intelligente existante', async () => {
    const router = creerRouter()
    await monter(Prestataires, router, '/client/prestataires?q=un%20souci%20bizarre&source=mimo')

    expect(catalogueService.searchIntelligente).toHaveBeenCalledWith('un souci bizarre', null)
  })
})

describe('Profil prestataire : demande pré-remplie par Mimo', () => {
  const PRESTATAIRE = {
    id: 'presta-1',
    user_first_name: 'Moussa',
    user_last_name: 'Diop',
    services: [
      { id: 'o1', disponible: true, service: { id: 's-plomb', nom: 'Réparation fuite', categorie: { id: 'c2', nom: 'Plomberie' } } },
      { id: 'o2', disponible: true, service: { id: 's-elec', nom: 'Dépannage électrique', categorie: { id: 'c1', nom: 'Électricité' } } },
    ],
  }

  async function profilApresMimo() {
    const router = creerRouter()
    const diagnostic = await monter(Diagnostic, router, '/client/diagnostic')
    await converserJusquAuPreDiagnostic(diagnostic)
    diagnostic.unmount()

    catalogueService.getProvider.mockResolvedValue(PRESTATAIRE)
    const wrapper = await monter(PrestataireProfil, router, '/client/prestataires/presta-1')
    const bouton = wrapper.findAll('button').find((b) => b.text().includes('Demander une prestation'))
    await bouton.trigger('click')
    await flushPromises()
    return wrapper
  }

  it('reprend service, description et photo ; le client modifie puis envoie lui-même', async () => {
    const wrapper = await profilApresMimo()

    expect(wrapper.find('[data-testid="demande-preremplie-mimo"]').exists()).toBe(true)
    const modale = wrapper.get('[aria-labelledby="titre-prestation"]')
    expect(modale.get('select').element.value).toBe('s-elec')
    const description = modale.get('textarea')
    expect(description.element.value).toContain('Une prise électrique ne fonctionne plus.')
    expect(description.element.value).toContain('Pré-diagnostic Mimo (à confirmer par le professionnel)')
    expect(wrapper.get('[data-testid="demande-photos-mimo"]').text()).toContain('prise.jpg')

    // Rien n'est envoyé tant que le client n'a pas cliqué sur « Envoyer la demande ».
    expect(demandeService.createRequest).not.toHaveBeenCalled()

    await description.setValue('Une seule prise de la cuisine ne marche plus.')
    await modale.get('input[type="datetime-local"]').setValue('2026-10-20T10:00')
    await modale.get('input[type="number"]').setValue('15000')
    demandeService.createRequest.mockResolvedValue({ id: 'd1', pieces_jointes: [PHOTO] })
    await modale.get('form').trigger('submit')
    await flushPromises()

    expect(demandeService.createRequest).toHaveBeenCalledTimes(1)
    expect(demandeService.createRequest.mock.calls[0][0]).toMatchObject({
      prestataire: 'presta-1',
      service: 's-elec',
      description: 'Une seule prise de la cuisine ne marche plus.',
      pieces_jointes: ['pj-1'],
    })
    // La photo appartient maintenant à la demande : elle n'est pas supprimée.
    expect(demandeService.retirerPieceJointe).not.toHaveBeenCalled()
    expect(useMimoStore().resultat).toBeNull()
  })

  it('une photo retirée avant l’envoi n’est pas jointe, puis est supprimée', async () => {
    const wrapper = await profilApresMimo()
    const modale = wrapper.get('[aria-labelledby="titre-prestation"]')

    await wrapper.get('[data-testid="demande-photos-mimo"] button').trigger('click')
    await modale.get('input[type="datetime-local"]').setValue('2026-10-20T10:00')
    await modale.get('input[type="number"]').setValue('15000')
    demandeService.createRequest.mockResolvedValue({ id: 'd1', pieces_jointes: [] })
    await modale.get('form').trigger('submit')
    await flushPromises()

    expect(demandeService.createRequest.mock.calls[0][0].pieces_jointes).toBeUndefined()
    expect(demandeService.createRequest.mock.calls[0][0].description).toContain(
      'Pré-diagnostic Mimo (à confirmer par le professionnel) : Le problème pourrait être lié à la prise.',
    )
    expect(demandeService.retirerPieceJointe).toHaveBeenCalledWith('pj-1')
  })
})

describe('Suivi : photos de la demande', () => {
  it('charge chaque photo par l’URL protégée, jamais une URL média publique', async () => {
    const wrapper = mount(PiecesJointesDemande, { props: { pieces: [PHOTO] } })
    await flushPromises()

    expect(demandeService.recupererApercuPieceJointe).toHaveBeenCalledWith('pj-1')
    expect(wrapper.get('img').attributes('src')).toBe('blob:photo')
    expect(wrapper.text()).toContain('Photos du client (1)')
  })
})

describe('Côté prestataire : la demande reçue', () => {
  it('affiche la description, le pré-diagnostic Mimo et la photo du client', async () => {
    demandeService.listRequests.mockResolvedValue([
      {
        id: 'd1',
        statut: 'EN_ATTENTE',
        client_nom: 'Awa Ndiaye',
        service_nom: 'Dépannage électrique',
        budget: '15000',
        date_souhaitee: '2026-10-20T10:00:00Z',
        date_creation: '2026-10-07T10:00:00Z',
        description:
          'Une prise électrique ne fonctionne plus.\n\nPré-diagnostic Mimo (à confirmer par le professionnel) : Le problème pourrait être lié à la prise.',
        pieces_jointes: [PHOTO],
      },
    ])
    const router = creerRouter()
    const wrapper = await monter(DemandesPrestataire, router, '/client')
    // Le prestataire ouvre la demande (bouton « Voir »).
    await wrapper.findAll('button').find((b) => b.text().trim() === 'Voir').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Une prise électrique ne fonctionne plus.')
    expect(wrapper.text()).toContain('Pré-diagnostic Mimo (à confirmer par le professionnel)')
    expect(wrapper.get('[data-testid="pieces-jointes-demande"]').text()).toContain('Photos du client (1)')
    expect(demandeService.recupererApercuPieceJointe).toHaveBeenCalledWith('pj-1')
  })
})
