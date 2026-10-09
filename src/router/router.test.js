// Garde de navigation : un compte connecté non vérifié est dirigé vers la
// page de vérification ; les pages publiques restent accessibles.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/authService', () => ({ getStoredUser: vi.fn(() => null), storeUser: vi.fn() }))

import * as authService from '@/services/authService'
import router from '@/router'

function connecter(utilisateur) {
  localStorage.setItem('mimosy_access_token', 'jeton')
  authService.getStoredUser.mockReturnValue(utilisateur)
  // Le store relit la session à sa création : on en recrée un.
  setActivePinia(createPinia())
}

describe('router.beforeEach', () => {
  beforeEach(async () => {
    localStorage.clear()
    authService.getStoredUser.mockReturnValue(null)
    setActivePinia(createPinia())
    await router.push('/')
  })

  it('compte non vérifié → page de vérification', async () => {
    connecter({ email: 'a@x.sn', role: 'CLIENT', email_verified: false })

    await router.push('/client/demandes')

    expect(router.currentRoute.value.name).toBe('verifier-email')
  })

  it('compte vérifié → page demandée', async () => {
    connecter({ email: 'a@x.sn', role: 'CLIENT', email_verified: true })

    await router.push('/client/demandes')

    expect(router.currentRoute.value.name).toBe('demandes')
  })

  it('ancienne URL diagnostic → accueil avec le modal Mimo demandé', async () => {
    connecter({ email: 'a@x.sn', role: 'CLIENT', email_verified: true })

    await router.push('/client/diagnostic')

    expect(router.currentRoute.value.name).toBe('client-home')
    expect(router.currentRoute.value.query.mimo).toBe('1')
  })

  it('les pages publiques restent accessibles à un compte non vérifié', async () => {
    connecter({ email: 'a@x.sn', role: 'PRESTATAIRE', email_verified: false })

    await router.push('/verifier-email')

    expect(router.currentRoute.value.name).toBe('verifier-email')
  })
})

describe('prestataire non validé', () => {
  beforeEach(async () => {
    localStorage.clear()
    authService.getStoredUser.mockReturnValue(null)
    setActivePinia(createPinia())
    await router.push('/')
  })

  it('les fonctions professionnelles redirigent vers le parcours', async () => {
    connecter({ email: 'p@x.sn', role: 'PRESTATAIRE', email_verified: true, prestataire_valide: false })

    await router.push('/prestataire/services')

    expect(router.currentRoute.value.name).toBe('prestataire-parcours')
  })

  it('le parcours et les paramètres restent accessibles', async () => {
    connecter({ email: 'p@x.sn', role: 'PRESTATAIRE', email_verified: true, prestataire_valide: false })

    await router.push('/prestataire/profil')
    expect(router.currentRoute.value.name).toBe('prestataire-profil')
    await router.push('/prestataire/verification')
    expect(router.currentRoute.value.name).toBe('prestataire-parcours')
  })

  it('prestataire validé : accès normal', async () => {
    connecter({ email: 'p@x.sn', role: 'PRESTATAIRE', email_verified: true, prestataire_valide: true })

    await router.push('/prestataire/services')

    expect(router.currentRoute.value.name).toBe('prestataire-services')
  })
})
