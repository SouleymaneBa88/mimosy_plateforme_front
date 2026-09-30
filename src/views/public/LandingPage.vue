<!--
  Page d'accueil publique (/) : présentation de MIMOSY, barre de recherche,
  catégories de services réelles, fonctionnement, avantages, etc.
  Accessible sans être connecté.
-->
<script setup>
// Outils Vue et routeur.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

// L'adresse du serveur (pour les images) et le store du catalogue.
import { API_BASE_URL } from '@/config/api'
import { useCatalogueStore } from '@/stores/catalogue'

// Le routeur (pour changer de page).
const router = useRouter()

// -----------------------------------------------------------------------------
// Style verre (glassmorphisme) réutilisé partout — aucune ombre
// -----------------------------------------------------------------------------

const glass =
  'border border-white/70 bg-white/60 backdrop-blur-xl backdrop-saturate-150'

// -----------------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------------

// Menu mobile ouvert ?
const isMobileMenuOpen = ref(false)

// Les liens du menu (chaque "target" est l'id d'une section de la page).
const navItems = [
  { label: 'Accueil', target: 'accueil' },
  { label: 'Services', target: 'services' },
  { label: 'Comment ça marche', target: 'fonctionnement' },
  { label: 'Tarifs', target: 'tarifs' },
  { label: 'À propos', target: 'apropos' },
]

// Fait défiler la page jusqu'à la section demandée.
const scrollToSection = (target) => {
  isMobileMenuOpen.value = false

  const element = document.getElementById(target)

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

// -----------------------------------------------------------------------------
// Navigation vers l'authentification
// -----------------------------------------------------------------------------

// Aller à la page de connexion.
const goToLogin = () => {
  isMobileMenuOpen.value = false
  router.push('/login')
}

// Aller à la page d'inscription.
const goToRegister = () => {
  isMobileMenuOpen.value = false
  router.push('/register')
}

// -----------------------------------------------------------------------------
// Recherche
// -----------------------------------------------------------------------------

// Le texte tapé dans la barre de recherche.
const heroSearch = ref('')

// La recherche est transmise à la page Prestataires (?q=...) ; le garde du
// routeur passe d'abord par la connexion si le visiteur n'est pas connecté.
const submitHeroSearch = () => {
  isMobileMenuOpen.value = false
  const q = heroSearch.value.trim()
  router.push({ name: 'client-prestataires', query: q ? { q } : {} })
}

// -----------------------------------------------------------------------------
// Collage du hero (façon Pinterest)
// Ajoute une image dans `image` pour remplacer la tuile graphique.
// -----------------------------------------------------------------------------

// Les trois colonnes d'images / tuiles décoratives du haut de page.
const heroColumns = [
  [
    { image: '/medias/electricien.jpg', alt: 'Électricien au travail', height: 'h-[300px]', bg: 'bg-[#2F6250]', shape: 'circle' },
    { image: null, height: 'h-[220px]', bg: 'bg-[#FFF3ED]', shape: 'arch' },
    { image: null, height: 'h-[240px]', bg: 'bg-[#051F20]', shape: 'ring' },
  ],
  [
    { image: null, height: 'h-[140px]', bg: 'bg-[#8FD9B6]', shape: 'half' },
    { image: '/medias/image.png', alt: 'Prestataire MIMOSY', height: 'h-[360px]', bg: 'bg-[#DAD4C9]', shape: 'circle' },
    { image: null, height: 'h-[280px]', bg: 'bg-[#2F6250]', shape: 'half' },
  ],
  [
    { image: null, height: 'h-[220px]', bg: 'bg-[#051F20]', shape: 'arch' },
    { image: null, height: 'h-[300px]', bg: 'bg-[#DAD4C9]', shape: 'ring' },
    { image: null, height: 'h-[260px]', bg: 'bg-[#FFF3ED]', shape: 'circle' },
  ],
]

// -----------------------------------------------------------------------------
// Services : catégories réelles du catalogue (GET /api/categories/, public,
// uniquement les catégories ACTIVE), via le store partagé avec l'espace client.
// -----------------------------------------------------------------------------

// Le store du catalogue (catégories).
const catalogueStore = useCatalogueStore()

// Au montage, on charge le catalogue.
onMounted(() => {
  catalogueStore.chargerCatalogue().catch(() => {})
})

// Emplacements du bento, dans l'ordre d'affichage des catégories.
const bentoSlots = [
  { bg: 'bg-[#2F6250]', layout: 'sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[380px]' },
  { bg: 'bg-[#FFF3ED]', layout: 'sm:col-span-2 lg:col-span-2 min-h-[300px]' },
  { bg: 'bg-[#DAD4C9]', layout: 'min-h-[300px]' },
]

// Photos locales utilisées tant qu'une catégorie n'a pas d'image en base.
const imagesParDefaut = [
  { motCle: 'electri', image: '/medias/electricien.jpg' },
  { motCle: 'plomb', image: '/medias/plombiuer.jpg' },
  { motCle: 'nettoy', image: '/medias/nettoyageMimosy.jpg' },
]

// Enlève les accents et met en minuscules (pour comparer des mots).
const normaliser = (texte) =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Met la première lettre en majuscule.
const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1)

