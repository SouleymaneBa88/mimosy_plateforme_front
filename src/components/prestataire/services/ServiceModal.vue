<script setup>
/**
 * ServiceModal.vue
 * ─────────────────────────────────────────────────────────────
 * Modale de création / édition d'une offre de service d'un prestataire.
 * Utilisée par MesPrestations.vue.
 *
 * Mode déduit de la prop `service` :
 *  - `null`    → création. Le champ « service » est ouvert sur le catalogue.
 *  - un objet  → édition. Le service du catalogue est verrouillé (changer de
 *                service reviendrait à créer une autre offre) ; seuls le
 *                descriptif, le tarif et la disponibilité restent modifiables.
 *
 * Contrat avec le parent :
 *  - `v-model`       ouverture / fermeture
 *  - `@save`         émet `{ service, description, prix, unite, disponible }`
 *  - `isSaving`      verrouille le formulaire pendant l'appel API
 *  - `errorMessage`  erreur serveur affichée au-dessus des actions
 *
 * Responsive :
 *  - < 640 px  : un champ par ligne, actions empilées, bouton principal en
 *                premier sous le pouce.
 *  - ≥ 640 px  : tarif et unité côte à côte, actions alignées à droite dans
 *                l'ordre de lecture habituel (annuler puis enregistrer).
 *
 * Design : mêmes partis pris que l'espace prestataire — pas d'ombre portée,
 * pas d'emoji, jetons de couleur --pp-* fixés localement pour ne pas dépendre
 * d'un thème hérité.
 */
// Outils Vue et la fenêtre modale commune.
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'

/** Unités proposées en suggestion. Le champ reste libre. */
const UNITES = ['prestation', 'heure', 'jour', 'm²', 'km', 'pièce']

/** Longueur maximale du descriptif, alignée sur la contrainte de l'API. */
const DESCRIPTION_MAX = 400

const props = defineProps({
  /** Ouverture de la modale (v-model). */
  modelValue: Boolean,
  /** Offre à éditer, ou `null` pour une création. */
  service: { type: Object, default: null },
  /** Catalogue MIMOSY : `[{ id, nom, categorie_nom }]`. */
  catalogue: { type: Array, default: () => [] },
  /** Sauvegarde en cours : verrouille les contrôles. */
  isSaving: Boolean,
  /** Message d'erreur renvoyé par le serveur. */
  errorMessage: { type: String, default: '' },
})

// Événements : fermer la fenêtre, enregistrer.
const emit = defineEmits(['update:modelValue', 'save'])

// Les valeurs du formulaire.
const form = reactive({
  service: '',
  description: '',
  prix: null,
  unite: 'prestation',
  disponible: true,
})

/**
 * Les erreurs ne s'affichent qu'après une première tentative d'envoi :
 * inutile de signaler un champ vide à quelqu'un qui n'a pas encore commencé.
 */
const submitted = ref(false)

// true en mode modification (un service existant a été fourni).
const isEdition = computed(() => Boolean(props.service))

// Les messages d'erreur de chaque champ (vide = pas d'erreur).
const errors = computed(() => ({
  service: !form.service ? 'Choisissez un service du catalogue.' : '',
  prix:
    form.prix === null || form.prix === '' || Number(form.prix) <= 0
      ? 'Indiquez un tarif supérieur à 0.'
      : '',
  unite: !form.unite?.trim() ? "Précisez l'unité facturée." : '',
}))

// Le formulaire est valide si aucun champ n'a d'erreur.
const isValid = computed(() => Object.values(errors.value).every((message) => !message))

/** Aperçu formaté du tarif, pour relire le montant sans compter les zéros. */
const prixApercu = computed(() => {
  const valeur = Number(form.prix)
  if (!valeur || valeur <= 0) return ''
  return `${valeur.toLocaleString('fr-FR')} FCFA / ${form.unite || 'unité'}`
})

/** Remplit le formulaire depuis la prop, ou le remet à zéro en création. */
function hydrate(service) {
  Object.assign(form, {
    service: service?.service || '',
    description: service?.description || '',
    prix: service?.prix != null ? Number(service.prix) : null,
    unite: service?.unite || 'prestation',
    disponible: service?.disponible ?? true,
  })
}

// Quand le service à modifier change, on remplit le formulaire.
watch(() => props.service, hydrate, { immediate: true })

// À chaque réouverture, on repart d'un formulaire propre : sans cela, une
// création qui suit une édition annulée conserverait les valeurs précédentes.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    submitted.value = false
    hydrate(props.service)
  },
)

// Ferme la fenêtre.
function close() {
  emit('update:modelValue', false)
}

