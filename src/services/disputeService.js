/** Litiges entre clients et prestataires (voir apps.disputes côté backend). */
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api'
import { apiFetch } from './api'

// Mes litiges (le backend filtre déjà selon le rôle connecté : client ou prestataire).
export const listMesLitiges = () => apiFetch(API_ENDPOINTS.litiges)

export const getLitige = (id) => apiFetch(API_ENDPOINTS.litige(id))

export const ouvrirLitige = ({ demandePrestation, motif, descriptionClient, descriptionPrestataire }) =>
  apiFetch(API_ENDPOINTS.litiges, {
    method: 'POST',
    body: {
      demande_prestation: demandePrestation,
      motif,
      description_client: descriptionClient || '',
      description_prestataire: descriptionPrestataire || '',
    },
  })

export const ajouterPreuve = (litigeId, { fichier, typePreuve, description }) => {
  const formData = new FormData()
  formData.append('fichier', fichier)
  formData.append('type_preuve', typePreuve)
  if (description) formData.append('description', description)
  return apiFetch(API_ENDPOINTS.litigeAjouterPreuve(litigeId), { method: 'POST', body: formData })
}

// Confirmation par le prestataire qu'il a refait la prestation contestée
// (voir LitigeViewSet.confirmer_reprise côté backend, seule source de
// vérité sur le respect du délai : ce n'est jamais le frontend qui décide).
export const confirmerReprise = (litigeId, description = '') =>
  apiFetch(API_ENDPOINTS.litigeConfirmerReprise(litigeId), {
    method: 'POST',
    body: { description },
  })

// Le fichier d'une preuve n'est jamais servi via une URL média publique
// (voir PreuveLitigeFichierView côté backend) : il faut un fetch
// authentifié, pas une simple balise <img src>. apiFetch ne convient
// pas ici car elle ne parse que du JSON (voir services/api.js) ; on
// récupère donc le blob nous-mêmes puis on le transforme en URL locale,
// que l'appelant doit révoquer (URL.revokeObjectURL) une fois affichée.
export async function recupererApercuPreuve(preuveId) {
  const token = localStorage.getItem('mimosy_access_token')
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.litigePreuveFichier(preuveId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error("Impossible de charger l'aperçu de cette preuve.")
  }

  const blob = await response.blob()
  return { url: URL.createObjectURL(blob), contentType: blob.type }
}
