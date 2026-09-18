# Architecture frontend MIMOSY

## 1. Architecture générale

Le frontend Vue 3 suit ce flux :

```text
Vue
  ↓
Pinia
  ↓
Services API
  ↓
Client HTTP centralisé
  ↓
API Django REST Framework
  ↓
Base de données
```

Les composants affichent les données et émettent des interactions. Les stores Pinia portent l'état réutilisable, les services connaissent les endpoints Django et `src/services/api.js` gère la communication HTTP commune.

## 2. Rôle de Vue

`src/views/` contient les pages liées aux routes. `src/components/` contient les éléments réutilisables de l'interface. Une page ne doit pas connaître la gestion du token ou construire plusieurs variantes de l'URL backend : elle appelle un store, puis affiche ses états `isLoading`, `errorMessage` et ses données.

## 3. Rôle de Pinia

Les stores de `src/stores/` sont les sources d'état frontend :

- `auth.js` : utilisateur authentifié, rôle backend, connexion, inscription et déconnexion.
- `clientProfil.js` : profil courant et photo, en conservant l'API déjà utilisée par les composants existants.
- `catalogue.js` : catégories et services du catalogue, chargés une fois grâce à `isLoaded`.
- `prestataire.js` : liste et détail des profils prestataires.
- `demandePrestation.js` : demandes du client connecté, détail et création.

Les tableaux démarrent vides. Aucun store ne contient de fournisseur, demande ou notification fictive.

## 4. Rôle des services

Les services de `src/services/` isolent les contrats Django :

- `api.js` : URL de base, Bearer token, JSON, FormData, erreurs HTTP et renouvellement du token.
- `authService.js` : `/api/auth/login/`, `/api/auth/register/`, `/api/auth/token/refresh/` et `/api/auth/logout/`.
- `profileService.js` : `/api/auth/profile/` et `/api/auth/profile/photo/`.
- `catalogueService.js` : catégories, services et profils prestataires réellement exposés.
- `demandePrestationService.js` : routes `Demande-prestation` réellement branchées dans Django.

Les APIs de messages, avis, notifications, rendez-vous, devis et localisation ne sont pas appelées : elles ne sont pas exposées par le backend actuel.

## 5. Configuration

`src/config/api.js` contient `API_BASE_URL`, dérivée de `VITE_API_BASE_URL`, avec `http://localhost:8000` comme valeur de développement. Les chemins d'API sont centralisés dans `API_ENDPOINTS`.

Une URL backend n'est donc pas répétée dans les vues ou stores.

## 6. `navigator.js`

`src/config/navigator.js` centralise :

- la normalisation des rôles (`CLIENT`, `PRESTATAIRE`, `ADMIN`) ;
- la récupération des entrées de menu par rôle ;
- la route d'accueil connue pour chaque rôle ;
- la vérification de `meta.roles` d'une route.

Le menu réutilise `src/config/navigation.js`. Les entrées ADMIN existantes sont conservées comme configuration, mais les routes admin correspondantes ne sont pas déclarées dans le router actuel : elles ne sont donc pas présentées comme fonctionnelles.

## 7. Authentification JWT

La connexion envoie l'email et le mot de passe à `/api/auth/login/`. Django renvoie `access`, `refresh` et `user`, dont le rôle réel est stocké dans Pinia et `localStorage`.

Pour une requête authentifiée, `apiFetch` ajoute :

```text
Authorization: Bearer <access token>
```

Si l'access token répond `401`, le refresh token est envoyé à `/api/auth/token/refresh/`, puis la requête initiale est rejouée une seule fois avec le nouvel access token. En cas d'échec, l'appel remonte une erreur ; la déconnexion efface les trois valeurs de session.

Le frontend n'envoie jamais `client` lors de la création d'une demande : Django l'associe à `request.user`.

## 8. Navigation par rôle

Le router contient `meta.requiresAuth` et `meta.roles` sur les espaces client/prestataire et sur la messagerie partagée. Le guard :

1. redirige un utilisateur non connecté vers `/login` ;
2. vérifie le rôle réel conservé par `authStore` ;
3. redirige un rôle non autorisé vers son accueil connu.

