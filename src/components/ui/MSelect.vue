<script setup>
/**
 * Liste déroulante native stylée (clavier, mobile et lecteurs d'écran
 * restent gérés par le navigateur).
 * `options` accepte [{ value, label, disabled? }] ; on peut aussi passer
 * directement des <option> dans le slot par défaut.
 */
import { computed, useId } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

// Les attributs non déclarés vont sur le <select>, pas sur la <div>.
defineOptions({ inheritAttrs: false })

// defineModel : permet d'utiliser v-model sur ce composant.
const model = defineModel({ type: [String, Number, null], default: '' })

// Les options : libellé, liste des choix, texte d'aide, erreur, taille...
const props = defineProps({
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  help: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  hideLabel: { type: Boolean, default: false },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
  id: { type: String, default: '' },
})

// Identifiants uniques pour relier le libellé, le select et le message.
const autoId = useId()
const champId = computed(() => props.id || `m-select-${autoId}`)
const messageId = computed(() => `${champId.value}-message`)
const aMessage = computed(() => Boolean(props.error || props.help))
</script>

<template>
  <div class="m-select" :class="[`m-select--${size}`, { 'is-invalid': error, 'is-disabled': disabled }]">
    <label v-if="label" :for="champId" class="m-select__label" :class="{ 'sr-only': hideLabel }">
      {{ label }}
      <span v-if="required" class="m-select__required" aria-hidden="true">*</span>
    </label>

    <div class="m-select__control">
      <select
        :id="champId"
        v-model="model"
        v-bind="$attrs"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="aMessage ? messageId : undefined"
        class="m-select__input"
      >
        <!-- Option vide affichée comme texte d'invitation (ex. "Choisir..."). -->
        <option v-if="placeholder" value="" :disabled="required">{{ placeholder }}</option>
        <!-- Si le parent ne fournit pas ses propres <option>, on les crée à partir de "options". -->
        <slot>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
          >
            {{ option.label }}
          </option>
        </slot>
      </select>
      <!-- La petite flèche vers le bas. -->
      <ChevronDown class="m-select__chevron" :size="16" :stroke-width="1.8" aria-hidden="true" />
    </div>

    <!-- Message d'erreur ou texte d'aide. -->
    <p
      v-if="aMessage"
      :id="messageId"
      :class="error ? 'm-select__error' : 'm-select__help'"
      :role="error ? 'alert' : undefined"
    >
      {{ error || help }}
    </p>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-select {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-family: var(--mimosy-font-sans);
  }

  .m-select__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--mimosy-text);
  }

  .m-select__required {
    margin-left: 0.15rem;
    color: var(--mimosy-danger);
  }

  .m-select__control {
    position: relative;
  }

  .m-select__input {
    width: 100%;
    min-height: 2.875rem;
    padding: 0 2.5rem 0 0.9rem;
    appearance: none;
    border: 1px solid var(--mimosy-border-strong);
    border-radius: var(--mimosy-radius-md);
    background: var(--mimosy-raised);
    color: var(--mimosy-text);
    font: inherit;
    font-size: 0.9375rem;
    transition: border-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-select--sm .m-select__input {
    min-height: 2.25rem;
    font-size: 0.8125rem;
    border-radius: 999px;
    padding-left: 0.9rem;
  }

  .m-select__input:hover {
    border-color: #BFC5BC;
  }

  .m-select__input:focus {
    outline: none;
    border-color: var(--mimosy-green);
    box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.14);
  }

  .m-select__chevron {
    position: absolute;
    top: 50%;
    right: 0.85rem;
    transform: translateY(-50%);
    color: var(--mimosy-muted);
    pointer-events: none;
  }

  .m-select__help,
  .m-select__error {
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .m-select__help { color: var(--mimosy-text-soft); }
  .m-select__error { color: var(--mimosy-danger); }

  .is-invalid .m-select__input { border-color: var(--mimosy-danger); }

  .is-disabled .m-select__input {
    background: var(--mimosy-sunken);
    border-color: var(--mimosy-border);
    color: var(--mimosy-muted);
    cursor: not-allowed;
  }
}
</style>
