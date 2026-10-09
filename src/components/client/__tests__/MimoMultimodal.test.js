// Conversation multimodale avec Mimo : aperçus, médias dans le fil, états, erreurs.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/diagnosisService', () => ({
  converserAvecMimo: vi.fn(),
  recupererVoixMimo: vi.fn(),
  recupererMediaMimo: vi.fn(),
  transcrireAudioMimo: vi.fn(),
  confirmerActionMimo: vi.fn(),
}))
vi.mock('@/services/demandePrestationService', () => ({ retirerPieceJointe: vi.fn(() => Promise.resolve(null)) }))

import * as diagnosisService from '@/services/diagnosisService'
import MimoAssistant from '@/components/client/MimoAssistant.vue'
import { useMimoStore } from '@/stores/mimo'

function reponse(champs = {}) {
  return {
    etape: 'question', message: 'Où se trouve la fuite ?', langue: 'fr', session_id: 'session-1',
    message_id: `parole-${Math.random()}`, pieces_jointes: [], warnings: [], tarifs: [], ...champs,
  }
}

async function monter() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
  await router.push('/')
  const wrapper = mount(MimoAssistant, { global: { plugins: [router], stubs: { teleport: true } }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

async function choisirFichier(wrapper, fichier) {
  const champ = wrapper.get('[data-testid="mimo-champ-photo"]')
  Object.defineProperty(champ.element, 'files', { value: [fichier], configurable: true })
  await champ.trigger('change')
}

let compteurBlob = 0
beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  setActivePinia(createPinia())
  compteurBlob = 0
  globalThis.URL.createObjectURL = vi.fn(() => `blob:local-${++compteurBlob}`)
  globalThis.URL.revokeObjectURL = vi.fn()
  diagnosisService.recupererVoixMimo.mockRejectedValue(Object.assign(new Error('x'), { status: 503, code: 'quota', retryAfter: 3600 }))
})

describe('Photos', () => {
  it('aperçu avant l’envoi, miniature dans le message, toujours visible après la réponse', async () => {
    let terminer
    diagnosisService.converserAvecMimo.mockReturnValueOnce(new Promise((ok) => { terminer = ok }))
    const wrapper = await monter()

    await choisirFichier(wrapper, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    expect(wrapper.get('[data-testid="mimo-apercu-image"]').attributes('src')).toBe('blob:local-1')

    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Voici la fuite.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    // Pendant l'analyse : la photo est déjà dans la conversation, avec son état.
    const message = wrapper.get('[data-testid="mimo-message-client"]')
    expect(message.find('img').exists()).toBe(true)
    expect(message.get('[data-testid="mimo-media-analyse"]').text()).toContain('Analyse de la photo')
    expect(wrapper.get('[data-testid="mimo-etat"]').attributes('data-etat')).toBe('analyse')

    terminer(reponse({
      media: { id: 'media-1', type: 'image', analyse_effectuee: true, url: '/api/pieces-jointes-demande/p1/fichier/' },
      pieces_jointes: [{ id: 'p1', nom: 'robinet.jpg', url: '/api/pieces-jointes-demande/p1/fichier/' }],
    }))
    await flushPromises()

    const apres = wrapper.get('[data-testid="mimo-message-client"]')
    expect(apres.find('img').exists()).toBe(true)
    expect(apres.get('[data-testid="mimo-media-analyse"]').text()).toBe('Photo analysée par Mimo')
    expect(wrapper.text()).toContain('Où se trouve la fuite ?')
    expect(wrapper.find('[data-testid="mimo-apercu"]').exists()).toBe(false)
  })

  it('analyse impossible : la photo reste visible et le client est informé', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({
      media: { id: 'media-1', type: 'image', analyse_effectuee: false, url: '/api/pieces-jointes-demande/p1/fichier/' },
    }))
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const message = wrapper.get('[data-testid="mimo-message-client"]')
    expect(message.find('img').exists()).toBe(true)
    expect(message.text()).toContain('n’a pas pu analyser ce média')
  })

  it('ouvre la photo en grand puis la referme avec Échap', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({ media: { id: 'm', type: 'image', analyse_effectuee: true, url: '/x/' } }))
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('[data-testid="mimo-media-image"]').trigger('click')
    expect(wrapper.find('[data-testid="mimo-visionneuse"]').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="mimo-visionneuse"]').exists()).toBe(false)
  })

  it('après un rechargement, la photo est rechargée par son URL protégée', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({
      media: { id: 'media-1', type: 'image', analyse_effectuee: true, url: '/api/pieces-jointes-demande/p1/fichier/' },
    }))
    const premier = await monter()
    await choisirFichier(premier, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    await premier.get('form').trigger('submit')
    await flushPromises()
    premier.unmount()

    // Nouvel onglet rechargé : le store relit sessionStorage (sans le blob local).
    setActivePinia(createPinia())
    diagnosisService.recupererMediaMimo.mockResolvedValueOnce('blob:serveur')
    const recharge = await monter()

    expect(diagnosisService.recupererMediaMimo).toHaveBeenCalledWith('/api/pieces-jointes-demande/p1/fichier/')
    expect(recharge.get('[data-testid="mimo-message-client"] img').attributes('src')).toBe('blob:serveur')
    expect(JSON.parse(sessionStorage.getItem('mimosy_mimo')).messages[0].media.apercu).toBeUndefined()
  })
})

