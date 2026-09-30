<script setup>
/**
 * État « aucune correspondance exacte » de la recherche intelligente,
 * partagé par HomeClient.vue et Prestataires.vue.
 *
 * Affiche les suggestions du fallback IA (champ suggestions_ia de
 * POST /api/recherche/intelligente/) : ce sont des PISTES DE RECHERCHE
 * issues du catalogue réel (service ou catégorie + nombre réel d'offres),
 * jamais des prestataires. Elles sont donc rendues comme des boutons de
 * recherche, jamais comme des PrestataireCard. Un clic relance la
 * recherche avec le libellé choisi (événement « rechercher »).
 *
 * Si l'IA est indisponible ou n'a rien trouvé de pertinent, seul le
 * message de repli envoyé par l'API est affiché.
 */
// Outils Vue et icônes.
import { computed } from 'vue'
import { ArrowRight, Search, Sparkles } from 'lucide-vue-next'

// Props : les suggestions renvoyées par le serveur, et l'affichage du bouton "Réinitialiser".
const props = defineProps({
  suggestionsIa: {
    type: Object,
    required: true,
  },
  peutReinitialiser: {
    type: Boolean,
    default: false,
  },
})

// Événements : relancer une recherche avec une suggestion, ou tout réinitialiser.
defineEmits(['rechercher', 'reinitialiser'])

// La liste des suggestions (vide si aucune).
const suggestions = computed(() => props.suggestionsIa.suggestions || [])

// Renvoie "s" si le nombre est supérieur à 1.
function pluriel(n) {
  return n > 1 ? 's' : ''
}
</script>

<template>
  <div class="sr-state" aria-live="polite">
    <div class="sr-state__icon"><Search class="sr-icon-md" :stroke-width="1.75" /></div>
    <h3 class="font-serif sr-state__title">Aucun résultat exact trouvé</h3>

    <!-- Cas 1 : il y a des suggestions. -->
    <template v-if="suggestions.length">
      <p class="sr-state__text">{{ suggestionsIa.message }}</p>

      <section class="sr-suggestions" aria-labelledby="sr-suggestions-titre">
        <h4 id="sr-suggestions-titre" class="sr-suggestions__title">
          <Sparkles class="sr-icon-sm" :stroke-width="2" />
          Suggestions pour élargir votre recherche
        </h4>
        <p v-if="suggestionsIa.besoin_compris" class="sr-suggestions__besoin">
          Besoin compris : {{ suggestionsIa.besoin_compris }}
        </p>

        <ul class="sr-suggestions__list">
          <!-- Un bouton par suggestion : un clic relance la recherche avec ce libellé. -->
          <li v-for="suggestion in suggestions" :key="`${suggestion.type}-${suggestion.libelle}`">
            <button type="button" class="sr-suggestion" @click="$emit('rechercher', suggestion.libelle)">
              <span class="sr-suggestion__libelle">{{ suggestion.libelle }}</span>
              <span class="sr-suggestion__meta">
                {{ suggestion.type === 'categorie' ? 'Catégorie' : suggestion.categorie }}
                · {{ suggestion.nb_offres }} offre{{ pluriel(suggestion.nb_offres) }}
              </span>
              <ArrowRight class="sr-icon-sm sr-suggestion__fleche" :stroke-width="2" />
            </button>
          </li>
        </ul>

        <p class="sr-suggestions__note">
          Suggestions générées par l'IA à partir des services réellement proposés sur MIMOSY.
        </p>
      </section>
    </template>

    <!-- Cas 2 : aucune suggestion, seulement le message du serveur. -->
    <p v-else class="sr-state__text">{{ suggestionsIa.message }}</p>

    <button v-if="peutReinitialiser" type="button" class="sr-btn-ghost" @click="$emit('reinitialiser')">
      Réinitialiser la recherche
    </button>
  </div>
</template>

<style scoped>
.sr-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  text-align: center;
  border: 1px dashed var(--color-mimosy-border);
  border-radius: 20px;
  background: var(--color-mimosy-surface);
}
.sr-state__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  background: var(--color-mimosy-primaryBg);
  color: var(--color-mimosy-primary);
}
.sr-state__title { font-size: 1.375rem; color: var(--color-mimosy-text); }
.sr-state__text { max-width: 32rem; font-size: 0.875rem; color: var(--color-mimosy-secondary); }

.sr-suggestions {
  width: 100%;
  max-width: 34rem;
  margin-top: 0.5rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: var(--color-mimosy-page);
  border: 1px solid var(--color-mimosy-border);
  text-align: left;
}
.sr-suggestions__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-mimosy-text);
}
.sr-suggestions__besoin { margin-top: 0.375rem; font-size: 0.8125rem; color: var(--color-mimosy-secondary); }
.sr-suggestions__list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.875rem; }
.sr-suggestions__note { margin-top: 0.875rem; font-size: 0.6875rem; color: var(--color-mimosy-secondary); }

.sr-suggestion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--color-mimosy-border);
  background: var(--color-mimosy-surface);
  text-align: left;
  transition: border-color 0.18s ease;
}
.sr-suggestion:hover,
.sr-suggestion:focus-visible { border-color: var(--color-mimosy-primary); }
.sr-suggestion__libelle { font-weight: 700; color: var(--color-mimosy-text); }
.sr-suggestion__meta { flex: 1; font-size: 0.75rem; color: var(--color-mimosy-secondary); }
.sr-suggestion__fleche { color: var(--color-mimosy-primary); }

.sr-btn-ghost {
  margin-top: 0.25rem;
  padding: 0.625rem 1.25rem;
  border-radius: 999px;
  border: 1px solid var(--color-mimosy-border);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-mimosy-text);
}

.sr-icon-sm { width: 1rem; height: 1rem; flex-shrink: 0; }
.sr-icon-md { width: 1.375rem; height: 1.375rem; }
</style>
