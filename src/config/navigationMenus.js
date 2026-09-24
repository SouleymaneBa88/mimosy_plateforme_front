import {
  House,
  Search,
  ClipboardList,
  MessageCircle,
  Star,
  User,
  Users,
  Briefcase,
  CalendarDays,
  Wallet,
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  Tags,
  FileWarning,
  Scale,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-vue-next'

export const navigationByRole = {
  CLIENT: [
    {
      label: 'Accueil',
      path: '/client',
      icon: House,
    },
    {
      label: 'Trouver un service',
      path: '/client/services',
      icon: Search,
    },
    {
      label: 'Mes demandes',
      path: '/client/demandes',
      icon: ClipboardList,
    },
    {
      label: 'Mes devis',
      path: '/client/devis',
      icon: Briefcase,
    },
    {
      label: 'Mes rendez-vous',
      path: '/client/rendez-vous',
      icon: CalendarDays,
    },
    {
      label: 'Diagnostic intelligent',
      path: '/client/diagnostic',
      icon: Sparkles,
    },
    {
      label: 'Mes litiges',
      path: '/client/litiges',
      icon: Scale,
    },
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageCircle,
    },
    {
      label: 'Profil et paramètres',
      path: '/client/profil',
      icon: User,
    },
  ],

  PRESTATAIRE: [
    {
      label: 'Accueil',
      path: '/prestataire',
      icon: House,
    },
    {
      label: 'Mes prestations',
      path: '/prestataire/services',
      icon: Briefcase,
    },
    {
      label: 'Demandes reçues',
      path: '/prestataire/demandes',
      icon: ClipboardList,
    },
    {
      label: 'Demandes de devis',
      path: '/prestataire/devis',
      icon: Briefcase,
    },
    {
      label: 'Messages',
      path: '/prestataire/messages',
      icon: MessageCircle,
    },
    {
      label: 'Avis',
      path: '/prestataire/avis',
      icon: Star,
    },
    {
      label: 'Wallet',
      path: '/prestataire/wallet',
      icon: Wallet,
    },
    {
      label: 'Disponibilité',
      path: '/prestataire/rendez-vous',
      icon: CalendarDays,
    },
    // {
    //   label: 'Vérification',
    //   path: '/prestataire/verification',
    //   icon: ShieldCheck,
    // },
    {
      label: 'Mes litiges',
      path: '/prestataire/litiges',
      icon: Scale,
    },
    // {
    //   label: 'Profil et paramètres',
    //   path: '/prestataire/profil',
    //   icon: User,
    // },
  ],

  // Toutes ces pages existent et sont connectées à une vraie API (voir
  // src/views/admin/ et apps.adminpanel / apps.reports côté backend).
  // Utilisateurs (clients + prestataires + admins), Services (catégories
  // + services) et Paiements (paiements + retraits + transactions) sont
  // volontairement regroupés en un seul écran à onglets/filtres chacun,
  // plutôt que dispersés sur des pages séparées.
  ADMIN: [
    {
      label: 'Tableau de bord',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Demandes',
      path: '/admin/demandes',
      icon: ClipboardList,
    },
    {
      label: 'Devis',
      path: '/admin/devis',
      icon: Briefcase,
    },
    {
      label: 'Rendez-vous',
      path: '/admin/rendez-vous',
      icon: Clock,
    },
    {
      label: 'Utilisateurs',
      path: '/admin/utilisateurs',
      icon: Users,
    },
    {
      label: 'Catalogue',
      path: '/admin/services',
      icon: Tags,
    },
    {
      label: 'Vérifications',
      path: '/admin/verifications',
      icon: ShieldCheck,
    },
    // {
    //   label: 'Modération avis',
    //   path: '/admin/avis',
    //   icon: Star,
    // },
    {
      label: 'Signalements',
      path: '/admin/signalements',
      icon: FileWarning,
    },
    {
      label: 'Litiges',
      path: '/admin/litiges',
      icon: Scale,
    },
    {
      label: 'Localisations',
      path: '/admin/localisations',
      icon: MapPin,
    },
    {
      label: 'Paiements',
      path: '/admin/paiements',
      icon: CreditCard,
    },
  ],
}
