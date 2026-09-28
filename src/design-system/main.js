// Entrée de la page de revue du design system (dev uniquement).
import { createApp } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

// Le CSS global d'abord : il déclare l'ordre des couches (base, components,
// utilities) avant les styles des composants.
import '@/assets/main.css'
import Preview from './DesignSystemPreview.vue'

// Routeur minimal en mémoire : certains composants (MButton `to`,
// MGlassHeader) s'appuient sur vue-router. Aucune route de l'application
// n'est chargée ici.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
})

createApp(Preview).use(router).mount('#app')
