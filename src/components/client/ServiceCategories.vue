```vue
<script setup>
defineProps({
  categories: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['select'])
</script>

<template>
  <section class="w-full">
    <div
      class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#EFE5E0] bg-[#FFFDF9] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2F6250] hover:bg-white sm:rounded-[20px]"
        @click="emit('select', category)"
      >
        <!-- ============================================================= -->
        <!-- IMAGE -->
        <!-- ============================================================= -->

        <div
          class="h-[140px] w-full shrink-0 overflow-hidden bg-[#FAF5F0] sm:h-[150px] lg:h-[160px]"
        >
          <img
            v-if="category.image"
            :src="category.image"
            :alt="category.name"
            class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />

          <!-- Image par défaut -->
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-[#FAF5F0]"
          >
            <span
              class="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold text-[#2F6250]"
            >
              <!-- {{ category.name?.charAt(0) }} -->
            </span>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- CONTENU -->
        <!-- ============================================================= -->

        <div
          class="flex flex-1 flex-col p-4 sm:p-5"
        >
          <!-- Nom -->
          <h3
            class="font-['Plus_Jakarta_Sans'] text-[17px] font-bold leading-6 text-[#051F20] transition-colors duration-200 group-hover:text-[#2F6250]"
          >
            {{ category.name }}
          </h3>

          <!-- Description -->
          <p
            v-if="category.description"
            class="mt-1.5 line-clamp-2 text-[12px] leading-[18px] text-[#64748B] sm:text-[13px] sm:leading-[19px]"
          >
            {{ category.description }}
          </p>

          <!-- =========================================================== -->
          <!-- SERVICES -->
          <!-- =========================================================== -->

          <div
            v-if="category.services?.length"
            class="mt-4"
          >
            <p
              class="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2F6250]"
            >
              Services proposés
            </p>

            <ul class="space-y-1.5">
              <li
                v-for="service in category.services.slice(0, 3)"
                :key="service.id"
                class="flex min-w-0 items-center gap-2 text-[12px] leading-5 text-[#051F20] sm:text-[13px]"
              >
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F6250]"
                ></span>

                <span class="truncate">
                  {{ service.name }}
                </span>
              </li>
            </ul>

            <!-- Plus de services -->
            <p
              v-if="category.services.length > 3"
              class="mt-2 text-[11px] font-medium text-[#94A3B8]"
            >
              + {{ category.services.length - 3 }} autres services
            </p>
          </div>

          <!-- =========================================================== -->
          <!-- FOOTER -->
          <!-- =========================================================== -->

          <div
            class="mt-auto pt-4"
          >
            <div
              class="border-t border-[#EFE5E0] pt-3.5"
            >
              <span
                class="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2F6250] transition-all duration-200 group-hover:gap-2.5 sm:text-[13px]"
              >
                Voir les services

                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>
```
