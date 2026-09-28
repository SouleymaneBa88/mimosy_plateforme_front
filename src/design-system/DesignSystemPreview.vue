<script setup>
/**
 * Planche de revue du design system MIMOSY (dev uniquement).
 * Les contenus ci-dessous sont des libellés d'exemple pour montrer les
 * composants : aucune donnée métier, aucun chiffre présenté comme réel.
 */
import { ref } from 'vue'
import { ArrowRight, Bell, ClipboardList, Inbox, MapPin, Plus, Search, SlidersHorizontal } from 'lucide-vue-next'

import {
  AuroraBackground,
  GlassPanel,
  MAvatar,
  MBadge,
  MButton,
  MCard,
  MDrawer,
  MEmptyState,
  MErrorState,
  MGlassHeader,
  MInput,
  MLoader,
  MModal,
  MPageHeader,
  MPagination,
  MSectionTitle,
  MSelect,
  MStat,
  MTable,
  MTabs,
} from '@/components/ui'

const couleurs = [
  ['--mimosy-green', 'Vert MIMOSY'],
  ['--mimosy-green-light', 'Vert clair'],
  ['--mimosy-green-dark', 'Vert profond'],
  ['--mimosy-green-soft', 'Vert teinté'],
  ['--mimosy-bg', 'Fond'],
  ['--mimosy-surface', 'Surface'],
  ['--mimosy-sunken', 'Retrait'],
  ['--mimosy-border', 'Bordure'],
  ['--mimosy-text', 'Texte'],
  ['--mimosy-text-soft', 'Texte secondaire'],
  ['--mimosy-muted', 'Discret'],
]

const semantiques = ['success', 'warning', 'danger', 'info', 'neutral']
const statutsBackend = ['EN_ATTENTE', 'ACCEPTEE', 'EN_COURS', 'TERMINEE', 'REFUSE', 'NON_SOUMIS', 'EN_ANALYSE', 'A_VERIFIER', 'VALIDE', 'REJETE']

const texte = ref('')
const email = ref('adresse@invalide')
const choix = ref('')
const onglet = ref('toutes')
const segment = ref('semaine')
const page = ref(3)
const modaleOuverte = ref(false)
const tiroirOuvert = ref(false)
const tiroirBasOuvert = ref(false)
const chargement = ref(false)

function simulerChargement() {
  chargement.value = true
  setTimeout(() => (chargement.value = false), 1400)
}

const colonnes = [
  { key: 'reference', label: 'Référence', primary: true },
  { key: 'personne', label: 'Personne' },
  { key: 'service', label: 'Service' },
  { key: 'statut', label: 'Statut' },
  { key: 'date', label: 'Date', align: 'right', hideOnMobile: true },
]