// Renvoie l'image d'une catégorie : celle de la base, sinon une photo locale selon le nom.
function imageCategorie(categorie) {
  if (categorie.image) {
    return /^https?:\/\//.test(categorie.image) || categorie.image.startsWith('/medias/')
      ? categorie.image
      : `${API_BASE_URL}/${categorie.image.replace(/^\//, '')}`
  }
  const nom = normaliser(categorie.nom)
  return imagesParDefaut.find(({ motCle }) => nom.includes(motCle))?.image || null
}

// Renvoie la description d'une catégorie : la sienne, sinon la liste de ses services.
function descriptionCategorie(categorie) {
  if (categorie.description?.trim()) return categorie.description.trim()
  const nomsServices = (categorie.services || []).map((service) => service.nom)
  if (nomsServices.length) return nomsServices.join(', ')
  return 'Des professionnels disponibles près de chez vous.'
}

// Les catégories affichées (les 3 premières), prêtes pour l'affichage.
const services = computed(() =>
  catalogueStore.categories.slice(0, bentoSlots.length).map((categorie, index) => ({
    id: categorie.id,
    nom: categorie.nom,
    title: majuscule(categorie.nom),
    description: descriptionCategorie(categorie),
    image: imageCategorie(categorie),
    ...bentoSlots[index],
  })),
)

// Nombre de catégories non affichées.
const autresCategories = computed(() =>
  Math.max(catalogueStore.categories.length - bentoSlots.length, 0),
)

// La tuile « et bien plus » comble la grille selon le nombre de catégories.
const bienPlusLayout = computed(() => {
  if (services.value.length === 0) return 'sm:col-span-2 lg:col-span-4'
  if (services.value.length === 1) return 'sm:col-span-2 lg:col-span-2 lg:row-span-2'
  if (services.value.length === 2) return 'sm:col-span-2 lg:col-span-2'
  return ''
})

// Petit texte listant les 3 premiers domaines (ex. "Plomberie, électricité... et bien plus encore.").
const domainesHero = computed(() => {
  const noms = catalogueStore.categories.slice(0, 3).map((categorie) => categorie.nom.toLowerCase())
  if (!noms.length) return ''
  return `${majuscule(noms.join(', '))} et bien plus encore.`
})

// Aller à la recherche de prestataires, filtrée sur une catégorie.
const trouverUnPro = (categorie) => {
  isMobileMenuOpen.value = false
  router.push({
    name: 'client-prestataires',
    query: categorie ? { categorie: categorie.nom } : {},
  })
}

// -----------------------------------------------------------------------------
// Comment ça marche
// -----------------------------------------------------------------------------

