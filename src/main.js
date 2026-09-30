// ------------------------------------------------------------------
// main.js : le point de départ de l'application Vue.
// C'est le premier fichier exécuté quand la page s'ouvre.
// ------------------------------------------------------------------

// createApp crée l'application Vue.
import { createApp } from "vue";
// Pinia sert à partager des données entre toutes les pages (ex. l'utilisateur connecté).
import { createPinia } from "pinia";

// Le composant racine qui contient toute l'application.
import App from "./App.vue";
// Le routeur : il affiche la bonne page selon l'adresse (URL).
import router from "./router";

// Le style CSS global du site.
import "./assets/main.css";

// On crée l'application, on branche Pinia et le routeur,
// puis on l'affiche dans la balise <div id="app"> de index.html.
createApp(App).use(createPinia()).use(router).mount("#app");
