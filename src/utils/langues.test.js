// Langues de communication (fr, en, wo) : voix de secours, écoute, détection de silence.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as parcoursService from '@/services/parcoursService'
import { creerEcoute, creerVoix, surveillerSilence } from './mediaEntretien'
import { choisirVoixNavigateur, nettoyerTexte } from './voixNavigateur'

vi.mock('@/services/parcoursService', () => ({ recupererVoix: vi.fn(), transcrireAudio: vi.fn() }))

const FRANCAIS = { code: 'fr', bcp47: 'fr-FR', dictee_navigateur: true, voix_navigateur: true }
const ANGLAIS = { code: 'en', bcp47: 'en-US', dictee_navigateur: true, voix_navigateur: true }
const WOLOF = { code: 'wo', bcp47: 'wo-SN', dictee_navigateur: false, voix_navigateur: false }

describe('voix du navigateur selon la langue', () => {
  it('choisit une voix anglaise en anglais, aucune voix française pour l’anglais', () => {
    const liste = [{ name: 'Google français', lang: 'fr-FR' }, { name: 'Google US English', lang: 'en-US' }]
    expect(choisirVoixNavigateur(liste, 'en-US').name).toBe('Google US English')
    expect(choisirVoixNavigateur(liste).name).toBe('Google français')
    expect(choisirVoixNavigateur([{ name: 'Google français', lang: 'fr-FR' }], 'wo-SN')).toBeNull()
  })

  it('règles de lecture françaises seulement en français', () => {
    expect(nettoyerTexte('De 8h-18h.')).toBe('De 8 heures à 18 heures.')
    expect(nettoyerTexte('From 8h-18h', 'en-US')).toBe('From 8h-18h.')
  })
})

describe('creerVoix et langue', () => {
  let parlees

  beforeEach(() => {
    parlees = []
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(texte) {
        this.texte = texte
      }
    })
    window.speechSynthesis = {
      getVoices: () => [{ name: 'Google français', lang: 'fr-FR' }, { name: 'Google US English', lang: 'en-US' }],
      cancel: vi.fn(),
      speak: (enonce) => {
        parlees.push(enonce)
        setTimeout(() => enonce.onend?.())
      },
    }
    parcoursService.recupererVoix.mockRejectedValue(new Error('Voix indisponible.'))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('wolof sans voix serveur : la phrase n’est pas lue par une voix française', async () => {
    // Les nouveaux essais de la voix serveur (wolof) sont attendus sans délai réel.
    const voix = creerVoix({ langue: () => WOLOF, attendre: () => Promise.resolve() })
    const resultat = await voix.parler({ texte: 'Lan mooy seen métier?', source: { source: 'assistant', index: 1 } })
    expect(parlees).toHaveLength(0)
    // Et l'échec est signalé à l'appelant (jamais un silence muet).
    expect(resultat.statut).toBe('indisponible')
  })

  it('anglais : secours du navigateur avec une voix anglaise', async () => {
    const voix = creerVoix({ langue: () => ANGLAIS })
    await voix.parler({ texte: 'What is your trade?', source: { source: 'assistant', index: 1 } })
    expect(parlees[0].voice.name).toBe('Google US English')
    expect(parlees[0].lang).toBe('en-US')
  })
})

describe('creerEcoute et langue', () => {
  let instances

  beforeEach(() => {
    instances = []
    window.SpeechRecognition = class {
      constructor() {
        instances.push(this)
      }
      start() {}
      stop() {}
    }
  })
  afterEach(() => {
    delete window.SpeechRecognition
    vi.unstubAllGlobals()
  })

  it('dicte dans la langue choisie (anglais)', () => {
    const ecoute = creerEcoute({ langue: () => ANGLAIS })
    ecoute.ecouter()
    expect(instances[0].lang).toBe('en-US')
    ecoute.arreter()
  })

  it('français par défaut', () => {
    const ecoute = creerEcoute({ langue: () => FRANCAIS })
    ecoute.ecouter()
    expect(instances[0].lang).toBe('fr-FR')
    ecoute.arreter()
  })

  it('wolof : pas de dictée du navigateur, réponse transcrite par le serveur', async () => {
    const piste = {}
    const flux = { getAudioTracks: () => [piste] }
    vi.stubGlobal('MediaStream', class {})
    vi.stubGlobal(
      'MediaRecorder',
      class {
        constructor() {
          this.state = 'inactive'
        }
        start() {
          this.state = 'recording'
          this.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) })
        }
        stop() {
          this.state = 'inactive'
          this.onstop()
        }
      },
    )
    parcoursService.transcrireAudio.mockResolvedValue({ texte: 'Maangi liggéey ci électricité' })
    const etapes = []
    const ecoute = creerEcoute({ flux: () => flux, langue: () => WOLOF, onEtape: (e) => etapes.push(e) })

    const promesse = ecoute.ecouter()
    ecoute.arreter()

    expect(await promesse).toBe('Maangi liggéey ci électricité')
    expect(instances).toHaveLength(0)
    expect(etapes).toEqual(['transcription'])
    expect(parcoursService.transcrireAudio).toHaveBeenCalledTimes(1)
  })
})

describe('surveillerSilence', () => {
  function contexteFactice(niveaux) {
    let i = 0
    return {
      createAnalyser: () => ({
        fftSize: 4,
        getFloatTimeDomainData: (tableau) => tableau.fill(niveaux[Math.min(i++, niveaux.length - 1)]),
      }),
      createMediaStreamSource: () => ({ connect: () => {} }),
    }
  }

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('termine après un silence qui suit une prise de parole', () => {
    let temps = 0
    const fin = vi.fn()
    // Parole pendant 1 s (≈ 7 mesures), puis silence.
    const niveaux = [...Array(7).fill(0.2), ...Array(40).fill(0)]
    const arreter = surveillerSilence({ getAudioTracks: () => [{}] }, fin, {
      contexte: contexteFactice(niveaux),
      maintenant: () => temps,
    })
    for (let n = 0; n < 20; n += 1) {
      temps += 150
      vi.advanceTimersByTime(150)
    }
    expect(fin).not.toHaveBeenCalled()
    for (let n = 0; n < 20; n += 1) {
      temps += 150
      vi.advanceTimersByTime(150)
    }
    expect(fin).toHaveBeenCalled()
    arreter()
  })

  it('sans Web Audio ni micro : aucune surveillance (arrêt manuel)', () => {
    expect(surveillerSilence(null, vi.fn())).toBeTypeOf('function')
  })
})
