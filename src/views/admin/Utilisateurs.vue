<script setup>
/**
 * Utilisateurs, clients et prestataires réunis sur un seul écran :
 * un onglet "Vue" change à la fois la source de données (endpoint
 * admin dédié) et les colonnes affichées, plutôt que de disperser ces
 * trois populations sur des pages séparées.
 *
 * Le rôle n'est jamais modifiable ici : seule l'activation/désactivation
 * du compte est possible, et le backend (apps.adminpanel) refuse de
 * toute façon tout champ "role" envoyé depuis cette page.
 */
// Outils Vue.
import { computed, onMounted, reactive, ref } from 'vue'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Modal from '@/components/common/Modal.vue'
import Pagination from '@/components/common/Pagination.vue'
// Composable des listes admin, toasts, store de connexion et API admin.
import { useAdminListe } from '@/composables/useAdminListe'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import * as adminService from '@/services/adminService'

// Les trois onglets de la page.
const vues = [
  { id: 'TOUS', label: 'Tous les utilisateurs' },
  { id: 'CLIENT', label: 'Clients' },
  { id: 'PRESTATAIRE', label: 'Prestataires' },
]

// Toasts, store de connexion, compte à confirmer, et compte en cours de traitement.
const { succes, erreur } = useToast()
const authStore = useAuthStore()
const cibleConfirmation = ref(null)
const actionEnCours = ref('')

// L'onglet sélectionné.
const vueActive = ref('TOUS')

// Trois instances indépendantes plutôt qu'une seule recréée à chaque
// changement d'onglet : les données déjà chargées restent disponibles
// en revenant sur un onglet visité (pas de rechargement inutile), et
// chaque vue garde ses propres filtres sans logique conditionnelle.
const listeTous = useAdminListe(adminService.listUtilisateurs, { role: '', is_active: '', recherche: '' })
const listeClients = useAdminListe(adminService.listClientsAdmin, { is_active: '', recherche: '' })
const listePrestataires = useAdminListe(adminService.listPrestatairesAdmin, { statut_verification: '', is_active: '', recherche: '' })

// La liste qui correspond à l'onglet actif.
const listesParVue = { TOUS: listeTous, CLIENT: listeClients, PRESTATAIRE: listePrestataires }
const etatSource = computed(() => listesParVue[vueActive.value])

// useAdminListe renvoie un objet de refs individuelles (pas un objet
// reactive()) : un computed() qui le renvoie tel quel ne déballe pas
// ces refs imbriquées dans le template (etat.loading resterait un
// objet Ref, donc toujours "truthy"). Ces accesseurs délèguent
// explicitement à la source active tout en laissant reactive()
// déballer correctement chaque ref au moment de la lecture.
const etat = reactive({
  get items() { return etatSource.value.items },
  get count() { return etatSource.value.count },
  get page() { return etatSource.value.page },
  get pageSize() { return etatSource.value.pageSize },
  get loading() { return etatSource.value.loading },
  get errorMessage() { return etatSource.value.errorMessage },
  get filtres() { return etatSource.value.filtres },
  charger: () => etatSource.value.charger(),
  rechercher: () => etatSource.value.rechercher(),
  changerPage: (p) => etatSource.value.changerPage(p),
})

// Change d'onglet, et charge sa liste si elle est encore vide.
function changerVue(vue) {
  vueActive.value = vue
  if (!etat.items.length && !etat.loading) etat.charger()
}

// Options des filtres "rôle" et "vérification", et couleurs des badges.
const roles = ['', 'CLIENT', 'PRESTATAIRE', 'ADMIN']
const statutsVerification = ['', 'EN_ATTENTE', 'VERIFIE', 'REJETE']
const classeVerification = {
  VERIFIE: 'bg-[#EAF8F2] text-[#16805B]',
  REJETE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_ATTENTE: 'bg-[#FFF7E6] text-[#9A723C]',
}

// Attendre 350 ms après la dernière frappe avant de lancer la recherche
// (évite d'appeler le serveur à chaque lettre tapée).
let debounce = null
function surRechercheChangee() {
  clearTimeout(debounce)
  debounce = setTimeout(() => etat.rechercher(), 350)
}

// L'identifiant du compte utilisateur diffère selon la vue : les
// endpoints "clients" renvoient directement l'id du compte, mais
// "prestataires" renvoient l'id du profil métier (voir user_id).
function idCompte(item) {
  return vueActive.value === 'PRESTATAIRE' ? item.user_id : item.id
}

// Empêche de proposer l'auto-désactivation dans l'interface : le
// backend la refuse déjà (voir UserAdminViewSet.changer_statut), mais
// mieux vaut ne jamais afficher une action qui échouera à coup sûr.
function estMonPropreCompte(item) {
  return String(idCompte(item)) === String(authStore.user?.id)
}