// const steps = [
//   {
//     number: '01',
//     title: 'Décrivez votre besoin',
//     description:
//       'Expliquez le service dont vous avez besoin et indiquez votre localisation.',
//   },
//   {
//     number: '02',
//     title: 'Trouvez un professionnel',
//     description:
//       'Consultez les professionnels disponibles correspondant à votre besoin.',
//   },
//   {
//     number: '03',
//     title: 'Échangez et choisissez',
//     description:
//       'Consultez le profil du prestataire et échangez avec lui avant de confirmer.',
//   },
//   {
//     number: '04',
//     title: 'Recevez votre services ',
//     description:
//       'Le professionnel intervient selon les conditions convenues avec vous.',
//   },
// ]

// Passe à true pour réafficher les étapes au-dessus de la vidéo
const showSteps = false

// -----------------------------------------------------------------------------
// Pourquoi choisir MIMOSY
// -----------------------------------------------------------------------------

// Les avantages pour les clients et pour les prestataires.
const benefitsClient = [
  'Des professionnels identifiés et contrôlés',
  'Une mise en relation simple et rapide',
  'Le suivi de vos demandes depuis votre espace client',
]

const benefitsPrestataire = [
  'Présentez vos services à de nouveaux clients',
  'Recevez directement des demandes de prestation',
  'Aucun abonnement. Aucun frais fixe.',
  'Nous prélevons uniquement 10 % du montant de chaque prestation réalisée via la plateforme.',
]

// -----------------------------------------------------------------------------
// Tarif
// -----------------------------------------------------------------------------

const monthlyPrice = '2 000 FCFA'

