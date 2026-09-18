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
        const data = await profileService.updateProfile({
            first_name: payload.firstName,
            last_name: payload.lastName,
            email: payload.email,
            telephone: payload.telephone,
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
