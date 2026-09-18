<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogueStore } from '@/stores/catalogue'

const router = useRouter()
const catalogueStore = useCatalogueStore()

// -----------------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------------

const isMobileMenuOpen = ref(false)

const navItems = [
  { label: 'Accueil', target: 'accueil' },
  { label: 'Services', target: 'services' },
  { label: 'Comment ça marche', target: 'fonctionnement' },
  { label: 'Tarifs', target: 'tarifs' },
  { label: 'À propos', target: 'apropos' },
]

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

const goToLogin = () => {
  isMobileMenuOpen.value = false
  router.push('/login')
}

const goToRegister = () => {
  isMobileMenuOpen.value = false
  router.push('/register')
}

const goToRequest = () => {
  isMobileMenuOpen.value = false
  router.push('/login')
}

// -----------------------------------------------------------------------------
// Tarifs / essai gratuit
// -----------------------------------------------------------------------------

//  À adapter : montant réel de l'abonnement une fois fixé.
const monthlyPrice = ref('2 000 FCFA')

// -----------------------------------------------------------------------------
// Catalogue
// -----------------------------------------------------------------------------

/**
 * Regroupe les services à l'intérieur de leur catégorie.
 *
 * Exemple :
 *
 * Électricité
 *   ├── Installation électrique
 *   ├── Dépannage électrique
 *   └── Pose de prises
 *
 * Plomberie
 *   ├── Réparation de fuite
 *   └── Installation robinet
 */
const categoriesAvecServices = computed(() => {
  return catalogueStore.categories.map((categorie) => {
    const servicesDeLaCategorie = catalogueStore.services.filter(
      (service) => service.categorie === categorie.id
    )

    return {
      id: categorie.id,

      name: categorie.nom,

      description:
        categorie.description ||
        'Découvrez les services proposés dans cette catégorie.',

      image: categorie.image,

      services: servicesDeLaCategorie.map((service) => ({
        id: service.id,

        name: service.nom,

        description:
          service.description ||
          'Aucune description disponible pour le moment.',
      })),
    }
  })
})

// -----------------------------------------------------------------------------
// Modal service
// -----------------------------------------------------------------------------

const selectedService = ref(null)

const openService = (service) => {
  selectedService.value = service
}

const closeService = () => {
  selectedService.value = null
}

const requestSelectedService = () => {
  closeService()
  goToRequest()
}

// -----------------------------------------------------------------------------
// Chargement catalogue
// -----------------------------------------------------------------------------