describe('Vidéos', () => {
  it('aperçu lisible avant l’envoi, lecteur dans la conversation, analyse annoncée honnêtement', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({
      media: {
        id: 'media-v', type: 'video', analyse_effectuee: true, images_analysees: 3, audio_analyse: false,
        url: '/api/diagnostic/mimo/medias/media-v/fichier/',
      },
    }))
    const wrapper = await monter()

    await choisirFichier(wrapper, new File(['mp4'], 'fuite.mp4', { type: 'video/mp4' }))
    const apercu = wrapper.get('[data-testid="mimo-apercu-video"]')
    expect(apercu.attributes('src')).toBe('blob:local-1')
    expect(apercu.attributes('controls')).toBeDefined()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(diagnosisService.converserAvecMimo.mock.calls[0][0].photo.name).toBe('fuite.mp4')
    const video = wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]')
    expect(video.attributes('controls')).toBeDefined()
    expect(video.attributes('playsinline')).toBeDefined()
    expect(wrapper.get('[data-testid="mimo-media-analyse"]').text()).toBe('3 images de la vidéo analysées (son non analysé)')
  })

  it('refuse une vidéo trop lourde avant tout envoi', async () => {
    const wrapper = await monter()
    const lourde = new File(['x'], 'longue.mp4', { type: 'video/mp4' })
    Object.defineProperty(lourde, 'size', { value: 11 * 1024 * 1024 })

    await choisirFichier(wrapper, lourde)

    expect(wrapper.text()).toContain('dépasse 10 Mo')
    expect(wrapper.find('[data-testid="mimo-apercu"]').exists()).toBe(false)
  })
})

describe('Échecs d’envoi', () => {
  it('erreur serveur : le média reste prêt à être renvoyé, message clair sans détail technique', async () => {
    diagnosisService.converserAvecMimo.mockRejectedValueOnce(Object.assign(new Error('La requête a échoué (500).'), { status: 500, data: null }))
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="mimo-message-client"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="mimo-apercu-image"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Mimo n’a pas pu traiter votre média')
    expect(wrapper.text()).not.toContain('500')

    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({ media: { id: 'm', type: 'image', analyse_effectuee: true, url: '/x/' } }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="mimo-message-client"]')).toHaveLength(1)
  })

  it('une ancienne erreur de fichier ne masque pas une nouvelle erreur d’envoi', async () => {
    diagnosisService.converserAvecMimo.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const wrapper = await monter()
    const lourde = new File(['x'], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(lourde, 'size', { value: 6 * 1024 * 1024 })
    await choisirFichier(wrapper, lourde)
    expect(wrapper.text()).toContain('dépasse 5 Mo')

    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Bonjour')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('dépasse 5 Mo')
    expect(wrapper.text()).toContain('Vérifiez votre connexion Internet')
  })

  it('erreur réseau : explique quoi faire', async () => {
    diagnosisService.converserAvecMimo.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const wrapper = await monter()
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Bonjour')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Vérifiez votre connexion Internet')
  })

  it('refus métier du serveur (format) : le message du serveur est affiché tel quel', async () => {
    diagnosisService.converserAvecMimo.mockRejectedValueOnce(Object.assign(
      new Error('Ce fichier n’est pas une image valide.'), { status: 400, data: { photo: 'Ce fichier n’est pas une image valide.' } },
    ))
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['x'], 'faux.jpg', { type: 'image/jpeg' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Ce fichier n’est pas une image valide.')
  })
})

describe('Voix et micro dans la conversation', () => {
  it('voix indisponible : le texte reste lisible, un message discret et un bouton Réécouter', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({ message_id: 'parole-1' }))
    const wrapper = await monter()
    await wrapper.get('[data-testid="mimo-saisie"]').setValue('Bonjour')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(diagnosisService.recupererVoixMimo).toHaveBeenCalledWith('parole-1')
    expect(wrapper.get('[data-testid="mimo-voix-indisponible"]').text()).toContain('la réponse reste lisible')
    expect(wrapper.get('[data-testid="mimo-etat"]').attributes('data-etat')).toBe('disponible')

    diagnosisService.recupererVoixMimo.mockClear()
    await wrapper.get('[data-testid="mimo-reecouter"]').trigger('click')
    await flushPromises()
    expect(diagnosisService.recupererVoixMimo).toHaveBeenCalledWith('parole-1')
  })

  it('micro indisponible dans ce navigateur : message utile, l’écrit reste possible', async () => {
    const wrapper = await monter()

    await wrapper.get('[aria-label="Parler à Mimo"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="mimo-micro-erreur"]').text()).toContain('Écrivez votre message')
    expect(wrapper.find('[data-testid="mimo-micro"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mimo-saisie"]').attributes('disabled')).toBeUndefined()
  })

  it('le store garde l’état d’analyse du média le temps de la réponse', async () => {
    let terminer
    diagnosisService.converserAvecMimo.mockReturnValueOnce(new Promise((ok) => { terminer = ok }))
    const wrapper = await monter()
    const mimo = useMimoStore()
    await choisirFichier(wrapper, new File(['jpeg'], 'robinet.jpg', { type: 'image/jpeg' }))
    await wrapper.get('form').trigger('submit')

    expect(mimo.analyseMediaEnCours).toBe(true)
    terminer(reponse({ media: { id: 'm', type: 'image', analyse_effectuee: true, url: '/x/' } }))
    await flushPromises()
    expect(mimo.analyseMediaEnCours).toBe(false)
  })
})

