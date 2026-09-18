import { ref } from 'vue'
import { saveLocation } from '@/services/locationService'

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
        async (position) => {
          try {
            // On garde 6 décimales pour respecter le DecimalField de Django
            const latitude = Number(position.coords.latitude.toFixed(6))
            const longitude = Number(position.coords.longitude.toFixed(6))

            console.log('Position récupérée :', {
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
            })

            await saveLocation(latitude, longitude)

            success.value = true

            resolve({
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
            })
          } catch (err) {
            console.error(
              "Erreur lors de l'enregistrement de la localisation :",
              err
            )

            error.value =
              'Impossible d’enregistrer votre localisation.'

            reject(err)
          } finally {
            loading.value = false
          }
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

  return {
    loading,
    error,
    success,
    requestLocation,
  }
}