// Ouvre la fenêtre de confirmation pour activer / désactiver un compte.
function demanderChangementStatut(item) {
  cibleConfirmation.value = item
}

// Score de confiance (voir apps.trust.services) : recalculé à la
// demande, jamais stocké. Réservé à l'admin, jamais affiché sur le
// profil public du prestataire (qui ne montre qu'un badge "vérifié").
const scoreAffiche = ref(null)
const chargementScore = ref(false)

// Charge et affiche le score de confiance d'un prestataire.
async function afficherScore(item) {
  chargementScore.value = true
  scoreAffiche.value = { prestataire: item, resultat: null }
  try {
    scoreAffiche.value = { prestataire: item, resultat: await adminService.getScoreConfiance(item.id) }
  } catch (error) {
    erreur(error.message)
    scoreAffiche.value = null
  } finally {
    chargementScore.value = false
  }
}

// Libellés lisibles des facteurs du score.
const libellesFacteurs = {
  identite: 'Identité vérifiée',
  documents: 'Documents professionnels',
  profil_complete: 'Profil complété',
  activite: 'Activité réelle',
  fiabilite: 'Fiabilité',
  avis: 'Avis clients',
}

// Confirme l'activation / désactivation du compte, puis recharge la liste.
async function confirmerChangementStatut() {
  const item = cibleConfirmation.value
  if (!item) return

  actionEnCours.value = item.id
  try {
    await adminService.changerStatutUtilisateur(idCompte(item), !item.is_active)
    succes(item.is_active ? 'Compte désactivé.' : 'Compte activé.')
    await etat.charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    cibleConfirmation.value = null
    actionEnCours.value = ''
  }
}

