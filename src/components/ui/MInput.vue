<script setup>
/**
 * Champ texte MIMOSY (input ou textarea via `multiline`).
 * Label, aide et erreur sont reliés au champ (for / aria-describedby /
 * aria-invalid). Les attributs non déclarés (autocomplete, min, name…)
 * sont transmis au champ lui-même, pas au conteneur.
 */
import { computed, useId, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: [String, Number], default: '' })

const props = defineProps({
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  help: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
  multiline: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  // Label visuellement masqué mais lu par les lecteurs d'écran.
  hideLabel: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const slots = useSlots()
const autoId = useId()
const champId = computed(() => props.id || `m-input-${autoId}`)
const aideId = computed(() => `${champId.value}-aide`)
const erreurId = computed(() => `${champId.value}-erreur`)

const decritPar = computed(() => {
  const ids = []
  if (props.error) ids.push(erreurId.value)
  if (props.help) ids.push(aideId.value)
  return ids.join(' ') || undefined
})
</script>

<template>
  <div class="m-field" :class="{ 'is-invalid': error, 'is-disabled': disabled }">
    <label v-if="label" :for="champId" class="m-field__label" :class="{ 'sr-only': hideLabel }">
      {{ label }}
      <span v-if="required" class="m-field__required" aria-hidden="true">*</span>
    </label>

    <div class="m-field__control" :class="{ 'has-icon': icon, 'is-multiline': multiline }">
      <component :is="icon" v-if="icon" class="m-field__icon" :size="17" :stroke-width="1.8" aria-hidden="true" />

      <textarea
        v-if="multiline"
        :id="champId"
        v-model="model"
        v-bind="$attrs"
        :rows="rows"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="decritPar"
        class="m-field__input"
      />
      <input
        v-else
        :id="champId"
        v-model="model"
        v-bind="$attrs"
        :type="type"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="decritPar"
        class="m-field__input"
      />

      <span v-if="slots.suffix" class="m-field__suffix"><slot name="suffix" /></span>
    </div>

    <p v-if="error" :id="erreurId" class="m-field__error" role="alert">{{ error }}</p>
    <p v-else-if="help" :id="aideId" class="m-field__help">{{ help }}</p>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-family: var(--mimosy-font-sans);
  }

  .m-field__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--mimosy-text);
  }

  .m-field__required {
    margin-left: 0.15rem;
    color: var(--mimosy-danger);
  }

  .m-field__control {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 2.875rem;
    border: 1px solid var(--mimosy-border-strong);
    border-radius: var(--mimosy-radius-md);
    background: var(--mimosy-raised);
    transition:
      border-color var(--mimosy-duration-fast) var(--mimosy-ease),
      background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-field__control:hover {
    border-color: #BFC5BC;
  }

  .m-field__control:focus-within {
    border-color: var(--mimosy-green);
    box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.14);
  }

  .m-field__control.is-multiline {
    align-items: stretch;
  }

  .m-field__input {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: 0;
    background: transparent;
    color: var(--mimosy-text);
    font: inherit;
    font-size: 0.9375rem;
    outline: none;
  }

  .m-field__control.is-multiline .m-field__input {
    resize: vertical;
    line-height: 1.55;
  }

  .has-icon .m-field__input {
    padding-left: 2.6rem;
  }

  .m-field__icon {
    position: absolute;
    left: 0.9rem;
    color: var(--mimosy-muted);
    pointer-events: none;
  }

  .is-multiline .m-field__icon {
    top: 0.8rem;
  }

  .m-field__control:focus-within .m-field__icon {
    color: var(--mimosy-green);
  }

  .m-field__suffix {
    display: flex;
    align-items: center;
    padding-right: 0.5rem;
    color: var(--mimosy-muted);
    font-size: 0.875rem;
  }

  .m-field__help,
  .m-field__error {
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .m-field__help {
    color: var(--mimosy-text-soft);
  }

  .m-field__error {
    color: var(--mimosy-danger);
  }

  .is-invalid .m-field__control {
    border-color: var(--mimosy-danger);
  }

  .is-invalid .m-field__control:focus-within {
    box-shadow: 0 0 0 3px rgba(164, 68, 58, 0.14);
  }

  .is-disabled .m-field__control {
    background: var(--mimosy-sunken);
    border-color: var(--mimosy-border);
  }

  .is-disabled .m-field__input {
    color: var(--mimosy-muted);
    cursor: not-allowed;
  }
}
</style>
