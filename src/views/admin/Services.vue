<script setup>
/**
 * Catalogue MIMOSY : Services et Catégories réunis sur un seul écran
 * (deux onglets), puisque l'un ne se gère jamais indépendamment de
 * l'autre (un service appartient toujours à une catégorie).
 *
 * La suppression réelle (DELETE) d'une catégorie est désactivée dès
 * qu'elle a des services rattachés : elle les supprimerait en cascade
 * côté backend (Service.categorie a on_delete=CASCADE). On propose
 * alors la désactivation (statut=INACTIVE), une suppression logique.
 */
// Outils Vue.
import { computed, onMounted, ref } from 'vue'

// Les composants de la page, les toasts et les appels à l'API du catalogue.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Modal from '@/components/common/Modal.vue'
import { useToast } from '@/composables/useToast'
import * as catalogueService from '@/services/catalogueService'

// Les deux onglets, et l'onglet ouvert.
const onglets = [
  { id: 'services', label: 'Services' },
  { id: 'categories', label: 'Catégories' },
]
const ongletActif = ref('services')

// Les services, les catégories, et les états de chargement et d'erreur.
const services = ref([])
const categories = ref([])
const loading = ref(false)
const errorMessage = ref('')
const { succes, erreur } = useToast()

// Charge services et catégories en même temps.
async function charger() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [servicesData, categoriesData] = await Promise.all([
      catalogueService.listServices(),
      catalogueService.listCategories(),
    ])
    services.value = servicesData
    categories.value = categoriesData
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// --- Services ---

// Filtres, formulaire (ouvert ? service modifié ? valeurs ?), enregistrement, suppression demandée.
const filtreCategorie = ref('')
const rechercheService = ref('')
const formulaireServiceOuvert = ref(false)
const serviceEnEdition = ref(null)
const formulaireService = ref({ nom: '', description: '', categorie: '' })
const enregistrementService = ref(false)
const suppressionServiceCiblee = ref(null)

// Les services affichés selon le filtre catégorie et le texte de recherche.
const servicesFiltres = computed(() => services.value.filter((service) => {
  const correspondCategorie = !filtreCategorie.value || service.categorie === filtreCategorie.value
  const texte = rechercheService.value.trim().toLowerCase()
  const correspondTexte = !texte || service.nom.toLowerCase().includes(texte)
  return correspondCategorie && correspondTexte
}))

// Ouvre le formulaire vide pour créer un service.
function ouvrirCreationService() {
  serviceEnEdition.value = null
  formulaireService.value = { nom: '', description: '', categorie: categories.value[0]?.id || '' }
  formulaireServiceOuvert.value = true
}

// Ouvre le formulaire rempli pour modifier un service.
function ouvrirEditionService(service) {
  serviceEnEdition.value = service
  formulaireService.value = { nom: service.nom, description: service.description, categorie: service.categorie }
  formulaireServiceOuvert.value = true
}

// Enregistre le service (création ou modification). Nom et catégorie obligatoires.
async function enregistrerService() {
  if (!formulaireService.value.nom.trim() || !formulaireService.value.categorie) {
    erreur('Le nom et la catégorie sont obligatoires.')
    return
  }

  enregistrementService.value = true
  try {
    if (serviceEnEdition.value) {
      await catalogueService.modifierService(serviceEnEdition.value.id, formulaireService.value)
      succes('Service mis à jour.')
    } else {
      await catalogueService.creerService(formulaireService.value)
      succes('Service créé.')
    }
    formulaireServiceOuvert.value = false
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    enregistrementService.value = false
  }
}

// Demande confirmation avant de supprimer un service.
function demanderSuppressionService(service) {
  suppressionServiceCiblee.value = service
}

// Supprime le service après confirmation.
async function confirmerSuppressionService() {
  const service = suppressionServiceCiblee.value
  if (!service) return

  try {
    await catalogueService.supprimerService(service.id)
    succes('Service supprimé.')
    suppressionServiceCiblee.value = null
    await charger()
  } catch (error) {
    erreur(error.message)
  }
}

// --- Catégories ---

// Formulaire catégorie : ouvert ? catégorie modifiée ? valeurs ? enregistrement ? suppression ?
const formulaireCategorieOuvert = ref(false)
const categorieEnEdition = ref(null)
const formulaireCategorie = ref({ nom: '', description: '', statut: 'ACTIVE' })
const enregistrementCategorie = ref(false)
const suppressionCategorieCiblee = ref(null)

// Ouvre le formulaire vide pour créer une catégorie.
function ouvrirCreationCategorie() {
  categorieEnEdition.value = null
  formulaireCategorie.value = { nom: '', description: '', statut: 'ACTIVE' }
  formulaireCategorieOuvert.value = true
}