Les rôles sont comparés aux valeurs Django en majuscules. Le rôle `ADMIN` est reconnu par la configuration, mais aucun espace admin n'est actuellement déclaré dans `src/router/index.js`.

## 9. Communication avec Django

Endpoints réellement utilisés :

| Fonction | Endpoint |
|---|---|
| Connexion | `POST /api/auth/login/` |
| Inscription | `POST /api/auth/register/` |
| Refresh | `POST /api/auth/token/refresh/` |
| Logout | `POST /api/auth/logout/` |
| Profil | `GET/PATCH /api/auth/profile/` |
| Photo | `POST /api/auth/profile/photo/` |
| Catégories | `GET /api/categories/` |
| Services | `GET /api/services/` |
| Profils prestataires | `GET /api/prestataires/`, `GET /api/prestataires/<uuid>/` |
| Demandes client | `GET/POST /api/Demande-prestation` |
| Demande détaillée | `GET/PATCH /api/Demande-prestation/<uuid>` |

Les routes de prestations ont été reprises exactement avec leur casse et sans slash final, car c'est ainsi qu'elles sont déclarées dans Django.

## 10. Gestion des états et erreurs

Chaque store active `isLoading` avant l'appel, efface l'ancienne erreur, stocke `errorMessage` en cas d'échec et remet `isLoading` à `false` dans `finally`. Les pages client affichent les états de chargement, d'erreur et vide.

Le client HTTP transforme les réponses non-2xx en erreurs avec `status`, `data` et un message lisible. Il respecte `FormData` sans ajouter un `Content-Type` JSON qui empêcherait le navigateur de calculer la boundary multipart.

## 11. Cache Pinia

Le catalogue est peu dynamique : `catalogueStore.chargerCatalogue()` ne refait pas immédiatement la requête après un chargement réussi. Les demandes restent rechargeables avec `chargerDemandes(true)` car leur statut peut changer. Les profils prestataires sont rechargés explicitement lorsque la page les demande.

Ce cache reste en mémoire et n'est pas présenté comme une persistance backend.

## 12. Flux d'une requête

```text
TrouverService.vue
  ↓ usePrestataireStore().chargerPrestataires()
prestataire.js
  ↓ catalogueService.listProviders()
services/catalogueService.js
  ↓ apiFetch('/api/prestataires/')
services/api.js
  ↓ Bearer JWT si disponible
Django ListAPIView
  ↓
Base de données
  ↓
JSON
  ↓
Pinia
  ↓
ServiceCard.vue
```

## 13. Ajouter une fonctionnalité

Pour une future fonctionnalité réelle, respecter cet ordre :

1. Vérifier qu'un endpoint Django existe, avec sa méthode, ses permissions et son schéma de réponse.
2. Ajouter le chemin dans `src/config/api.js`.
3. Créer un service ciblé dans `src/services/` qui appelle `apiFetch`.
4. Créer un store Pinia uniquement si l'état est partagé ou doit être mis en cache.
5. Ajouter les états `isLoading`, `errorMessage`, données vides et sélection éventuelle.
6. Brancher la vue ou le composant au store.
7. Ajouter `meta.requiresAuth` et `meta.roles` si la route est protégée.
8. Tester le build et le flux avec le backend réel.

### Exemple : favoris prestataires

```text
components/FavoriButton.vue
  ↓
stores/favori.js
  ↓
services/favoriService.js
  ↓
API Django des favoris
  ↓
Base de données
```

Cette structure ne doit être créée que lorsque l'API Django des favoris existe réellement. Sans modèle, serializer, vue et URL backend, la fonctionnalité est à signaler comme non implémentée et aucun mock frontend ne doit la remplacer.

## État actuel et limites

Les pages client `HomeClient`, `TrouverService`, `MesDemandes` et `DetailsDemandes` utilisent maintenant les réponses API réelles. Les pages prestataire sans endpoint correspondant utilisent des collections vides et des états indisponibles ; elles ne sont pas converties en appels inventés, car le backend n'expose pas les endpoints nécessaires pour toutes ces fonctionnalités.

Les pages avis, messagerie, notifications et rendez-vous restent donc des interfaces existantes mais non connectées à une API Django correspondante. Le build frontend doit être considéré comme la validation de compilation, pas comme une preuve de disponibilité du backend ou d'une base de données de test.