// Clic sur "Enregistrer" : on affiche les erreurs, et on envoie seulement si tout est valide.
function save() {
  submitted.value = true
  if (!isValid.value || props.isSaving) return
  emit('save', {
    ...form,
    prix: Number(form.prix),
    description: form.description.trim(),
    unite: form.unite.trim(),
  })
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="isEdition ? 'Modifier le service' : 'Ajouter un service'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="sm-form" novalidate @submit.prevent="save">
      <!-- Service du catalogue -->
      <div class="sm-field">
        <label class="sm-label" for="sm-service">Service</label>
        <select
          id="sm-service"
          v-model="form.service"
          class="sm-input sm-select"
          :class="{ 'sm-input--error': submitted && errors.service }"
          :disabled="isEdition || isSaving"
          :aria-invalid="Boolean(submitted && errors.service)"
        >
          <option value="">Choisir un service du catalogue</option>
          <option v-for="item in catalogue" :key="item.id" :value="item.id">
            {{ item.nom }}{{ item.categorie_nom ? ` — ${item.categorie_nom}` : '' }}
          </option>
        </select>
        <p v-if="isEdition" class="sm-hint">
          Le service choisi ne peut plus changer. Créez une autre offre pour une
          prestation différente.
        </p>
        <p v-else-if="submitted && errors.service" class="sm-error">{{ errors.service }}</p>
      </div>

      <!-- Descriptif -->
      <div class="sm-field">
        <div class="sm-label-row">
          <label class="sm-label" for="sm-description">Description</label>
          <span class="sm-counter" :class="{ 'sm-counter--max': form.description.length >= DESCRIPTION_MAX }">
            {{ form.description.length }}/{{ DESCRIPTION_MAX }}
          </span>
        </div>
        <textarea
          id="sm-description"
          v-model="form.description"
          class="sm-input sm-textarea"
          :maxlength="DESCRIPTION_MAX"
          :disabled="isSaving"
          rows="3"
          placeholder="Ce que comprend votre offre, votre zone d'intervention, vos délais…"
        />
      </div>

      <!-- Tarif et unité -->
      <div class="sm-row">
        <div class="sm-field">
          <label class="sm-label" for="sm-prix">Tarif</label>
          <div class="sm-affix" :class="{ 'sm-affix--error': submitted && errors.prix }">
            <input
              id="sm-prix"
              v-model.number="form.prix"
              type="number"
              inputmode="numeric"
              min="1"
              step="500"
              class="sm-input sm-input--bare"
              :disabled="isSaving"
              :aria-invalid="Boolean(submitted && errors.prix)"
              placeholder="15000"
            />
            <span class="sm-affix-unit">FCFA</span>
          </div>
          <p v-if="submitted && errors.prix" class="sm-error">{{ errors.prix }}</p>
        </div>

        <div class="sm-field">
          <label class="sm-label" for="sm-unite">Unité</label>
          <input
            id="sm-unite"
            v-model="form.unite"
            list="sm-unites"
            class="sm-input"
            :class="{ 'sm-input--error': submitted && errors.unite }"
            :disabled="isSaving"
            :aria-invalid="Boolean(submitted && errors.unite)"
            placeholder="prestation"
          />
          <datalist id="sm-unites">
            <option v-for="unite in UNITES" :key="unite" :value="unite" />
          </datalist>
          <p v-if="submitted && errors.unite" class="sm-error">{{ errors.unite }}</p>
        </div>
      </div>

      <p v-if="prixApercu" class="sm-preview">Affiché aux clients : {{ prixApercu }}</p>

      <!-- Disponibilité : interrupteur plutôt que case à cocher, la valeur est
           visible d'un coup d'œil et la cible tactile est plus large. -->
      <label class="sm-switch" :class="{ 'sm-switch--on': form.disponible }">
        <input v-model="form.disponible" type="checkbox" class="sm-switch-input" :disabled="isSaving" />
        <span class="sm-switch-track" aria-hidden="true"><span class="sm-switch-thumb" /></span>
        <span class="sm-switch-text">
          <span class="sm-switch-title">Offre disponible</span>
          <span class="sm-switch-sub">
            {{ form.disponible ? 'Visible par les clients.' : 'Masquée, vous pourrez la réactiver.' }}
          </span>
        </span>
      </label>

      <!-- Erreur renvoyée par le serveur. -->
      <p v-if="errorMessage" class="sm-server-error" role="alert">{{ errorMessage }}</p>

      <!-- Boutons Annuler / Enregistrer. -->
      <div class="sm-actions">
        <button type="button" class="sm-btn sm-btn--ghost" :disabled="isSaving" @click="close">
          Annuler
        </button>
        <button type="submit" class="sm-btn sm-btn--primary" :disabled="isSaving">
          {{ isSaving ? 'Enregistrement…' : isEdition ? 'Enregistrer les modifications' : 'Publier l\'offre' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
/*
 * Jetons fixés localement, comme dans MesPrestations.vue : la modale reste
 * lisible même si un thème parent redéfinit des variables du même nom.
 * Aucune box-shadow ici non plus — bordures et fonds portent la hiérarchie.
 */
.sm-form {
  --sm-ink: #0f172a;
  --sm-muted: #47556a;
  --sm-sage: #2f6250;
  --sm-sage-dark: #1c3f34;
  --sm-border: #d9ddd8;
  --sm-border-strong: #b9c4bd;
  --sm-bg-soft: #f1f5f4;
  --sm-danger: #8f342b;
  --sm-danger-border: #e7b8b2;
  --sm-danger-bg: #fff0ee;

  display: grid;
  gap: 1.1rem;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--sm-ink);
}

.sm-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.sm-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.sm-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sm-muted);
}