// Ouvre le formulaire rempli pour modifier une catégorie.
function ouvrirEditionCategorie(categorie) {
  categorieEnEdition.value = categorie
  formulaireCategorie.value = { nom: categorie.nom, description: categorie.description, statut: categorie.statut }
  formulaireCategorieOuvert.value = true
}

// Enregistre la catégorie (création ou modification). Le nom est obligatoire.
async function enregistrerCategorie() {
  if (!formulaireCategorie.value.nom.trim()) {
    erreur('Le nom de la catégorie est obligatoire.')
    return
  }

  enregistrementCategorie.value = true
  try {
    if (categorieEnEdition.value) {
      await catalogueService.modifierCategorie(categorieEnEdition.value.id, formulaireCategorie.value)
      succes('Catégorie mise à jour.')
    } else {
      await catalogueService.creerCategorie(formulaireCategorie.value)
      succes('Catégorie créée.')
    }
    formulaireCategorieOuvert.value = false
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    enregistrementCategorie.value = false
  }
}

// Active / désactive une catégorie (suppression "logique", sans rien effacer).
async function basculerStatutCategorie(categorie) {
  try {
    await catalogueService.modifierCategorie(categorie.id, {
      statut: categorie.statut === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
    succes(categorie.statut === 'ACTIVE' ? 'Catégorie désactivée.' : 'Catégorie activée.')
    await charger()
  } catch (error) {
    erreur(error.message)
  }
}

// Demande confirmation avant de supprimer une catégorie.
function demanderSuppressionCategorie(categorie) {
  suppressionCategorieCiblee.value = categorie
}

// Supprime la catégorie après confirmation.
async function confirmerSuppressionCategorie() {
  const categorie = suppressionCategorieCiblee.value
  if (!categorie) return

  try {
    await catalogueService.supprimerCategorie(categorie.id)
    succes('Catégorie supprimée.')
    suppressionCategorieCiblee.value = null
    await charger()
  } catch (error) {
    erreur(error.message)
  }
}

// On charge le catalogue au montage.
onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <ClientHeader title="Catalogue" subtitle="Catégories et services proposés aux clients." />
        <button
          v-if="ongletActif === 'services'"
          type="button"
          class="rounded-xl bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white"
          @click="ouvrirCreationService"
        >
          Nouveau service
        </button>
        <button
          v-else
          type="button"
          class="rounded-xl bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white"
          @click="ouvrirCreationCategorie"
        >
          Nouvelle catégorie
        </button>
      </div>

      <!-- Onglets : Services / Catégories. -->
      <div class="flex gap-1 border-b border-[#E2E8F0]">
        <button
          v-for="onglet in onglets"
          :key="onglet.id"
          type="button"
          class="rounded-t-lg px-4 py-2.5 text-sm font-bold transition"
          :class="ongletActif === onglet.id ? 'border-b-2 border-[#2F6250] text-[#2F6250]' : 'text-[#68716C] hover:text-[#051F20]'"
          @click="ongletActif = onglet.id"
        >
          {{ onglet.label }}
        </button>
      </div>

      <!-- États : chargement, erreur. -->
      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />

      <!-- Services -->
      <template v-else-if="ongletActif === 'services'">
        <div class="flex flex-wrap items-center gap-2 text-black">
          <input v-model="rechercheService" type="search" placeholder="Rechercher un service..." class="min-w-[220px] flex-1 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select v-model="filtreCategorie" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm">
            <option value="">Toutes les catégories</option>
            <option v-for="categorie in categories" :key="categorie.id" :value="categorie.id">{{ categorie.nom }}</option>
          </select>
        </div>

        <EmptyState v-if="!servicesFiltres.length" title="Aucun service" message="Aucun service ne correspond à ces critères." />

        <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
              <tr>
                <th class="px-4 py-3">Nom</th>
                <th class="px-4 py-3">Catégorie</th>
                <th class="px-4 py-3">Créé le</th>
                <th class="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr v-for="service in servicesFiltres" :key="service.id">
                <td class="px-4 py-3">
                  <p class="font-bold text-[#051F20]">{{ service.nom }}</p>
                  <p class="text-xs text-[#94A3B8]">{{ service.description || 'Aucune description' }}</p>
                </td>
                <td class="px-4 py-3 text-[#334155]">{{ service.categorie_nom }}</td>
                <td class="px-4 py-3 text-[#68716C]">{{ new Date(service.date_creation).toLocaleDateString('fr-FR') }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#051F20]" @click="ouvrirEditionService(service)">
                      Modifier
                    </button>
                    <button type="button" class="rounded-lg border border-[#E7B8B2] px-3 py-1.5 text-xs font-bold text-[#A85148]" @click="demanderSuppressionService(service)">
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Catégories -->
      <template v-else>
        <EmptyState v-if="!categories.length" title="Aucune catégorie" message="Créez la première catégorie du catalogue." />

        <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
              <tr>
                <th class="px-4 py-3">Nom</th>
                <th class="px-4 py-3">Services</th>
                <th class="px-4 py-3">Statut</th>
                <th class="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr v-for="categorie in categories" :key="categorie.id">
                <td class="px-4 py-3">
                  <p class="font-bold text-[#051F20]">{{ categorie.nom }}</p>
                  <p class="text-xs text-[#94A3B8]">{{ categorie.description || 'Aucune description' }}</p>
                </td>
                <td class="px-4 py-3 font-bold text-[#051F20]">{{ categorie.services.length }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="categorie.statut === 'ACTIVE' ? 'bg-[#EAF8F2] text-[#16805B]' : 'bg-[#F1F5F9] text-[#68716C]'">
                    {{ categorie.statut }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#051F20]" @click="ouvrirEditionCategorie(categorie)">
                      Modifier
                    </button>
                    <button type="button" class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#051F20]" @click="basculerStatutCategorie(categorie)">
                      {{ categorie.statut === 'ACTIVE' ? 'Désactiver' : 'Activer' }}
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-[#E7B8B2] px-3 py-1.5 text-xs font-bold text-[#A85148] disabled:cursor-not-allowed disabled:opacity-40"
                      :disabled="categorie.services.length > 0"
                      :title="categorie.services.length > 0 ? 'Désactivez plutôt cette catégorie : des services y sont rattachés.' : ''"
                      @click="demanderSuppressionCategorie(categorie)"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Modale service -->
    <Modal v-model="formulaireServiceOuvert" :title="serviceEnEdition ? 'Modifier le service' : 'Nouveau service'">
      <div class="flex flex-col gap-3">
        <label class="text-sm font-bold text-[#051F20]">
          Nom
          <input v-model="formulaireService.nom" type="text" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal" />
        </label>
        <label class="text-sm font-bold text-[#051F20]">
          Catégorie
          <select v-model="formulaireService.categorie" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal">
            <option v-for="categorie in categories" :key="categorie.id" :value="categorie.id">{{ categorie.nom }}</option>
          </select>
        </label>
        <label class="text-sm font-bold text-[#051F20]">
          Description
          <textarea v-model="formulaireService.description" rows="3" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="formulaireServiceOuvert = false">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="enregistrementService" @click="enregistrerService">
          Enregistrer
        </button>
      </div>
    </Modal>

    <!-- Fenêtre de confirmation de suppression d'un service. -->
    <Modal :model-value="!!suppressionServiceCiblee" title="Supprimer le service" @update:model-value="suppressionServiceCiblee = null">
      <p class="text-sm text-[#334155]" v-if="suppressionServiceCiblee">
        Supprimer définitivement <strong>{{ suppressionServiceCiblee.nom }}</strong> ? Cette action peut affecter les offres de prestataires associées et est irréversible.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="suppressionServiceCiblee = null">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#A85148] px-4 py-2 text-sm font-bold text-white" @click="confirmerSuppressionService">
          Supprimer
        </button>
      </div>
    </Modal>

    <!-- Modale catégorie -->
    <Modal v-model="formulaireCategorieOuvert" :title="categorieEnEdition ? 'Modifier la catégorie' : 'Nouvelle catégorie'">
      <div class="flex flex-col gap-3">
        <label class="text-sm font-bold text-[#051F20]">
          Nom
          <input v-model="formulaireCategorie.nom" type="text" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal" />
        </label>
        <label class="text-sm font-bold text-[#051F20]">
          Description
          <textarea v-model="formulaireCategorie.description" rows="3" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal" />
        </label>
        <label class="text-sm font-bold text-[#051F20]">
          Statut
          <select v-model="formulaireCategorie.statut" class="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="formulaireCategorieOuvert = false">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="enregistrementCategorie" @click="enregistrerCategorie">
          Enregistrer
        </button>
      </div>
    </Modal>

    <!-- Fenêtre de confirmation de suppression d'une catégorie. -->
    <Modal :model-value="!!suppressionCategorieCiblee" title="Supprimer la catégorie" @update:model-value="suppressionCategorieCiblee = null">
      <p class="text-sm text-[#334155]" v-if="suppressionCategorieCiblee">
        Supprimer définitivement <strong>{{ suppressionCategorieCiblee.nom }}</strong> ? Cette action est irréversible.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="suppressionCategorieCiblee = null">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#A85148] px-4 py-2 text-sm font-bold text-white" @click="confirmerSuppressionCategorie">
          Supprimer
        </button>
      </div>
    </Modal>
  </AppLayout>
</template>
