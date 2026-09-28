import { ref } from 'vue'
import { getMyLocation, updateLocationCoordinates } from '@/services/locationService'

/**
 * Géolocalisation du navigateur.
 *
 * requestLocation() ne fait que récupérer latitude/longitude : elle ne
 * tente plus, à elle seule, d'enregistrer une localisation complète
 * côté backend. Le GPS ne fournit jamais d'adresse/ville/quartier
 * fiables, et LocalisationSerializer les exige pour créer une
 * localisation — les inventer produirait des données fausses.
 *
 * memoriserPositionSiLocalisationExiste() est un second geste,
 * volontairement séparé : si l'utilisateur a déjà une localisation
 * enregistrée (adresse déjà connue), on met seulement à jour ses
 * coordonnées GPS. S'il n'en a pas encore, on ne crée rien : mieux
 * vaut ne pas mémoriser sa position que de fabriquer une adresse.
 */
export function useLocation() {
  const loading = ref(false)
  const error = ref(null)
  const success = ref(false)

  function requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        error.value =
          'La géolocalisation n’est pas supportée par votre navigateur.'

        reject(new Error(error.value))
        return
      }

      loading.value = true
      error.value = null
      success.value = false

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // On garde 6 décimales pour respecter le DecimalField de Django
          const latitude = Number(position.coords.latitude.toFixed(6))
          const longitude = Number(position.coords.longitude.toFixed(6))

          loading.value = false
          success.value = true

          resolve({
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
          })
        },

        (err) => {
          loading.value = false

          switch (err.code) {
            case err.PERMISSION_DENIED:
              error.value =
                'Vous avez refusé l’accès à votre localisation.'
              break

            case err.POSITION_UNAVAILABLE:
              error.value =
                'Votre position est indisponible.'
              break

            case err.TIMEOUT:
              error.value =
                'La récupération de votre position a expiré.'
              break

            default:
              error.value =
                'Impossible de récupérer votre localisation.'
          }

          reject(err)
        },

        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      )
    })
  }

  /**
   * Tentative silencieuse de mise à jour des coordonnées d'une
   * localisation déjà enregistrée. N'échoue jamais bruyamment : un
   * appelant comme la connexion ne doit pas être bloqué par ça.
   */
  async function memoriserPositionSiLocalisationExiste(latitude, longitude) {
    try {
      const localisation = await getMyLocation()

      if (localisation) {
        await updateLocationCoordinates(localisation.id, latitude, longitude)
      }
    } catch (err) {
      console.warn(
        'Impossible de mettre à jour la localisation enregistrée :',
        err
      )
    }
  }

  /**
   * Position de référence pour une recherche « Autour de moi » :
   *   1. la position du navigateur (GPS), si l'utilisateur l'autorise ;
   *   2. sinon, la localisation qu'il a lui-même enregistrée dans son
   *      profil (adresse réelle), si elle existe ;
   *   3. sinon, échec avec un message clair — jamais une coordonnée fixe.
   *
   * Renvoie { latitude, longitude, source: 'gps' | 'adresse', libelle }.
   */
  async function positionPourRecherche() {
    try {
      const position = await requestLocation()
      return { ...position, source: 'gps', libelle: '' }
    } catch (erreurGps) {
      const messageGps = error.value
      loading.value = true
      let enregistree = null
      try {
        enregistree = await getMyLocation()
      } catch {
        // Localisation enregistrée illisible : on reste sur l'erreur GPS.
      } finally {
        loading.value = false
      }

      const latitude = Number(enregistree?.latitude)
      const longitude = Number(enregistree?.longitude)
      if (enregistree && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        error.value = null
        return {
          latitude,
          longitude,
          source: 'adresse',
          libelle: [enregistree.quartier, enregistree.ville].filter(Boolean).join(', '),
        }
      }

      error.value = `${messageGps} Vous pouvez aussi enregistrer votre adresse dans votre profil pour rechercher autour d’elle.`
      throw erreurGps
    }
  }

  return {
    loading,
    error,
    success,
    requestLocation,
    positionPourRecherche,
    memoriserPositionSiLocalisationExiste,
  }
}
