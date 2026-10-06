import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import { formaterDuree, useEntretien } from './useEntretien'

// Faux adaptateurs : aucune caméra, aucun micro, aucun réseau.
function fauxAdaptateurs({ reponses = [] } = {}) {
  let tick = null
  let temps = 0
  let indexSegment = 1
  const segment = (texte) => ({ index: ++indexSegment, texte })
  const service = {
    demarrerEntretien: vi.fn().mockResolvedValue({
      id: 'e1',
      question_numero: 1,
      nombre_questions: 6,
      duree_max_secondes: 300,
      agent: { code: 'fassa', nom: 'Fassa', role: 'Assistante IA de vérification professionnelle', est_ia: true },
      segments: [
        { index: 0, texte: "Bonjour. Je suis Fassa, l'assistante IA de vérification professionnelle de MIMOSY." },
        { index: 1, texte: 'Question 1 ?' },
      ],
    }),
    commencerEntretien: vi.fn().mockResolvedValue({ temps_restant: 300 }),
    repondreEntretien: vi.fn((id, numero) =>
      Promise.resolve(
        numero >= 6
          ? { action: 'fin', question_numero: 6, segments: [segment("Merci pour vos réponses. L'entretien est terminé.")] }
          : { action: 'question', question_numero: numero + 1, segments: [segment('Merci.'), segment(`Question ${numero + 1} ?`)] },
      ),
    ),
    terminerEntretien: vi.fn().mockResolvedValue({ statut: 'TERMINE', parcours: { statut: 'DOSSIER_EN_REVUE' } }),
  }
  let indexReponse = 0
  const ecoute = {
    disponible: true,
    ecouter: vi.fn((onPartiel) => {
      const texte = reponses[indexReponse++] ?? 'Une réponse détaillée et concrète.'
      onPartiel(texte)
      return Promise.resolve(texte)
    }),
    arreter: vi.fn(),
    erreur: '',
  }
  const enregistreur = {
    demarrer: vi.fn(),
    arreter: vi.fn().mockResolvedValue(new File(['video'], 'entretien.webm', { type: 'video/webm' })),
    fermer: vi.fn(),
    ouvrir: vi.fn(),
    flux: null,
  }
  const voix = { parler: vi.fn().mockResolvedValue(), taire: vi.fn() }
  return {
    deps: {
      service,
      ecoute,
      enregistreur,
      voix,
      maintenant: () => temps,
      planifier: (fn) => {
        tick = fn
        return 1
      },
      annuler: vi.fn(),
    },
    avancer(secondes) {
      temps += secondes * 1000
      tick?.()
    },
  }
}

function monter(deps) {
  let api
  const Composant = defineComponent({
    setup() {
      api = useEntretien(deps)
      return () => null
    },
  })
  mount(Composant)
  return api
}

async function repondreAToutesLesQuestions(entretien) {
  for (let i = 0; i < 6; i += 1) {
    await entretien.repondreVoix()
    await flushPromises()
  }
}

describe('formaterDuree', () => {
  it('affiche mm:ss', () => {
    expect(formaterDuree(84)).toBe('01:24')
    expect(formaterDuree(300)).toBe('05:00')
  })
})

