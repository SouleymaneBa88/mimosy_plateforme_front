// Mesure du micro : la visualisation suit le signal réel et libère l'AudioContext.
import { describe, expect, it, vi } from 'vitest'
import { NB_BANDES, SEUIL_PAROLE, suivreNiveauMicro } from './niveauMicro'

function fauxContexte(signal) {
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const contexte = {
    close: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: () => ({
      fftSize: 512,
      frequencyBinCount: 256,
      getFloatTimeDomainData: (tableau) => tableau.fill(signal.amplitude),
      getByteFrequencyData: (tableau) => tableau.fill(Math.round(signal.amplitude * 255)),
    }),
  }
  return { Contexte: vi.fn(function Contexte() { return contexte }), contexte, source }
}

const flux = { getAudioTracks: () => [{}] }

describe('suivreNiveauMicro', () => {
  it('reste au repos sans parole, puis réagit à la voix', () => {
    const signal = { amplitude: 0 }
    const { Contexte } = fauxContexte(signal)
    let suivante = null
    const mesures = []

    suivreNiveauMicro(flux, (m) => mesures.push(m), { Contexte, planifier: (fn) => { suivante = fn; return 1 }, annulerPlanification: vi.fn() })
    expect(mesures[0].niveau).toBe(0)
    expect(mesures[0].bandes).toHaveLength(NB_BANDES)
    expect(Math.max(...mesures[0].bandes)).toBe(0)

    signal.amplitude = 0.2
    suivante()
    expect(mesures[1].niveau).toBeGreaterThan(SEUIL_PAROLE)
    expect(Math.max(...mesures[1].bandes)).toBeGreaterThan(0)
  })

  it('l’arrêt déconnecte la source et ferme l’AudioContext', () => {
    const { Contexte, contexte, source } = fauxContexte({ amplitude: 0 })
    const annuler = vi.fn()

    const arreter = suivreNiveauMicro(flux, () => {}, { Contexte, planifier: () => 7, annulerPlanification: annuler })
    arreter()
    arreter()

    expect(annuler).toHaveBeenCalledWith(7)
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(contexte.close).toHaveBeenCalledOnce()
  })

  it('sans Web Audio ou sans piste audio : aucune mesure, aucune erreur', () => {
    expect(suivreNiveauMicro(flux, vi.fn(), { Contexte: null })).toBeTypeOf('function')
    expect(suivreNiveauMicro({ getAudioTracks: () => [] }, vi.fn(), { Contexte: vi.fn() })).toBeTypeOf('function')
  })
})
