import { defineStore } from 'pinia'
import * as profileService from '@/services/profileService'

function normaliserProfil(data) {
  return {
    id: data.id ?? null,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    nomComplet: data.nom_complet ?? `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
    email: data.email ?? '',
    indicatif: '+221',
    telephone: data.telephone ?? '',
    photo: data.photo ?? '',
    role: data.role ?? '',
  }
}

// Source unique du profil client, alimentee par l'API Django authentifiee.
export const useClientProfilStore = defineStore('clientProfil', {
  state: () => ({
    profil: {
      id: null,
      firstName: '',
      lastName: '',
      nomComplet: '',
      email: '',
      indicatif: '+221',
      telephone: '',
      photo: '',
      role: '',
    },
    isLoading: false,
    isLoaded: false,
    errorMessage: '',
  }),

  getters: {
    nomComplet: (state) => state.profil.nomComplet || 'Utilisateur Mimosy',
    photoProfil: (state) => state.profil.photo,
  },

  actions: {
    async chargerProfil() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const data = await profileService.getProfile()

        Object.assign(this.profil, normaliserProfil(data))
        this.isLoaded = true
      } catch (error) {
        this.errorMessage = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async mettreAJourProfil(payload) {
      this.isLoading = true
      this.errorMessage = ''

      try {
        // email/telephone sont protégés côté backend (voir ProfileSerializer.read_only_fields) :
        // aucun processus de vérification de changement n'existe encore, donc on ne les envoie
        // même pas ici, pour ne jamais laisser croire à l'utilisateur qu'ils ont été modifiés.
        const data = await profileService.updateProfile({
            first_name: payload.firstName,
            last_name: payload.lastName,
        })

        Object.assign(this.profil, normaliserProfil(data))
      } catch (error) {
        this.errorMessage = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async mettreAJourPhoto(fichier) {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const data = await profileService.updateProfilePhoto(fichier)

        Object.assign(this.profil, normaliserProfil(data))
      } catch (error) {
        this.errorMessage = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },
  },
})
