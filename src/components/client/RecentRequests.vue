<script setup>
defineProps({
  requests: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['view-all', 'view-details'])
// Couleurs de badge par statut, centralisées ici pour éviter de dupliquer le mapping
// entre la version tableau (desktop) et la version carte (mobile)
const statusStyles = {
  'En attente': 'bg-[#FFF7E6] text-[#C47A08]',
  'Devis reçu': 'bg-[#EDF4FF] text-[#3267B1]',
  'Terminée': 'bg-[#EAF8F2] text-[#16805B]',
  'Acceptée': 'bg-[#EAF8F2] text-[#16805B]',
  'Annulée': 'bg-[#FFF0EE] text-[#C53B35]',
}

const badgeClass = (status) => statusStyles[status] ?? 'bg-[#F1F5F9] text-[#64748B]'
</script>

<template>
  <section class="w-full">
    <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <h2 class="text-[18px] font-bold leading-7 tracking-[0.02px] text-[#051F20] sm:text-[20px] sm:leading-[30px]">
        Mes demandes récentes
      </h2>

      <button
        type="button"
        class="self-start text-[12px] font-bold text-[#2F6250] transition hover:underline sm:self-auto sm:text-[13px]"
        @click="emit('view-all')"
      >
        Voir tout
      </button>
    </div>

    <div class="w-full overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white sm:rounded-[20px]">
      <!-- Tableau à partir de la tablette -->
      <div class="hidden sm:block">
        <div class="grid grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr] border-b border-[#E2E8F0] bg-[#FAF5F0] px-4 py-3 md:px-5 md:py-4">
          <div class="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] md:text-[11px]">Service</div>
          <div class="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] md:text-[11px]">Prestataire</div>
          <div class="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] md:text-[11px]">Date</div>
          <div class="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94A3B8] md:text-[11px]">Statut</div>
        </div>

        <div
          v-for="(request, index) in requests"
          :key="request.id"
          class="grid cursor-pointer grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr] items-center px-4 py-4 transition hover:bg-[#FAFAFA] md:px-5 md:py-5"
          :class="{ 'border-b border-[#F1F5F9]': index < requests.length - 1 }"
          @click="emit('view-details', request)"
        >
          <div class="min-w-0">
            <p class="truncate text-[13px] font-bold text-[#051F20] md:text-[14px]">
              {{ request.service }}
            </p>
            <p v-if="request.description" class="mt-1 truncate text-[11px] text-[#94A3B8] md:text-[12px]">
              {{ request.description }}
            </p>
          </div>

          <div class="min-w-0">
            <p class="truncate text-[12px] font-medium text-[#334155] md:text-[13px]">
              {{ request.provider }}
            </p>
          </div>

          <div>
            <p class="text-[12px] text-[#64748B] md:text-[13px]">
              {{ request.date }}
            </p>
          </div>

          <div>
            <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold md:px-3 md:text-[11px]" :class="badgeClass(request.status)">
              {{ request.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Cartes sur mobile -->
      <div class="sm:hidden">
        <article
          v-for="(request, index) in requests"
          :key="request.id"
          class="cursor-pointer p-4 transition hover:bg-[#FAFAFA]"
          :class="{ 'border-b border-[#F1F5F9]': index < requests.length - 1 }"
          @click="emit('view-details', request)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[14px] font-bold leading-5 text-[#051F20]">
                {{ request.service }}
              </p>
              <p v-if="request.description" class="mt-1 line-clamp-2 text-[11px] leading-4 text-[#94A3B8]">
                {{ request.description }}
              </p>
            </div>

            <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" :class="badgeClass(request.status)">
              {{ request.status }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Prestataire</p>
              <p class="mt-1 truncate text-[12px] font-medium text-[#334155]">{{ request.provider }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Date</p>
              <p class="mt-1 text-[12px] text-[#64748B]">{{ request.date }}</p>
            </div>
          </div>
        </article>
      </div>

      <div v-if="requests.length === 0" class="px-5 py-10 text-center sm:px-6 sm:py-12">
        <p class="text-[13px] font-semibold text-[#051F20] sm:text-[14px]">
          Aucune demande récente
        </p>
        <p class="mt-1 text-[12px] text-[#64748B] sm:text-[13px]">
          Vos demandes de services apparaîtront ici.
        </p>
      </div>
    </div>
  </section>
</template>