<!--
  Modal : fenêtre qui s'affiche par-dessus la page.
  Utilisation : <Modal v-model="ouvert" title="Titre"> contenu </Modal>
  - modelValue : true = ouverte, false = fermée.
  - Un clic sur le fond gris ou sur la croix ferme la fenêtre.
-->
<script setup>
// Props : ouverte ou non, et le titre.
defineProps({ modelValue: { type: Boolean, default: false }, title: { type: String, default: '' } })
// Événement pour fermer la fenêtre (utilisé par v-model).
defineEmits(['update:modelValue'])
</script>

<template>
  <!-- Teleport : la fenêtre est placée directement dans <body>, au-dessus de tout. -->
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 px-4 py-6" @click.self="$emit('update:modelValue', false)">
      <section class="w-full max-w-lg overflow-hidden rounded-[24px] bg-mimosy-surface shadow-xl" role="dialog" aria-modal="true" :aria-label="title">
        <header class="flex items-center justify-between border-b border-mimosy-border px-6 py-5">
          <h2 class="font-serif text-lg text-mimosy-text">{{ title }}</h2>
          <button type="button" class="text-2xl leading-none text-mimosy-secondary transition hover:text-mimosy-text" aria-label="Fermer" @click="$emit('update:modelValue', false)">×</button>
        </header>
        <div class="max-h-[75vh] overflow-y-auto p-6"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>
