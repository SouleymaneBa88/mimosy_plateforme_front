/**
 * Met en forme une distance en kilomètres pour l'affichage à un client
 * français (virgule décimale, une décimale dans le cas général).
 *
 * Une distance réelle mais très petite (ex. 0,04 km) ne doit pas
 * s'afficher comme "0 km" : on garde alors deux décimales plutôt que
 * de laisser croire qu'il n'y a aucune distance.
 */
export function formaterDistanceKm(distanceKm) {
  // Pas de distance : on n'affiche rien.
  if (distanceKm === null || distanceKm === undefined) {
    return ''
  }

  // On transforme en nombre ; si ce n'est pas un nombre, on n'affiche rien.
  const valeur = Number(distanceKm)

  if (Number.isNaN(valeur)) {
    return ''
  }

  // On arrondit à une décimale.
  let arrondie = Math.round(valeur * 10) / 10

  // Une vraie petite distance arrondie à 0 : on garde deux décimales.
  if (arrondie === 0 && valeur > 0) {
    arrondie = Math.round(valeur * 100) / 100
  }

  // On remplace le point par une virgule (format français).
  return `${arrondie.toString().replace('.', ',')} km`
}
