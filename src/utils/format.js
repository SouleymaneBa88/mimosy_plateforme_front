/**
 * Met en forme une distance en kilomètres pour l'affichage à un client
 * français (virgule décimale, une décimale dans le cas général).
 *
 * Une distance réelle mais très petite (ex. 0,04 km) ne doit pas
 * s'afficher comme "0 km" : on garde alors deux décimales plutôt que
 * de laisser croire qu'il n'y a aucune distance.
 */
export function formaterDistanceKm(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return ''
  }

  const valeur = Number(distanceKm)

  if (Number.isNaN(valeur)) {
    return ''
  }

  let arrondie = Math.round(valeur * 10) / 10

  if (arrondie === 0 && valeur > 0) {
    arrondie = Math.round(valeur * 100) / 100
  }

  return `${arrondie.toString().replace('.', ',')} km`
}