// Passe à true pour réafficher la section Tarifs
const showTarifs = false
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#FAF5F0] text-[#051F20]">
    <!-- ================================================================= -->
    <!-- HEADER (pilule en verre flottante) -->
    <!-- ================================================================= -->

    <header class="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div
        :class="[
          glass,
          'mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between rounded-full pl-5 pr-2 sm:h-[68px] sm:pl-6',
        ]"
      >
        <!-- Logo : ramène en haut de page -->
        <button
          type="button"
          class="flex items-center rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250] focus-visible:ring-offset-2"
          aria-label="Retour en haut de la page"
          title="Retour à l'accueil"
          @click="scrollToSection('accueil')"
        >
          <img
            src="/images/mimosy_logo_transparent.png"
            alt="MIMOSY"
            class="h-auto w-[120px] object-contain sm:w-[140px]"
          />
        </button>

        <!-- Navigation desktop -->
        <nav class="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          <button
            v-for="item in navItems"
            :key="item.target"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium text-[#051F20] transition hover:bg-white/70 hover:text-[#2F6250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250]"
            :class="{ 'font-bold text-[#2F6250]': item.target === 'accueil' }"
            @click="scrollToSection(item.target)"
          >
            {{ item.label }}
          </button>
        </nav>

        <!-- Actions desktop -->
        <div class="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            class="h-12 rounded-full px-5 text-sm font-bold text-[#2F6250] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250]"
            @click="goToLogin"
          >
            Se connecter
          </button>

          <button
            type="button"
            class="h-12 rounded-full bg-[#051F20] px-6 text-sm font-bold text-white transition hover:bg-[#2F6250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250] focus-visible:ring-offset-2"
            @click="goToRegister"
          >
            Rejoindre MIMOSY
          </button>
        </div>

        <!-- Bouton mobile -->
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-[#051F20] text-white transition hover:bg-[#2F6250] lg:hidden"
          :aria-label="isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
          :aria-expanded="isMobileMenuOpen"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <svg v-if="!isMobileMenuOpen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
          <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>

      <!-- Menu mobile (verre) -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          :class="[glass, 'mx-auto mt-2 max-w-[1400px] rounded-[28px] p-3 lg:hidden']"
        >
          <nav class="flex flex-col gap-1" aria-label="Navigation mobile">
            <button
              v-for="item in navItems"
              :key="item.target"
              type="button"
              class="rounded-[18px] px-4 py-3 text-left text-sm font-medium text-[#051F20] transition hover:bg-white/70 hover:text-[#2F6250]"
              @click="scrollToSection(item.target)"
            >
              {{ item.label }}
            </button>

            <div class="mt-2 flex flex-col gap-2 border-t border-[#051F20]/10 pt-3 sm:flex-row">
              <button
                type="button"
                class="h-12 flex-1 rounded-full border border-[#2F6250] text-sm font-bold text-[#2F6250] transition hover:bg-white/70"
                @click="goToLogin"
              >
                Se connecter
              </button>
              <button
                type="button"
                class="h-12 flex-1 rounded-full bg-[#051F20] text-sm font-bold text-white transition hover:bg-[#2F6250]"
                @click="goToRegister"
              >
                Rejoindre MIMOSY
              </button>
            </div>
          </nav>
        </div>
      </Transition>
    </header>

    <!-- ================================================================= -->
    <!-- HERO -->
    <!-- ================================================================= -->

    <section id="accueil" class="scroll-mt-28">
      <div
        class="relative mx-auto grid w-full max-w-[1400px] gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24"
      >
        <!-- Texte -->
        <div class="relative z-10 w-full">
          <div class="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-[#FFF3ED] px-4 py-2">
            <span class="h-2 w-2 shrink-0 rounded-full bg-[#2F6250]"></span>
            <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs">
              Plateforme de mise en relation au Sénégal
            </span>
          </div>

          <h1
            class="font-sans text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#051F20] sm:text-[54px] lg:text-[64px] xl:text-[76px]"
          >
            Trouvez le bon
            <span class="text-[#2F6250]">professionnel</span>
            près de chez vous.
          </h1>

          <p class="mt-6 max-w-xl text-[15px] leading-7 text-[#64748B] sm:text-base sm:leading-8 lg:text-[17px]">
            MIMOSY connecte les particuliers et les entreprises du Sénégal
            avec des professionnels de confiance.
            <template v-if="domainesHero">{{ domainesHero }}</template>
          </p>

          <!-- Recherche en verre : déborde volontairement sur le collage -->
          <form
            :class="[
              glass,
              'mt-8 flex w-full flex-col gap-2 rounded-[28px] p-2 sm:flex-row sm:items-center sm:rounded-full lg:w-[calc(100%+80px)]',
            ]"
            @submit.prevent="submitHeroSearch"
          >
            <label class="flex min-h-[52px] w-full min-w-0 flex-1 items-center gap-3 rounded-full px-4">
              <svg class="h-5 w-5 shrink-0 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <span class="sr-only">Rechercher un service</span>
              <input
                v-model="heroSearch"
                type="text"
                placeholder="Quel service recherchez-vous ?"
                class="min-w-0 flex-1 bg-transparent text-[15px] text-[#051F20] outline-none placeholder:text-[#64748B]"
              />
            </label>

            <button
              type="submit"
              class="h-[52px] w-full shrink-0 rounded-full bg-[#051F20] px-7 text-sm font-bold text-white transition hover:bg-[#2F6250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250] focus-visible:ring-offset-2 sm:w-auto"
            >
              Rechercher
            </button>
          </form>

          <p class="mt-6 text-[13px] font-medium text-[#2F6250] sm:text-sm">
            Prestataires : 40 jours d'essai gratuit, sans carte bancaire.
          </p>
        </div>

        <!-- Collage façon Pinterest -->
        <div class="relative">
          <div class="flex h-[520px] gap-3 overflow-hidden sm:h-[640px] sm:gap-4 lg:h-[760px]">
            <div
              v-for="(column, columnIndex) in heroColumns"
              :key="columnIndex"
              class="flex flex-1 flex-col gap-3 sm:gap-4"
              :class="{
                'hidden sm:flex': columnIndex === 2,
                '-mt-10': columnIndex === 1,
              }"
            >
              <div
                v-for="(tile, tileIndex) in column"
                :key="tileIndex"
                class="relative shrink-0 overflow-hidden rounded-[24px] sm:rounded-[28px]"
                :class="[tile.height, tile.bg]"
              >
                <img
                  v-if="tile.image"
                  :src="tile.image"
                  :alt="tile.alt"
                  class="h-full w-full object-cover"
                />

                <!-- Formes graphiques quand il n'y a pas encore de photo -->
                <template v-else>
                  <span v-if="tile.shape === 'circle'" class="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-[#8FD9B6]" aria-hidden="true"></span>
                  <span v-if="tile.shape === 'arch'" class="absolute bottom-0 left-6 h-40 w-32 rounded-t-full bg-[#2F6250]" aria-hidden="true"></span>
                  <span v-if="tile.shape === 'ring'" class="absolute -left-10 -top-10 h-48 w-48 rounded-full border-[26px] border-[#8FD9B6]" aria-hidden="true"></span>
                  <span v-if="tile.shape === 'half'" class="absolute bottom-0 left-4 h-20 w-40 rounded-t-full bg-[#FFF3ED]" aria-hidden="true"></span>
                </template>
              </div>
            </div>
          </div>

          <!-- Badge verre : identité vérifiée -->
          <div
            :class="[
              glass,
              'absolute bottom-6 left-4 flex items-center gap-3 rounded-[20px] p-3.5 sm:left-8 sm:p-4',
            ]"
          >
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF8F2] text-[#16805B]">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-[13px] font-bold leading-4 text-[#051F20]">Identité vérifiée</p>
              <p class="mt-0.5 text-[12px] leading-4 text-[#051F20]/70">Chaque prestataire est contrôlé</p>
            </div>
          </div>

          <!-- Carte verre : essai prestataire -->
          <div
            :class="[
              glass,
              'absolute right-4 top-6 hidden w-[230px] flex-col gap-2 rounded-[22px] p-5 sm:flex sm:right-6',
            ]"
          >
            <span class="flex items-center gap-2 text-xs font-bold text-[#2F6250]">
              <span class="h-2 w-2 rounded-full bg-[#2F6250]"></span>
              Pour les prestataires
            </span>
            <span class="text-[28px] font-extrabold leading-none tracking-tight text-[#051F20]">40 jours</span>
            <span class="text-[13px] leading-5 text-[#051F20]/70">d'essai gratuit, sans carte bancaire.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- SERVICES (bento façon Pinterest) -->
    <!-- ================================================================= -->

    <section id="services" class="scroll-mt-28">
      <div class="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs">
              Nos domaines de service
            </p>
            <h2 class="mt-3 font-sans text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#051F20] sm:text-[42px] lg:text-[52px]">
              Des professionnels pour vos besoins du quotidien
            </h2>
          </div>
          <p class="max-w-sm text-sm leading-7 text-[#64748B]">
            MIMOSY facilite la recherche de professionnels dans différents
            domaines de services.
          </p>
        </div>

        <!-- Chargement du catalogue -->
        <div
          v-if="catalogueStore.isLoading && !services.length"
          class="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:grid-rows-[300px_300px]"
          aria-busy="true"
          aria-label="Chargement des services"
        >
          <div
            v-for="slot in bentoSlots"
            :key="slot.layout"
            class="animate-pulse rounded-[28px] bg-[#DAD4C9]/60"
            :class="slot.layout"
          ></div>
          <div class="min-h-[300px] animate-pulse rounded-[28px] bg-[#051F20]/20"></div>
        </div>

        <div v-else class="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:grid-rows-[300px_300px]">
          <article
            v-for="service in services"
            :key="service.id"
            class="relative overflow-hidden rounded-[28px]"
            :class="[service.bg, service.layout]"
          >
            <img
              v-if="service.image"
              :src="service.image"
              :alt="`Services de ${service.title.toLowerCase()}`"
              class="absolute inset-0 h-full w-full object-cover"
            />

            <template v-else>
              <span class="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#2F6250]" aria-hidden="true"></span>
              <span class="absolute left-8 top-10 h-24 w-24 rounded-full border-[18px] border-[#8FD9B6]" aria-hidden="true"></span>
            </template>

            <!-- Étiquette en verre -->
            <div
              :class="[
                glass,
                'absolute inset-x-3 bottom-3 flex flex-col gap-3 rounded-[22px] p-5 sm:flex-row sm:items-end sm:justify-between',
              ]"
            >
              <div class="min-w-0">
                <h3 class="font-sans text-xl font-bold text-[#051F20] sm:text-2xl">
                  {{ service.title }}
                </h3>
                <p class="mt-1 max-w-md text-sm leading-6 text-[#051F20]/75">
                  {{ service.description }}
                </p>
              </div>

              <button
                type="button"
                class="flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-[#051F20] px-5 text-sm font-bold text-white transition hover:bg-[#2F6250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250] focus-visible:ring-offset-2 sm:self-auto"
                @click="trouverUnPro(service)"
              >
                Trouver un pro
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>

          <!-- Tuile « et bien plus » -->
          <article
            class="relative min-h-[300px] overflow-hidden rounded-[28px] bg-[#051F20]"
            :class="bienPlusLayout"
          >
            <span class="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[30px] border-[#8FD9B6]" aria-hidden="true"></span>
            <span class="absolute right-10 top-10 h-12 w-12 rounded-full bg-[#FFF3ED]" aria-hidden="true"></span>

            <div class="relative flex h-full flex-col justify-between gap-6 p-6">
              <p class="max-w-[260px] font-sans text-2xl font-extrabold leading-tight text-white">
                <template v-if="autresCategories > 0">
                  Et {{ autresCategories }} autre{{ autresCategories > 1 ? 's' : '' }} domaine{{ autresCategories > 1 ? 's' : '' }}.
                </template>
                <template v-else-if="services.length">Et bien plus encore.</template>
                <template v-else-if="catalogueStore.errorMessage">
                  Les services sont momentanément indisponibles.
                </template>
                <template v-else>Nos domaines arrivent bientôt.</template>
              </p>
              <button
                type="button"
                class="flex h-11 items-center gap-2 self-start rounded-full bg-white px-5 text-sm font-bold text-[#051F20] transition hover:bg-[#FFF3ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#051F20]"
                @click="trouverUnPro()"
              >
                Voir les services
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- COMMENT ÇA MARCHE -->
    <!-- ================================================================= -->

    <section id="fonctionnement" class="scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div class="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[32px] bg-[#2F6250] px-5 py-14 sm:rounded-[40px] sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <!-- Formes derrière le verre -->
        <span class="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#8FD9B6]" aria-hidden="true"></span>
        <span class="absolute -bottom-40 left-1/4 h-[380px] w-[380px] rounded-full border-[44px] border-[#FFF3ED]/60" aria-hidden="true"></span>

        <div class="relative">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80 sm:text-xs">
            Votre parcours simple
          </p>
          <h2 class="mt-3 font-sans text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white sm:text-[42px] lg:text-[52px]">
            Comment ça marche ?
          </h2>

          <!-- Étapes (désactivées par défaut, voir showSteps) -->
          <div v-if="showSteps" class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="step in steps"
              :key="step.number"
              :class="[glass, 'rounded-[24px] p-6']"
            >
              <span class="font-sans text-3xl font-extrabold text-[#2F6250]">{{ step.number }}</span>
              <h3 class="mt-3 font-sans text-[17px] font-bold text-[#051F20]">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-[#051F20]/75">{{ step.description }}</p>
            </div>
          </div>

          <!-- Vidéo dans un cadre en verre -->
          <div :class="[glass, 'mx-auto mt-10 w-full max-w-4xl rounded-[28px] p-2 sm:mt-14 sm:rounded-[32px] sm:p-3']">
            <div class="overflow-hidden rounded-[22px] bg-[#051F20] sm:rounded-[24px]">
              <video
                src="/medias/PubMimosy_202609091346.mp4"
                controls
                autoplay
                muted
                loop
                playsinline
                class="aspect-video h-auto w-full object-cover"
              ></video>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- POURQUOI MIMOSY -->
    <!-- ================================================================= -->

    <section>
      <div class="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div class="mb-10 max-w-3xl sm:mb-14">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs">
            Pourquoi MIMOSY
          </p>
          <h2 class="mt-3 font-sans text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#051F20] sm:text-[42px] lg:text-[52px]">
            Une plateforme pensée pour la confiance
          </h2>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <!-- Client : verre sur formes -->
          <div class="relative overflow-hidden rounded-[32px] bg-[#FFF3ED] p-3">
            <span class="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#8FD9B6]" aria-hidden="true"></span>
            <span class="absolute -bottom-10 right-10 h-40 w-40 rounded-t-full bg-[#2F6250]" aria-hidden="true"></span>

            <div :class="[glass, 'relative flex h-full flex-col rounded-[24px] p-6 sm:p-8']">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2F6250]">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>

              <h3 class="mt-5 font-sans text-2xl font-bold text-[#051F20] sm:text-[28px]">
                Pour les clients
              </h3>

              <ul class="mt-6 space-y-4 text-[15px] text-[#051F20]">
                <li v-for="benefit in benefitsClient" :key="benefit" class="flex items-start gap-3">
                  <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2F6250]">
                    <svg class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <span>{{ benefit }}</span>
                </li>
              </ul>

              <button
                type="button"
                class="mt-8 h-12 self-start rounded-full bg-[#051F20] px-6 text-sm font-bold text-white transition hover:bg-[#2F6250]"
                @click="trouverUnPro()"
              >
                Trouver un professionnel
              </button>
            </div>
          </div>

          <!-- Prestataire -->
          <div class="relative flex flex-col overflow-hidden rounded-[32px] bg-[#051F20] p-6 text-white sm:p-10">
            <span class="absolute -bottom-20 -right-20 h-72 w-72 rounded-full border-[36px] border-[#2F6250]" aria-hidden="true"></span>

            <div class="relative flex h-full flex-col">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 21h18" />
                  <path d="M5 21V9l7-5 7 5v12" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </span>

              <h3 class="mt-5 font-sans text-2xl font-bold sm:text-[28px]">
                Pour les prestataires
              </h3>

              <ul class="mt-6 space-y-4 text-[15px] text-white/85">
                <li v-for="benefit in benefitsPrestataire" :key="benefit" class="flex items-start gap-3">
                  <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8FD9B6]">
                    <svg class="h-3.5 w-3.5 text-[#051F20]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <span>{{ benefit }}</span>
                </li>
              </ul>

              <button
                type="button"
                class="mt-8 h-12 self-start rounded-full bg-white px-6 text-sm font-bold text-[#051F20] transition hover:bg-[#FFF3ED]"
                @click="goToRegister"
              >
                Rejoindre en tant que prestataire
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- TARIFS (désactivée par défaut, voir showTarifs) -->
    <!-- ================================================================= -->

    <section v-if="showTarifs" id="tarifs" class="scroll-mt-28">
      <div class="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div class="mb-12 max-w-3xl">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs">
            Pour les prestataires
          </p>
          <h2 class="mt-3 font-sans text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#051F20] sm:text-[42px] lg:text-[52px]">
            Testez MIMOSY avant de vous abonner
          </h2>
          <p class="mt-4 text-sm leading-7 text-[#64748B]">
            Commencez avec 40 jours d'accès gratuit avant de décider de
            continuer avec l'abonnement.
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <div class="flex flex-col rounded-[28px] border-2 border-[#2F6250] bg-[#FFFDF9] p-8">
            <p class="text-xs font-bold uppercase tracking-wide text-[#2F6250]">Essai gratuit</p>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="font-sans text-4xl font-extrabold">0 FCFA</span>
              <span class="text-sm text-[#64748B]">pendant 40 jours</span>
            </div>
            <ul class="mt-6 flex-1 space-y-3 text-sm">
              <li>✓ Profil visible auprès des clients</li>
              <li>✓ Réception de demandes de prestation</li>
              <li>✓ Aucune carte bancaire requise</li>
            </ul>
          </div>

          <div class="flex flex-col rounded-[28px] bg-[#2F6250] p-8 text-white">
            <p class="text-xs font-bold uppercase tracking-wide text-white/75">Abonnement prestataire</p>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="font-sans text-4xl font-extrabold">{{ monthlyPrice }}</span>
              <span class="text-sm text-white/75">/ mois</span>
            </div>
            <ul class="mt-6 flex-1 space-y-3 text-sm">
              <li>✓ Profil visible auprès des clients</li>
              <li>✓ Réception des demandes de prestation</li>
              <li>✓ Accès aux fonctionnalités prestataire</li>
            </ul>
            <button
              type="button"
              class="mt-6 h-12 rounded-full bg-white px-6 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
              @click="goToRegister"
            >
              Démarrer l'essai gratuit
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- CTA : panneau en verre sur l'image -->
    <!-- ================================================================= -->

    <section id="apropos" class="scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div class="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[32px] bg-[#2F6250] p-3 sm:rounded-[40px] sm:p-6 lg:p-10">
        <img
          src="/medias/image.png"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 h-full w-full object-cover"
        />

        <div
          :class="[
            glass,
            'relative flex flex-col gap-7 rounded-[24px] p-6 sm:rounded-[28px] sm:p-10 md:max-w-[640px] lg:p-12',
          ]"
        >
          <h2 class="font-sans text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#051F20] sm:text-[40px] lg:text-[48px]">
            Vous êtes prestataire ?
            <span class="text-[#2F6250]">Rejoignez MIMOSY.</span>
          </h2>

          <p class="text-[15px] leading-7 text-[#051F20]/80 sm:text-base">
            Présentez vos services, développez votre visibilité et recevez de
            nouvelles demandes de prestation.
          </p>

          <button
            type="button"
            class="h-14 w-full rounded-full bg-[#051F20] px-7 text-sm font-bold text-white transition hover:bg-[#2F6250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6250] focus-visible:ring-offset-2 sm:w-auto sm:self-start sm:text-base"
            @click="goToRegister"
          >
            S'inscrire gratuitement
          </button>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- FOOTER -->
    <!-- ================================================================= -->

    <footer class="mt-20 sm:mt-24">
      <div class="mx-auto w-full max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-8">
          <!-- Présentation -->
          <div class="max-w-sm">
            <button
              type="button"
              class="flex items-center rounded-md transition hover:opacity-80"
              aria-label="Retour en haut de la page"
              @click="scrollToSection('accueil')"
            >
              <img src="/images/mimosy_logo_transparent.png" alt="MIMOSY" class="h-auto w-[140px] object-contain" />
            </button>
            <p class="mt-5 text-sm leading-6 text-[#64748B]">
              La plateforme de mise en relation entre clients et
              professionnels au Sénégal.
            </p>
          </div>

          <!-- Plateforme -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wide text-[#051F20]">Plateforme</h3>
            <div class="mt-5 flex flex-col gap-4 text-sm text-[#64748B]">
              <button type="button" class="text-left transition hover:text-[#2F6250]" @click="scrollToSection('accueil')">Accueil</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]" @click="scrollToSection('services')">Services</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]" @click="scrollToSection('tarifs')">Tarifs</button>
            </div>
          </div>

          <!-- Entreprise -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wide text-[#051F20]">Entreprise</h3>
            <div class="mt-5 flex flex-col gap-4 text-sm text-[#64748B]">
              <button type="button" class="text-left transition hover:text-[#2F6250]" @click="scrollToSection('apropos')">À propos</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]">Blog</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]">Carrières</button>
            </div>
          </div>

          <!-- Support -->
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wide text-[#051F20]">Support</h3>
            <div class="mt-5 flex flex-col gap-4 text-sm text-[#64748B]">
              <button type="button" class="text-left transition hover:text-[#2F6250]">Centre d'aide</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]">Nous contacter</button>
              <button type="button" class="text-left transition hover:text-[#2F6250]">FAQ</button>
            </div>
          </div>
        </div>

        <!-- Grand logotype -->
        <div class="mt-14 border-t border-[#051F20]/10 pt-6">
          <!-- <p
            class="select-none font-sans text-[22vw] font-extrabold leading-[0.8] tracking-[-0.05em] text-[#051F20] lg:text-[280px]"
            aria-hidden="true"
          >
            MIMOSY<span class="text-[#2F6250]">.</span>
          </p> -->

          <div class="mt-6 flex flex-col gap-1 text-xs text-[#64748B] sm:flex-row sm:justify-between">
            <p>© 2026 MIMOSY. Tous droits réservés.</p>
            <p>Dakar, Sénégal</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
}
</style>