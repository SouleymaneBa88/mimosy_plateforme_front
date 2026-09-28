<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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

// -----------------------------------------------------------------------------
// Navigation vers l'authentification
// -----------------------------------------------------------------------------

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
// Recherche
// -----------------------------------------------------------------------------

const heroSearch = ref('')

const submitHeroSearch = () => {
  isMobileMenuOpen.value = false
  router.push('/login')
}

// -----------------------------------------------------------------------------
// Comment ça marche
// -----------------------------------------------------------------------------

const steps = [
  {
    number: '01',
    title: 'Décrivez votre besoin',
    description:
      'Expliquez le service dont vous avez besoin et indiquez votre localisation.',
  },
  {
    number: '02',
    title: 'Trouvez un professionnel',
    description:
      'Consultez les professionnels disponibles correspondant à votre besoin.',
  },
  {
    number: '03',
    title: 'Échangez et choisissez',
    description:
      'Consultez le profil du prestataire et échangez avec lui avant de confirmer.',
  },
  {
    number: '04',
    title: 'Recevez votre service',
    description:
      'Le professionnel intervient selon les conditions convenues avec vous.',
  },
]

// -----------------------------------------------------------------------------
// Pourquoi choisir MIMOSY
// -----------------------------------------------------------------------------

const benefitsClient = [
  'Des professionnels identifiés et contrôlés',
  'Une mise en relation simple et rapide',
  'Le suivi de vos demandes depuis votre espace client',
]

const benefitsPrestataire = [
  'Présentez vos services à de nouveaux clients',
  'Recevez directement des demandes de prestation',
  '40 jours d’essai gratuit sans carte bancaire',
]

// -----------------------------------------------------------------------------
// Tarif
// -----------------------------------------------------------------------------

