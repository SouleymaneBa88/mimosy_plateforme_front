<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

/*
|--------------------------------------------------------------------------
| Rôle
|--------------------------------------------------------------------------
*/

const selectedRole = ref("client");

const selectRole = (role) => {
  selectedRole.value = role;
};

/*
|--------------------------------------------------------------------------
| Formulaire
|--------------------------------------------------------------------------
*/

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const phone = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const acceptTerms = ref(false);

const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const isLoading = ref(false);
const errorMessage = ref("");

/*
|--------------------------------------------------------------------------
| Regex
|--------------------------------------------------------------------------
*/

/*
 * Prénom / Nom
 *
 * Autorise :
 * A-Z
 * lettres accentuées
 * espace
 * apostrophe
 * tiret
 *
 * N'autorise pas :
 * chiffres
 * symboles
 * trois mêmes lettres consécutives
 */
const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

/*
 * E-mail
 */
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/*
 * Téléphone mobile Sénégal
 *
 * Formats acceptés :
 * 77 123 45 67
 * 76 123 45 67
 * 78 123 45 67
 * 75 123 45 67
 * 70 123 45 67
 */
const phoneRegex = /^(70|75|76|77|78)\d{7}$/;

/*
 * Mot de passe
 *
 * Exactement 8 caractères
 * Au moins une lettre
 * Au moins un chiffre
 * Aucun espace
 * Majuscule facultative
 */
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8}$/;

const tripleLetterRegex = /([A-Za-zÀ-ÖØ-öø-ÿ])\1\1/i;

/*
|--------------------------------------------------------------------------
| Nettoyage
|--------------------------------------------------------------------------
*/

const cleanName = (value) => {
  return value.replace(/\s+/g, " ").trimStart();
};

const formatPhone = () => {
  let digits = phone.value.replace(/\D/g, "");

  digits = digits.slice(0, 9);

  const parts = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }

  if (digits.length > 2) {
    parts.push(digits.slice(2, 5));
  }

  if (digits.length > 5) {
    parts.push(digits.slice(5, 7));
  }

  if (digits.length > 7) {
    parts.push(digits.slice(7, 9));
  }

  phone.value = parts.join(" ");
};

const phoneDigits = computed(() => {
  return phone.value.replace(/\D/g, "");
});

/*
|--------------------------------------------------------------------------
| Validation Prénom
|--------------------------------------------------------------------------
*/

const firstNameError = computed(() => {
  const value = firstName.value.trim();

  if (!value) {
    return "";
  }

  if (value.length < 2) {
    return "Le prénom doit contenir au moins 2 caractères.";
  }

  if (value.length > 30) {
    return "Le prénom ne doit pas dépasser 30 caractères.";
  }

  if (!nameRegex.test(value)) {
    return "Le prénom contient des caractères non autorisés.";
  }

  if (tripleLetterRegex.test(value)) {
    return "Le prénom ne peut pas contenir trois lettres identiques à la suite.";
  }

  return "";
});

const firstNameIsValid = computed(() => {
  const value = firstName.value.trim();

  return (
    value.length >= 2 &&
    value.length <= 30 &&
    nameRegex.test(value) &&
    !tripleLetterRegex.test(value)
  );
});

/*
|--------------------------------------------------------------------------
| Validation Nom
|--------------------------------------------------------------------------
*/

const lastNameError = computed(() => {
  const value = lastName.value.trim();

  if (!value) {
    return "";
  }

  if (value.length < 2) {
    return "Le nom doit contenir au moins 2 caractères.";
  }

  if (value.length > 30) {
    return "Le nom ne doit pas dépasser 30 caractères.";
  }

  if (!nameRegex.test(value)) {
    return "Le nom contient des caractères non autorisés.";
  }

  if (tripleLetterRegex.test(value)) {
    return "Le nom ne peut pas contenir trois lettres identiques à la suite.";
  }

  return "";
});

