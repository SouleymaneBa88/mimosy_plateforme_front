// Micro de Mimo : états visibles, autorisation, annulation, libération des pistes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

// Écoute pilotée par le test : on décide quand la parole se termine et ce qui a été dit.
const ecoute = { finir: null, annule: false, onEtape: null }
vi.mock('@/utils/mediaEntretien', () => ({
  enregistrementDisponible: () => true,
  reconnaissanceDisponible: () => false,
  creerEcoute: ({ onEtape }) => {
    ecoute.onEtape = onEtape
    return {
      erreur: '',
      ecouter: () => new Promise((resolve) => { ecoute.finir = resolve }),
      arreter: () => ecoute.finir?.('texte terminé'),
      annuler: () => {
        ecoute.annule = true
        ecoute.finir?.('')
      },
    }
  },
}))
// Mesure du signal pilotée par le test.
const mesure = { emettre: null, arreter: vi.fn() }
vi.mock('@/utils/niveauMicro', () => ({
  NB_BANDES: 4,
  SEUIL_PAROLE: 0.08,
  suivreNiveauMicro: (_flux, onMesure) => {
    mesure.emettre = onMesure
    return mesure.arreter
  },
}))

import { useMicroMimo } from '@/composables/useMicroMimo'

const piste = { stop: vi.fn() }
const flux = { getTracks: () => [piste], getAudioTracks: () => [piste] }

function monterMicro(options = {}) {
  let micro
  const onTexte = vi.fn()
  mount(defineComponent({
    setup() {
      micro = useMicroMimo({ langue: () => ({ code: 'fr', dictee_navigateur: true }), transcrire: vi.fn(), onTexte, ...options })
      return () => h('div')
    },
  }))
  return { micro, onTexte }
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(ecoute, { finir: null, annule: false, onEtape: null })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve(flux)) },
  })
})

afterEach(() => vi.useRealTimers())

describe('useMicroMimo', () => {
  it('passe par autorisation, attente, parole, transcription puis envoie le texte', async () => {
    const { micro, onTexte } = monterMicro()
    expect(micro.etat.value).toBe('inactif')

    const fin = micro.demarrer()
    expect(micro.etat.value).toBe('autorisation')
    await flushPromises()
    expect(micro.etat.value).toBe('attente')
    expect(micro.actif.value).toBe(true)

    mesure.emettre({ niveau: 0.4, bandes: [0.5, 0.6, 0.2, 0.1] })
    expect(micro.etat.value).toBe('parole')
    expect(micro.bandes.value).toEqual([0.5, 0.6, 0.2, 0.1])

    ecoute.onEtape('transcription')
    expect(micro.etat.value).toBe('transcription')
    micro.terminer()
    await fin

    expect(onTexte).toHaveBeenCalledWith('texte terminé')
    expect(micro.etat.value).toBe('envoye')
    // Le micro n'est plus actif et ses pistes sont libérées.
    expect(micro.actif.value).toBe(false)
    expect(piste.stop).toHaveBeenCalled()
    expect(micro.bandes.value).toEqual([0, 0, 0, 0])
  })

  it('revient en attente quand la personne se tait', async () => {
    let instant = 0
    const { micro } = monterMicro({ maintenant: () => instant })
    micro.demarrer()
    await flushPromises()

    mesure.emettre({ niveau: 0.5, bandes: [1, 1, 1, 1] })
    expect(micro.etat.value).toBe('parole')
    instant = 1000
    mesure.emettre({ niveau: 0.01, bandes: [0, 0, 0, 0] })
    expect(micro.etat.value).toBe('attente')
  })

  it('autorisation refusée : erreur expliquée, rien n’est capté', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('refus'), { name: 'NotAllowedError' }))
    const { micro, onTexte } = monterMicro()

    await micro.demarrer()

    expect(micro.etat.value).toBe('erreur')
    expect(micro.erreur.value).toContain('refusé')
    expect(micro.actif.value).toBe(false)
    expect(onTexte).not.toHaveBeenCalled()
  })

  it('aucun micro détecté : message utile', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('absent'), { name: 'NotFoundError' }))
    const { micro } = monterMicro()

    await micro.demarrer()

    expect(micro.erreur.value).toContain('Aucun micro')
  })

  it('annuler : rien n’est envoyé, le micro est coupé et libéré', async () => {
    const { micro, onTexte } = monterMicro()
    const fin = micro.demarrer()
    await flushPromises()

    micro.annuler()
    await fin

    expect(ecoute.annule).toBe(true)
    expect(onTexte).not.toHaveBeenCalled()
    expect(micro.etat.value).toBe('inactif')
    expect(piste.stop).toHaveBeenCalled()
    expect(mesure.arreter).toHaveBeenCalled()
  })

  it('rien entendu : erreur explicite au lieu d’un envoi vide', async () => {
    const { micro, onTexte } = monterMicro()
    const fin = micro.demarrer()
    await flushPromises()

    ecoute.finir('')
    await fin

    expect(onTexte).not.toHaveBeenCalled()
    expect(micro.etat.value).toBe('erreur')
    expect(micro.erreur.value).toContain('rien entendu')
  })

  it('conversation vocale : le flux est gardé entre deux prises de parole', async () => {
    const { micro } = monterMicro({ garderFlux: () => true })
    const fin = micro.demarrer()
    await flushPromises()
    micro.terminer()
    await fin

    expect(piste.stop).not.toHaveBeenCalled()
    micro.fermer()
    expect(piste.stop).toHaveBeenCalled()
  })
})