// On charge la liste au montage.
onMounted(() => etat.charger())
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Utilisateurs" subtitle="Comptes clients, prestataires et administrateurs de la plateforme." />

      <!-- Onglets : tous / clients / prestataires. -->
      <div class="flex gap-1 border-b border-[#E2E8F0]">
        <button
          v-for="vue in vues"
          :key="vue.id"
          type="button"
          class="rounded-t-lg px-4 py-2.5 text-sm font-bold transition"
          :class="vueActive === vue.id ? 'border-b-2 border-[#2F6250] text-[#2F6250]' : 'text-[#64748B] hover:text-[#051F20]'"
          @click="changerVue(vue.id)"
        >
          {{ vue.label }}
        </button>
      </div>

      <!-- Recherche et filtres. -->
      <div class="flex flex-wrap items-center gap-2 text-black">
        <input
          v-model="etat.filtres.recherche"
          type="search"
          placeholder="Rechercher un nom, un email..."
          class="min-w-[220px] flex-1 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
          @input="surRechercheChangee"
        />
        <select v-if="vueActive === 'TOUS'" v-model="etat.filtres.role" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="etat.rechercher">
          <option v-for="role in roles" :key="role" :value="role">{{ role || 'Tous les rôles' }}</option>
        </select>
        <select v-if="vueActive === 'PRESTATAIRE'" v-model="etat.filtres.statut_verification" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="etat.rechercher">
          <option v-for="statut in statutsVerification" :key="statut" :value="statut">{{ statut || 'Tous les statuts de vérification' }}</option>
        </select>
        <select v-model="etat.filtres.is_active" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="etat.rechercher">
          <option value="">Tous les statuts</option>
          <option value="true">Actif</option>
          <option value="false">Désactivé</option>
        </select>
      </div>

      <!-- États : chargement, erreur, vide. -->
      <Loader v-if="etat.loading" />
      <ErrorState v-else-if="etat.errorMessage" :message="etat.errorMessage" @retry="etat.charger" />
      <EmptyState v-else-if="!etat.items.length" title="Aucun utilisateur trouvé" message="Aucun compte ne correspond à ces critères." />

      <!-- Tableau des utilisateurs. -->
      <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table class="w-full text-sm">
          <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
            <tr>
              <th class="px-4 py-3">Nom</th>
              <th v-if="vueActive === 'TOUS'" class="px-4 py-3">Rôle</th>
              <th v-if="vueActive === 'CLIENT'" class="px-4 py-3">Ville</th>
              <th v-if="vueActive === 'CLIENT'" class="px-4 py-3">Demandes</th>
              <th v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3">Localisation</th>
              <th v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3">Offres</th>
              <th v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3">Vérification</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3">Inscrit le</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9]">
            <tr v-for="item in etat.items" :key="item.id">
              <td class="px-4 py-3">
                <p class="font-bold text-[#051F20]">{{ item.nom_complet }}</p>
                <p class="text-xs text-[#94A3B8]">{{ item.email }}</p>
              </td>
              <td v-if="vueActive === 'TOUS'" class="px-4 py-3">
                <span class="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold text-[#64748B]">{{ item.role }}</span>
              </td>
              <td v-if="vueActive === 'CLIENT'" class="px-4 py-3 text-[#64748B]">{{ item.ville || '—' }}</td>
              <td v-if="vueActive === 'CLIENT'" class="px-4 py-3 font-bold text-[#051F20]">{{ item.nombre_demandes }}</td>
              <td v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3 text-[#64748B]">
                {{ [item.quartier, item.ville].filter(Boolean).join(', ') || '—' }}
              </td>
              <td v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3 font-bold text-[#051F20]">{{ item.nombre_services }}</td>
              <td v-if="vueActive === 'PRESTATAIRE'" class="px-4 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="classeVerification[item.statut_verification]">
                  {{ item.statut_verification }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-bold"
                  :class="item.is_active ? 'bg-[#EAF8F2] text-[#16805B]' : 'bg-[#FFF0EE] text-[#A85148]'"
                >
                  {{ item.is_active ? 'Actif' : 'Désactivé' }}
                </span>
              </td>
              <td class="px-4 py-3 text-[#64748B]">{{ new Date(item.date_joined).toLocaleDateString('fr-FR') }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="vueActive === 'PRESTATAIRE'"
                    type="button"
                    class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#051F20]"
                    @click="afficherScore(item)"
                  >
                    Score
                  </button>
                  <button
                    v-if="!estMonPropreCompte(item)"
                    type="button"
                    class="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    :class="item.is_active ? 'border-[#E7B8B2] text-[#A85148]' : 'border-[#BFE3D3] text-[#16805B]'"
                    :disabled="actionEnCours === item.id"
                    @click="demanderChangementStatut(item)"
                  >
                    {{ item.is_active ? 'Désactiver' : 'Activer' }}
                  </button>
                  <span v-else-if="vueActive !== 'PRESTATAIRE'" class="text-xs text-[#94A3B8]" title="Vous ne pouvez pas modifier votre propre compte">Vous</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <Pagination :page="etat.page" :count="etat.count" :page-size="etat.pageSize" @update:page="etat.changerPage" />
      </div>
    </div>

    <!-- Fenêtre de confirmation (activer / désactiver). -->
    <Modal :model-value="!!cibleConfirmation" title="Confirmer l'action" @update:model-value="cibleConfirmation = null">
      <p class="text-sm text-[#334155]" v-if="cibleConfirmation">
        {{ cibleConfirmation.is_active ? 'Désactiver' : 'Activer' }} le compte de
        <strong>{{ cibleConfirmation.nom_complet }}</strong> ?
        <span v-if="cibleConfirmation.is_active"> Il ne pourra plus se connecter tant qu'il ne sera pas réactivé.</span>
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="cibleConfirmation = null">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white" @click="confirmerChangementStatut">
          Confirmer
        </button>
      </div>
    </Modal>

    <!-- Fenêtre du score de confiance. -->
    <Modal :model-value="!!scoreAffiche" title="Score de confiance" @update:model-value="scoreAffiche = null">
      <template v-if="scoreAffiche">
        <p class="text-sm font-bold text-[#051F20]">{{ scoreAffiche.prestataire.nom_complet }}</p>

        <Loader v-if="chargementScore" />
        <template v-else-if="scoreAffiche.resultat">
          <p class="mt-2 text-4xl font-extrabold text-[#2F6250]">{{ scoreAffiche.resultat.score }}<span class="text-lg text-[#94A3B8]">/100</span></p>
          <p class="mt-1 text-xs text-[#94A3B8]">
            Calculé à partir de données réelles, jamais stocké. Réservé à l'administration.
          </p>

          <ul class="mt-4 flex flex-col gap-2 text-sm">
            <li v-for="(facteur, cle) in scoreAffiche.resultat.facteurs" :key="cle" class="flex items-start justify-between gap-3">
              <div>
                <p class="font-bold text-[#051F20]">{{ libellesFacteurs[cle] || cle }}</p>
                <p class="text-xs text-[#64748B]">{{ facteur.explication }}</p>
              </div>
              <span class="shrink-0 font-bold text-[#051F20]">{{ facteur.points }}/{{ facteur.maximum }}</span>
            </li>
            <li class="flex items-start justify-between gap-3 border-t border-[#E2E8F0] pt-2">
              <div>
                <p class="font-bold text-[#A85148]">Litiges résolus (malus)</p>
                <p class="text-xs text-[#64748B]">{{ scoreAffiche.resultat.malus.explication }}</p>
              </div>
              <span class="shrink-0 font-bold text-[#A85148]">-{{ scoreAffiche.resultat.malus.points }}</span>
            </li>
          </ul>
        </template>
      </template>
      <div class="mt-6 flex justify-end">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="scoreAffiche = null">
          Fermer
        </button>
      </div>
    </Modal>
  </AppLayout>
</template>
