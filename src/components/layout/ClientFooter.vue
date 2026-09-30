<script setup>
/**
 * Pied de page CLIENT, repris de
 * front_mimosy/src/components/clients/PiedDePage.vue. Les liens
 * "Services" pointent vers les vraies routes du router MIMOSY ; les liens
 * "Entreprise"/"Légal" restent des ancres (#) comme dans la référence,
 * MIMOSY n'ayant pas encore de pages dédiées pour ces contenus.
 */
// RouterLink : lien vers une autre page de l'application.
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="border-t border-mimosy-border bg-mimosy-alt">
    <div class="mx-auto grid gap-10 px-4 py-10 sm:px-8 sm:py-12 md:grid-cols-2 lg:grid-cols-4">
      <!-- Colonne 1 : logo et slogan. -->
      <div class="space-y-4">
        <img src="/images/mimosy_logo_transparent.png" alt="MIMOSY" class="h-10 w-auto object-contain" />
        <p class="max-w-xs font-sans text-sm leading-6 text-mimosy-secondary">
          Trouvez le bon professionnel, en toute confiance.
        </p>
      </div>

      <!-- Colonne 2 : liens vers les services. -->
      <div>
        <h3 class="mb-4 font-sans text-sm font-bold text-mimosy-text">Services</h3>
        <div class="space-y-3 font-sans text-sm text-mimosy-secondary">
          <RouterLink to="/client" class="block hover:text-mimosy-primary">Trouver un prestataire</RouterLink>
          <RouterLink to="/client/demandes" class="block hover:text-mimosy-primary">Mes demandes</RouterLink>
          <RouterLink to="/client/devis" class="block hover:text-mimosy-primary">Mes devis</RouterLink>
        </div>
      </div>

      <!-- Colonne 3 : liens "Entreprise". -->
      <div>
        <h3 class="mb-4 font-sans text-sm font-bold text-mimosy-text">Entreprise</h3>
        <div class="space-y-3 font-sans text-sm text-mimosy-secondary">
          <a href="#" class="block hover:text-mimosy-primary">À propos</a>
          <a href="#" class="block hover:text-mimosy-primary">Contact</a>
          <a href="#" class="block hover:text-mimosy-primary">Devenir prestataire</a>
        </div>
      </div>

      <!-- Colonne 4 : liens légaux. -->
      <div>
        <h3 class="mb-4 font-sans text-sm font-bold text-mimosy-text">Légal</h3>
        <div class="space-y-3 font-sans text-sm text-mimosy-secondary">
          <a href="#" class="block hover:text-mimosy-primary">Conditions générales</a>
          <a href="#" class="block hover:text-mimosy-primary">Politique de confidentialité</a>
          <a href="#" class="block hover:text-mimosy-primary">Sécurité</a>
        </div>
      </div>
    </div>

    <!-- Ligne du bas : copyright avec l'année actuelle. -->
    <div class="border-t border-mimosy-border">
      <div class="mx-auto px-4 py-5 font-sans text-sm text-mimosy-secondary sm:px-8 text-center">
        © {{ new Date().getFullYear() }} MIMOSY. Tous droits réservés.
      </div>
    </div>
  </footer>
</template>