const lastNameIsValid = computed(() => {
  const value = lastName.value.trim();

  return (
    value.length >= 2 &&
    value.length <= 30 &&
    nameRegex.test(value) &&
    !tripleLetterRegex.test(value)
  );
});

const emailError = computed(() => {
  const value = email.value.trim();

  if (!value) {
    return "";
  }

  if (!emailRegex.test(value)) {
    return "Veuillez saisir une adresse e-mail valide.";
  }

  return "";
});

const emailIsValid = computed(() => {
  return emailRegex.test(email.value.trim());
});

/*
|--------------------------------------------------------------------------
| Validation téléphone
|--------------------------------------------------------------------------
*/

const phoneError = computed(() => {
  if (!phoneDigits.value) {
    return "";
  }

  if (phoneDigits.value.length !== 9) {
    return "Le numéro doit contenir exactement 9 chiffres.";
  }

  if (!phoneRegex.test(phoneDigits.value)) {
    return "Veuillez saisir un numéro mobile sénégalais valide.";
  }

  return "";
});

const phoneIsValid = computed(() => {
  return phoneRegex.test(phoneDigits.value);
});

/*
|--------------------------------------------------------------------------
| Validation mot de passe
|--------------------------------------------------------------------------
*/

const passwordError = computed(() => {
  if (!password.value) {
    return "";
  }

  if (password.value.length !== 8) {
    return "Le mot de passe doit contenir exactement 8 caractères.";
  }

  if (/\s/.test(password.value)) {
    return "Le mot de passe ne doit pas contenir d’espace.";
  }

  if (!/[A-Za-z]/.test(password.value)) {
    return "Le mot de passe doit contenir au moins une lettre.";
  }

  if (!/\d/.test(password.value)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!passwordRegex.test(password.value)) {
    return "Le mot de passe contient des caractères non autorisés.";
  }

  return "";
});

const passwordIsValid = computed(() => {
  return passwordRegex.test(password.value);
});

/*
|--------------------------------------------------------------------------
| Confirmation
|--------------------------------------------------------------------------
*/

const passwordConfirmationError = computed(() => {
  if (!passwordConfirmation.value) {
    return "";
  }

  if (passwordConfirmation.value !== password.value) {
    return "Les deux mots de passe ne correspondent pas.";
  }

  return "";
});

const passwordConfirmationIsValid = computed(() => {
  return (
    passwordConfirmation.value !== "" &&
    passwordConfirmation.value === password.value &&
    passwordIsValid.value
  );
});

/*
|--------------------------------------------------------------------------
| Conditions
|--------------------------------------------------------------------------
*/

const formIsValid = computed(() => {
  return (
    selectedRole.value !== "" &&
    firstNameIsValid.value &&
    lastNameIsValid.value &&
    emailIsValid.value &&
    phoneIsValid.value &&
    passwordIsValid.value &&
    passwordConfirmationIsValid.value &&
    acceptTerms.value
  );
});

/*
|--------------------------------------------------------------------------
| Actions
|--------------------------------------------------------------------------
*/

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const togglePasswordConfirmation = () => {
  showPasswordConfirmation.value = !showPasswordConfirmation.value;
};

const goToLogin = () => {
  router.push("/login");
};

const goToHome = () => {
  router.push("/");
};

const selectedRoleForApi = computed(() => {
  return selectedRole.value === "prestataire" ? "PRESTATAIRE" : "CLIENT";
});

const getApiErrorMessage = (data) => {
  if (data?.detail) {
    return data.detail;
  }

  if (typeof data === "object" && data !== null) {
    const firstError = Object.values(data).flat().find(Boolean);

    if (firstError) {
      return String(firstError);
    }
  }

  return "Impossible de créer le compte. Veuillez réessayer.";
};

/*
|--------------------------------------------------------------------------
| Inscription
|--------------------------------------------------------------------------
*/

