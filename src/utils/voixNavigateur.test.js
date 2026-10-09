import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  choisirVoixNavigateur,
  choisirVoixNavigateurMasculine,
  creerLecteurNavigateur,
  decouperEnSegments,
  nettoyerTexte,
  reglagesPour,
  voixDisponibles,
} from './voixNavigateur'

const voix = (name, lang = 'fr-FR', localService = true) => ({ name, lang, localService })

describe('nettoyerTexte', () => {
  it('espaces, retours à la ligne et ponctuation', () => {
    expect(nettoyerTexte('Bonjour   !\n\nPouvez-vous vous présenter ?')).toBe('Bonjour! Pouvez-vous vous présenter?')
    expect(nettoyerTexte('Bonjour\n\nJe vais vous poser quelques questions')).toBe(
      'Bonjour. Je vais vous poser quelques questions.',
    )
    expect(nettoyerTexte('Vraiment ?!.. Oui,, bien sûr...')).toBe('Vraiment? Oui, bien sûr…')
  })

  it('URL, sigles, horaires et nombres, sans changer le sens', () => {
    expect(nettoyerTexte("Je suis Fassa, l'assistante IA de MIMOSY")).toBe("Je suis Fassa, l'assistante I A de Mimosy.")
    expect(nettoyerTexte('Voir https://mimosy.sn/aide de 8h à 18h30 : 25 000 FCFA')).toBe(
      'Voir le lien indiqué de 8 heures à 18 heures 30: 25000 francs C F A.',
    )
    // Les mots ordinaires ne sont pas touchés (« cap », « ia » dans un mot).
    expect(nettoyerTexte('Gardez le cap, la maria est finie.')).toBe('Gardez le cap, la maria est finie.')
    expect(nettoyerTexte('  \n ')).toBe('')
  })
})

describe('decouperEnSegments', () => {
  it('une phrase par segment, jamais mot par mot', () => {
    expect(decouperEnSegments('Bonjour. Je vais vous poser quelques questions. Prenez votre temps?')).toEqual([
      'Bonjour.',
      'Je vais vous poser quelques questions.',
      'Prenez votre temps?',
    ])
  })

  it('une phrase très longue est coupée aux virgules', () => {
    const longue =
      'Pouvez-vous me décrire, étape par étape, comment vous installez un tableau électrique dans une maison neuve, ' +
      'en précisant les vérifications de sécurité, les outils utilisés, et le temps nécessaire?'
    const segments = decouperEnSegments(longue)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.every((s) => s.length <= 180)).toBe(true)
    expect(segments.join(' ')).toBe(longue)
  })
})

describe('choix de la voix', () => {
  it('Mimo préfère une voix masculine disponible dans la langue demandée', () => {
    const voix = [
      { name: 'Google français Female', lang: 'fr-FR', localService: false },
      { name: 'Microsoft male voice Online (Natural)', lang: 'fr-FR', localService: false },
      { name: 'Google US English Male', lang: 'en-US', localService: false },
    ]
    expect(choisirVoixNavigateurMasculine(voix, 'fr-FR').name).toBe('Microsoft male voice Online (Natural)')
    expect(choisirVoixNavigateurMasculine(voix, 'en-US').name).toBe('Google US English Male')
    expect(choisirVoixNavigateurMasculine([{ name: 'Samantha', lang: 'en-US' }], 'fr-FR')).toBeNull()
    expect(choisirVoixNavigateurMasculine([{ name: 'Google français Female', lang: 'fr-FR' }])).toBeNull()
  })

  it('voix neuronale fr-FR d’abord, puis voix du système, puis eSpeak (variante la plus claire)', () => {
    const toutes = [
      voix('French (France)+female4'),
      voix('French (France)+Robosoft'),
      voix('French (France)+female2'),
      voix('Microsoft Hortense - French (France)'),
      voix('Google français', 'fr-FR', false),
      voix('Google US English', 'en-US', false),
    ]
    expect(choisirVoixNavigateur(toutes).name).toBe('Google français')
    expect(choisirVoixNavigateur(toutes.slice(0, 4)).name).toBe('Microsoft Hortense - French (France)')
    expect(choisirVoixNavigateur(toutes.slice(0, 3)).name).toBe('French (France)+female2')
    expect(choisirVoixNavigateur([voix('French (Belgium)+female2', 'fr-BE'), voix('French (France)', 'fr-FR')]).name).toBe(
      'French (France)',
    )
    expect(choisirVoixNavigateur([voix('Samantha', 'en-US')])).toBeNull()
  })

  it('débit adapté au moteur : ~130 mots/min dans les deux cas (mesuré)', () => {
    expect(reglagesPour(voix('Google français', 'fr-FR', false))).toEqual({ lang: 'fr-FR', rate: 0.9, pitch: 1, volume: 1 })
    expect(reglagesPour(voix('French (France)+female2')).rate).toBe(0.75)
    // « Microsoft Hortense - French (France) » n'est pas une voix eSpeak.
    expect(reglagesPour(voix('Microsoft Hortense - French (France)')).rate).toBe(0.9)
    expect(reglagesPour(null).lang).toBe('fr-FR')
  })
})