const monthlyPrice = '2 000 FCFA'
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#FFFDF9] text-[#051F20]">
    <!-- ================================================================= -->
    <!-- HEADER -->
    <!-- ================================================================= -->

    <header
      class="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur"
    >
      <div
        class="mx-auto flex h-16 w-full items-center justify-between px-4 sm:h-[72px] sm:px-6 lg:h-[80px] lg:px-8"
      >
        <!-- Logo : on est déjà sur l'accueil, il ramène donc en haut de page -->
        <button
          type="button"
          class="flex items-center rounded-md transition hover:opacity-80"
          aria-label="Retour en haut de la page"
          title="Retour à l'accueil"
          @click="scrollToSection('accueil')"
        >
          <img
            src="/images/mimosy_logo_transparent.png"
            alt="MIMOSY"
            class="h-auto w-[130px] object-contain sm:w-[150px]"
          />
        </button>

        <!-- Navigation desktop -->
        <nav class="hidden items-center gap-1 lg:flex">
          <button
            v-for="item in navItems"
            :key="item.target"
            type="button"
            class="rounded-[9px] px-3 py-2 text-sm font-medium text-[#051F20] transition hover:bg-[#FFF3ED] hover:text-[#2F6250]"
            :class="{
              'font-bold text-[#2F6250]': item.target === 'accueil',
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

    <!-- ================================================================= -->
    <!-- HERO -->
    <!-- ================================================================= -->

    <section
      id="accueil"
      class="scroll-mt-20 bg-[#FAF5F0]"
    >
      <div
        class="mx-auto grid w-full items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24"
      >
        <!-- Texte -->
        <div class="w-full">
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
            class="font-sans text-[32px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#051F20] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px]"
          >
            Trouvez le bon
            <span class="text-[#2F6250]">professionnel</span>
            près de chez vous.
          </h1>

          <p
            class="mt-5 text-[15px] leading-7 text-[#64748B] sm:mt-6 sm:text-base sm:leading-8 lg:text-[17px]"
          >
            MIMOSY connecte les particuliers et les entreprises
            du Sénégal avec des professionnels de confiance.
            Électricité, plomberie, nettoyage et bien plus encore.
          </p>

          <!-- Recherche -->
          <form
            class="mt-7 flex w-full flex-col gap-2.5 rounded-[16px] border border-[#E2E8F0] bg-white p-2.5 shadow-[0_10px_30px_-15px_rgba(5,31,32,0.25)] sm:mt-8 sm:flex-row sm:items-center sm:rounded-[18px] sm:p-3"
            @submit.prevent="submitHeroSearch"
          >
            <div
              class="flex min-h-[48px] w-full min-w-0 flex-1 items-center gap-2.5 rounded-[10px] bg-[#FAF5F0] px-3.5 sm:min-h-[52px]"
            >
              <svg
                class="h-[18px] w-[18px] shrink-0 text-[#64748B]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                v-model="heroSearch"
                type="text"
                placeholder="Quel service recherchez-vous ?"
                aria-label="Rechercher un service"
                class="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-[#051F20] outline-none placeholder:text-[#94A3B8] sm:text-[15px]"
              />
            </div>

            <button
              type="submit"
              class="min-h-[48px] w-full shrink-0 rounded-[10px] bg-[#2F6250] px-6 text-sm font-bold text-white transition hover:bg-[#244B3D] sm:min-h-[52px] sm:w-auto sm:px-7"
            >
              Rechercher
            </button>
          </form>

          <p
            class="mt-5 text-[13px] font-medium text-[#2F6250] sm:mt-6 sm:text-sm"
          >
            Prestataires : 40 jours d'essai gratuit, sans carte bancaire.
          </p>
        </div>

        <!-- Image -->
        <div
          class="relative mx-auto w-full max-w-md pt-3 sm:pt-5 lg:pt-0"
        >
          <div
            class="absolute left-0 top-5 h-20 w-20 rounded-full bg-[#FFF3ED] sm:left-[-10px] sm:top-8 sm:h-28 sm:w-28 lg:left-[-20px] lg:top-10 lg:h-36 lg:w-36"
          ></div>

          <div
            class="relative h-[340px] w-full overflow-hidden rounded-[24px] bg-[#DAD4C9] sm:h-[440px] sm:rounded-[28px] lg:h-[520px]"
          >
            <img
              src="/medias/electricien.jpg"
              alt="Professionnel MIMOSY"
              class="h-full w-full object-cover"
            />
          </div>

          <!-- Badge -->
          <div
            class="absolute bottom-4 right-[-10px] flex items-center gap-3 rounded-[16px] border border-[#EFE5E0] bg-white p-3.5 shadow-[0_14px_34px_-12px_rgba(5,31,32,0.35)] sm:bottom-6 sm:right-[-16px] sm:p-4"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F2] text-[#16805B] sm:h-11 sm:w-11"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>

            <div class="min-w-0">
              <p
                class="text-[12px] font-bold leading-4 text-[#051F20] sm:text-[13px]"
              >
                Identité vérifiée
              </p>

              <p
                class="mt-0.5 text-[11px] leading-4 text-[#64748B] sm:text-[12px]"
              >
                Chaque prestataire est contrôlé
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- SERVICES -->
    <!-- ================================================================= -->

    <section
      id="services"
      class="scroll-mt-20 bg-white"
    >
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div class="mx-auto max-w-3xl text-center">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Nos domaines de service
          </p>

          <h2
            class="mt-2 font-sans text-[26px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Des professionnels pour vos besoins du quotidien
          </h2>

          <p
            class="mt-3 text-[13px] leading-6 text-[#64748B] sm:text-sm sm:leading-7"
          >
            MIMOSY facilite la recherche de professionnels dans
            différents domaines de services.
          </p>
        </div>

        <div
          class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <!-- Électricité -->
          <article
            class="overflow-hidden rounded-[20px] border border-[#EFE5E0] bg-[#FFFDF9] sm:rounded-[24px]"
          >
            <div class="h-[210px] overflow-hidden sm:h-[230px]">
              <img
                src="/medias/electricien.jpg"
                alt="Services d'électricité"
                class="h-full w-full object-cover"
              />
            </div>

            <div class="p-5 sm:p-6">
              <h3
                class="font-sans text-xl font-bold text-[#051F20]"
              >
                Électricité
              </h3>

              <p
                class="mt-2 text-sm leading-6 text-[#64748B]"
              >
                Installation, dépannage et travaux électriques réalisés
                par des professionnels.
              </p>

              <button
                type="button"
                class="mt-5 text-sm font-bold text-[#2F6250] hover:underline"
                @click="goToRequest"
              >
                Trouver un professionnel →
              </button>
            </div>
          </article>

          <!-- Plomberie -->
          <article
            class="overflow-hidden rounded-[20px] border border-[#EFE5E0] bg-[#FFFDF9] sm:rounded-[24px]"
          >
            <div
              class="flex h-[210px] items-center justify-center bg-[#FAF5F0] sm:h-[230px]"
            >
              <span
                class="font-sans text-5xl font-extrabold text-[#2F6250]"
              >
                P
              </span>
            </div>

            <div class="p-5 sm:p-6">
              <h3
                class="font-sans text-xl font-bold text-[#051F20]"
              >
                Plomberie
              </h3>

              <p
                class="mt-2 text-sm leading-6 text-[#64748B]"
              >
                Réparation, installation et entretien de vos équipements
                de plomberie.
              </p>

              <button
                type="button"
                class="mt-5 text-sm font-bold text-[#2F6250] hover:underline"
                @click="goToRequest"
              >
                Trouver un professionnel →
              </button>
            </div>
          </article>

          <!-- Nettoyage -->
          <article
            class="overflow-hidden rounded-[20px] border border-[#EFE5E0] bg-[#FFFDF9] sm:rounded-[24px]"
          >
            <div
              class="flex h-[210px] items-center justify-center bg-[#FAF5F0] sm:h-[230px]"
            >
              <span
                class="font-sans text-5xl font-extrabold text-[#2F6250]"
              >
                N
              </span>
            </div>

            <div class="p-5 sm:p-6">
              <h3
                class="font-sans text-xl font-bold text-[#051F20]"
              >
                Nettoyage
              </h3>

              <p
                class="mt-2 text-sm leading-6 text-[#64748B]"
              >
                Des professionnels pour l'entretien et le nettoyage de
                vos espaces.
              </p>

              <button
                type="button"
                class="mt-5 text-sm font-bold text-[#2F6250] hover:underline"
                @click="goToRequest"
              >
                Trouver un professionnel →
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- COMMENT ÇA MARCHE -->
    <!-- ================================================================= -->

    <section
      id="fonctionnement"
      class="scroll-mt-20 bg-[#FAF5F0]"
    >
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div class="mx-auto mb-9 text-center sm:mb-14">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Votre parcours simple
          </p>

          <h2
            class="mt-2 font-sans text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Comment ça marche ?
          </h2>
        </div>

        <!-- Étapes -->
        <!-- <div
          class="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
        >
          <div
            v-for="step in steps"
            :key="step.number"
            class="rounded-[18px] border border-[#EFE5E0] bg-white p-5 sm:rounded-[20px] sm:p-6"
          >
            <span
              class="font-sans text-2xl font-extrabold text-[#D8DDD9] sm:text-3xl"
            >
              {{ step.number }}
            </span>

            <h3
              class="mt-3 font-sans text-[16px] font-bold text-[#051F20] sm:text-[17px]"
            >
              {{ step.title }}
            </h3>

            <p
              class="mt-2 text-[13px] leading-6 text-[#64748B] sm:text-sm"
            >
              {{ step.description }}
            </p>
          </div>
        </div> -->

        <!-- VIDÉO MIMOSY -->
        <div class="mt-12 flex justify-center sm:mt-16">
          <div
            class="w-full max-w-3xl overflow-hidden rounded-[18px] bg-[#051F20] sm:rounded-[24px] lg:rounded-[28px]"
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

    <!-- ================================================================= -->
    <!-- POURQUOI MIMOSY -->
    <!-- ================================================================= -->

    <section class="bg-white">
      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div class="mx-auto mb-10 text-center sm:mb-14">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Pourquoi MIMOSY
          </p>

          <h2
            class="mt-2 font-sans text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Une plateforme pensée pour la confiance
          </h2>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Client -->
          <div
            class="flex flex-col rounded-[20px] border border-[#EFE5E0] bg-[#FFFDF9] p-6 sm:rounded-[24px] sm:p-8"
          >
            <span
              class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#FFF3ED] text-[#2F6250]"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>

            <h3
              class="mt-4 font-sans text-xl font-bold text-[#051F20] sm:text-2xl"
            >
              Pour les clients
            </h3>

            <ul class="mt-5 space-y-3 text-sm text-[#051F20]">
              <li
                v-for="benefit in benefitsClient"
                :key="benefit"
                class="flex items-start gap-2.5"
              >
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

                <span>{{ benefit }}</span>
              </li>
            </ul>
          </div>

          <!-- Prestataire -->
          <div
            class="flex flex-col rounded-[20px] bg-[#051F20] p-6 text-white sm:rounded-[24px] sm:p-8"
          >
            <span
              class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/10 text-white"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 21h18" />
                <path d="M5 21V9l7-5 7 5v12" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </span>

            <h3
              class="mt-4 font-sans text-xl font-bold sm:text-2xl"
            >
              Pour les prestataires
            </h3>

            <ul class="mt-5 space-y-3 text-sm text-white/85">
              <li
                v-for="benefit in benefitsPrestataire"
                :key="benefit"
                class="flex items-start gap-2.5"
              >
                <svg
                  class="mt-0.5 h-4 w-4 shrink-0 text-[#8FD9B6]"
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

                <span>{{ benefit }}</span>
              </li>
            </ul>

            <button
              type="button"
              class="mt-6 self-start rounded-[10px] bg-[#2F6250] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#244B3D]"
              @click="goToRegister"
            >
              Rejoindre en tant que prestataire
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- TARIFS -->
    <!-- ================================================================= -->

    <!-- <section
      id="tarifs"
      class="scroll-mt-20 bg-white"

      <div
        class="mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div class="mx-auto mb-12 text-center sm:mb-16">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2F6250] sm:text-xs"
          >
            Pour les prestataires
          </p>

          <h2
            class="mt-2 font-sans text-[28px] font-extrabold tracking-[-0.01em] text-[#051F20] sm:text-3xl lg:text-4xl"
          >
            Testez MIMOSY avant de vous abonner
          </h2>

          <p
            class="mt-3 text-[13px] leading-6 text-[#64748B] sm:text-sm sm:leading-7"
          >
            Commencez avec 40 jours d'accès gratuit avant de décider
            de continuer avec l'abonnement.
          </p>
        </div>

        <!-- Parcours
        <div
          class="mx-auto mb-14 flex items-start gap-3 sm:mb-16 sm:gap-6"
        >
          <div
            class="flex flex-1 flex-col items-center text-center"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2F6250] bg-[#FFF3ED] text-sm font-bold text-[#2F6250]"
            >
              1
            </span>

            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Jour 0
            </p>

            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Inscription et accès aux fonctionnalités
            </p>
          </div>

          <div
            class="mt-[22px] h-[2px] flex-1 bg-[#EFE5E0]"
          ></div>

          <div
            class="flex flex-1 flex-col items-center text-center"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2F6250] bg-[#FFF3ED] text-sm font-bold text-[#2F6250]"
            >
              2
            </span>

            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Jour 40
            </p>

            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Fin de la période d'essai gratuit
            </p>
          </div>

          <div
            class="mt-[22px] h-[2px] flex-1 bg-[#EFE5E0]"
          ></div>

          <div
            class="flex flex-1 flex-col items-center text-center"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F6250] text-sm font-bold text-white"
            >
              3
            </span>

            <p class="mt-3 text-sm font-bold text-[#051F20]">
              Ensuite
            </p>

            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              Choix de continuer avec l'abonnement
            </p>
          </div>
        </div>

        <!-- Tarifs -->
        <!-- <div
          class="mx-auto flex flex-col items-center justify-center gap-6 sm:flex-row sm:flex-wrap sm:items-stretch"
        > -->
          <!-- Essai
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
                class="font-sans text-4xl font-extrabold text-[#051F20]"
              >
                0 FCFA
              </span>

              <span class="text-sm text-[#64748B]">
                pendant 40 jours
              </span>
            </div>

            <ul
              class="mt-6 flex-1 space-y-3 text-sm text-[#051F20]"
            >
              <li class="flex items-start gap-2.5">
                <span class="text-[#2F6250]">✓</span>
                <span>Profil visible auprès des clients</span>
              </li>

              <li class="flex items-start gap-2.5">
                <span class="text-[#2F6250]">✓</span>
                <span>Réception de demandes de prestation</span>
              </li>

              <li class="flex items-start gap-2.5">
                <span class="text-[#2F6250]">✓</span>
                <span>Aucune carte bancaire requise</span>
              </li>
            </ul>

            <p class="mt-6 text-xs text-[#94A3B8]">
              Sans engagement pendant la durée de l'essai.
            </p>
          <!-- </div> -->

          <!-- Abonnement
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
                class="font-sans text-4xl font-extrabold"
              >
                {{ monthlyPrice }}
              </span>

              <span class="text-sm text-white/75">
                / mois
              </span>
            </div>

            <p class="mt-1 text-xs text-white/75">
              Après la période d'essai
            </p>

            <ul class="mt-6 flex-1 space-y-3 text-sm">
              <li class="flex items-start gap-2.5">
                <span>✓</span>
                <span>Profil visible auprès des clients</span>
              </li>

              <li class="flex items-start gap-2.5">
                <span>✓</span>
                <span>Réception des demandes de prestation</span>
              </li>

              <li class="flex items-start gap-2.5">
                <span>✓</span>
                <span>Accès aux fonctionnalités prestataire</span>
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
    </section> -->

    <!-- ================================================================= -->
    <!-- CTA -->
    <!-- ================================================================= -->

    <section
      id="apropos"
      class="relative scroll-mt-20 overflow-hidden bg-[#2F6250]"
    >
      <img
        src="/medias/image.png"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover"
      />

      <div
        class="absolute inset-0 bg-[#2F6250]/75"
      ></div>

      <div
        class="relative mx-auto flex w-full flex-col gap-7 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-20"
      >
        <div class="max-w-2xl">
          <h2
            class="font-sans text-[24px] font-extrabold leading-8 tracking-[-0.01em] text-white sm:text-3xl sm:leading-10"
          >
            Vous êtes prestataire ?
            Rejoignez MIMOSY.
          </h2>

          <p
            class="mt-3 text-[14px] leading-6 text-white/90 sm:text-base sm:leading-7"
          >
            Présentez vos services, développez votre visibilité
            et recevez de nouvelles demandes de prestation.
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

    <!-- ================================================================= -->
    <!-- FOOTER -->
    <!-- ================================================================= -->

    <footer class="bg-white">
      <div
        class="mx-auto w-full px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
      >
        <div
          class="grid gap-9 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-8"
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
                class="font-sans text-[21px] font-extrabold text-[#051F20]"
              >
                MIMOSY
              </span>
            </button>

            <p
              class="mt-5 text-[13px] leading-6 text-[#64748B] sm:text-sm"
            >
              La plateforme de mise en relation entre clients
              et professionnels au Sénégal.
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
  </div>
</template>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
}
</style>
