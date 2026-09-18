# Référence du code frontend MIMOSY

## Flux général

```text
Vue
  ↓
Store Pinia
  ↓
Service métier
  ↓
apiFetch
  ↓
API Django REST
```

Les vues ne doivent pas construire directement les requêtes HTTP. Les stores portent les données, l'état de chargement et les erreurs. Les services connaissent les URLs déclarées dans `src/config/api.js`.

## Configuration

- `src/config/api.js` : URL de base `VITE_API_BASE_URL` et chemins Django réels.
- `src/config/navigation.js` : entrées visuelles de navigation par rôle.
- `src/config/navigator.js` : normalisation des rôles, accès aux menus et accueil par rôle.
- `src/router/index.js` : routes publiques, routes protégées et guard JWT/rôle.

Le rôle utilisé par le router vient de la réponse réelle de `/api/auth/login/`, dans `data.user.role`. Les valeurs attendues sont `CLIENT`, `PRESTATAIRE` et `ADMIN`.

## Services

- `src/services/api.js` centralise `fetch`, `Authorization: Bearer`, JSON, FormData, erreurs HTTP et renouvellement de l'access token.
- `authService.js` appelle login, inscription, refresh et logout.
- `profileService.js` appelle le profil courant et sa photo.
- `catalogueService.js` appelle catégories, services et profils prestataires.
- `demandePrestationService.js` appelle les routes `Demande-prestation` réellement déclarées par Django.

## Stores Pinia

- `auth.js` : session et rôle réel.
- `clientProfil.js` : profil authentifié, réutilisé par l'en-tête et le layout.
- `catalogue.js` : catégories/services, avec cache mémoire `isLoaded`.
- `prestataire.js` : profils publics et détail d'un profil.
- `demandePrestation.js` : liste, détail et création des demandes du client.

Les collections initiales sont toujours vides. Aucune donnée métier n'est créée avec un identifiant local ou `Date.now()` dans les flux API client.

## Pages client connectées

### `HomeClient.vue`

Charge en parallèle :

- `GET /api/categories/`
- `GET /api/services/`
- `GET /api/prestataires/`
- `GET /api/Demande-prestation`

Les cartes de catégories, prestataires et demandes reçoivent des props issues des stores. Les notes, distances, photos, coordonnées et notifications ne sont pas fabriquées lorsque le backend ne les fournit pas.

### `MesDemandes.vue`

Affiche les demandes de `GET /api/Demande-prestation`. Le bouton Détails utilise la route nommée `detais.demande` avec `params.id`, donc il transmet l'UUID réel :

```js
router.push({
  name: 'detais.demande',
  params: { id: String(id) },
})
```

Cette méthode évite de dépendre d'une concaténation de chemin et conserve le contrat dynamique du router.

### `DetailsDemandes.vue`

Utilise `useRoute().params.id`, puis appelle :

```text
GET /api/Demande-prestation/<uuid>
```

La page affiche exclusivement les champs du serializer Django : `id`, `client`, `prestataire`, `description`, `date_souhaitee`, `statut`, `budget` et `date_creation`. Les devis, messages, photos, localisation et avis restent absents tant que le backend ne les renvoie pas.

### `PrestataireProfil.vue`

Le bouton « Demander une prestation » ouvre un formulaire réel. Le store envoie `prestataire`, `description`, `date_souhaitee` et `budget` vers `POST /api/Demande-prestation`. Le champ `client` n'est jamais envoyé : Django l'associe à `request.user` grâce au JWT.

La page utilise également la réponse enrichie de `GET /api/prestataires/<uuid>/` pour afficher les offres, catégories, tarifs et compétences réelles. Les avis, réalisations et localisation restent des états vides car aucune API correspondante n'est disponible.

## États d'interface

Chaque écran API prévoit :

- chargement avec `isLoading` ;
- erreur avec `errorMessage` ;
- collection vide ;
- données reçues depuis Django.

Une collection vide signifie qu'aucune donnée réelle n'a été retournée. Elle ne doit pas être remplie avec des exemples pour embellir l'interface.

## Fonctionnalités non connectées

Le backend actuel n'expose pas d'API REST pour :

- messages et conversations ;
- notifications ;
- avis ;
- rendez-vous ;
- demandes reçues côté prestataire ;
- gestion complète des offres prestataire ;
- localisation client.

Les écrans correspondants peuvent exister visuellement, mais ne doivent pas prétendre afficher ou enregistrer des données réelles tant que les modèles, serializers, vues et URLs Django nécessaires ne sont pas disponibles.

## Règle d'ajout

Pour une nouvelle page :

1. vérifier l'URL et la méthode dans Django ;
2. ajouter le chemin dans `api.js` ;
3. créer le service ;
4. créer ou réutiliser un store ;
5. connecter la vue aux états du store ;
6. ajouter un guard de rôle si nécessaire ;
7. tester le build et le parcours réel.

Une donnée absente de la réponse backend doit rester absente ou être indiquée comme non disponible. Elle ne doit pas être remplacée par un nom, un prix, une date, une image ou un identifiant inventé.
