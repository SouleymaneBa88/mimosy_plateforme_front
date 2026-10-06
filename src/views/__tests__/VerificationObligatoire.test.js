// Vérification e-mail obligatoire : utilisateur connecté mais non vérifié.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/authService', () => ({
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getStoredUser: vi.fn(() => null),
  storeUser: vi.fn(),
}))
vi.mock('@/services/profileService', () => ({ getProfile: vi.fn() }))
vi.mock('@/composables/useLocation', () => ({
  useLocation: () => ({
    requestLocation: () => Promise.reject(new Error('test')),
    memoriserPositionSiLocalisationExiste: vi.fn(),
  }),
}))

import * as authService from '@/services/authService'
import { getProfile } from '@/services/profileService'
import { useAuthStore } from '@/stores/auth'
import VerifierEmail from '../VerifierEmail.vue'
import LoginPage from '../LoginPage.vue'

const UTILISATEUR = { id: 1, email: 'awa@example.com', role: 'CLIENT', email_verified: false }

function erreurApi(status, data) {
  return Object.assign(new Error(data?.detail || 'erreur'), { status, data })
}

// Simule une session existante (jeton + utilisateur gardés dans le navigateur).
function connecter(utilisateur) {
  localStorage.setItem('mimosy_access_token', 'jeton')
  authService.getStoredUser.mockReturnValue(utilisateur)
}

async function monter(composant, url) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verifier-email', name: 'verifier-email', component: VerifierEmail },
      { path: '/login', name: 'login', component: LoginPage },
      { path: '/client', name: 'client-home', component: { template: '<div />' } },
      { path: '/', name: 'landing', component: { template: '<div />' } },
    ],
  })
  router.push(url)
  await router.isReady()
  const wrapper = mount(composant, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  authService.getStoredUser.mockReturnValue(null)
  localStorage.clear()
  sessionStorage.clear()
  setActivePinia(createPinia())
})

describe('store auth', () => {
  it('emailNonVerifie : vrai seulement pour un compte connecté explicitement non vérifié', () => {
    connecter(UTILISATEUR)
    expect(useAuthStore().emailNonVerifie).toBe(true)

    setActivePinia(createPinia())
    connecter({ ...UTILISATEUR, email_verified: true })
    expect(useAuthStore().emailNonVerifie).toBe(false)

    // Ancienne session sans le champ : jamais bloquée par erreur.
    setActivePinia(createPinia())
    connecter({ id: 1, email: 'awa@example.com', role: 'CLIENT' })
    expect(useAuthStore().emailNonVerifie).toBe(false)

    // Administrateur : jamais concerné.
    setActivePinia(createPinia())
    connecter({ ...UTILISATEUR, role: 'ADMIN' })
    expect(useAuthStore().emailNonVerifie).toBe(false)
  })

  it('rafraichirUtilisateur actualise l’état depuis le serveur', async () => {
    connecter(UTILISATEUR)
    getProfile.mockResolvedValue({ email_verified: true })
    const store = useAuthStore()

    expect(await store.rafraichirUtilisateur()).toBe(true)
    expect(store.emailNonVerifie).toBe(false)
    expect(authService.storeUser).toHaveBeenCalledWith(expect.objectContaining({ email_verified: true }))
  })
})