// Faux moteur : chaque énoncé « dure » 100 ms ; journalise début et fin.
function fauxMoteur({ voixInitiales = [voix('Google français', 'fr-FR', false)], oublieOnend = false } = {}) {
  const journal = []
  let enCours = null
  let liste = voixInitiales
  const ecouteurs = []
  const moteur = {
    paused: false,
    getVoices: () => liste,
    addEventListener: (_, f) => ecouteurs.push(f),
    removeEventListener: () => {},
    resume: vi.fn(),
    cancel: vi.fn(() => {
      if (enCours) {
        const e = enCours
        enCours = null
        journal.push({ fin: e.text, t: Date.now(), annule: true })
        e.onerror?.({ error: 'interrupted' })
      }
    }),
    speak: vi.fn((u) => {
      if (enCours) journal.push({ chevauchement: u.text })
      enCours = u
      journal.push({ debut: u.text, t: Date.now(), rate: u.rate, voix: u.voice?.name })
      if (oublieOnend) return
      setTimeout(() => {
        if (enCours !== u) return
        enCours = null
        journal.push({ fin: u.text, t: Date.now() })
        u.onend?.()
      }, 100)
    }),
    charger(nouvelles) {
      liste = nouvelles
      ecouteurs.forEach((f) => f())
    },
  }
  return { moteur, journal }
}

describe('lecteur du navigateur', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) {
        this.text = text
      }
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lit les phrases une à une, sans chevauchement, avec une pause plus longue après une question', async () => {
    const { moteur, journal } = fauxMoteur()
    const lecteur = creerLecteurNavigateur({ synthese: moteur })

    const lecture = lecteur.lire('Bonjour.\n\nPouvez-vous vous présenter ? Prenez votre temps.')
    await vi.runAllTimersAsync()
    await lecture

    const debuts = journal.filter((e) => e.debut)
    expect(debuts.map((e) => e.debut)).toEqual(['Bonjour.', 'Pouvez-vous vous présenter?', 'Prenez votre temps.'])
    expect(journal.some((e) => e.chevauchement)).toBe(false)
    expect(debuts[0]).toMatchObject({ rate: 0.9, voix: 'Google français' })
    const fins = journal.filter((e) => e.fin)
    expect(debuts[1].t - fins[0].t).toBe(200) // après une phrase
    expect(debuts[2].t - fins[1].t).toBe(350) // après une question
  })

  it('pas de doublon : la même phrase demandée deux fois n’est lue qu’une fois', async () => {
    const { moteur } = fauxMoteur()
    const lecteur = creerLecteurNavigateur({ synthese: moteur })

    const deux = Promise.all([lecteur.lire('Merci pour votre réponse.'), lecteur.lire('Merci pour votre réponse.')])
    await vi.runAllTimersAsync()
    await deux
    const juste_apres = lecteur.lire('Merci pour votre réponse.')
    await vi.runAllTimersAsync()
    await juste_apres

    expect(moteur.speak).toHaveBeenCalledTimes(1)
  })

  it('interruption, puis nouvelle lecture normale', async () => {
    const { moteur, journal } = fauxMoteur()
    const lecteur = creerLecteurNavigateur({ synthese: moteur })

    const premiere = lecteur.lire('Une phrase. Puis une autre. Et une troisième.')
    await vi.advanceTimersByTimeAsync(120)
    lecteur.arreter()
    await premiere
    const seconde = lecteur.lire('Reprenons.')
    await vi.runAllTimersAsync()
    await seconde

    const lues = journal.filter((e) => e.debut).map((e) => e.debut)
    expect(lues).toEqual(['Une phrase.', 'Reprenons.'])
    expect(moteur.cancel).toHaveBeenCalled()
  })

  it('attend les voix chargées après la page (voiceschanged)', async () => {
    const { moteur, journal } = fauxMoteur({ voixInitiales: [] })
    const lecteur = creerLecteurNavigateur({ synthese: moteur })

    const lecture = lecteur.lire('Bonjour.')
    await vi.advanceTimersByTimeAsync(100)
    moteur.charger([voix('French (France)+female2'), voix('Google français', 'fr-FR', false)])
    await vi.runAllTimersAsync()
    await lecture

    expect(journal[0]).toMatchObject({ debut: 'Bonjour.', voix: 'Google français' })
  })

  it('garde-fou : un navigateur qui oublie « onend » ne bloque pas la file', async () => {
    const { moteur, journal } = fauxMoteur({ oublieOnend: true })
    const lecteur = creerLecteurNavigateur({ synthese: moteur })

    const lecture = lecteur.lire('Première. Seconde.')
    await vi.runAllTimersAsync()
    await lecture

    expect(journal.filter((e) => e.debut).map((e) => e.debut)).toEqual(['Première.', 'Seconde.'])
  })
})

describe('voixDisponibles', () => {
  it('rend la main même si aucune voix n’arrive (navigateur sans synthèse)', async () => {
    vi.useFakeTimers()
    const attente = voixDisponibles({ getVoices: () => [], addEventListener() {}, removeEventListener() {} }, 1000)
    await vi.advanceTimersByTimeAsync(1100)
    expect(await attente).toEqual([])
    vi.useRealTimers()
  })
})
