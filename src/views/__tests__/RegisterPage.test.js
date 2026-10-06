import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/authService', () => ({
  register: vi.fn(),
  getStoredUser: () => null,
}))

import * as authService from '@/services/authService'
import RegisterPage from '../RegisterPage.vue'

async function monter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', name: 'register', component: RegisterPage },
      { path: '/verifier-email', name: 'verifier-email', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/', name: 'landing', component: { template: '<div />' } },
    ],
  })
  router.push('/register')
  await router.isReady()
  const wrapper = mount(RegisterPage, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function remplir(wrapper, champs = {}) {
  const valeurs = {
    firstName: 'Amadou',
    lastName: 'Diallo',
    email: 'amadou@example.com',
    phone: '77 123 45 67',
    password: 'motdepasse123',
    passwordConfirmation: 'motdepasse123',
    ...champs,
  }
  for (const [id, valeur] of Object.entries(valeurs)) {
    await wrapper.find(`#${id}`).setValue(valeur)
  }
  await wrapper.find('input[type="checkbox"]').setValue(true)
}

const boutonEnvoi = (wrapper) => wrapper.find('button[type="submit"]')

describe('RegisterPage.vue — contrôles de saisie', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('formulaire valide : bouton actif', async () => {
    const { wrapper } = await monter()
    await remplir(wrapper)

    expect(boutonEnvoi(wrapper).attributes('disabled')).toBeUndefined()
  })

  it.each([
    ['email', 'amadou@', 'Veuillez saisir une adresse e-mail valide.'],
    ['password', 'abc12', 'au moins 8 caractères'],
    ['passwordConfirmation', 'autre12345', 'ne correspondent pas'],
    ['firstName', 'Am4dou', 'ne peut contenir que des lettres'],
    ['phone', '74 123 45 67', 'mobile sénégalais'],
  ])('champ %s invalide : message affiché et envoi bloqué', async (champ, valeur, message) => {
    const { wrapper } = await monter()
    await remplir(wrapper, { [champ]: valeur })

    expect(wrapper.text()).toContain(message)
    expect(boutonEnvoi(wrapper).attributes('disabled')).toBeDefined()
  })

  it('envoie des données normalisées puis redirige vers la vérification e-mail', async () => {
    authService.register.mockResolvedValue({ email_verification_envoyee: true })
    const { wrapper, router } = await monter()
    await remplir(wrapper, { email: '  amadou@example.com ', firstName: 'N’Deye' })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const envoi = authService.register.mock.calls[0][0]
    expect(envoi).toMatchObject({
      email: 'amadou@example.com',
      first_name: "N'Deye",
      phone: '771234567',
      role: 'CLIENT',
    })
    expect(router.currentRoute.value.name).toBe('verifier-email')
    expect(sessionStorage.getItem('mimosy_email_a_verifier')).toBe('amadou@example.com')
  })

  it('affiche l’erreur API sous le champ concerné (e-mail déjà utilisé)', async () => {
    authService.register.mockRejectedValue(
      Object.assign(new Error('x'), {
        status: 400,
        data: { email: ['Cette adresse e-mail est déjà utilisée.'] },
      }),
    )
    const { wrapper } = await monter()
    await remplir(wrapper)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Cette adresse e-mail est déjà utilisée.')
    expect(wrapper.text()).not.toContain('400')

    // Corriger le champ efface l'erreur du serveur.
    await wrapper.find('#email').setValue('autre@example.com')
    expect(wrapper.text()).not.toContain('Cette adresse e-mail est déjà utilisée.')
  })
})
