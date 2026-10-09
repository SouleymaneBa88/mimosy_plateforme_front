// Voix de Mimo : une seule lecture, jamais de silence muet, relecture possible.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/diagnosisService', () => ({ recupererVoixMimo: vi.fn() }))

import { recupererVoixMimo } from '@/services/diagnosisService'
import { useVoixMimoStore } from '@/stores/voixMimo'

// Faux lecteur audio : enregistre chaque lecture et permet de la terminer.
const lectures = []
class FauxAudio {
  constructor(src) {
    this.src = src
    this.paused = false
    lectures.push(this)
  }
  play() {
    queueMicrotask(() => this.onplaying?.())
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  finir() {
    this.onended?.()
  }
}

function erreurVoix(status, code, retryAfter) {
  return Object.assign(new Error('Voix de Mimo indisponible.'), { status, code, retryAfter })
}

beforeEach(() => {
  vi.clearAllMocks()
  lectures.length = 0
  vi.stubGlobal('Audio', FauxAudio)
  // jsdom n'a pas de speechSynthesis : aucune voix de secours dans le navigateur.
  setActivePinia(createPinia())
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('Voix de Mimo', () => {
  it('passe par préparation puis lecture, et revient au repos à la fin', async () => {
    recupererVoixMimo.mockResolvedValue('blob:voix-1')
    const voix = useVoixMimoStore()

    const fin = voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })
    expect(voix.phase).toBe('preparation')
    await flushPromises()
    expect(voix.phase).toBe('parle')
    expect(voix.messageEnCours).toBe('m1')

    lectures[0].finir()
    await fin
    expect(voix.phase).toBe('inactif')
    expect(voix.messageEnCours).toBeNull()
  })

  it('échec du TTS (quota) sans voix de secours : statut indisponible, jamais bloqué', async () => {
    recupererVoixMimo.mockRejectedValue(erreurVoix(503, 'quota', 3600))
    const voix = useVoixMimoStore()

    const resultat = await voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })

    expect(resultat.statut).toBe('indisponible')
    expect(voix.indisponibles.m1).toBe('quota')
    expect(voix.phase).toBe('inactif')
  })

  it('une erreur sur une réponse n’empêche pas la suivante d’être lue', async () => {
    recupererVoixMimo.mockRejectedValueOnce(erreurVoix(503, 'quota', 3600)).mockResolvedValueOnce('blob:voix-2')
    const voix = useVoixMimoStore()

    await voix.lire({ texte: 'Première.', messageId: 'm1', langue: 'fr' })
    expect(voix.indisponibles.m1).toBe('quota')
    const seconde = voix.lire({ texte: 'Seconde.', messageId: 'm2', langue: 'fr' })
    await flushPromises()

    expect(voix.phase).toBe('parle')
    lectures.at(-1).finir()
    expect((await seconde).statut).toBe('serveur')
  })

  it('relance la lecture à la demande (Réécouter)', async () => {
    recupererVoixMimo.mockRejectedValueOnce(erreurVoix(503, 'quota', 3600)).mockResolvedValueOnce('blob:voix-1')
    const voix = useVoixMimoStore()
    await voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })
    expect(voix.indisponibles.m1).toBeTruthy()

    const relecture = voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' }, { force: true })
    await flushPromises()

    expect(voix.indisponibles.m1).toBeUndefined()
    expect(voix.phase).toBe('parle')
    lectures.at(-1).finir()
    await relecture
  })

  it('ne relit jamais automatiquement une réponse déjà lue (deux panneaux, erreur d’envoi)', async () => {
    recupererVoixMimo.mockResolvedValue('blob:voix-1')
    const voix = useVoixMimoStore()

    voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })
    const doublon = await voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })
    await flushPromises()

    expect(doublon).toBeNull()
    expect(recupererVoixMimo).toHaveBeenCalledTimes(1)
  })

  it('aucune lecture simultanée : une nouvelle réponse coupe la précédente', async () => {
    recupererVoixMimo.mockResolvedValueOnce('blob:voix-1').mockResolvedValueOnce('blob:voix-2')
    const voix = useVoixMimoStore()

    voix.lire({ texte: 'Première.', messageId: 'm1', langue: 'fr' })
    await flushPromises()
    voix.lire({ texte: 'Seconde.', messageId: 'm2', langue: 'fr' })
    await flushPromises()

    expect(lectures).toHaveLength(2)
    expect(lectures[0].paused).toBe(true)
    expect(lectures[1].paused).toBe(false)
    expect(voix.messageEnCours).toBe('m2')
  })

  it('taire() arrête la lecture en cours', async () => {
    recupererVoixMimo.mockResolvedValue('blob:voix-1')
    const voix = useVoixMimoStore()
    voix.lire({ texte: 'Bonjour.', messageId: 'm1', langue: 'fr' })
    await flushPromises()

    voix.taire()

    expect(lectures[0].paused).toBe(true)
    expect(voix.phase).toBe('inactif')
  })
})