describe('useEntretien', () => {
  it('Fassa parle avec la voix du serveur, puis attend la réponse ; le compte à rebours part à la 1re question', async () => {
    const { deps } = fauxAdaptateurs()
    const entretien = monter(deps)

    await entretien.demarrer(true)

    expect(entretien.agent.value.nom).toBe('Fassa')
    expect(deps.voix.parler).toHaveBeenNthCalledWith(1, {
      texte: "Bonjour. Je suis Fassa, l'assistante IA de vérification professionnelle de MIMOSY.",
      source: { source: 'entretien', entretien: 'e1', index: 0 },
    })
    expect(deps.service.commencerEntretien).toHaveBeenCalledWith('e1')
    // L'accueil est dit avant que le chronomètre démarre.
    expect(deps.voix.parler.mock.invocationCallOrder[0]).toBeLessThan(deps.service.commencerEntretien.mock.invocationCallOrder[0])
    expect(entretien.chronoDemarre.value).toBe(true)
    expect(entretien.etat.value).toBe('attente')
    // Rien n'est écouté tant que le prestataire n'a pas appuyé sur le micro.
    expect(deps.ecoute.ecouter).not.toHaveBeenCalled()
  })

  it('6 réponses à la voix, puis fin et envoi de l’enregistrement', async () => {
    const { deps } = fauxAdaptateurs()
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await repondreAToutesLesQuestions(entretien)

    expect(deps.service.repondreEntretien.mock.calls.map((c) => c[1])).toEqual([1, 2, 3, 4, 5, 6])
    // Chaque réponse orale est envoyée avec son mode.
    expect(deps.service.repondreEntretien.mock.calls.every((c) => c[3] === 'VOIX')).toBe(true)
    // La transcription affiche Fassa et le prestataire, dans l'ordre.
    expect(entretien.echanges.value[0]).toMatchObject({ role: 'ia' })
    expect(entretien.echanges.value.filter((e) => e.role === 'prestataire')).toHaveLength(6)
    expect(deps.voix.parler).toHaveBeenCalledWith(expect.objectContaining({ texte: 'Question 2 ?' }))
    expect(deps.service.terminerEntretien).toHaveBeenCalledWith('e1', expect.any(File))
    expect(entretien.phase.value).toBe('termine')
    expect(entretien.parcoursFinal.value.statut).toBe('DOSSIER_EN_REVUE')
  })

  it('réponse écrite : même chemin que la voix', async () => {
    const { deps } = fauxAdaptateurs()
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await entretien.repondreEcrit('  Je suis électricien depuis 7 ans.  ')

    expect(deps.service.repondreEntretien).toHaveBeenCalledWith('e1', 1, 'Je suis électricien depuis 7 ans.', 'TEXTE')
    expect(entretien.echanges.value.at(-3)).toMatchObject({ role: 'prestataire', mode: 'TEXTE' })
    expect(entretien.questionNumero.value).toBe(2)
    expect(deps.ecoute.ecouter).not.toHaveBeenCalled()
  })

  it('le prestataire peut couper la parole à l’IA', async () => {
    const { deps } = fauxAdaptateurs()
    let finirParole
    deps.voix.parler = vi.fn(() => new Promise((ok) => (finirParole = ok)))
    deps.voix.taire = vi.fn(() => finirParole?.())
    const entretien = monter(deps)

    entretien.demarrer(true)
    await flushPromises()
    expect(entretien.etat.value).toBe('ia_parle')

    entretien.repondreVoix()
    await flushPromises()

    expect(deps.voix.taire).toHaveBeenCalled()
    expect(deps.ecoute.ecouter).toHaveBeenCalled()
  })

  it('aucune réponse entendue : consigne affichée, rien n’est envoyé', async () => {
    const { deps } = fauxAdaptateurs({ reponses: [''] })
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await entretien.repondreVoix()

    expect(deps.service.repondreEntretien).not.toHaveBeenCalled()
    expect(entretien.consigne.value).toContain("Je n'ai pas entendu")
    expect(entretien.etat.value).toBe('attente')
  })

  it('transcription impossible : message clair, rien n’est envoyé', async () => {
    const { deps } = fauxAdaptateurs({ reponses: [''] })
    deps.ecoute.erreur = 'La transcription automatique est indisponible. Réessayez, ou écrivez votre réponse.'
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await entretien.repondreVoix()

    expect(deps.service.repondreEntretien).not.toHaveBeenCalled()
    expect(entretien.consigne.value).toContain('transcription automatique est indisponible')
  })

  it('coupure réseau : la réponse est retirée du fil, puis renvoyée dans son mode', async () => {
    const { deps } = fauxAdaptateurs()
    deps.service.repondreEntretien.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await entretien.repondreVoix()

    expect(entretien.consigne.value).toContain('Connexion perdue')
    expect(entretien.reponseNonEnvoyee.value).toBe('Une réponse détaillée et concrète.')
    expect(entretien.echanges.value.some((e) => e.role === 'prestataire')).toBe(false)
    expect(entretien.etat.value).toBe('attente')

    await entretien.renvoyer()

    expect(deps.service.repondreEntretien).toHaveBeenLastCalledWith('e1', 1, 'Une réponse détaillée et concrète.', 'VOIX')
    expect(entretien.questionNumero.value).toBe(2)
    expect(entretien.reponseNonEnvoyee.value).toBe('')
  })

  it('compte à rebours de 5 minutes, arrêt automatique à 00:00 même au milieu d’une réponse', async () => {
    const { deps, avancer } = fauxAdaptateurs()
    deps.ecoute.ecouter = vi.fn(() => new Promise(() => {}))
    const entretien = monter(deps)
    await entretien.demarrer(true)
    expect(entretien.chrono.value).toBe('05:00')
    entretien.repondreVoix()

    avancer(2)
    expect(entretien.chrono.value).toBe('04:58')
    avancer(26)
    expect(entretien.chrono.value).toBe('04:32')
    expect(entretien.finProche.value).toBe(false)
    avancer(257)
    expect(entretien.chrono.value).toBe('00:15')
    expect(entretien.finProche.value).toBe(true)
    avancer(15)
    await flushPromises()

    expect(deps.ecoute.arreter).toHaveBeenCalled()
    expect(deps.service.terminerEntretien).toHaveBeenCalled()
    expect(entretien.phase.value).toBe('termine')
    expect(entretien.secondes.value).toBe(300)
    expect(entretien.chrono.value).toBe('00:00')
  })

  it('consentement refusé par le backend : reste en préparation avec le message', async () => {
    const { deps } = fauxAdaptateurs()
    deps.service.demarrerEntretien = vi.fn().mockRejectedValue(new Error('Votre accord est nécessaire.'))
    const entretien = monter(deps)

    await entretien.demarrer(false)

    expect(entretien.phase.value).toBe('preparation')
    expect(entretien.erreur.value).toBe('Votre accord est nécessaire.')
    expect(deps.enregistreur.demarrer).not.toHaveBeenCalled()
  })

  it('enregistrement indisponible : erreur affichée', async () => {
    const { deps } = fauxAdaptateurs()
    deps.enregistreur.arreter = vi.fn().mockResolvedValue(null)
    const entretien = monter(deps)
    await entretien.demarrer(true)

    await repondreAToutesLesQuestions(entretien)

    expect(entretien.phase.value).toBe('erreur')
    expect(deps.service.terminerEntretien).not.toHaveBeenCalled()
  })
})

