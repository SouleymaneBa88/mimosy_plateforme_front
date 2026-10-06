import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as parcoursService from '@/services/parcoursService'
import { choisirVoixNavigateur, creerVoix } from './mediaEntretien'

vi.mock('@/services/parcoursService', () => ({ recupererVoix: vi.fn(), transcrireAudio: vi.fn() }))

const voix = (name, lang = 'fr-FR') => ({ name, lang })

describe('choisirVoixNavigateur', () => {
  it('préfère une voix neuronale féminine française à eSpeak', () => {
    const liste = [
      voix('eSpeak French', 'fr'),
      voix('English Female', 'en-US'),
      voix('Thomas', 'fr-FR'),
      voix('Microsoft Denise Online (Natural) - French (France)'),
      voix('Google français'),
    ]
    expect(choisirVoixNavigateur(liste).name).toBe('Microsoft Denise Online (Natural) - French (France)')
    expect(choisirVoixNavigateur([voix('eSpeak French', 'fr'), voix('Thomas')]).name).toBe('Thomas')
    expect(choisirVoixNavigateur([voix('Samantha', 'en-US')])).toBeNull()
  })
})

describe('creerVoix', () => {
  let lectures
  let parlees

  beforeEach(() => {
    lectures = []
    parlees = []
    // Faux lecteur audio : la lecture se termine aussitôt.
    vi.stubGlobal(
      'Audio',
      class {
        constructor(url) {
          lectures.push(url)
        }
        play() {
          setTimeout(() => this.onended?.())
          return Promise.resolve()
        }
        pause() {}
      },
    )
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(texte) {
        this.texte = texte
      }
    })
    window.speechSynthesis = {
      getVoices: () => [voix('Google français')],
      cancel: vi.fn(),
      speak: (enonce) => {
        parlees.push(enonce)
        setTimeout(() => enonce.onend?.())
      },
    }
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('lit la voix du serveur quand elle est disponible', async () => {
    parcoursService.recupererVoix.mockResolvedValue('blob:fassa')
    const v = creerVoix()

    await v.parler({ texte: 'Bonjour.', source: { source: 'entretien', entretien: 'e1', index: 0 } })

    expect(lectures).toEqual(['blob:fassa'])
    expect(parlees).toHaveLength(0)
  })

  it('lecture bloquée par le navigateur (page ouverte sans clic) : la phrase est jouée au premier geste', async () => {
    parcoursService.recupererVoix.mockResolvedValue('blob:aby')
    let essais = 0
    vi.stubGlobal(
      'Audio',
      class {
        play() {
          essais += 1
          if (essais === 1) return Promise.reject(Object.assign(new Error('bloqué'), { name: 'NotAllowedError' }))
          setTimeout(() => this.onended?.())
          return Promise.resolve()
        }
        pause() {}
      },
    )
    const v = creerVoix()
    let fini = false
    const lecture = v.parler({ texte: 'Bonjour.', source: { source: 'assistant', index: 0 } }).then(() => (fini = true))

    await new Promise((ok) => setTimeout(ok))
    expect(essais).toBe(1)
    expect(fini).toBe(false) // en attente d'un geste, pas perdue ni lue par le navigateur
    window.dispatchEvent(new Event('pointerdown'))
    await lecture

    expect(essais).toBe(2)
    expect(parlees).toHaveLength(0)
  })

  it('panne de la voix serveur : la phrase est lue par le navigateur, puis le serveur est réessayé après une pause', async () => {
    let temps = 0
    parcoursService.recupererVoix.mockRejectedValueOnce(new Error('Voix indisponible.')).mockResolvedValue('blob:ok')
    const v = creerVoix({ maintenant: () => temps })
    const source = { source: 'entretien', entretien: 'e1', index: 0 }

    await v.parler({ texte: 'Première phrase. Deuxième phrase.', source })
    // Une phrase à la fois, débit posé, meilleure voix française.
    expect(parlees.map((e) => e.texte)).toEqual(['Première phrase.', 'Deuxième phrase.'])
    expect(parlees[0].rate).toBe(0.9)
    expect(parlees[0].voice.name).toBe('Google français')
    expect(v.voixServeur).toBe(false)

    await v.parler({ texte: 'Pendant la pause.', source })
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(1)

    temps = 61_000
    await v.parler({ texte: 'Après la pause.', source })
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(2)
    expect(lectures).toEqual(['blob:ok'])
  })
})


