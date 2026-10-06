import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/authService', () => ({
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
  getStoredUser: () => null,
  storeUser: vi.fn(),
}))

import * as authService from '@/services/authService'
import VerifierEmail from '../VerifierEmail.vue'

// Erreur telle que la lève apiFetch pour une réponse 400 de Django.
function erreurApi(status, data) {
  return Object.assign(new Error(data?.detail || 'erreur'), { status, data })
}

async function monter(url = '/verifier-email') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verifier-email', name: 'verifier-email', component: VerifierEmail },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/', name: 'landing', component: { template: '<div />' } },
    ],
  })
  router.push(url)
  await router.isReady()
  const wrapper = mount(VerifierEmail, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('VerifierEmail.vue — clic sur le lien', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('confirmation réussie, et le jeton est retiré de l’URL', async () => {
    authService.verifyEmail.mockResolvedValue({ email_verified: true, email: 'awa@example.com' })

    const { wrapper, router } = await monter('/verifier-email?token=abc123')

    expect(authService.verifyEmail).toHaveBeenCalledWith('abc123')
    expect(wrapper.text()).toContain('Votre adresse e-mail a été vérifiée.')
    expect(router.currentRoute.value.query.token).toBeUndefined()
  })

  it.each([
    ['token_expire', 'Lien expiré'],
    ['token_invalide', 'Lien invalide'],
    ['token_deja_utilise', 'Lien déjà utilisé'],
  ])('affiche l’état %s', async (code, titre) => {
    authService.verifyEmail.mockRejectedValue(erreurApi(400, { code, detail: '...' }))

    const { wrapper } = await monter('/verifier-email?token=abc123')

    expect(wrapper.text()).toContain(titre)
  })

  it('erreur serveur', async () => {
    authService.verifyEmail.mockRejectedValue(erreurApi(500, null))

    const { wrapper } = await monter('/verifier-email?token=abc123')

    expect(wrapper.text()).toContain('Une erreur est survenue')
  })

  it('propose le renvoi quand le lien a expiré, pas quand il a déjà servi', async () => {
    authService.verifyEmail.mockRejectedValue(erreurApi(400, { code: 'token_expire' }))
    let { wrapper } = await monter('/verifier-email?token=abc')
    expect(wrapper.find('[data-test="bouton-renvoi"]').exists()).toBe(true)

    authService.verifyEmail.mockRejectedValue(erreurApi(400, { code: 'token_deja_utilise' }))
    ;({ wrapper } = await monter('/verifier-email?token=abc'))
    expect(wrapper.find('[data-test="bouton-renvoi"]').exists()).toBe(false)
  })
})

describe('VerifierEmail.vue — après inscription et renvoi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('affiche l’adresse à laquelle le lien a été envoyé', async () => {
    sessionStorage.setItem('mimosy_email_a_verifier', 'amadou@example.com')

    const { wrapper } = await monter()

    expect(wrapper.text()).toContain('Vérifiez votre adresse e-mail')
    expect(wrapper.find('[data-test="email-inscription"]').text()).toBe('amadou@example.com')
  })

  it('renvoie le lien, affiche le succès puis bloque le bouton', async () => {
    sessionStorage.setItem('mimosy_email_a_verifier', 'amadou@example.com')
    authService.resendVerificationEmail.mockResolvedValue({ detail: 'Un nouveau lien a été envoyé.' })
    const { wrapper } = await monter()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('amadou@example.com', { connecte: false })
    expect(wrapper.text()).toContain('Un nouveau lien a été envoyé.')
    const bouton = wrapper.find('[data-test="bouton-renvoi"]')
    expect(bouton.attributes('disabled')).toBeDefined()
    expect(bouton.text()).toMatch(/Renvoyer le lien \(\d+ s\)/)

    // Un second envoi pendant le délai n'appelle pas l'API.
    await wrapper.find('form').trigger('submit')
    expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1)
  })

  it('refuse un e-mail invalide sans appeler l’API', async () => {
    const { wrapper } = await monter()

    await wrapper.find('#email-renvoi').setValue('pas-un-email')
    await wrapper.find('form').trigger('submit')

    expect(authService.resendVerificationEmail).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Veuillez saisir une adresse e-mail valide.')
  })

  it('message clair en cas de limitation (429)', async () => {
    authService.resendVerificationEmail.mockRejectedValue(erreurApi(429, { detail: 'Request was throttled.' }))
    const { wrapper } = await monter()

    await wrapper.find('#email-renvoi').setValue('amadou@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Trop de demandes')
  })
})