.sm-counter {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}
.sm-counter--max {
  color: var(--sm-danger);
}

/* ---------- Champs ---------- */
.sm-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid var(--sm-border);
  background: #ffffff;
  padding: 0.7rem 0.9rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--sm-ink);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.sm-input::placeholder {
  color: #94a3b8;
}
.sm-input:hover:not(:disabled) {
  border-color: var(--sm-border-strong);
}
/* L'anneau de focus double la bordure : repère net au clavier. */
.sm-input:focus-visible,
.sm-affix:focus-within {
  border-color: var(--sm-sage);
  outline: 2px solid rgba(47, 98, 80, 0.25);
  outline-offset: 1px;
}
.sm-input:disabled {
  background: #f8fafc;
  color: var(--sm-muted);
  cursor: not-allowed;
}
.sm-input--error,
.sm-affix--error {
  border-color: var(--sm-danger-border);
  background: var(--sm-danger-bg);
}

.sm-select {
  /* Chevron dessiné en SVG inline : pas de dépendance à une police d'icônes. */
  appearance: none;
  padding-right: 2.4rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2347556a' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  background-size: 1.1rem;
}

.sm-textarea {
  resize: vertical;
  min-height: 5.25rem;
  line-height: 1.5;
}

/* Champ tarif : l'unité monétaire est collée au champ plutôt que placée
   dans le placeholder, qui disparaît dès la saisie. */
.sm-affix {
  display: flex;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid var(--sm-border);
  background: #ffffff;
  transition: border-color 0.15s ease;
}
.sm-affix:hover {
  border-color: var(--sm-border-strong);
}
.sm-input--bare {
  border: 0;
  background: transparent;
  padding-right: 0.3rem;
  font-variant-numeric: tabular-nums;
}
.sm-input--bare:focus-visible {
  outline: none;
}
.sm-affix-unit {
  flex-shrink: 0;
  padding: 0 0.9rem 0 0.2rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sm-muted);
}

.sm-hint {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--sm-muted);
}
.sm-error {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sm-danger);
}
.sm-preview {
  margin-top: -0.35rem;
  font-size: 0.78rem;
  color: var(--sm-muted);
}

/* ---------- Grille tarif / unité ---------- */
.sm-row {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .sm-row {
    grid-template-columns: 1fr 170px;
  }
}

/* ---------- Interrupteur de disponibilité ---------- */
.sm-switch {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 0.9rem;
  border: 1px solid var(--sm-border);
  background: #ffffff;
  padding: 0.85rem 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.sm-switch--on {
  border-color: rgba(47, 98, 80, 0.35);
  background: var(--sm-bg-soft);
}
.sm-switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.sm-switch-track {
  position: relative;
  flex-shrink: 0;
  width: 2.4rem;
  height: 1.35rem;
  margin-top: 0.1rem;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background-color 0.15s ease;
}
.sm-switch--on .sm-switch-track {
  background: var(--sm-sage);
}
.sm-switch-thumb {
  position: absolute;
  top: 0.175rem;
  left: 0.175rem;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  background: #ffffff;
  transition: transform 0.15s ease;
}
.sm-switch--on .sm-switch-thumb {
  transform: translateX(1.05rem);
}
.sm-switch-input:focus-visible + .sm-switch-track {
  outline: 2px solid var(--sm-sage);
  outline-offset: 2px;
}
.sm-switch-text {
  display: grid;
  gap: 0.15rem;
}
.sm-switch-title {
  font-size: 0.875rem;
  font-weight: 600;
}
.sm-switch-sub {
  font-size: 0.75rem;
  color: var(--sm-muted);
}

/* ---------- Erreur serveur ---------- */
.sm-server-error {
  border-radius: 0.75rem;
  border: 1px solid var(--sm-danger-border);
  background: var(--sm-danger-bg);
  padding: 0.75rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--sm-danger);
}

/* ---------- Actions ---------- */
.sm-actions {
  display: flex;
  flex-direction: column-reverse; /* mobile : action principale sous le pouce */
  gap: 0.5rem;
  margin-top: 0.15rem;
  padding-top: 1rem;
  border-top: 1px solid #eef2f1;
}
@media (min-width: 640px) {
  .sm-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.sm-btn {
  border-radius: 0.75rem;
  padding: 0.75rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.sm-btn:focus-visible {
  outline: 2px solid var(--sm-sage);
  outline-offset: 2px;
}
.sm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.sm-btn--primary {
  background: var(--sm-sage);
  border-color: var(--sm-sage);
  color: #ffffff;
}
.sm-btn--primary:hover:not(:disabled) {
  background: var(--sm-sage-dark);
  border-color: var(--sm-sage-dark);
}
.sm-btn--ghost {
  background: #ffffff;
  border-color: var(--sm-border);
  color: #334155;
}
.sm-btn--ghost:hover:not(:disabled) {
  background: var(--sm-bg-soft);
}

@media (prefers-reduced-motion: reduce) {
  .sm-form * {
    transition: none !important;
  }
}
</style>