describe('page « adresse non vérifiée » (connecté)', () => {
  it('affiche le message demandé, l’adresse, sans champ e-mail à saisir', async () => {
    connecter(UTILISATEUR)

    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    expect(wrapper.text()).toContain("Votre adresse e-mail n'est pas encore vérifiée.")
    expect(wrapper.find('[data-test="email-inscription"]').text()).toBe('awa@example.com')
    expect(wrapper.find('#email-renvoi').exists()).toBe(false)
  })

  it('renvoi : appelle l’API en mode connecté et applique le délai du serveur', async () => {
    connecter(UTILISATEUR)
    authService.resendVerificationEmail.mockResolvedValue({
      detail: 'Un lien de vérification a été envoyé à votre adresse e-mail. Vérifiez votre boîte de réception.',
      retry_after: 60,
    })
    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.resendVerificationEmail).toHaveBeenCalledWith('awa@example.com', { connecte: true })
    expect(wrapper.text()).toContain('Un lien de vérification a été envoyé')
    expect(wrapper.find('[data-test="bouton-renvoi"]').text()).toBe('Renvoyer le lien (60 s)')
  })

  it('renvoi trop rapide (429) : message et compte à rebours du serveur', async () => {
    connecter(UTILISATEUR)
    authService.resendVerificationEmail.mockRejectedValue(
      erreurApi(429, {
        code: 'renvoi_trop_rapide',
        detail: "Un lien vient d'être envoyé. Patientez 42 secondes avant d'en demander un nouveau.",
        retry_after: 42,
      }),
    )
    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="erreur-renvoi"]').text()).toContain('Patientez 42 secondes')
    expect(wrapper.find('[data-test="bouton-renvoi"]').attributes('disabled')).toBeDefined()
  })

  it('erreur Brevo (503) : message lisible, jamais d’erreur technique', async () => {
    connecter(UTILISATEUR)
    authService.resendVerificationEmail.mockRejectedValue(
      erreurApi(503, {
        code: 'envoi_impossible',
        detail: "Impossible d'envoyer l'e-mail pour le moment. Veuillez réessayer plus tard.",
      }),
    )
    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="erreur-renvoi"]').text()).toBe(
      "Impossible d'envoyer l'e-mail pour le moment. Veuillez réessayer plus tard.",
    )
  })

  it('« J’ai vérifié mon adresse » : actualise l’état utilisateur', async () => {
    connecter(UTILISATEUR)
    getProfile.mockResolvedValueOnce({ email_verified: false }).mockResolvedValueOnce({ email_verified: true })
    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    await wrapper.find('[data-test="bouton-deja-verifie"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain("Votre adresse e-mail n'est pas encore vérifiée. Cliquez sur le lien")

    await wrapper.find('[data-test="bouton-deja-verifie"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Votre adresse e-mail a été vérifiée.')
    expect(useAuthStore().emailNonVerifie).toBe(false)
  })

  it('après clic sur le lien, l’état de la session est mis à jour', async () => {
    connecter(UTILISATEUR)
    authService.verifyEmail.mockResolvedValue({ email_verified: true, email: 'awa@example.com' })

    const { wrapper } = await monter(VerifierEmail, '/verifier-email?token=abc')

    expect(wrapper.text()).toContain('Votre adresse e-mail a été vérifiée.')
    expect(useAuthStore().emailNonVerifie).toBe(false)
  })
})

describe('après inscription', () => {
  it('envoi échoué (cas B) : message explicite et renvoi proposé', async () => {
    sessionStorage.setItem('mimosy_email_a_verifier', 'awa@example.com')
    sessionStorage.setItem('mimosy_envoi_verification_echoue', '1')

    const { wrapper } = await monter(VerifierEmail, '/verifier-email')

    expect(wrapper.text()).toContain("n'a pas pu être envoyé")
    expect(wrapper.find('[data-test="bouton-renvoi"]').exists()).toBe(true)
  })
})

describe('connexion', () => {
  async function seConnecter(wrapper, motDePasse = 'UnMotDePasseLong2026') {
    await wrapper.find('#email').setValue('awa@example.com')
    await wrapper.find('#password').setValue(motDePasse)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  it('compte non vérifié : redirigé vers la page de vérification', async () => {
    authService.login.mockImplementation(async () => {
      localStorage.setItem('mimosy_access_token', 'jeton')
      return { user: UTILISATEUR }
    })
    const { wrapper, router } = await monter(LoginPage, '/login')

    await seConnecter(wrapper)

    expect(router.currentRoute.value.name).toBe('verifier-email')
  })

  it('compte vérifié : redirigé vers son espace', async () => {
    authService.login.mockImplementation(async () => {
      localStorage.setItem('mimosy_access_token', 'jeton')
      return { user: { ...UTILISATEUR, email_verified: true } }
    })
    const { wrapper, router } = await monter(LoginPage, '/login')

    await seConnecter(wrapper)

    expect(router.currentRoute.value.path).toBe('/client')
  })

  it('un mot de passe de plus de 8 caractères est accepté (pas de règle de création à la connexion)', async () => {
    const { wrapper } = await monter(LoginPage, '/login')

    await wrapper.find('#email').setValue('awa@example.com')
    await wrapper.find('#password').setValue('UnMotDePasseLong2026!')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('identifiants refusés (401) : message en français', async () => {
    authService.login.mockRejectedValue(
      erreurApi(401, { detail: 'No active account found with the given credentials' }),
    )
    const { wrapper } = await monter(LoginPage, '/login')

    await seConnecter(wrapper)

    expect(wrapper.text()).toContain('Adresse e-mail ou mot de passe incorrect.')
    expect(wrapper.text()).not.toContain('No active account')
  })
})
