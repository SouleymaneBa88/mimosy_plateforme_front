import {
  House,
  Search,
  ClipboardList,
  MessageCircle,
  Star,
  User,
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  Users,
  Grid2X2,
  TriangleAlert,
  ShieldCheck,
  ChartColumn,
  Settings,
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
      label: 'Disponibilité',
      path: '/prestataire/rendez-vous',
      icon: CalendarDays,
    },
    {
      label: 'Profil et paramètres',
      path: '/prestataire/profil',
      icon: User,
    },
  ],

  ADMIN: [
    {
      label: 'Tableau de bord',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Utilisateurs',
      path: '/admin/utilisateurs',
      icon: Users,
    },
    {
      label: 'Catégories et services',
      path: '/admin/services',
      icon: Grid2X2,
    },
    {
      label: 'Signalements',
      path: '/admin/signalements',
      icon: TriangleAlert,
    },
    {
      label: 'Modération IA',
      path: '/admin/moderation',
      icon: ShieldCheck,
    },
    {
      label: 'Statistiques',
      path: '/admin/statistiques',
      icon: ChartColumn,
    },
    {
      label: 'Paramètres',
      path: '/admin/parametres',
      icon: Settings,
    },
  ],
}