describe('Formats vidéo non lus par le navigateur (HEVC)', () => {
  it('aperçu illisible : explication au lieu d’un lecteur noir, envoi toujours possible', async () => {
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['hevc'], 'IMG_0042.MOV', { type: 'video/quicktime' }))

    await wrapper.get('[data-testid="mimo-apercu-video"]').trigger('error')

    expect(wrapper.get('[data-testid="mimo-apercu-video-illisible"]').text()).toContain('convertie à l’envoi')
    expect(wrapper.get('[data-testid="mimo-envoyer"]').attributes('disabled')).toBeUndefined()
  })

  it('erreur de l’aperçu local pendant l’envoi : attend la copie convertie, puis la lit', async () => {
    let terminer
    diagnosisService.converserAvecMimo.mockReturnValueOnce(new Promise((ok) => { terminer = ok }))
    diagnosisService.recupererMediaMimo.mockResolvedValueOnce('blob:serveur-h264')
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['hevc'], 'IMG_0042.MOV', { type: 'video/quicktime' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]').trigger('error')
    expect(wrapper.get('[data-testid="mimo-media-video-conversion"]').text()).toContain('Conversion')
    expect(wrapper.find('[data-testid="mimo-media-video-illisible"]').exists()).toBe(false)

    terminer(reponse({ media: { id: 'mv', type: 'video', analyse_effectuee: true, images_analysees: 2, url: '/api/diagnostic/mimo/medias/mv/fichier/' } }))
    await flushPromises()

    expect(wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]').attributes('src')).toBe('blob:serveur-h264')
  })

  it('dans la conversation, une vidéo locale illisible bascule sur la copie convertie du serveur', async () => {
    diagnosisService.converserAvecMimo.mockResolvedValueOnce(reponse({
      media: { id: 'mv', type: 'video', analyse_effectuee: true, images_analysees: 2, url: '/api/diagnostic/mimo/medias/mv/fichier/' },
    }))
    diagnosisService.recupererMediaMimo.mockResolvedValueOnce('blob:serveur-h264')
    const wrapper = await monter()
    await choisirFichier(wrapper, new File(['hevc'], 'IMG_0042.MOV', { type: 'video/quicktime' }))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]').trigger('error')
    await flushPromises()

    expect(diagnosisService.recupererMediaMimo).toHaveBeenCalledWith('/api/diagnostic/mimo/medias/mv/fichier/')
    expect(wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]').attributes('src')).toBe('blob:serveur-h264')

    // Même la copie du serveur illisible : message clair, jamais un lecteur noir muet.
    await wrapper.get('[data-testid="mimo-message-client"] [data-testid="mimo-media-video"]').trigger('error')
    expect(wrapper.get('[data-testid="mimo-media-video-illisible"]').text()).toContain('ne peut pas lire ce format')
  })
})
