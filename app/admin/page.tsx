'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BulkUploadManager } from '@/components/BulkUploadManager';
import { Epreuve, StatutEpreuve, TypeEpreuve } from '@/types';
import { formatRelativeDate, formatFileSize } from '@/lib/utils/date';
import { VALID_NIVEAUX_PREDEFINIS, VALID_TYPES } from '@/lib/utils/validation';
import { getAcademicYears } from '@/lib/utils/date';
import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/utils/admin';
import {
  ShieldAlert,

  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  Search,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  Award,
  Calendar,
  User,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Check,
  X,
  BookOpen,
  Users,
  Activity,
  BarChart3,
  Plus,
  ShieldCheck,
  UserCheck,
  UserX,
  History,
  FolderOpen,
  UploadCloud,
  CheckSquare,
  Square,
  MinusSquare,
  Archive
} from 'lucide-react';

interface UserAccount {
  email: string;
  nom: string;
  image?: string;
  role: 'admin' | 'etudiant';
  niveau?: string;
  created_at: string;
  last_login: string;
  total_depots: number;
}

interface ConnexionLog {
  id: string;
  user_email: string;
  user_nom?: string;
  provider: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface MatiereWithStats {
  id: string;
  nom: string;
  created_by_email: string;
  created_at: string;
  total_epreuves: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userIsAdmin = Boolean(session?.user?.isAdmin || session?.user?.role === 'admin');

  // Navigation par onglets
  const [mainTab, setMainTab] = useState<'soumissions' | 'import_lot' | 'matieres' | 'utilisateurs' | 'connexions' | 'stats'>('soumissions');

  // Données des soumissions
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [activeTab, setActiveTab] = useState<'en_attente' | 'all' | 'approuve' | 'rejete'>('en_attente');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState('all');

  // Données des autres onglets
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [matieresList, setMatieresList] = useState<MatiereWithStats[]>([]);
  const [connexionsList, setConnexionsList] = useState<ConnexionLog[]>([]);
  const [connexionFilterEmail, setConnexionFilterEmail] = useState('');

  // Statistiques globales
  const [stats, setStats] = useState<{
    totalEpreuves: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalDownloads: number;
    contributorsCount: number;
    totalUsers: number;
    totalAdmins: number;
    totalLogins: number;
    totalMatieres: number;
  } | null>(null);

  // États de chargement et actions
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sélection multiple (bulk actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Modales Soumissions
  const [previewEpreuve, setPreviewEpreuve] = useState<Epreuve | null>(null);
  const [editingEpreuve, setEditingEpreuve] = useState<Epreuve | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Epreuve | null>(null);

  // Formulaire d'édition détaillée de soumission
  const [editTitre, setEditTitre] = useState('');
  const [editMatiereNom, setEditMatiereNom] = useState('');
  const [editNiveau, setEditNiveau] = useState('');
  const [editAnnee, setEditAnnee] = useState('');
  const [editType, setEditType] = useState<TypeEpreuve>('devoir');
  const [editStatut, setEditStatut] = useState<StatutEpreuve>('approuve');
  const [editUploaderNom, setEditUploaderNom] = useState('');
  const [editUploaderEmail, setEditUploaderEmail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Formulaire d'ajout de matière
  const [newMatiereNom, setNewMatiereNom] = useState('');
  const [isAddingMatiere, setIsAddingMatiere] = useState(false);

  // Formulaire d'ajout d'administrateur
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  const academicYears = getAcademicYears(6);

  // Feedback toast helper
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Charger les statistiques globales
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        setError('Accès refusé : votre compte n\'est pas administrateur.');
        return;
      }
      if (!res.ok) throw new Error('Impossible de charger les statistiques.');
      const data = await res.json();
      setStats(data.stats || data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Charger les épreuves
  const fetchEpreuves = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/admin/epreuves', window.location.origin);
      if (activeTab !== 'all') url.searchParams.set('statut', activeTab);
      if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
      if (selectedNiveau !== 'all') url.searchParams.set('niveau', selectedNiveau);

      const res = await fetch(url.toString());
      if (res.status === 403) {
        setError('Accès refusé : compte administrateur requis.');
        return;
      }
      if (!res.ok) throw new Error('Erreur lors du chargement des épreuves.');

      const data = await res.json();
      setEpreuves(data.epreuves || []);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedNiveau]);

  // Charger les utilisateurs
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const data = await res.json();
      setUsersList(data.users || []);
    } catch (err) {
      console.error('Erreur chargement users:', err);
    }
  }, []);

  // Charger les matières
  const fetchMatieres = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/matieres');
      if (!res.ok) return;
      const data = await res.json();
      setMatieresList(data.matieres || []);
    } catch (err) {
      console.error('Erreur chargement matieres:', err);
    }
  }, []);

  // Charger l'historique de connexions
  const fetchConnexions = useCallback(async (emailFilter?: string) => {
    try {
      const url = new URL('/api/admin/logins', window.location.origin);
      if (emailFilter?.trim()) url.searchParams.set('email', emailFilter.trim());
      url.searchParams.set('limit', '100');

      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      setConnexionsList(data.logs || []);
    } catch (err) {
      console.error('Erreur chargement connexions:', err);
    }
  }, []);

  // Chargement initial (uniquement si l'utilisateur est administrateur)
  useEffect(() => {
    if (status === 'authenticated' && userIsAdmin) {
      fetchStats();
      fetchEpreuves();
      fetchUsers();
      fetchMatieres();
      fetchConnexions();
    }
  }, [status, userIsAdmin, fetchStats, fetchEpreuves, fetchUsers, fetchMatieres, fetchConnexions]);

  // Recharger les données quand on change d'onglet principal
  useEffect(() => {
    if (!userIsAdmin) return;
    if (mainTab === 'soumissions') fetchEpreuves();
    if (mainTab === 'utilisateurs') fetchUsers();
    if (mainTab === 'matieres') fetchMatieres();
    if (mainTab === 'connexions') fetchConnexions(connexionFilterEmail);
    if (mainTab === 'stats') fetchStats();
  }, [mainTab, userIsAdmin, fetchEpreuves, fetchUsers, fetchMatieres, fetchConnexions, fetchStats, connexionFilterEmail]);

  // Auto-refresh des stats toutes les 60 secondes
  useEffect(() => {
    if (status !== 'authenticated' || !userIsAdmin) return;
    const interval = setInterval(() => {
      fetchStats();
      if (mainTab === 'soumissions') fetchEpreuves();
    }, 60_000);
    return () => clearInterval(interval);
  }, [status, userIsAdmin, mainTab, fetchStats, fetchEpreuves]);


  // Stats calculées localement depuis les épreuves chargées (toujours à jour)
  const derivedStats = React.useMemo(() => {
    const allEpreuves = epreuves;
    // On calcule sur TOUTES les épreuves chargées (sans filtre de statut)
    // Pour avoir les vrais totaux, on se base sur les stats serveur si dispo,
    // mais on recalcule pendingCount/approvedCount/rejectedCount depuis la liste courante
    // quand on est en vue "toutes" (activeTab === 'all')
    if (activeTab === 'all') {
      const pendingCount = allEpreuves.filter((e) => e.statut === 'en_attente').length;
      const approvedCount = allEpreuves.filter((e) => e.statut === 'approuve').length;
      const rejectedCount = allEpreuves.filter((e) => e.statut === 'rejete').length;
      return { pendingCount, approvedCount, rejectedCount };
    }
    return null;
  }, [epreuves, activeTab]);


  // ============================================================
  // SÉLECTION MULTIPLE
  // ============================================================

  const allVisibleIds = epreuves.map((e) => e.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ============================================================
  // ACTIONS : SOUMISSIONS
  // ============================================================

  /**
   * Met à jour les KPIs localement de façon immédiate après une action,
   * sans attendre le rechargement serveur.
   */
  const adjustStatsLocally = (
    changes: { from?: StatutEpreuve | null; to?: StatutEpreuve | null; deleted?: boolean }
  ) => {
    setStats((prev) => {
      if (!prev) return prev;
      let { pendingCount, approvedCount, rejectedCount, totalEpreuves } = prev;

      if (changes.from === 'en_attente') pendingCount = Math.max(0, pendingCount - 1);
      if (changes.from === 'approuve') approvedCount = Math.max(0, approvedCount - 1);
      if (changes.from === 'rejete') rejectedCount = Math.max(0, rejectedCount - 1);

      if (changes.deleted) {
        totalEpreuves = Math.max(0, totalEpreuves - 1);
      } else if (changes.to) {
        if (changes.to === 'en_attente') pendingCount += 1;
        if (changes.to === 'approuve') approvedCount += 1;
        if (changes.to === 'rejete') rejectedCount += 1;
      }

      return { ...prev, pendingCount, approvedCount, rejectedCount, totalEpreuves };
    });
  };

  const handleBulkAction = async (action: 'approuve' | 'rejete' | 'delete') => {
    if (selectedIds.size === 0) return;

    try {
      setIsBulkLoading(true);
      setBulkDeleteConfirm(false);

      // Snapshot des épreuves concernées AVANT la requête
      const affectedEpreuves = epreuves.filter((e) => selectedIds.has(e.id));

      const res = await fetch('/api/admin/epreuves/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de l\'opération en masse.');
      }

      const data = await res.json();

      if (action === 'delete') {
        const deletedIds = new Set(
          Array.isArray(data.results)
            ? data.results.filter((r: any) => r.success).map((r: any) => r.id)
            : Array.from(selectedIds)
        );
        setEpreuves((prev) => prev.filter((e) => !deletedIds.has(e.id)));
        // Mettre à jour les KPIs pour chaque suppression réussie
        affectedEpreuves
          .filter((e) => deletedIds.has(e.id))
          .forEach((e) => adjustStatsLocally({ from: e.statut, deleted: true }));

        if (data.failCount > 0) {
          notifySuccess(`${data.successCount} épreuve(s) supprimée(s), ${data.failCount} échec(s).`);
        } else {
          notifySuccess(`${data.successCount} épreuve(s) supprimée(s) définitivement.`);
        }
      } else {
        setEpreuves((prev) =>
          prev.map((e) => selectedIds.has(e.id) ? { ...e, statut: action } : e)
        );
        // Mettre à jour les KPIs pour chaque changement de statut
        affectedEpreuves.forEach((e) => adjustStatsLocally({ from: e.statut, to: action }));
        const label = action === 'approuve' ? 'validée(s) en ligne' : 'rejetée(s)';
        notifySuccess(`${data.successCount} épreuve(s) ${label}.`);
      }

      setSelectedIds(new Set());
      fetchStats(); // sync serveur en arrière-plan
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleExportZip = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsExportingZip(true);
      const res = await fetch('/api/epreuves/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la génération de l\'archive ZIP.');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let fileName = `Annale229_Selection_${Date.now()}.zip`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      notifySuccess(`Archive ZIP (${selectedIds.size} épreuves) téléchargée avec succès !`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors du téléchargement de l\'archive ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleUpdateStatut = async (id: string, newStatut: StatutEpreuve) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/epreuves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la mise à jour.');
      }

      setEpreuves((prev) =>
        prev.map((e) => (e.id === id ? { ...e, statut: newStatut } : e))
      );

      // Trouver l'ancien statut pour ajuster les KPIs
      const oldEpreuve = epreuves.find((e) => e.id === id);
      adjustStatsLocally({ from: oldEpreuve?.statut, to: newStatut });

      fetchStats(); // sync serveur en arrière-plan
      notifySuccess(`Statut mis à jour : ${newStatut}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      setActionLoadingId(target.id);
      const res = await fetch(`/api/admin/epreuves/${target.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la suppression.');
      }

      setEpreuves((prev) => prev.filter((e) => e.id !== target.id));
      setDeleteTarget(null);

      // Mise à jour immédiate des KPIs
      adjustStatsLocally({ from: target.statut, deleted: true });

      fetchStats(); // sync serveur en arrière-plan
      notifySuccess('Épreuve supprimée définitivement.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (epreuve: Epreuve) => {
    setEditingEpreuve(epreuve);
    setEditTitre(epreuve.titre || '');
    setEditMatiereNom(epreuve.matiere_nom);
    setEditNiveau(epreuve.niveau);
    setEditAnnee(epreuve.annee_academique);
    setEditType(epreuve.type === 'rattrapage' ? 'rattrapage' : 'devoir');
    setEditStatut(epreuve.statut);
    setEditUploaderNom(epreuve.uploader_nom || '');
    setEditUploaderEmail(epreuve.uploader_email || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpreuve) return;

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/admin/epreuves/${editingEpreuve.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: editTitre.trim(),
          matiereNom: editMatiereNom.trim(),
          niveau: editNiveau,
          anneeAcademique: editAnnee,
          type: editType,
          statut: editStatut,
          uploaderNom: editUploaderNom.trim(),
          uploaderEmail: editUploaderEmail.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de la sauvegarde.');
      }

      const data = await res.json();
      if (data.epreuve) {
        // Si le statut a changé, mettre à jour les KPIs immédiatement
        if (editingEpreuve.statut !== editStatut) {
          adjustStatsLocally({ from: editingEpreuve.statut, to: editStatut });
        }
        setEpreuves((prev) =>
          prev.map((item) => (item.id === editingEpreuve.id ? data.epreuve : item))
        );
      }
      setEditingEpreuve(null);
      fetchStats(); // sync serveur en arrière-plan
      notifySuccess('Modifications enregistrées avec succès !');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ============================================================
  // ACTIONS : MATIÈRES
  // ============================================================

  const handleAddMatiere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatiereNom.trim()) return;

    try {
      setIsAddingMatiere(true);
      const res = await fetch('/api/admin/matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newMatiereNom.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur création matière.');
      }

      setNewMatiereNom('');
      await fetchMatieres();
      fetchStats();
      notifySuccess('Nouvelle matière ajoutée au catalogue !');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingMatiere(false);
    }
  };

  const handleDeleteMatiere = async (matiere: MatiereWithStats) => {
    if (matiere.total_epreuves > 0) {
      alert(`Impossible de supprimer "${matiere.nom}" car ${matiere.total_epreuves} épreuve(s) y sont rattachée(s).`);
      return;
    }

    if (!confirm(`Supprimer définitivement la matière "${matiere.nom}" ?`)) return;

    try {
      const res = await fetch(`/api/admin/matieres/${matiere.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la suppression.');
      }
      await fetchMatieres();
      fetchStats();
      notifySuccess(`Matière "${matiere.nom}" supprimée.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ============================================================
  // ACTIONS : UTILISATEURS & ADMINS
  // ============================================================

  const handleToggleUserRole = async (user: UserAccount) => {
    const targetRole = user.role === 'admin' ? 'etudiant' : 'admin';
    const actionLabel = targetRole === 'admin' ? 'promouvoir administrateur' : 'rétrograder en simple étudiant';

    if (!confirm(`Voulez-vous vraiment ${actionLabel} le compte ${user.email} ?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, role: targetRole, action: 'setRole' }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de l\'opération.');
      }

      await fetchUsers();
      fetchStats();
      notifySuccess(`Rôle mis à jour : ${user.email} est désormais ${targetRole}.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAdminByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    try {
      setIsAddingAdmin(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail.trim(), role: 'admin', action: 'setRole' }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Impossible d\'ajouter cet administrateur.');
      }

      setNewAdminEmail('');
      await fetchUsers();
      fetchStats();
      notifySuccess(`Droits administrateur accordés à ${newAdminEmail.trim()} !`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Badge de statut d'épreuve
  const getStatusBadge = (statut: StatutEpreuve) => {
    switch (statut) {
      case 'approuve':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>En ligne</span>
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>À valider</span>
          </span>
        );
      case 'rejete':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>Rejetée</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Chargement de l&apos;espace administration...</p>
        </main>
      </div>
    );
  }

  if (status === 'unauthenticated' || !userIsAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bg">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full bg-white dark:bg-[#161B22] p-8 rounded-3xl border border-slate-200 dark:border-[#30363D] shadow-sm text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-ink-primary dark:text-white mb-2">
              {status === 'unauthenticated' ? 'Connexion requise' : 'Accès réservé aux administrateurs'}
            </h2>
            <p className="text-xs text-ink-secondary dark:text-slate-400 mb-6 leading-relaxed">
              {status === 'unauthenticated'
                ? 'Vous devez être identifié avec un compte administrateur pour accéder à cette interface.'
                : 'Votre compte ne dispose pas des privilèges nécessaires pour accéder au panel d\'administration.'}
            </p>
            <Link
              href={status === 'unauthenticated' ? '/' : '/epreuves'}
              className="inline-flex items-center justify-center w-full px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              {status === 'unauthenticated' ? 'Se connecter / Retour à l\'accueil' : 'Retourner au catalogue'}
            </Link>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-surface-bg selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/epreuves"
              className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Retour au catalogue</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>Administration Annale229</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                if (mainTab === 'soumissions') fetchEpreuves();
                if (mainTab === 'utilisateurs') fetchUsers();
                if (mainTab === 'matieres') fetchMatieres();
                if (mainTab === 'connexions') fetchConnexions(connexionFilterEmail);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-ink-secondary hover:text-brand text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>

        {/* Message de succès temporaire */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-2xl flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Message d'erreur d'autorisation ou réseau */}
        {error && (
          error.toLowerCase().includes('refusé') || error.toLowerCase().includes('administrateur') ? (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-3xl text-center max-w-lg mx-auto shadow-xs">
              <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
              <h2 className="text-base font-bold text-red-900 mb-1">Accès Restreint</h2>
              <p className="text-xs text-red-700 mb-4">{error}</p>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-red-700 transition-colors"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  fetchStats();
                  if (mainTab === 'soumissions') fetchEpreuves();
                  if (mainTab === 'utilisateurs') fetchUsers();
                  if (mainTab === 'matieres') fetchMatieres();
                  if (mainTab === 'connexions') fetchConnexions(connexionFilterEmail);
                }}
                className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-300 transition-colors shrink-0"
              >
                Réessayer
              </button>
            </div>
          )
        )}

        {/* KPI Quick Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">À Valider</span>
              <span className={`text-2xl font-black mt-1 block ${
                (derivedStats?.pendingCount ?? stats.pendingCount) > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}>
                {derivedStats?.pendingCount ?? stats.pendingCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Ligne</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {derivedStats?.approvedCount ?? stats.approvedCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Utilisateurs</span>
              <span className="text-2xl font-black text-brand mt-1 block">
                {stats.totalUsers || 1}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Admins</span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                {stats.totalAdmins || 1}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Matières</span>
              <span className="text-2xl font-black text-teal-600 mt-1 block">
                {stats.totalMatieres || matieresList.length}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Connexions</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {stats.totalLogins || 0}
              </span>
            </div>
          </div>
        )}

        {/* Fallback KPIs si stats serveur pas encore chargées mais épreuves disponibles */}
        {!stats && epreuves.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">À Valider</span>
              <span className={`text-2xl font-black mt-1 block ${
                epreuves.filter((e) => e.statut === 'en_attente').length > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}>
                {epreuves.filter((e) => e.statut === 'en_attente').length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Ligne</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {epreuves.filter((e) => e.statut === 'approuve').length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rejetées</span>
              <span className="text-2xl font-black text-red-500 mt-1 block">
                {epreuves.filter((e) => e.statut === 'rejete').length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total épreuves</span>
              <span className="text-2xl font-black text-brand mt-1 block">{epreuves.length}</span>
            </div>
          </div>
        )}


        {/* Barre de navigation des onglets principaux */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 mb-8">
          <button
            type="button"
            onClick={() => setMainTab('soumissions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'soumissions'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Soumissions</span>
            {stats && stats.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-red-500 text-white">
                {stats.pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMainTab('import_lot')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'import_lot'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Import en lot</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
              Masse
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('matieres')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'matieres'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Matières ({matieresList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('utilisateurs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'utilisateurs'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Comptes ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('connexions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'connexions'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique Connexions</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainTab === 'stats'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistiques & Vue globale</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* ONGLET 1 : SOUMISSIONS D'ÉPREUVES */}
        {/* ============================================================ */}
        {mainTab === 'soumissions' && (
          <div>
            {/* Filtres de soumissions */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Onglets statut */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('en_attente')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'en_attente'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>À valider</span>
                  {stats && stats.pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-amber-600 text-white rounded-full">
                      {stats.pendingCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('approuve')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'approuve'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>En ligne</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rejete')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'rejete'
                      ? 'bg-red-100 text-red-900 border border-red-300 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Rejetées</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>Toutes ({stats?.totalEpreuves || 0})</span>
                </button>
              </div>

              {/* Recherche & Niveau */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer matière ou titre..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <select
                  value={selectedNiveau}
                  onChange={(e) => setSelectedNiveau(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">Tous niveaux</option>
                  {VALID_NIVEAUX_PREDEFINIS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setMainTab('import_lot')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors shadow-xs shrink-0"
                  title="Téléverser plusieurs épreuves simultanément"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">+ Import par lot</span>
                  <span className="sm:hidden">+ Lot</span>
                </button>
              </div>
            </div>

            {/* Table des soumissions */}
            {loading ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80">
                <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-medium">Chargement des soumissions...</p>
              </div>
            ) : epreuves.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-6">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-ink-primary">Aucune soumission trouvée</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeTab === 'en_attente'
                    ? 'Toutes les soumissions récentes ont déjà été traitées. Bon travail !'
                    : 'Aucun document ne correspond aux filtres sélectionnés.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {/* Checkbox tout sélectionner */}
                        <th className="py-3.5 pl-4 pr-2 w-10">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                            className="text-slate-400 hover:text-brand transition-colors"
                          >
                            {allSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand" />
                            ) : someSelected ? (
                              <MinusSquare className="w-4 h-4 text-brand" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-3.5 px-4">Épreuve</th>
                        <th className="py-3.5 px-3">Matière & Niveau</th>
                        <th className="py-3.5 px-3">Type & Année</th>
                        <th className="py-3.5 px-3">Déposé par</th>
                        <th className="py-3.5 px-3 text-center">Corrigé</th>
                        <th className="py-3.5 px-3 text-center">Statut</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {epreuves.map((epreuve) => {
                        const isActionLoading = actionLoadingId === epreuve.id;
                        const isSelected = selectedIds.has(epreuve.id);

                        return (
                          <tr
                            key={epreuve.id}
                            className={`hover:bg-slate-50/60 transition-colors ${
                              isSelected ? 'bg-brand/5 border-l-2 border-l-brand' : ''
                            }`}
                          >
                            {/* Checkbox sélection */}
                            <td className="py-3.5 pl-4 pr-2">
                              <button
                                type="button"
                                onClick={() => toggleSelectOne(epreuve.id)}
                                className="text-slate-300 hover:text-brand transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-brand" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Épreuve & Titre */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  epreuve.type_fichier === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {epreuve.type_fichier === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                </div>
                                <div className="max-w-[200px] truncate">
                                  <span className="font-bold text-ink-primary block truncate">
                                    {epreuve.titre || epreuve.matiere_nom}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {formatFileSize(epreuve.taille_octets)} • {formatRelativeDate(epreuve.created_at)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Matière & Niveau */}
                            <td className="py-3.5 px-3">
                              <span className="font-semibold text-ink-primary block truncate max-w-[160px]">
                                {epreuve.matiere_nom}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {epreuve.niveau}
                              </span>
                            </td>

                            {/* Type & Année */}
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                epreuve.type === 'devoir' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {epreuve.type}
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {epreuve.annee_academique}
                              </span>
                            </td>

                            {/* Auteur */}
                            <td className="py-3.5 px-3">
                              <span className="font-medium text-ink-primary block truncate max-w-[140px]">
                                {epreuve.uploader_nom || 'Anonyme'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                                {epreuve.uploader_email}
                              </span>
                            </td>

                            {/* Corrigé */}
                            <td className="py-3.5 px-3 text-center">
                              {epreuve.has_corrige ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Corrigé</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                                  Sans corrigé
                                </span>
                              )}
                            </td>

                            {/* Statut */}
                            <td className="py-3.5 px-3 text-center">
                              {getStatusBadge(epreuve.statut)}
                            </td>

                            {/* Actions rapides */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Page détaillée / gestion corrigé */}
                                <Link
                                  href={`/epreuves/${epreuve.id}`}
                                  target="_blank"
                                  title="Ouvrir la page de l'épreuve (voir / déposer un corrigé)"
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>

                                {/* Aperçu */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewEpreuve(epreuve)}
                                  title="Aperçu du fichier"
                                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Modifier les détails */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(epreuve)}
                                  title="Modifier les détails de la soumission"
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {/* Valider */}
                                {epreuve.statut !== 'approuve' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatut(epreuve.id, 'approuve')}
                                    disabled={isActionLoading}
                                    title="Mettre en ligne"
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Rejeter */}
                                {epreuve.statut !== 'rejete' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatut(epreuve.id, 'rejete')}
                                    disabled={isActionLoading}
                                    title="Rejeter"
                                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Supprimer définitivement */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(epreuve)}
                                  disabled={isActionLoading}
                                  title="Supprimer définitivement"
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ONGLET : TÉLÉVERSEMENT EN LOT (BULK UPLOAD) */}
        {/* ============================================================ */}
        {mainTab === 'import_lot' && (
          <BulkUploadManager
            matieresList={matieresList}
            onUploadSuccess={() => {
              fetchStats();
              fetchEpreuves();
              notifySuccess('Importation par lot réussie ! Les épreuves sont publiées au catalogue.');
            }}
          />
        )}

        {/* ============================================================ */}
        {/* ONGLET 2 : GESTION DES MATIÈRES */}
        {/* ============================================================ */}
        {mainTab === 'matieres' && (
          <div className="space-y-6">
            {/* Formulaire d'ajout de matière */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-2">
                <Plus className="w-4 h-4 text-brand" />
                <span>Ajouter une nouvelle matière au programme MBH</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                La matière sera immédiatement disponible dans le combobox de dépôt et dans les filtres du catalogue.
              </p>

              <form onSubmit={handleAddMatiere} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newMatiereNom}
                  onChange={(e) => setNewMatiereNom(e.target.value)}
                  placeholder="Ex: Télémédecine & Systèmes PACS, Automatisme Hospitalier..."
                  required
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={isAddingMatiere}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAddingMatiere ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Créer la matière</span>
                </button>
              </form>
            </div>

            {/* Liste des matières */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-ink-primary">
                  Catalogue des matières MBH ({matieresList.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Trié par ordre alphabétique
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">Matière</th>
                      <th className="py-3 px-4">Épreuves liées</th>
                      <th className="py-3 px-4">Créé par</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {matieresList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-ink-primary">
                          {m.nom}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.total_epreuves > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {m.total_epreuves} épreuve(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 truncate max-w-[180px]">
                          {m.created_by_email}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {formatRelativeDate(m.created_at)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMatiere(m)}
                            disabled={m.total_epreuves > 0}
                            title={m.total_epreuves > 0 ? 'Impossible de supprimer une matière liée à des épreuves' : 'Supprimer'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              m.total_epreuves > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ONGLET 3 : COMPTES UTILISATEURS & ADMINISTRATEURS */}
        {/* ============================================================ */}
        {mainTab === 'utilisateurs' && (
          <div className="space-y-6">
            {/* Formulaire ajout admin rapide */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Promouvoir un nouvel administrateur</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Entrez l&apos;adresse Google de l&apos;étudiant ou du délégué pour lui accorder les droits d&apos;administration complets.
              </p>

              <form onSubmit={handleAddAdminByEmail} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="etudiant.mbh@gmail.com..."
                  required
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={isAddingAdmin}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAddingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Accorder le rôle Admin</span>
                </button>
              </form>
            </div>

            {/* Liste des utilisateurs */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-ink-primary">
                  Utilisateurs enregistrés ({usersList.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Comptes connectés au moins une fois
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">Utilisateur</th>
                      <th className="py-3 px-4">Rôle</th>
                      <th className="py-3 px-4">Dépôts</th>
                      <th className="py-3 px-4">Dernière connexion</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {usersList.map((u) => {
                      const isSuperAdmin = checkIsSuperAdmin(u.email);

                      return (

                        <tr key={u.email} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              {u.image ? (
                                <img src={u.image} alt={u.nom} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand font-bold flex items-center justify-center text-xs">
                                  {u.nom[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-ink-primary block">{u.nom}</span>
                                <span className="text-[11px] text-slate-400">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldAlert className="w-3 h-3 text-indigo-600" />
                                <span>Administrateur</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Étudiant</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {u.total_depots} épreuve(s)
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {formatRelativeDate(u.last_login)}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            {isSuperAdmin ? (
                              <span className="text-[11px] font-bold text-slate-400 italic">Fondateur</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  u.role === 'admin'
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                }`}
                              >
                                {u.role === 'admin' ? 'Rétrograder en Étudiant' : 'Nommer Administrateur'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ONGLET 4 : HISTORIQUE DES CONNEXIONS */}
        {/* ============================================================ */}
        {mainTab === 'connexions' && (
          <div className="space-y-6">
            {/* Barre de filtrage */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand" />
                <span className="text-xs sm:text-sm font-bold text-ink-primary">
                  Journal d&apos;activité des connexions ({connexionsList.length})
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={connexionFilterEmail}
                    onChange={(e) => {
                      setConnexionFilterEmail(e.target.value);
                      fetchConnexions(e.target.value);
                    }}
                    placeholder="Filtrer par email d'étudiant..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            {/* Table des logs */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">Date & Heure</th>
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Méthode</th>
                      <th className="py-3 px-6">Détails Appareil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {connexionsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          Aucun historique de connexion enregistré.
                        </td>
                      </tr>
                    ) : (
                      connexionsList.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-6 text-slate-600 font-medium">
                            {new Date(log.created_at).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="py-3 px-4 font-bold text-ink-primary">
                            {log.user_nom || 'Étudiant MBH'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {log.user_email}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {log.provider}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-slate-400 text-[11px] truncate max-w-[220px]">
                            {log.user_agent || log.ip_address || 'Navigateur'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ONGLET 5 : STATISTIQUES & VUE GLOBALE */}
        {/* ============================================================ */}
        {mainTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-ink-primary mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand" />
                <span>Bilan des Épreuves MBH</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Total épreuves enregistrées</span>
                  <span className="font-bold text-ink-primary">{stats?.totalEpreuves || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl text-emerald-800">
                  <span className="font-medium">Épreuves validées en ligne</span>
                  <span className="font-bold">{stats?.approvedCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl text-amber-800">
                  <span className="font-medium">Épreuves en attente de modération</span>
                  <span className="font-bold">{stats?.pendingCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl text-red-800">
                  <span className="font-medium">Épreuves rejetées</span>
                  <span className="font-bold">{stats?.rejectedCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl text-blue-800">
                  <span className="font-medium">Total consultations / téléchargements</span>
                  <span className="font-bold">{stats?.totalDownloads || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-ink-primary mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand" />
                <span>Communauté & Utilisateurs</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Comptes étudiants inscrits</span>
                  <span className="font-bold text-ink-primary">{stats?.totalUsers || 1}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl text-indigo-800">
                  <span className="font-medium">Nombre d&apos;administrateurs</span>
                  <span className="font-bold">{stats?.totalAdmins || 1}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Contributeurs actifs (ayant déposé)</span>
                  <span className="font-bold text-ink-primary">{stats?.contributorsCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Total des connexions enregistrées</span>
                  <span className="font-bold text-ink-primary">{stats?.totalLogins || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl text-teal-800">
                  <span className="font-medium">Matières actives au catalogue</span>
                  <span className="font-bold">{stats?.totalMatieres || matieresList.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODALE 1 : APERÇU FICHIER */}
      {/* ============================================================ */}
      {previewEpreuve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-primary">
                  {previewEpreuve.matiere_nom} — {previewEpreuve.niveau}
                </h3>
                <p className="text-xs text-slate-400">
                  {previewEpreuve.type} • {previewEpreuve.annee_academique}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEpreuve(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[450px]">
              {previewEpreuve.type_fichier === 'pdf' ? (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewEpreuve.cloudinary_url)}&embedded=true`}
                  title="Aperçu PDF"
                  className="w-full h-[600px] border-0 rounded-xl"
                />
              ) : (
                <img
                  src={previewEpreuve.cloudinary_url}
                  alt={previewEpreuve.matiere_nom}
                  className="max-h-[600px] w-auto object-contain rounded-xl"
                />
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={previewEpreuve.cloudinary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                <span>Ouvrir le fichier dans un nouvel onglet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewEpreuve(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-ink-primary text-xs font-bold rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALE 2 : ÉDITION COMPLÈTE DES DÉTAILS DE LA SOUMISSION */}
      {/* ============================================================ */}
      {editingEpreuve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand" />
                <span>Modifier les détails de la soumission</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingEpreuve(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Titre / précision */}
              <div>
                <label className="block font-bold text-ink-primary mb-1">Titre / Précision de l&apos;épreuve</label>
                <input
                  type="text"
                  value={editTitre}
                  onChange={(e) => setEditTitre(e.target.value)}
                  placeholder="Ex: Devoir de synthèse n°1, Session normale..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Matière */}
              <div>
                <label className="block font-bold text-ink-primary mb-1">Matière</label>
                <input
                  type="text"
                  value={editMatiereNom}
                  onChange={(e) => setEditMatiereNom(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* 2 colonnes : Niveau & Année */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Niveau</label>
                  <select
                    value={editNiveau}
                    onChange={(e) => setEditNiveau(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {VALID_NIVEAUX_PREDEFINIS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink-primary mb-1">Année académique</label>
                  <select
                    value={editAnnee}
                    onChange={(e) => setEditAnnee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2 colonnes : Type d'épreuve (devoir / rattrapage) & Statut */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Type d&apos;épreuve</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TypeEpreuve)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand capitalize"
                  >
                    {VALID_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink-primary mb-1">Statut</label>
                  <select
                    value={editStatut}
                    onChange={(e) => setEditStatut(e.target.value as StatutEpreuve)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="approuve">En ligne (approuvé)</option>
                    <option value="en_attente">À valider (en attente)</option>
                    <option value="rejete">Rejetée</option>
                  </select>
                </div>
              </div>

              {/* 2 colonnes : Auteur Nom & Email */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Nom de l&apos;auteur</label>
                  <input
                    type="text"
                    value={editUploaderNom}
                    onChange={(e) => setEditUploaderNom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Email de l&apos;auteur</label>
                  <input
                    type="email"
                    value={editUploaderEmail}
                    onChange={(e) => setEditUploaderEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEpreuve(null)}
                  className="px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BARRE D'ACTIONS EN MASSE (flottante, apparaît quand des items sont sélectionnés) */}
      {/* ============================================================ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 border border-white/10">
            {/* Compteur & désélectionner */}
            <div className="flex items-center gap-2 pr-3 border-r border-white/20">
              <CheckSquare className="w-4 h-4 text-brand" />
              <span className="text-xs font-bold">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                title="Annuler la sélection"
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Télécharger la sélection en ZIP */}
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isBulkLoading || isExportingZip}
              title="Télécharger la sélection en archive ZIP (sujet + corrigé fusionné)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-emerald-300" />
              )}
              <span>Exporter ZIP ({selectedIds.size})</span>
            </button>

            {/* Valider en masse */}
            <button
              type="button"
              onClick={() => handleBulkAction('approuve')}
              disabled={isBulkLoading}
              title="Valider toutes les sélectionnées"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isBulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Valider tout</span>
            </button>

            {/* Rejeter en masse */}
            <button
              type="button"
              onClick={() => handleBulkAction('rejete')}
              disabled={isBulkLoading}
              title="Rejeter toutes les sélectionnées"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isBulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Rejeter tout</span>
            </button>

            {/* Supprimer en masse */}
            {bulkDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-red-400 font-bold animate-pulse">Confirmer ?</span>
                <button
                  type="button"
                  onClick={() => handleBulkAction('delete')}
                  disabled={isBulkLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Oui, supprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={isBulkLoading}
                title="Supprimer définitivement toutes les sélectionnées"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALE 3 : CONFIRMATION SUPPRESSION */}
      {/* ============================================================ */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Supprimer définitivement l'épreuve ?"
        message={
          deleteTarget
            ? `Vous êtes sur le point de supprimer "${deleteTarget.matiere_nom} - ${deleteTarget.niveau}". Cette action est irréversible et supprimera également le fichier hébergé.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