const handleRegister = async () => {
  errorMessage.value = "";

  /*
   * Vérifications finales
   */

  if (!selectedRole.value) {
    errorMessage.value = "Veuillez sélectionner votre rôle.";
    return;
  }

  if (!firstNameIsValid.value) {
    errorMessage.value = "Veuillez corriger votre prénom.";
    return;
  }

  if (!lastNameIsValid.value) {
    errorMessage.value = "Veuillez corriger votre nom.";
    return;
  }

  if (!emailIsValid.value) {
    errorMessage.value = "Veuillez saisir une adresse e-mail valide.";
    return;
  }

  if (!phoneIsValid.value) {
    errorMessage.value =
      "Veuillez saisir un numéro de téléphone sénégalais valide.";
    return;
  }

  if (!passwordIsValid.value) {
    errorMessage.value = "Veuillez respecter les règles du mot de passe.";
    return;
  }

  if (!passwordConfirmationIsValid.value) {
    errorMessage.value = "La confirmation du mot de passe est incorrecte.";
    return;
  }

  if (!acceptTerms.value) {
    errorMessage.value = "Vous devez accepter les conditions d'utilisation.";
    return;
  }

  isLoading.value = true;

  try {
    await authStore.register({
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        email: email.value.trim(),
        phone: phoneDigits.value,
        password: password.value,
        password_confirm: passwordConfirmation.value,
        role: selectedRoleForApi.value,
        accept_terms: acceptTerms.value,
      });

    router.push("/login");
  } catch (error) {
    errorMessage.value =
      error.message || "Impossible de créer le compte. Veuillez réessayer.";
  } finally {
    isLoading.value = false;
  }
};

/*
|--------------------------------------------------------------------------
| Google
|--------------------------------------------------------------------------
*/

const GOOGLE_LOGIN_URL = "http://localhost:8000/accounts/google/login/";

const handleGoogleSignup = () => {
  /*
   * On conserve le rôle choisi pour pouvoir le récupérer
   * après le retour de Google.
   */
  sessionStorage.setItem("mimosy_signup_role", selectedRole.value);

  window.location.href = GOOGLE_LOGIN_URL;
};
</script>