onMounted(() => {
  catalogueStore.chargerCatalogue().catch(() => {})
})
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#FFFDF9] text-[#051F20]">

    <!-- =================================================================== -->
    <!-- HEADER -->
    <!-- =================================================================== -->

    <header
      class="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur"
    >
      <div
        class="mx-auto flex h-16 w-full items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:h-[80px] lg:px-8"
      >

        <!-- Logo -->
        <button
          type="button"
          class="flex shrink-0 items-center gap-2.5"
          aria-label="Accueil MIMOSY"
          @click="scrollToSection('accueil')"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#2F6250] text-lg font-extrabold text-white sm:h-9 sm:w-9"
          >
            M
          </span>

          <span
            class="font-['Plus_Jakarta_Sans'] text-[19px] font-extrabold tracking-tight text-[#051F20] sm:text-[21px]"
          >
            MIMOSY
          </span>
        </button>

        <!-- Navigation desktop -->
        <nav class="hidden items-center gap-1 lg:flex">
          <button
            v-for="item in navItems"
            :key="item.target"
            type="button"
            class="rounded-[9px] px-3 py-2 text-sm font-medium text-[#051F20] transition hover:bg-[#FFF3ED] hover:text-[#2F6250]"
            :class="{
              'font-bold text-[#2F6250]':
                item.target === 'accueil',
            }"
            @click="scrollToSection(item.target)"
          >
            {{ item.label }}
          </button>
        </nav>

        <!-- Actions desktop -->
        <div class="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            class="rounded-[10px] border-2 border-[#2F6250] px-5 py-2.5 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
            @click="goToLogin"
          >
            Se connecter
          </button>

          <button
            type="button"
            class="rounded-[10px] bg-[#2F6250] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244B3D]"
            @click="goToRegister"
          >
            Rejoindre MIMOSY
          </button>
        </div>

        <!-- Bouton mobile -->
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E2E8F0] text-[#051F20] transition hover:bg-[#FFF3ED] lg:hidden"
          :aria-label="
            isMobileMenuOpen
              ? 'Fermer le menu'
              : 'Ouvrir le menu'
          "
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <!-- Menu -->
          <svg
            v-if="!isMobileMenuOpen"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>

          <!-- Fermer -->
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>

      <!-- Menu mobile -->
      <div
        v-if="isMobileMenuOpen"
        class="border-t border-[#E2E8F0] bg-white lg:hidden"
      >
        <nav
          class="mx-auto flex w-full flex-col gap-1 px-4 py-4 sm:px-6"
        >
          <button
            v-for="item in navItems"
            :key="item.target"
            type="button"
            class="rounded-[10px] px-4 py-3 text-left text-sm font-medium text-[#64748B] transition hover:bg-[#FFF3ED] hover:text-[#2F6250]"
            @click="scrollToSection(item.target)"
          >
            {{ item.label }}
          </button>

          <div
            class="mt-3 flex flex-col gap-2 border-t border-[#EFE5E0] pt-4 sm:flex-row"
          >
            <button
              type="button"
              class="flex-1 rounded-[10px] border-2 border-[#2F6250] px-5 py-3 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
              @click="goToLogin"
            >
              Se connecter
            </button>

            <button
              type="button"
              class="flex-1 rounded-[10px] bg-[#2F6250] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#244B3D]"
              @click="goToRegister"
            >
              Rejoindre MIMOSY
            </button>
          </div>
        </nav>
      </div>
    </header>

    <!-- =================================================================== -->
    <!-- HERO -->
    <!-- =================================================================== -->

    <section
      id="accueil"
      class="scroll-mt-20 bg-[#FAF5F0]"
    >
      <div
        class="mx-auto grid w-full items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24"
      >

        <!-- Texte -->
        <div class="w-full ">

          <div
            class="mb-5 inline-flex max-w-full items-center gap-2 rounded-[10px] bg-[#FFF3ED] px-3 py-2 sm:mb-6 sm:px-4"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full bg-[#2F6250]"
            ></span>

            <span
              class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
            >
              Plateforme de mise en relation au Sénégal
            </span>
          </div>

          <h1
            class="font-['Plus_Jakarta_Sans'] text-[34px] font-extrabold leading-[1.1] tracking-[-0.01em] text-[#051F20] sm:text-[46px] md:text-[52px] lg:text-[58px] xl:text-[62px]"
          >
            Trouvez le bon prestataire,
            <span class="text-[#2F6250]">en quelques clics.</span>
          </h1>

          <p
            class="mt-6  text-[15px] leading-7 text-[#64748B] sm:mt-7 sm:text-base sm:leading-8 lg:text-[17px]"
          >
            MIMOSY connecte les particuliers et entreprises du
            Sénégal avec des professionnels de confiance
            rigoureusement vérifiés. Électricité, plomberie,
            nettoyage&nbsp;: confiez vos travaux l'esprit tranquille.
          </p>

          <div
            class="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row"
          >
            <button
              type="button"
              class="w-full rounded-[10px] bg-[#2F6250] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#244B3D] sm:w-auto sm:px-7 sm:py-4 sm:text-base"
              @click="goToRequest"
            >
              Demander une prestation
            </button>

            <button
              type="button"
              class="w-full rounded-[10px] border-2 border-[#2F6250] px-6 py-3.5 text-sm font-bold text-[#2F6250] transition hover:bg-white sm:w-auto sm:px-7 sm:py-4 sm:text-base"
              @click="scrollToSection('services')"
            >
              Voir les services
            </button>
          </div>

          <p
            class="mt-6 text-[13px] font-medium text-[#2F6250] sm:text-sm"
          >
            Prestataires&nbsp;: 40 jours d'essai gratuit, sans carte bancaire.
          </p>
        </div>

        <!-- Images -->
        <div
          class="relative mx-auto w-full max-w-xl pt-3 sm:pt-5 lg:pt-0"
        >
          <div
            class="absolute left-0 top-5 h-20 w-20 rounded-full bg-[#FFF3ED] sm:left-[-10px] sm:top-8 sm:h-28 sm:w-28 lg:left-[-20px] lg:top-10 lg:h-36 lg:w-36"
          ></div>

          <div
            class="relative grid w-full grid-cols-2 items-end gap-2 sm:gap-3 lg:gap-4"
          >
            <!-- Image 1 -->
            <div
              class="h-[230px] overflow-hidden rounded-l-[20px] rounded-r-[8px] bg-[#DAD4C9] sm:h-[330px] sm:rounded-l-[24px] lg:h-[400px] lg:rounded-l-[28px]"
            >
              <img
                src="/medias/electricien.jpg"
                alt="Professionnel MIMOSY"
                class="h-full w-full object-cover"
              />
            </div>

            <!-- Image 2 -->
            <div
              class="h-[270px] overflow-hidden rounded-[20px] bg-[#DAD4C9] sm:h-[390px] sm:rounded-[24px] lg:h-[470px] lg:rounded-[28px]"
            >
              <img
                src="/medias/mimosynet.jpeg"
                alt="Service MIMOSY"
                class="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- SERVICES / CATEGORIES -->
    <!-- =================================================================== -->

    <section
      id="services"
      class="scroll-mt-20 bg-white"
    >
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >

        <!-- Titre -->
        <div
          class="mx-auto mb-10  p-5 text-center sm:mb-14"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Sélection de prestations
          </p>

          <h2
            class="mt-2 font-['Plus_Jakarta_Sans'] text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Nos services
          </h2>

          <p
            class="mt-3 text-[13px] leading-6 text-[#64748B] sm:text-sm sm:leading-7"
          >
            Trouvez rapidement le professionnel adapté à votre
            besoin.
          </p>
        </div>

        <!-- Chargement -->
        <p
          v-if="catalogueStore.isLoading"
          class="rounded-[16px] border border-[#E2E8F0] bg-[#FFFDF9] p-6 text-center text-sm text-[#64748B]"
        >
          Chargement des services...
        </p>

        <!-- Erreur -->
        <p
          v-else-if="catalogueStore.errorMessage"
          class="rounded-[16px] bg-[#FFF0EE] p-6 text-center text-sm text-[#A85148]"
        >
          {{ catalogueStore.errorMessage }}
        </p>

        <!-- Aucune catégorie -->
        <p
          v-else-if="!categoriesAvecServices.length"
          class="rounded-[16px] border border-dashed border-[#E2E8F0] bg-[#FFFDF9] p-6 text-center text-sm text-[#64748B]"
        >
          Aucune catégorie disponible pour le moment.
        </p>

        <!-- =============================================================== -->
        <!-- CARTES CATÉGORIES -->
        <!-- =============================================================== -->

        <div
          v-else
          class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >

          <!-- Une carte = une catégorie -->
          <article
            v-for="categorie in categoriesAvecServices"
            :key="categorie.id"
            class="group flex flex-col overflow-hidden rounded-[20px] border border-[#EFE5E0] bg-[#FFFDF9] transition hover:border-[#2F6250] sm:rounded-[24px]"
          >

            <!-- Image catégorie -->
            <div
              class="h-[210px] overflow-hidden bg-[#FAF5F0] sm:h-[230px]"
            >

              <img
                v-if="categorie.image"
                :src="categorie.image"
                :alt="categorie.name"
                class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />

              <!-- Si aucune image -->
              <div
                v-else
                class="flex h-full items-center justify-center text-5xl font-extrabold text-[#2F6250]"
              >
                {{ categorie.name.charAt(0) }}
              </div>

            </div>

            <!-- Contenu catégorie -->
            <div
              class="flex flex-1 flex-col p-5 sm:p-6 lg:p-7"
            >

              <!-- Nom catégorie -->
              <h3
                class="font-['Plus_Jakarta_Sans'] text-[20px] font-bold tracking-[-0.005em] text-[#051F20] sm:text-[22px]"
              >
                {{ categorie.name }}
              </h3>

              <!-- Description catégorie -->
              <p
                class="mt-2 text-[13px] leading-6 text-[#64748B] sm:text-sm"
              >
                {{ categorie.description }}
              </p>

              <!-- ========================================================= -->
              <!-- SERVICES DE LA CATÉGORIE -->
              <!-- ========================================================= -->

              <div
                v-if="categorie.services.length"
                class="mt-5"
              >

                <p
                  class="mb-3 text-xs font-bold uppercase tracking-wide text-[#2F6250]"
                >
                  Services proposés
                </p>

                <ul class="space-y-2">

                  <!-- Une ligne = un service -->
                  <!-- <li
                    v-for="service in categorie.services"
                    :key="service.id"
                    class="flex items-start gap-2 text-sm text-[#051F20]"
                  >

                    <span
                      class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F6250]"
                    ></span>

                    <span>
                      {{ service.name }}
                    </span>

                  </li> -->

                </ul>

              </div>

              <!-- Aucun service -->
              <p
                v-else
                class="mt-5 text-sm italic text-[#94A3B8]"
              >
                Aucun service disponible dans cette catégorie.
              </p>

              <!-- ========================================================= -->
              <!-- FOOTER CARTE -->
              <!-- ========================================================= -->

              <div
                class="mt-6 border-t border-[#EFE5E0] pt-4"
              >

                <button
                  type="button"
                  class="flex items-center gap-2 text-[13px] font-bold text-[#2F6250] transition hover:gap-3 sm:text-sm"
                  @click="
                    categorie.services.length
                      ? openService(categorie.services[0])
                      : null
                  "
                >
                  Voir les services

                  <span>→</span>
                </button>

              </div>

            </div>
          </article>

        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- COMMENT ÇA MARCHE -->
    <!-- =================================================================== -->

    <section
      id="fonctionnement"
      class="scroll-mt-20 bg-[#FAF5F0]"
    >
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >

        <div
          class="mx-auto mb-9 text-center sm:mb-10"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Votre parcours simple
          </p>

          <h2
            class="mt-2 font-['Plus_Jakarta_Sans'] text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Comment ça marche ?
          </h2>
        </div>

        <div class="flex justify-center">

          <div
            class="w-full max-w-2xl overflow-hidden rounded-[18px] bg-[#051F20] sm:rounded-[24px] lg:rounded-[28px]"
          >
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
    </section>

    <!-- =================================================================== -->
    <!-- TARIFS / ESSAI GRATUIT -->
    <!-- =================================================================== -->

    <section
      id="tarifs"
      class="scroll-mt-20 bg-white"
    >
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >

        <!-- Titre -->
        <div
          class="mx-auto mb-12  text-center sm:mb-16"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Pour les prestataires
          </p>

          <h2
            class="mt-2 font-['Plus_Jakarta_Sans'] text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Testez MIMOSY avant de vous abonner
          </h2>

          <p
            class="mt-3 text-[13px] leading-6 text-[#64748B] sm:text-sm sm:leading-7"
          >
            MIMOSY fonctionne par abonnement, mais vous démarrez
            avec 40 jours d'accès complet et gratuit, sans carte
            bancaire.
          </p>
        </div>

        <!-- Frise : jour 0 → jour 40 → abonnement -->
        <div
          class="mx-auto mb-14 flex items-start gap-3 sm:mb-16 sm:gap-6"
        >
          <div class="flex flex-1 flex-col items-center text-center">
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2F6250] bg-[#FFF3ED] text-sm font-bold text-[#2F6250]"
            >
              1
            </span>
            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Jour 0
            </p>
            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Inscription et accès immédiat à toutes les
              fonctionnalités
            </p>
          </div>

          <div class="mt-[22px] h-[2px] flex-1 bg-[#EFE5E0]"></div>

          <div class="flex flex-1 flex-col items-center text-center">
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2F6250] bg-[#FFF3ED] text-sm font-bold text-[#2F6250]"
            >
              2
            </span>
            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Jour 40
            </p>
            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Fin de l'essai gratuit, vous décidez de continuer
              ou non
            </p>
          </div>

          <div class="mt-[22px] h-[2px] flex-1 bg-[#EFE5E0]"></div>

          <div class="flex flex-1 flex-col items-center text-center">
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6250] text-sm font-bold text-white"
            >
              3
            </span>
            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Ensuite
            </p>
            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Passage à l'abonnement pour rester visible sur la
              plateforme
            </p>
          </div>
        </div>

        <!-- Cartes tarifaires -->
        <div
          class="mx-auto flex  flex-col items-center justify-center gap-6 sm:flex-row sm:flex-wrap sm:items-stretch"
        >

          <!-- Carte essai gratuit -->
          <div
            class="flex w-full flex-col rounded-[20px] border-2 border-[#2F6250] bg-[#FFFDF9] p-6 sm:max-w-[320px] sm:rounded-[24px] sm:p-8"
          >
            <p
              class="text-xs font-bold uppercase tracking-wide text-[#2F6250]"
            >
              Essai gratuit
            </p>

            <div class="mt-4 flex items-baseline gap-2">
              <span
                class="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold text-[#051F20]"
              >
                0 FCFA
              </span>
              <span class="text-sm text-[#64748B]">
                pendant 40 jours
              </span>
            </div>

            <ul class="mt-6 flex-1 space-y-3 text-sm text-[#051F20]">
              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-[#2F6250]"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Profil visible auprès des clients</span>
              </li>

              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-[#2F6250]"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Réception de demandes de prestation</span>
              </li>

              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-[#2F6250]"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Aucune carte bancaire requise</span>
              </li>
            </ul>

            <p class="mt-6 text-xs text-[#94A3B8]">
              Sans engagement pendant toute la durée de l'essai.
            </p>
          </div>

          <!-- Carte abonnement -->
          <div
            class="flex w-full flex-col rounded-[20px] bg-[#2F6250] p-6 text-white sm:max-w-[320px] sm:rounded-[24px] sm:p-8"
          >
            <p
              class="text-xs font-bold uppercase tracking-wide text-white/75"
            >
              Abonnement prestataire
            </p>

            <div class="mt-4 flex items-baseline gap-2">
              <span
                class="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold"
              >
                {{ monthlyPrice }}
              </span>
              <span class="text-sm text-white/75">
                / mois
              </span>
            </div>

            <p class="mt-1 text-xs text-white/75">
              Facturé à partir du 41ᵉ jour
            </p>

            <ul class="mt-6 flex-1 space-y-3 text-sm">
              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-white"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Tous les avantages de l'essai, en illimité</span>
              </li>

              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-white"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Paiements clients sécurisés intégrés</span>
              </li>

              <li class="flex items-start gap-2.5">
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-white"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M4 10.5l3.5 3.5L16 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Support prioritaire</span>
              </li>
            </ul>

            <button
              type="button"
              class="mt-6 rounded-[10px] bg-white px-5 py-3 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
              @click="goToRegister"
            >
              Démarrer l'essai gratuit
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- CTA PRESTATAIRE -->
    <!-- =================================================================== -->

    <section
      id="apropos"
      class="relative scroll-mt-20 overflow-hidden bg-[#2F6250]"
    >

      <!-- Image -->
      <img
        src="/medias/image.png"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover"
      />

      <!-- Overlay -->
      <div
        class="absolute inset-0 bg-[#2F6250]/75"
      ></div>

      <!-- Contenu -->
      <div
        class="relative mx-auto flex w-full flex-col gap-7 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-20"
      >

        <div class="max-w-2xl">

          <h2
            class="font-['Plus_Jakarta_Sans'] text-[24px] font-extrabold leading-8 tracking-[-0.01em] text-white sm:text-3xl sm:leading-10"
          >
            Vous êtes prestataire ?
            Rejoignez MIMOSY.
          </h2>

          <p
            class="mt-3 text-[14px] leading-6 text-white/90 sm:text-base sm:leading-7"
          >
            Développez votre clientèle à Dakar et partout au
            Sénégal en améliorant votre visibilité auprès de
            nouveaux clients. 40 jours d'essai offerts.
          </p>

        </div>

        <button
          type="button"
          class="w-full shrink-0 rounded-[10px] bg-white px-6 py-3.5 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED] sm:w-auto sm:px-7 sm:py-4 sm:text-base"
          @click="goToRegister"
        >
          S'inscrire gratuitement
        </button>

      </div>
    </section>

    <!-- =================================================================== -->
    <!-- FOOTER -->
    <!-- =================================================================== -->

    <footer class="bg-white">

      <div
        class="mx-auto w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
      >

        <div
          class="grid gap-9 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] lg:gap-8"
        >

          <!-- Présentation -->
          <div class="max-w-sm">

            <button
              type="button"
              class="flex items-center gap-2"
              @click="scrollToSection('accueil')"
            >
              <span
                class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#2F6250] font-extrabold text-white"
              >
                M
              </span>

              <span
                class="font-['Plus_Jakarta_Sans'] text-[21px] font-extrabold text-[#051F20]"
              >
                MIMOSY
              </span>
            </button>

            <p
              class="mt-5 text-[13px] leading-6 text-[#64748B] sm:text-sm"
            >
              La plateforme de confiance qui révolutionne la
              mise en relation de services au Sénégal. Simple,
              rapide et sécurisée.
            </p>

          </div>

          <!-- Plateforme -->
          <div>

            <h3
              class="text-xs font-bold uppercase tracking-wide text-[#051F20] sm:text-sm"
            >
              Plateforme
            </h3>

            <div
              class="mt-4 flex flex-col gap-3 text-[13px] text-[#64748B] sm:mt-5 sm:gap-4 sm:text-sm"
            >
              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
                @click="scrollToSection('accueil')"
              >
                Accueil
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
                @click="scrollToSection('services')"
              >
                Services
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
                @click="scrollToSection('tarifs')"
              >
                Tarifs
              </button>
            </div>

          </div>

          <!-- Entreprise -->
          <div>

            <h3
              class="text-xs font-bold uppercase tracking-wide text-[#051F20] sm:text-sm"
            >
              Entreprise
            </h3>

            <div
              class="mt-4 flex flex-col gap-3 text-[13px] text-[#64748B] sm:mt-5 sm:gap-4 sm:text-sm"
            >
              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
                @click="scrollToSection('apropos')"
              >
                À propos
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Blog
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Carrières
              </button>
            </div>

          </div>

          <!-- Support -->
          <div>

            <h3
              class="text-xs font-bold uppercase tracking-wide text-[#051F20] sm:text-sm"
            >
              Support
            </h3>

            <div
              class="mt-4 flex flex-col gap-3 text-[13px] text-[#64748B] sm:mt-5 sm:gap-4 sm:text-sm"
            >
              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Centre d'aide
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Nous contacter
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                FAQ
              </button>
            </div>

          </div>

          <!-- Légal -->
          <div>

            <h3
              class="text-xs font-bold uppercase tracking-wide text-[#051F20] sm:text-sm"
            >
              Légal
            </h3>

            <div
              class="mt-4 flex flex-col gap-3 text-[13px] text-[#64748B] sm:mt-5 sm:gap-4 sm:text-sm"
            >
              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Conditions d'utilisation
              </button>

              <button
                type="button"
                class="text-left transition hover:text-[#2F6250]"
              >
                Politique de confidentialité
              </button>
            </div>

          </div>

        </div>

        <!-- Copyright -->
        <div
          class="mt-9 border-t border-[#EFE5E0] pt-5 sm:mt-12 sm:pt-6"
        >
          <p
            class="text-center text-[11px] text-[#64748B] sm:text-xs"
          >
            © 2026 MIMOSY. Tous droits réservés. Dakar, Sénégal
          </p>
        </div>

      </div>
    </footer>

    <!-- =================================================================== -->
    <!-- MODAL SERVICE -->
    <!-- =================================================================== -->

    <Transition name="fade">

      <div
        v-if="selectedService"
        class="fixed inset-0 z-[100] flex items-end justify-center bg-[#051F20]/60 p-3 sm:items-center sm:p-5"
        @click.self="closeService"
      >

        <div
          class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] border border-[#E2E8F0] bg-white p-5 sm:rounded-[24px] sm:p-7"
        >

          <!-- Header modal -->
          <div
            class="flex items-start justify-between gap-4"
          >

            <div class="min-w-0">

              <div
                class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FFF3ED] text-xl text-[#2F6250] sm:h-14 sm:w-14 sm:text-2xl"
              >
                {{ selectedService.name.charAt(0) }}
              </div>

              <h3
                class="mt-4 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#051F20] sm:mt-5 sm:text-2xl"
              >
                {{ selectedService.name }}
              </h3>

            </div>

            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FAF5F0] text-xl text-[#64748B] transition hover:bg-[#FFF3ED] hover:text-[#2F6250]"
              aria-label="Fermer"
              @click="closeService"
            >
              ×
            </button>

          </div>

          <!-- Description -->
          <p
            class="mt-4 text-sm leading-6 text-[#64748B] sm:mt-5 sm:leading-7"
          >
            {{ selectedService.description }}
          </p>

          <!-- Actions -->
          <div
            class="mt-6 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:gap-3"
          >

            <button
              type="button"
              class="flex-1 rounded-[10px] bg-[#2F6250] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#244B3D]"
              @click="requestSelectedService"
            >
              Trouver un prestataire
            </button>

            <button
              type="button"
              class="flex-1 rounded-[10px] border-2 border-[#2F6250] px-5 py-3 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
              @click="closeService"
            >
              Fermer
            </button>

          </div>

        </div>

      </div>

    </Transition>

  </div>
</template>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>