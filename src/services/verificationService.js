/** Vérification d'identité et documents KYC du prestataire (pièce d'identité, diplôme, certification, document professionnel). */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Un document précis, par type ("PIECE_IDENTITE" par défaut si omis — voir apps.verification.views).
export const getMonDocument = (typeDocument) =>
  apiFetch(typeDocument ? `${API_ENDPOINTS.verificationDocument}?type_document=${typeDocument}` : API_ENDPOINTS.verificationDocument)

// Tous mes documents, tous types confondus (vue d'ensemble du dossier KYC).
export const getMesDocuments = () => apiFetch(API_ENDPOINTS.verificationDocuments)

export const soumettreDocument = (fichier, typeDocument) => {
  const formData = new FormData()
  formData.append('fichier', fichier)
  if (typeDocument) formData.append('type_document', typeDocument)
  return apiFetch(API_ENDPOINTS.verificationDocument, { method: 'POST', body: formData })
}