const lignes = [
  { id: 1, reference: 'Exemple A', personne: 'Libellé nom', service: 'Libellé service', statut: 'EN_ATTENTE', date: 'jj/mm/aaaa' },
  { id: 2, reference: 'Exemple B', personne: 'Libellé nom', service: 'Libellé service', statut: 'ACCEPTEE', date: 'jj/mm/aaaa' },
  { id: 3, reference: 'Exemple C', personne: 'Libellé nom', service: 'Libellé service', statut: 'REFUSE', date: 'jj/mm/aaaa' },
]
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink">
    <!-- Header flottant sur aurora -->
    <section class="relative isolate overflow-hidden pb-24">
      <AuroraBackground />

      <MGlassHeader variant="floating">
        <template #brand>
          <img src="/images/mimosy_logo_transparent.png" alt="MIMOSY" class="h-auto w-[128px]" />
        </template>
        <template #nav>
          <a v-for="lien in ['Trouver un professionnel', 'Comment ça marche', 'Pour les prestataires']" :key="lien" href="#" class="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:text-ink">{{ lien }}</a>
        </template>
        <template #actions>
          <MButton variant="ghost" size="sm" class="hidden sm:inline-flex">Connexion</MButton>
          <MButton size="sm">Créer un compte</MButton>
        </template>
        <template #mobile="{ close }">
          <a v-for="lien in ['Trouver un professionnel', 'Comment ça marche', 'Pour les prestataires']" :key="lien" href="#" class="block rounded-xl px-3 py-3 text-sm font-medium text-ink-soft hover:bg-sunken" @click="close">{{ lien }}</a>
        </template>
      </MGlassHeader>

      <div class="relative z-10 container-mimosy pt-16 sm:pt-24">
        <p class="text-eyebrow text-brand animate-rise">Design system · Phase 1</p>
        <h1 class="text-display mt-5 max-w-4xl text-brand-dark animate-rise" style="--reveal-delay: 80ms">
          Trouvez le bon professionnel, <em class="text-brand">en toute confiance.</em>
        </h1>
        <p class="mt-6 max-w-xl text-base leading-7 text-ink-soft animate-rise" style="--reveal-delay: 160ms">
          Planche de revue : Instrument Serif pour l'éditorial, DM Sans pour l'interface. Le verre et l'aurora sont réservés à la landing et à l'en-tête client.
        </p>

        <GlassPanel radius="xl" padding="sm" class="mt-10 flex max-w-2xl flex-col gap-2 sm:flex-row animate-rise" style="--reveal-delay: 240ms">
          <MInput v-model="texte" label="Service" hide-label placeholder="Que recherchez-vous ?" :icon="Search" class="flex-1" />
          <MInput label="Lieu" hide-label placeholder="Où ?" :icon="MapPin" class="flex-1" />
          <MButton size="lg">Rechercher</MButton>
        </GlassPanel>
      </div>
    </section>

    <main class="container-mimosy flex flex-col gap-20 pb-32">
      <!-- Couleurs -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="01" eyebrow="Fondations" title="Couleurs" description="Le vert porte la marque ; le fond reste clair et chaud. Les tons sémantiques sont terreux, jamais saturés." />
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div v-for="[token, nom] in couleurs" :key="token" class="overflow-hidden rounded-xl border border-line">
            <div class="h-16" :style="{ background: `var(${token})` }" />
            <div class="bg-raised px-3 py-2.5">
              <p class="text-[13px] font-semibold">{{ nom }}</p>
              <p class="font-mono text-[11px] text-muted">{{ token }}</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <MBadge v-for="ton in semantiques" :key="ton" :variant="ton" dot>{{ ton }}</MBadge>
          <MBadge variant="verified">Identité vérifiée</MBadge>
        </div>
      </section>

      <!-- Typographie -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="02" eyebrow="Fondations" title="Typographie" />
        <div class="grid gap-8 lg:grid-cols-2">
          <div class="flex flex-col gap-4">
            <p class="text-eyebrow text-muted">text-display · Instrument Serif</p>
            <p class="text-display text-brand-dark">Services du quotidien</p>
            <p class="text-eyebrow text-muted">text-editorial</p>
            <p class="text-editorial text-brand-dark">Professionnels près de vous</p>
          </div>
          <div class="flex flex-col gap-3 text-ink-soft">
            <p class="text-eyebrow text-muted">Interface · DM Sans</p>
            <p class="text-lg font-semibold text-ink">Titre de bloc — 18 / 600</p>
            <p class="text-[15px] leading-7">Texte courant — 15 / 400. Utilisé pour les descriptions, formulaires et contenus fonctionnels de l'application.</p>
            <p class="text-[13px] text-muted">Métadonnée — 13 / 400</p>
            <p class="tabular text-2xl font-semibold text-ink">0 123 456 789 FCFA</p>
          </div>
        </div>
      </section>

      <!-- Boutons -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="03" eyebrow="Composants" title="Boutons" />
        <div class="flex flex-wrap items-center gap-3">
          <MButton>Primaire</MButton>
          <MButton variant="secondary">Secondaire</MButton>
          <MButton variant="outline">Contour</MButton>
          <MButton variant="ghost">Discret</MButton>
          <MButton variant="danger">Supprimer</MButton>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <MButton size="sm" :icon="Plus">Petit</MButton>
          <MButton :icon-right="ArrowRight">Moyen</MButton>
          <MButton size="lg">Grand</MButton>
          <MButton :loading="chargement" @click="simulerChargement">Cliquer pour charger</MButton>
          <MButton disabled>Désactivé</MButton>
          <MButton variant="outline" icon-only :icon="Bell" aria-label="Notifications" />
          <MButton variant="ghost" icon-only :icon="SlidersHorizontal" aria-label="Filtres" />
        </div>
      </section>

      <!-- Formulaires -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="04" eyebrow="Composants" title="Formulaires" />
        <div class="grid gap-6 md:grid-cols-2">
          <MInput v-model="texte" label="Intitulé" placeholder="Saisissez un texte" help="Texte d'aide sous le champ." required />
          <MInput v-model="email" label="Adresse e-mail" type="email" error="Cette adresse n'est pas valide." />
          <MSelect v-model="choix" label="Catégorie" placeholder="Choisir une catégorie" :options="[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]" />
          <MInput label="Champ désactivé" model-value="Non modifiable" disabled />
          <MInput label="Description" multiline placeholder="Décrivez votre besoin" class="md:col-span-2" />
        </div>
      </section>

      <!-- Badges / avatars / onglets -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="05" eyebrow="Composants" title="Statuts, avatars, onglets" />
        <div class="flex flex-wrap gap-2">
          <MBadge v-for="statut in statutsBackend" :key="statut" :status="statut" />
        </div>
        <div class="flex flex-wrap items-end gap-4">
          <MAvatar name="Awa Diop" size="xs" />
          <MAvatar name="Moussa Fall" size="sm" />
          <MAvatar name="Fatou Sow" />
          <MAvatar name="Ibrahima Ndiaye" size="lg" verified />
          <MAvatar name="Khady Ba" size="xl" />
          <MAvatar size="md" />
          <MAvatar name="Image cassée" src="/introuvable.jpg" />
        </div>
        <p class="text-[13px] text-muted">Noms d'exemple pour montrer les initiales. Aucune photo : sans image réelle, le composant affiche les initiales.</p>
        <MTabs v-model="onglet" label="Filtrer" :tabs="[{ value: 'toutes', label: 'Toutes' }, { value: 'attente', label: 'En attente' }, { value: 'cours', label: 'En cours' }, { value: 'terminees', label: 'Terminées' }]" />
        <MTabs v-model="segment" variant="pill" label="Période" :tabs="[{ value: 'jour', label: 'Jour' }, { value: 'semaine', label: 'Semaine' }, { value: 'mois', label: 'Mois' }]" />
      </section>

      <!-- Cartes / stats -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="06" eyebrow="Composants" title="Cartes et indicateurs" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MStat label="Valeur absente" :value="null" :icon="ClipboardList" hint="Tiret si l'API ne renvoie rien" />
          <MStat label="Chargement" loading />
          <MStat label="Indicateur d'exemple" value="0" :delta="4.2" delta-label="vs période précédente" />
          <MStat label="Petit format" size="sm" value="0 FCFA" to="/" hint="Cliquable" />
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <MCard>
            <p class="font-semibold">Carte par défaut</p>
            <p class="mt-1 text-sm text-ink-soft">Surface claire, bordure fine, aucune ombre.</p>
          </MCard>
          <MCard variant="compact" tone="raised">
            <p class="font-semibold">Compacte</p>
            <p class="mt-1 text-sm text-ink-soft">Pour les listes denses.</p>
          </MCard>
          <MCard variant="interactive" to="/">
            <p class="font-semibold">Interactive</p>
            <p class="mt-1 text-sm text-ink-soft">Survol par la bordure, léger soulèvement.</p>
          </MCard>
        </div>
      </section>

      <!-- Tableau -->
      <section class="flex flex-col gap-8">
        <MPageHeader :editorial="false" eyebrow="Composants" title="Tableau" description="Tableau sur desktop, cartes sur mobile (réduisez la fenêtre sous 768px).">
          <template #actions>
            <MButton variant="outline" size="sm" :icon="SlidersHorizontal" @click="tiroirOuvert = true">Filtres</MButton>
          </template>
        </MPageHeader>
        <MTable :columns="colonnes" :rows="lignes" caption="Exemple de tableau" clickable>
          <template #cell-personne="{ row }">
            <span class="flex items-center gap-2.5"><MAvatar :name="row.reference" size="sm" />{{ row.personne }}</span>
          </template>
          <template #cell-statut="{ value }"><MBadge :status="value" size="sm" /></template>
          <template #actions>
            <MButton variant="ghost" size="sm">Voir</MButton>
          </template>
        </MTable>
        <MPagination v-model:page="page" :count="240" :page-size="20" />
      </section>

      <!-- États -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="07" eyebrow="Composants" title="États" />
        <div class="grid gap-4 lg:grid-cols-2">
          <MEmptyState :icon="Inbox" title="Aucune demande" description="Vos demandes apparaîtront ici dès que vous en aurez créé une." action-label="Trouver un professionnel" />
          <div class="flex flex-col gap-4">
            <MErrorState />
            <MCard><MLoader variant="skeleton" :lines="4" /></MCard>
            <MCard><MLoader /></MCard>
          </div>
        </div>
      </section>

      <!-- Superpositions -->
      <section class="flex flex-col gap-8">
        <MSectionTitle variant="editorial" number="08" eyebrow="Composants" title="Modale et tiroirs" />
        <div class="flex flex-wrap gap-3">
          <MButton variant="outline" @click="modaleOuverte = true">Ouvrir la modale</MButton>
          <MButton variant="outline" @click="tiroirOuvert = true">Tiroir latéral</MButton>
          <MButton variant="outline" @click="tiroirBasOuvert = true">Tiroir bas (mobile)</MButton>
        </div>
      </section>
    </main>

    <MModal v-model="modaleOuverte" title="Confirmer l'action" description="Échap ou clic extérieur pour fermer ; le focus reste dans la modale.">
      <MInput label="Motif" multiline placeholder="Expliquez brièvement" />
      <template #footer>
        <MButton variant="ghost" @click="modaleOuverte = false">Annuler</MButton>
        <MButton @click="modaleOuverte = false">Confirmer</MButton>
      </template>
    </MModal>

    <MDrawer v-model="tiroirOuvert" title="Filtres">
      <div class="flex flex-col gap-5">
        <MSelect label="Catégorie" placeholder="Toutes" :options="[{ value: 'a', label: 'Option A' }]" />
        <MInput label="Quartier" placeholder="Saisir un quartier" :icon="MapPin" />
      </div>
      <template #footer>
        <MButton variant="outline" @click="tiroirOuvert = false">Réinitialiser</MButton>
        <MButton @click="tiroirOuvert = false">Appliquer</MButton>
      </template>
    </MDrawer>

    <MDrawer v-model="tiroirBasOuvert" side="bottom" title="Panneau mobile">
      <p class="text-sm text-ink-soft">Feuille ancrée en bas d'écran, utilisée pour les filtres sur mobile.</p>
    </MDrawer>
  </div>
</template>
