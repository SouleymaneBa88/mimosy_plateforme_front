import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/adminService', () => ({
  getDossierVerification: vi.fn(),
  deciderDossier: vi.fn(),
  validerDocument: vi.fn(),
  rejeterDocument: vi.fn(),
  recupererFichierProtege: vi.fn().mockResolvedValue('blob:fichier'),
}))
vi.mock('@/components/layout/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))

import * as adminService from '@/services/adminService'
import DossierVerification from '../DossierVerification.vue'

function dossier(statut = 'DOSSIER_EN_REVUE') {
  return {
    id: 'd1',
    nom_complet: 'Awa Ndiaye',
    email: 'awa@test.sn',
    statut,
    statut_libelle: statut,
    decision: '',
    soumis_le: '2026-10-02T10:00:00Z',
    profil: { metier: 'Électricien', domaine: 'Électricité', services: ['Installation'], experience_annees: 8,
      zone_intervention: 'Dakar', disponibilites: 'Lundi-samedi', description: 'Électricien.', telephone: '771111111' },
    documents: [{ id: 'doc1', type_document: 'PIECE_IDENTITE', type_libelle: "Pièce d'identité", statut: 'A_VERIFIER',
      statut_libelle: 'À vérifier', fichier_url: '/api/verification/document/doc1/fichier/',
      resultat_comparaison: { champs: { nom: { profil: 'Ndiaye', document: 'FALL', correspond: false } } } }],
    analyse_competence: { type_document_detecte: 'Certificat', conclusion: { etat: 'VERIFICATION_NECESSAIRE' }, observations: '' },
    analyse_coherence: { resume: 'Résumé.', profil_complet: true, identite_coherente: false, competence_coherente: null,
      incoherences: ['Le nom diffère.'], points_a_verifier: ['Justificatif à lire.'], mode: 'regles' },
    entretiens: [{ id: 'e1', statut: 'TERMINE', debut: '2026-10-02T09:00:00Z', duree_secondes: 118, mode: 'regles',
      consentement_le: '2026-10-02T09:00:00Z', transcription: '[00:05] Fassa (IA) : Bonjour',
      enregistrement_url: '/api/verification/entretiens/e1/enregistrement/',
      rapport: { resume: 'Entretien complet.', experience_declaree: '8 an(s)', services_mentionnes: [], points_coherents: ['Expérience cohérente.'],
        points_a_verifier: [], incoherences_detectees: [], niveau_confiance: 'informationnel' } }],
    historique: [{ type: 'SOUMISSION', message: 'Dossier transmis.', date: '2026-10-02T10:00:00Z', acteur: null }],
  }
}

async function monter() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin/dossiers', component: { template: '<div />' } }] })
  router.push('/admin/dossiers')
  await router.isReady()
  const wrapper = mount(DossierVerification, { props: { id: 'd1' }, global: { plugins: [router], stubs: { teleport: true } } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('dossier admin', () => {
  it('affiche le dossier complet : analyses, vidéo, transcription, rapport, historique', async () => {
    adminService.getDossierVerification.mockResolvedValue(dossier())

    const wrapper = await monter()

    expect(wrapper.find('[data-test="coherence"]').text()).toContain('Le nom diffère.')
    expect(wrapper.text()).toContain('FALL')
    expect(wrapper.find('[data-test="video"]').attributes('src')).toBe('blob:fichier')
    expect(wrapper.find('[data-test="transcription"]').text()).toContain('Fassa (IA) : Bonjour')
    expect(wrapper.find('[data-test="rapport"]').text()).toContain('Expérience cohérente.')
    expect(wrapper.find('[data-test="historique"]').text()).toContain('Dossier transmis.')
    expect(adminService.recupererFichierProtege).toHaveBeenCalledWith('/api/verification/entretiens/e1/enregistrement/')
  })

  it('valider n’est possible que pour un dossier en revue', async () => {
    adminService.getDossierVerification.mockResolvedValue(dossier('ENTRETIEN_A_FAIRE'))

    const wrapper = await monter()

    expect(wrapper.find('[data-test="valider"]').attributes('disabled')).toBeDefined()
  })

  it('« À vérifier » : étape et motif transmis, décision enregistrée', async () => {
    adminService.getDossierVerification.mockResolvedValue(dossier())
    adminService.deciderDossier.mockResolvedValue({ ...dossier('A_VERIFIER'), decision: 'A_VERIFIER' })
    const wrapper = await monter()

    await wrapper.find('[data-test="a-verifier"]').trigger('click')
    await wrapper.find('[data-test="etape-a-reprendre"]').setValue('competences')
    await wrapper.find('[data-test="motif"]').setValue('Justificatif illisible.')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(adminService.deciderDossier).toHaveBeenCalledWith('d1', 'A_VERIFIER', 'Justificatif illisible.', 'competences')
    expect(wrapper.find('[data-test="statut"]').text()).toBe('A_VERIFIER')
  })

  it('rejet d’un document : motif obligatoire, transmis à l’API puis dossier rechargé', async () => {
    adminService.getDossierVerification.mockResolvedValue(dossier())
    adminService.rejeterDocument.mockResolvedValue({})
    const wrapper = await monter()

    await wrapper.find('[data-test="document-rejeter"]').trigger('click')
    await wrapper.find('[data-test="document-confirmer-rejet"]').trigger('click')
    expect(adminService.rejeterDocument).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="document"]').text()).toContain('motif')

    await wrapper.find('[data-test="document-motif"]').setValue('Photo floue, illisible.')
    await wrapper.find('[data-test="document-confirmer-rejet"]').trigger('click')
    await flushPromises()

    expect(adminService.rejeterDocument).toHaveBeenCalledWith('doc1', 'Photo floue, illisible.')
    expect(adminService.getDossierVerification).toHaveBeenCalledTimes(2)
  })

  it('historique : décision, motif, acteur et résumé IA figés sont affichés', async () => {
    adminService.getDossierVerification.mockResolvedValue({
      ...dossier(),
      historique: [
        { id: 1, type: 'ANALYSE_IDENTITE', message: "Pièce d'identité analysée (claude).", date: '2026-10-02T09:00:00Z', acteur: null,
          details: { mode: 'claude', resume: 'Identité lisible.', correspondances: { nom: 'oui', prenom: 'non' } } },
        { id: 2, type: 'DOCUMENT_REJETE', message: 'Pièce rejetée', date: '2026-10-02T10:00:00Z', acteur: 'admin@test.sn',
          acteur_nom: 'Fatou Sow', acteur_role: 'ADMIN', details: { decision: 'REJETE', motif: 'Photo floue.', type_libelle: "Pièce d'identité" } },
      ],
    })

    const wrapper = await monter()
    const historique = wrapper.find('[data-test="historique"]').text()

    expect(historique).toContain('Photo floue.')
    expect(historique).toContain('Fatou Sow (Administrateur)')
    expect(historique).toContain('Identité lisible.')
    expect(historique).toContain('Prénom : ne correspond pas')
    // L'IA n'est jamais présentée comme décisionnaire.
    expect(wrapper.text()).toContain("La décision finale revient à l'administrateur")
  })
})