describe('creerVoix — langue sans voix de secours du navigateur (wolof)', () => {
  const WOLOF = { code: 'wo', bcp47: 'wo-SN', voix_navigateur: false, dictee_navigateur: false }
  const erreurServeur = (status, extra = {}) => Object.assign(new Error('Voix indisponible.'), { status, ...extra })
  const src = (index) => ({ source: 'entretien', entretien: 'e1', index })
  let lectures
  let parlees
  let attentes

  beforeEach(() => {
    lectures = []
    parlees = []
    attentes = []
    vi.stubGlobal(
      'Audio',
      class {
        constructor(url) {
          lectures.push(url)
        }
        play() {
          setTimeout(() => this.onended?.())
          return Promise.resolve()
        }
        pause() {}
      },
    )
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(texte) {
        this.texte = texte
      }
    })
    window.speechSynthesis = {
      getVoices: () => [voix('Google français')],
      cancel: vi.fn(),
      speak: (enonce) => {
        parlees.push(enonce)
        setTimeout(() => enonce.onend?.())
      },
    }
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // Les attentes entre deux essais sont enregistrées, pas réellement attendues.
  const creer = () => creerVoix({ langue: () => WOLOF, attendre: (ms) => (attentes.push(ms), Promise.resolve()) })

  it('RÉGRESSION (2026-10-06) : 503 → nouvel essai → audio joué ; la phrase suivante est encore demandée et jouée', async () => {
    parcoursService.recupererVoix
      .mockRejectedValueOnce(erreurServeur(503, { code: 'quota' }))
      .mockResolvedValueOnce('blob:phrase-5')
      .mockResolvedValueOnce('blob:phrase-7')
    const v = creer()

    const premiere = await v.parler({ texte: 'Laaj bu jëkk.', source: src(5) })
    const suivante = await v.parler({ texte: 'Laaj bu ñaareel.', source: src(7) })

    expect(premiere).toEqual({ statut: 'serveur' })
    expect(suivante).toEqual({ statut: 'serveur' })
    // Avant la correction : 1 seul appel, 0 audio (60 s sans voix, aucun message).
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(3)
    expect(lectures).toEqual(['blob:phrase-5', 'blob:phrase-7'])
    // Jamais de wolof lu par une voix française.
    expect(parlees).toHaveLength(0)
  })

  it('respecte le Retry-After du serveur quand il est plus long que le délai prévu', async () => {
    parcoursService.recupererVoix.mockRejectedValueOnce(erreurServeur(503, { code: 'quota', retryAfter: 6 })).mockResolvedValue('blob:ok')

    await creer().parler({ texte: 'Laaj.', source: src(3) })

    expect(attentes).toEqual([6000])
    expect(lectures).toEqual(['blob:ok'])
  })

  it('échecs répétés : statut « indisponible » renvoyé (jamais un silence muet), sans voix française', async () => {
    parcoursService.recupererVoix.mockRejectedValue(erreurServeur(503, { code: 'indisponible' }))

    const resultat = await creer().parler({ texte: 'Laaj.', source: src(3) })

    expect(resultat).toEqual({ statut: 'indisponible', raison: 'indisponible' })
    // Un essai, puis deux nouveaux essais après 1,5 s et 4 s.
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(3)
    expect(attentes).toEqual([1500, 4000])
    expect(parlees).toHaveLength(0)
  })

  it('quota d’une heure (Retry-After trop long) : pas d’attente inutile, indisponible tout de suite', async () => {
    parcoursService.recupererVoix.mockRejectedValue(erreurServeur(503, { code: 'quota', retryAfter: 3600 }))

    const resultat = await creer().parler({ texte: 'Laaj.', source: src(3) })

    expect(resultat.statut).toBe('indisponible')
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(1)
    expect(attentes).toEqual([])
  })

  it('phrase refusée (409 langue différente) : aucun nouvel essai', async () => {
    parcoursService.recupererVoix.mockRejectedValue(erreurServeur(409, { code: 'langue_differente' }))

    const resultat = await creer().parler({ texte: 'Question restée en français ?', source: src(3) })

    expect(resultat).toEqual({ statut: 'indisponible', raison: 'langue_differente' })
    expect(parcoursService.recupererVoix).toHaveBeenCalledTimes(1)
  })

  it('le prestataire coupe la parole pendant l’attente d’un nouvel essai : la phrase est abandonnée', async () => {
    parcoursService.recupererVoix.mockRejectedValueOnce(erreurServeur(503)).mockResolvedValue('blob:trop-tard')
    let v
    v = creerVoix({
      langue: () => WOLOF,
      attendre: () => {
        v.taire() // le prestataire commence à répondre
        return Promise.resolve()
      },
    })

    const resultat = await v.parler({ texte: 'Laaj.', source: src(3) })

    expect(resultat).toEqual({ statut: 'interrompue' })
    expect(lectures).toHaveLength(0)
  })
})