<template>
  <main class="min-h-screen bg-[#FFFDF9]">
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- ===================================================== -->
      <!-- PARTIE GAUCHE -->
      <!-- ===================================================== -->

      <section class="relative hidden min-h-screen overflow-hidden lg:flex">
        <img
          src="/medias/mimosynet.jpeg"
          alt="MIMOSY"
          class="absolute inset-0 h-full w-full object-cover"
        />

        <div class="absolute inset-0 bg-[#0F172A]/65"></div>

        <div
          class="relative z-10 flex min-h-screen w-full flex-col justify-between p-16"
        >
          <!-- Logo -->

          <button
            type="button"
            class="flex w-fit items-center gap-2"
            aria-label="Accueil MIMOSY"
            @click="goToHome"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#2F6250] font-['Plus_Jakarta_Sans'] text-[20px] font-[800] text-white"
            >
              M
            </span>

            <span
              class="font-['Plus_Jakarta_Sans'] text-[22px] font-[800] text-white"
            >
              MIMOSY
            </span>
          </button>

          <!-- Texte -->

          <div class="max-w-[520px]">
            <h1
              class="font-['Plus_Jakarta_Sans'] text-4xl font-[800] leading-[1.2] text-white"
            >
              Rejoignez la plus grande communauté de services.
            </h1>

            <p class="mt-4 text-base leading-6 text-white/80">
              Inscrivez-vous gratuitement pour trouver rapidement des solutions
              de qualité pour vos besoins quotidiens, ou commencez à proposer
              vos services qualifiés.
            </p>
          </div>

          <!-- Footer -->

          <div class="text-sm text-white/60">Sénégal · Dakar · Mimosy 2026</div>
        </div>
      </section>

      <!-- ===================================================== -->
      <!-- PARTIE DROITE -->
      <!-- ===================================================== -->

      <section
        class="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-16"
      >
        <div class="w-full max-w-[460px]">
          <!-- Logo mobile -->

          <button
            type="button"
            class="mx-auto mb-7 flex items-center gap-2 lg:hidden"
            aria-label="Accueil MIMOSY"
            @click="goToHome"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#2F6250] font-['Plus_Jakarta_Sans'] text-[20px] font-[800] text-white"
            >
              M
            </span>

            <span
              class="font-['Plus_Jakarta_Sans'] text-[22px] font-[800] text-[#051F20]"
            >
              MIMOSY
            </span>
          </button>

          <!-- ================================================= -->
          <!-- EN-TÊTE -->
          <!-- ================================================= -->

          <div class="flex flex-col items-center text-center">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#2F6250] font-['Plus_Jakarta_Sans'] text-[22px] font-[800] text-white"
            >
              M
            </div>

            <h2
              class="mt-2 font-['Plus_Jakarta_Sans'] text-[26px] font-[800] text-[#0F172A]"
            >
              Créer un compte
            </h2>
          </div>

          <!-- ================================================= -->
          <!-- CHOIX DU RÔLE -->
          <!-- ================================================= -->

          <div class="mt-6 flex h-12 w-full rounded-[10px] bg-[#FAF5F0] p-1">
            <button
              type="button"
              class="flex flex-1 items-center justify-center rounded-[10px] text-sm transition-all duration-200"
              :class="
                selectedRole === 'client'
                  ? 'bg-white font-bold text-[#2F6250] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  : 'font-semibold text-[#334155] hover:text-[#2F6250]'
              "
              @click="selectRole('client')"
            >
              Je suis client
            </button>

            <button
              type="button"
              class="flex flex-1 items-center justify-center rounded-xl text-sm transition-all duration-200"
              :class="
                selectedRole === 'prestataire'
                  ? 'bg-white font-bold text-[#2F6250] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  : 'font-semibold text-[#334155] hover:text-[#2F6250]'
              "
              @click="selectRole('prestataire')"
            >
              Je suis prestataire
            </button>
          </div>

          <p class="mt-2 text-center text-xs text-[#64748B]">
            {{
              selectedRole === "client"
                ? "Vous recherchez un professionnel pour une prestation."
                : "Vous souhaitez proposer vos services sur MIMOSY."
            }}
          </p>

          <!-- ================================================= -->
          <!-- FORMULAIRE -->
          <!-- ================================================= -->

          <form
            class="mt-6 flex flex-col gap-4"
            @submit.prevent="handleRegister"
          >
            <!-- Prénom + Nom -->

            <div class="grid gap-4 sm:grid-cols-2">
              <!-- Prénom -->

              <div>
                <label
                  for="firstName"
                  class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
                >
                  Prénom
                </label>

                <input
                  id="firstName"
                  v-model="firstName"
                  type="text"
                  autocomplete="given-name"
                  placeholder="Fatou"
                  maxlength="30"
                  class="h-[42px] w-full rounded-[10px] border bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:ring-4"
                  :class="
                    firstNameError
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : firstNameIsValid
                        ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                        : 'border-[#E2E8F0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                  "
                  @input="firstName = cleanName(firstName)"
                />

                <p
                  v-if="firstNameError"
                  class="mt-1.5 text-[11px] leading-4 text-red-500"
                >
                  {{ firstNameError }}
                </p>
              </div>

              <!-- Nom -->

              <div>
                <label
                  for="lastName"
                  class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
                >
                  Nom
                </label>

                <input
                  id="lastName"
                  v-model="lastName"
                  type="text"
                  autocomplete="family-name"
                  placeholder="Sarr"
                  maxlength="30"
                  class="h-[42px] w-full rounded-[10px] border bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:ring-4"
                  :class="
                    lastNameError
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                      : lastNameIsValid
                        ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                        : 'border-[#E2E8F0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                  "
                  @input="lastName = cleanName(lastName)"
                />

                <p
                  v-if="lastNameError"
                  class="mt-1.5 text-[11px] leading-4 text-red-500"
                >
                  {{ lastNameError }}
                </p>
              </div>
            </div>

            <!-- Email -->

            <div>
              <label
                for="email"
                class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
                v-model.trim="email"
                type="email"
                autocomplete="email"
                placeholder="fatousarr@domaine.sn"
                maxlength="100"
                class="h-[42px] w-full rounded-[10px] border bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:ring-4"
                :class="
                  emailError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : emailIsValid
                      ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                      : 'border-[#E2E8F0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                "
              />

              <p
                v-if="emailError"
                class="mt-1.5 text-[11px] leading-4 text-red-500"
              >
                {{ emailError }}
              </p>
            </div>

            <!-- Téléphone -->

            <div>
              <label
                for="phone"
                class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
              >
                Numéro de téléphone
              </label>

              <div
                class="flex h-[42px] overflow-hidden rounded-[10px] border bg-white"
                :class="
                  phoneError
                    ? 'border-red-400'
                    : phoneIsValid
                      ? 'border-[#2F6250]'
                      : 'border-[#E2E8F0]'
                "
              >
                <div
                  class="flex items-center border-r border-[#E2E8F0] bg-[#FAF5F0] px-4 text-sm font-bold text-[#0F172A]"
                >
                  +221
                </div>

                <input
                  id="phone"
                  v-model="phone"
                  type="tel"
                  inputmode="numeric"
                  autocomplete="tel"
                  placeholder="77 123 45 67"
                  class="min-w-0 flex-1 px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#64748B]"
                  @input="formatPhone"
                />
              </div>

              <p
                v-if="phoneError"
                class="mt-1.5 text-[11px] leading-4 text-red-500"
              >
                {{ phoneError }}
              </p>
            </div>

            <!-- Mot de passe + Confirmation -->

            <div class="grid gap-4 sm:grid-cols-2">
              <!-- Mot de passe -->

              <div>
                <label
                  for="password"
                  class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
                >
                  Mot de passe
                </label>

                <div class="relative">
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    maxlength="8"
                    class="h-[42px] w-full rounded-[10px] border bg-white px-3 pr-16 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:ring-4"
                    :class="
                      passwordError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : passwordIsValid
                          ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                          : 'border-[#E2E8F0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                    "
                  />

                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#2F6250]"
                    @click="togglePassword"
                  >
                    {{ showPassword ? "Masquer" : "Afficher" }}
                  </button>
                </div>

                <p
                  v-if="passwordError"
                  class="mt-1.5 text-[11px] leading-4 text-red-500"
                >
                  {{ passwordError }}
                </p>

                <p v-else class="mt-1 text-[10px] text-[#94A3B8]">
                  Lettre + chiffre · exactement 8 caractères ·
                  {{ password.length }}/8
                </p>
              </div>

              <!-- Confirmation -->

              <div>
                <label
                  for="passwordConfirmation"
                  class="mb-1.5 block text-[13px] font-bold text-[#0F172A]"
                >
                  Confirmer
                </label>

                <div class="relative">
                  <input
                    id="passwordConfirmation"
                    v-model="passwordConfirmation"
                    :type="showPasswordConfirmation ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    maxlength="8"
                    class="h-[42px] w-full rounded-[10px] border bg-white px-3 pr-16 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:ring-4"
                    :class="
                      passwordConfirmationError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : passwordConfirmationIsValid
                          ? 'border-[#2F6250] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                          : 'border-[#E2E8F0] focus:border-[#2F6250] focus:ring-[#2F6250]/10'
                    "
                  />

                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#2F6250]"
                    @click="togglePasswordConfirmation"
                  >
                    {{ showPasswordConfirmation ? "Masquer" : "Afficher" }}
                  </button>
                </div>

                <p
                  v-if="passwordConfirmationError"
                  class="mt-1.5 text-[11px] leading-4 text-red-500"
                >
                  {{ passwordConfirmationError }}
                </p>

                <p
                  v-else-if="passwordConfirmationIsValid"
                  class="mt-1 text-[10px] font-medium text-[#2F6250]"
                >
                  Les mots de passe correspondent.
                </p>
              </div>
            </div>

            <!-- Conditions -->

            <label class="flex cursor-pointer items-start gap-2">
              <input
                v-model="acceptTerms"
                type="checkbox"
                class="peer sr-only"
              />

              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#E2E8F0] bg-white text-white transition peer-checked:border-[#2F6250] peer-checked:bg-[#2F6250]"
              >
                <svg
                  v-if="acceptTerms"
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path d="m5 12 4 4L19 7" />
                </svg>
              </span>

              <span class="text-[12px] leading-[18px] text-[#334155]">
                J'accepte les
                <button type="button" class="font-bold text-[#2F6250]">
                  conditions d'utilisation
                </button>
                et la
                <button type="button" class="font-bold text-[#2F6250]">
                  politique de confidentialité
                </button>
              </span>
            </label>

            <!-- Erreur globale -->

            <div
              v-if="errorMessage"
              class="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-600"
            >
              {{ errorMessage }}
            </div>

            <!-- Créer compte -->

            <button
              type="submit"
              :disabled="!formIsValid || isLoading"
              class="flex h-12 w-full items-center justify-center rounded-[10px] px-8 text-base font-bold text-white transition"
              :class="
                formIsValid && !isLoading
                  ? 'bg-[#2F6250] hover:bg-[#245443] hover:shadow-lg'
                  : 'cursor-not-allowed bg-[#A8B6AF]'
              "
            >
              <span v-if="!isLoading"> Créer mon compte </span>

              <span v-else class="flex items-center gap-2">
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                ></span>

                Création...
              </span>
            </button>
          </form>

          <!-- ================================================= -->
          <!-- SÉPARATEUR -->
          <!-- ================================================= -->

          <div class="my-5 flex items-center gap-4">
            <div class="h-px flex-1 bg-[#E2E8F0]"></div>

            <span class="text-[13px] text-[#64748B]"> ou </span>

            <div class="h-px flex-1 bg-[#E2E8F0]"></div>
          </div>

          <!-- ================================================= -->
          <!-- GOOGLE -->
          <!-- ================================================= -->

          <button
            type="button"
            class="flex h-11 w-full items-center justify-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A] transition hover:border-[#2F6250] hover:bg-[#FFFDF9]"
            @click="handleGoogleSignup"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.805 12.23c0-.79-.07-1.55-.225-2.28H12v4.315h5.49a4.69 4.69 0 0 1-2.04 3.078v2.557h3.3c1.93-1.78 3.055-4.4 3.055-7.67Z"
                fill="#4285F4"
              />

              <path
                d="M12 22c2.76 0 5.075-.915 6.767-2.48l-3.3-2.557c-.915.615-2.08.98-3.467.98-2.665 0-4.92-1.8-5.73-4.215h-3.41v2.635A10.23 10.23 0 0 0 12 22Z"
                fill="#34A853"
              />

              <path
                d="M6.27 13.728A6.15 6.15 0 0 1 5.95 12c0-.6.105-1.18.32-1.728V7.637H2.86A10.23 10.23 0 0 0 1.77 12c0 1.65.395 3.205 1.09 4.363l3.41-2.635Z"
                fill="#FBBC05"
              />

              <path
                d="M12 6.057c1.5 0 2.845.515 3.905 1.525l2.93-2.93C17.07 3.01 14.76 2 12 2A10.23 10.23 0 0 0 2.86 7.637l3.41 2.635C7.08 7.857 9.335 6.057 12 6.057Z"
                fill="#EA4335"
              />
            </svg>

            Continuer avec Google
          </button>

          <!-- ================================================= -->
          <!-- LOGIN -->
          <!-- ================================================= -->

          <div class="mt-5 flex items-center justify-center gap-1.5 text-sm">
            <span class="text-[#334155]"> Déjà un compte ? </span>

            <button
              type="button"
              class="font-bold text-[#2F6250] transition hover:text-[#245443]"
              @click="goToLogin"
            >
              Se connecter
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
button,
input {
  font-family: inherit;
}

input[type="checkbox"] {
  accent-color: #2f6250;
}
</style>