describe('préchargement de la voix', () => {
  it('prépare la 1re question pendant l’accueil, puis la suivante pendant chaque réponse', async () => {
    const { deps } = fauxAdaptateurs()
    deps.voix.precharger = vi.fn()
    const entretien = monter(deps)

    await entretien.demarrer(true)
    expect(deps.voix.precharger).toHaveBeenCalledWith({ source: 'entretien', entretien: 'e1', index: 1 })

    await entretien.repondreEcrit('Je suis électricien depuis 7 ans.')
    expect(deps.voix.precharger).toHaveBeenCalledWith({ source: 'question', entretien: 'e1', index: 2 })
  })
})

describe('langue de l’entretien', () => {
  it('reste en français ; « Parle-moi en wolof » fait passer la voix et l’écoute en wolof', async () => {
    const { deps } = fauxAdaptateurs()
    const WOLOF = { code: 'wo', libelle: 'Wolof (Sénégal)', bcp47: 'wo-SN', dictee_navigateur: false, voix_navigateur: false }
    deps.service.repondreEntretien.mockResolvedValueOnce({
      action: 'question',
      question_numero: 1,
      langue: WOLOF,
      segments: [{ index: 3, texte: 'Baax na, nu ngi kontine ci Wolof (Sénégal).' }, { index: 4, texte: 'Laaj 1' }],
    })
    const entretien = monter(deps)
    await entretien.demarrer(true)
    await flushPromises()
    expect(entretien.langue.value).toBeNull() // français par défaut

    await entretien.repondreEcrit('Parle-moi en wolof')
    await flushPromises()

    expect(deps.service.repondreEntretien).toHaveBeenCalledWith('e1', 1, 'Parle-moi en wolof', 'TEXTE')
    expect(entretien.langue.value.code).toBe('wo')
    expect(entretien.questionNumero.value).toBe(1)
  })
})

describe('useEntretien — voix indisponible', () => {
  it('une phrase que personne ne peut dire est SIGNALÉE (pas de silence muet), puis « Réécouter » la rejoue', async () => {
    const { deps } = fauxAdaptateurs()
    // Accueil dit, 1re question impossible à dire (quota), puis la voix revient.
    deps.voix.parler
      .mockResolvedValueOnce({ statut: 'serveur' })
      .mockResolvedValueOnce({ statut: 'indisponible', raison: 'quota' })
      .mockResolvedValue({ statut: 'serveur' })
    const entretien = monter(deps)

    await entretien.demarrer(true)

    expect(entretien.voixIndisponible.value).toEqual({
      texte: 'Question 1 ?',
      source: { source: 'entretien', entretien: 'e1', index: 1 },
      raison: 'quota',
    })
    // L'entretien reste utilisable : le prestataire peut répondre.
    expect(entretien.etat.value).toBe('attente')

    await entretien.reecouter()

    expect(deps.voix.parler).toHaveBeenLastCalledWith({
      texte: 'Question 1 ?',
      source: { source: 'entretien', entretien: 'e1', index: 1 },
    })
    expect(entretien.voixIndisponible.value).toBeNull()
    expect(entretien.etat.value).toBe('attente')
  })

  it('la voix revient au tour suivant : le signalement disparaît de lui-même', async () => {
    const { deps } = fauxAdaptateurs()
    deps.voix.parler
      .mockResolvedValueOnce({ statut: 'serveur' })
      .mockResolvedValueOnce({ statut: 'indisponible', raison: 'quota' })
      .mockResolvedValue({ statut: 'serveur' })
    const entretien = monter(deps)
    await entretien.demarrer(true)
    expect(entretien.voixIndisponible.value).not.toBeNull()

    await entretien.repondreVoix()
    await flushPromises()

    expect(entretien.voixIndisponible.value).toBeNull()
  })
})

