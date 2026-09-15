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
  Archive,
  Smartphone,
  Monitor,
  Globe
} from 'lucide-react';

interface UserAccount {
  email: string;
  nom: string;
  image?: string;
  role: 'admin' | 'etudiant';
  is_super_admin?: boolean;
  niveau?: string;
  created_at: string;
  last_login: string;
  total_depots: number;
}

function AdminUserAvatar({ src, nom }: { src?: string; nom: string }) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={nom}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand font-bold flex items-center justify-center text-xs">
      {nom?.[0]?.toUpperCase() || 'U'}
    </div>
  );
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
  const isCallerSuperAdmin = Boolean(session?.user?.isSuperAdmin || checkIsSuperAdmin(session?.user?.email));

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
        {/* KPI Quick Stats Row (Responsive: 3 cols sur mobile, 6 cols sur desktop) */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">À Valider</span>
              <span className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 block ${(derivedStats?.pendingCount ?? stats.pendingCount) > 0 ? 'text-amber-600' : 'text-slate-700'
                }`}>
                {derivedStats?.pendingCount ?? stats.pendingCount}
              </span>
            </div>

            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">En Ligne</span>
              <span className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">
                {derivedStats?.approvedCount ?? stats.approvedCount}
              </span>
            </div>

            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Utilisateurs</span>
              <span className="text-lg sm:text-2xl font-black text-brand mt-0.5 sm:mt-1 block">
                {stats.totalUsers || 1}
              </span>
            </div>

            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Admins</span>
              <span className="text-lg sm:text-2xl font-black text-indigo-600 mt-0.5 sm:mt-1 block">
                {stats.totalAdmins || 1}
              </span>
            </div>

            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Matières</span>
              <span className="text-lg sm:text-2xl font-black text-teal-600 mt-0.5 sm:mt-1 block">
                {stats.totalMatieres || matieresList.length}
              </span>
            </div>

            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Connexions</span>
              <span className="text-lg sm:text-2xl font-black text-blue-600 mt-0.5 sm:mt-1 block">
                {stats.totalLogins || 0}
              </span>
            </div>
          </div>
        )}

        {/* Fallback KPIs si stats serveur pas encore chargées mais épreuves disponibles */}
        {!stats && epreuves.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">À Valider</span>
              <span className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 block ${epreuves.filter((e) => e.statut === 'en_attente').length > 0 ? 'text-amber-600' : 'text-slate-700'
                }`}>
                {epreuves.filter((e) => e.statut === 'en_attente').length}
              </span>
            </div>
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">En Ligne</span>
              <span className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">
                {epreuves.filter((e) => e.statut === 'approuve').length}
              </span>
            </div>
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Rejetées</span>
              <span className="text-lg sm:text-2xl font-black text-red-500 mt-0.5 sm:mt-1 block">
                {epreuves.filter((e) => e.statut === 'rejete').length}
              </span>
            </div>
            <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs col-span-3">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total épreuves</span>
              <span className="text-lg sm:text-2xl font-black text-brand mt-0.5 sm:mt-1 block">{epreuves.length}</span>
            </div>
          </div>
        )}

        {/* Navigation des onglets principaux (Défilement fluide horizontal sur mobile, pills sur desktop) */}
        <div className="relative mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 border-b border-slate-200/80 pb-3">
            <button
              type="button"
              onClick={() => setMainTab('soumissions')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'soumissions'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Soumissions</span>
              {stats && stats.pendingCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white min-w-[18px] text-center leading-none">
                  {stats.pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMainTab('import_lot')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'import_lot'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Import en lot</span>
              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                Masse
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('matieres')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'matieres'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Matières ({matieresList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('utilisateurs')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'utilisateurs'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Comptes ({usersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('connexions')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'connexions'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Historique Connexions</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('stats')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${mainTab === 'stats'
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'text-ink-secondary bg-slate-100/80 hover:bg-slate-200/80 sm:bg-transparent'
                }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Statistiques</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ONGLET 1 : SOUMISSIONS D'ÉPREUVES */}
        {/* ============================================================ */}
        {mainTab === 'soumissions' && (
          <div>
            {/* Filtres de soumissions */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Onglets statut avec défilement fluide sans barre */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('en_attente')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${activeTab === 'en_attente'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>À valider</span>
                  {stats && stats.pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded-full font-black min-w-[18px] text-center leading-none">
                      {stats.pendingCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('approuve')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${activeTab === 'approuve'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>En ligne</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rejete')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${activeTab === 'rejete'
                    ? 'bg-red-100 text-red-900 border border-red-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Rejetées</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${activeTab === 'all'
                    ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <span>Toutes ({stats?.totalEpreuves || 0})</span>
                </button>
              </div>

              {/* Recherche, Niveau & Import par lot */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer matière ou titre..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedNiveau}
                    onChange={(e) => setSelectedNiveau(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="all">Tous niveaux</option>
                    {VALID_NIVEAUX_PREDEFINIS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setMainTab('import_lot')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors shadow-xs shrink-0 active:scale-95"
                    title="Téléverser plusieurs épreuves simultanément"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">+ Import lot</span>
                    <span className="sm:hidden">+ Lot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Barre de sélection multiple flottante */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 border border-slate-700 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-brand text-[11px] font-black">
                    {selectedIds.size}
                  </span>
                  <span className="text-xs font-semibold">sélectionnée(s)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkAction('approuve')}
                    disabled={isBulkLoading}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Valider</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkAction('rejete')}
                    disabled={isBulkLoading}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rejeter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    title="Télécharger l'archive ZIP"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
                    title="Désélectionner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Contenu des soumissions */}
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
              <>
                {/* ── 1. VUE MOBILE : Cartes tactiles interactives (écrans < md) ── */}
                <div className="md:hidden space-y-3">
                  {/* Bouton de sélection rapide mobile */}
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 font-bold text-ink-primary hover:text-brand transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand" />
                      ) : someSelected ? (
                        <MinusSquare className="w-4 h-4 text-brand" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Tout sélectionner ({epreuves.length})</span>
                    </button>
                    {selectedIds.size > 0 && (
                      <span className="font-bold text-brand">{selectedIds.size} cochée(s)</span>
                    )}
                  </div>

                  {epreuves.map((epreuve) => {
                    const isActionLoading = actionLoadingId === epreuve.id;
                    const isSelected = selectedIds.has(epreuve.id);

                    return (
                      <div
                        key={epreuve.id}
                        className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs ${
                          isSelected ? 'border-brand ring-2 ring-brand/20 bg-brand/5' : 'border-slate-200/80'
                        }`}
                      >
                        {/* En-tête de la carte */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(epreuve.id)}
                              className="text-slate-300 hover:text-brand transition-colors shrink-0 p-1"
                              aria-label="Sélectionner"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-brand" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <span className="font-bold text-sm text-ink-primary block truncate">
                                {epreuve.matiere_nom}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {epreuve.niveau}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                  epreuve.type === 'devoir' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {epreuve.type}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {epreuve.annee_academique}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {getStatusBadge(epreuve.statut)}
                            {epreuve.has_corrige && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-2.5 h-2.5" />
                                Corrigé
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Détails du document */}
                        <div className="flex items-center gap-2.5 py-2 px-3 bg-slate-50 rounded-xl mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            epreuve.type_fichier === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {epreuve.type_fichier === 'pdf' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-ink-primary truncate">
                              {epreuve.titre || epreuve.matiere_nom}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {formatFileSize(epreuve.taille_octets)} • Par {epreuve.uploader_nom || 'Anonyme'} • {formatRelativeDate(epreuve.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Barre d'actions rapides au pouce */}
                        <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewEpreuve(epreuve)}
                              className="p-2 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                              title="Aperçu du fichier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(epreuve)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors active:scale-95"
                              title="Modifier"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/epreuves/${epreuve.id}`}
                              target="_blank"
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors active:scale-95"
                              title="Voir la page épreuve"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(epreuve)}
                              disabled={isActionLoading}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40 active:scale-95"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {epreuve.statut !== 'rejete' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatut(epreuve.id, 'rejete')}
                                disabled={isActionLoading}
                                className="px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center gap-1 transition-colors disabled:opacity-40 active:scale-95"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Rejeter</span>
                              </button>
                            )}
                            {epreuve.statut !== 'approuve' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatut(epreuve.id, 'approuve')}
                                disabled={isActionLoading}
                                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shadow-xs transition-colors disabled:opacity-40 active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── 2. VUE DESKTOP : Table complète (écrans >= md) ── */}
                <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                              className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-brand/5 border-l-2 border-l-brand' : ''
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
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${epreuve.type_fichier === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${epreuve.type === 'devoir' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
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
              </>
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

              {/* ── 1. VUE MOBILE : Cartes matières (écrans < md) ── */}
              <div className="md:hidden divide-y divide-slate-100">
                {matieresList.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-ink-primary block truncate">{m.nom}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.total_epreuves > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {m.total_epreuves} épreuve(s)
                        </span>
                        <span className="text-[10px] text-slate-400">{formatRelativeDate(m.created_at)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMatiere(m)}
                      disabled={m.total_epreuves > 0}
                      className={`p-2.5 rounded-xl transition-colors shrink-0 active:scale-95 ${
                        m.total_epreuves > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 bg-red-50 hover:bg-red-100'
                      }`}
                      title={m.total_epreuves > 0 ? 'Matière liée à des épreuves' : 'Supprimer'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── 2. VUE DESKTOP : Table complète (écrans >= md) ── */}
              <div className="hidden md:block overflow-x-auto">
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${m.total_epreuves > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
                            className={`p-1.5 rounded-lg transition-colors ${m.total_epreuves > 0
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
            {/* Formulaire ajout admin rapide — visible UNIQUEMENT pour le Fondateur */}
            {isCallerSuperAdmin && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Promouvoir un nouvel administrateur</span>
                  </h3>
                </div>
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
                    disabled={isAddingAdmin}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-50"
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
            )}

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

              {/* ── 1. VUE MOBILE : Cartes utilisateurs (écrans < md) ── */}
              <div className="md:hidden divide-y divide-slate-100">
                {usersList.map((u) => {
                  const isTargetSuperAdmin = Boolean(u.is_super_admin || checkIsSuperAdmin(u.email));
                  const isSelf = Boolean(session?.user?.email && u.email.toLowerCase() === session.user.email.toLowerCase());

                  return (
                    <div key={u.email} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AdminUserAvatar src={u.image} nom={u.nom} />
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-ink-primary block truncate">{u.nom}</span>
                            <span className="text-xs text-slate-400 block truncate">{u.email}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {/* Badge rôle — le Fondateur voit son propre badge spécial, les autres voient Admin/Étudiant */}
                          {isTargetSuperAdmin && isCallerSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Fondateur</span>
                            </span>
                          ) : u.role === 'admin' ? (
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
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="font-medium text-slate-600">{u.total_depots} épreuve(s) déposée(s)</span>
                        <span className="text-[11px] text-slate-400">Vu {formatRelativeDate(u.last_login)}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-50 flex items-center justify-end">
                        {isSelf ? (
                          <span className="text-xs font-semibold text-slate-400 italic">Votre compte</span>
                        ) : isCallerSuperAdmin && !isTargetSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleUserRole(u)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${u.role === 'admin'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                              }`}
                          >
                            {u.role === 'admin' ? 'Rétrograder en Étudiant' : 'Nommer Administrateur'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── 2. VUE DESKTOP : Table complète (écrans >= md) ── */}
              <div className="hidden md:block overflow-x-auto">
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
                      const isTargetSuperAdmin = Boolean(u.is_super_admin || checkIsSuperAdmin(u.email));
                      const isSelf = Boolean(session?.user?.email && u.email.toLowerCase() === session.user.email.toLowerCase());

                      return (
                        <tr key={u.email} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <AdminUserAvatar src={u.image} nom={u.nom} />
                              <div>
                                <span className="font-bold text-ink-primary block">{u.nom}</span>
                                <span className="text-[11px] text-slate-400">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {/* Rôle — le Fondateur voit son badge spécial, les autres voient Admin/Étudiant */}
                            {isTargetSuperAdmin && isCallerSuperAdmin ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Fondateur</span>
                              </span>
                            ) : u.role === 'admin' ? (
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
                            {isSelf ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">Votre compte</span>
                            ) : isCallerSuperAdmin && !isTargetSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${u.role === 'admin'
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                  }`}
                              >
                                {u.role === 'admin' ? 'Rétrograder en Étudiant' : 'Nommer Administrateur'}
                              </button>
                            ) : null}
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

            {/* VUE MOBILE : Cartes de flux d'activité tactiles */}
            <div className="md:hidden space-y-3">
              {connexionsList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs shadow-xs">
                  Aucun historique de connexion enregistré.
                </div>
              ) : (
                connexionsList.map((log) => {
                  const isMobileDevice = /mobile|android|iphone|ipad/i.test(log.user_agent || '');
                  const formattedDate = new Date(log.created_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 border border-slate-200">
                            {(log.user_nom || log.user_email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-ink-primary text-xs block truncate">
                              {log.user_nom || 'Étudiant MBH'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {log.user_email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          {isMobileDevice ? (
                            <Smartphone className="w-3.5 h-3.5 text-brand shrink-0" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[170px]">
                            {isMobileDevice ? 'Mobile' : 'Ordinateur'} {log.ip_address ? `• ${log.ip_address}` : ''}
                          </span>
                        </div>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {log.provider}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* VUE BUREAU : Tableau complet */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Poignée tiroir mobile */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-ink-primary truncate">
                  {previewEpreuve.matiere_nom} — {previewEpreuve.niveau}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {previewEpreuve.type} • {previewEpreuve.annee_academique}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEpreuve(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-900 flex items-center justify-center min-h-[300px] sm:min-h-[450px]">
              {previewEpreuve.type_fichier === 'pdf' ? (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewEpreuve.cloudinary_url)}&embedded=true`}
                  title="Aperçu PDF"
                  className="w-full h-[55vh] sm:h-[600px] border-0 rounded-xl"
                />
              ) : (
                <img
                  src={previewEpreuve.cloudinary_url}
                  alt={previewEpreuve.matiere_nom}
                  className="max-h-[55vh] sm:max-h-[600px] w-auto object-contain rounded-xl"
                />
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <a
                href={previewEpreuve.cloudinary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 sm:py-0 text-xs font-bold text-brand hover:underline"
              >
                <span>Ouvrir dans un nouvel onglet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewEpreuve(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-ink-primary text-xs font-bold rounded-xl transition-colors text-center"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Poignée tiroir mobile */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 mb-3 sm:mb-5 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-ink-primary flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand" />
                <span>Modifier les détails</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingEpreuve(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 sm:space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Titre / précision */}
              <div>
                <label className="block font-bold text-ink-primary mb-1">Titre / Précision de l&apos;épreuve</label>
                <input
                  type="text"
                  value={editTitre}
                  onChange={(e) => setEditTitre(e.target.value)}
                  placeholder="Ex: Devoir de synthèse n°1, Session normale..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
                />
              </div>

              {/* 2 colonnes : Niveau & Année */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Niveau</label>
                  <select
                    value={editNiveau}
                    onChange={(e) => setEditNiveau(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
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
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
                  >
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2 colonnes : Type d'épreuve & Statut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Type d&apos;épreuve</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TypeEpreuve)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand capitalize min-h-[42px]"
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
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
                  >
                    <option value="approuve">En ligne (approuvé)</option>
                    <option value="en_attente">À valider (en attente)</option>
                    <option value="rejete">Rejetée</option>
                  </select>
                </div>
              </div>

              {/* 2 colonnes : Auteur Nom & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Nom de l&apos;auteur</label>
                  <input
                    type="text"
                    value={editUploaderNom}
                    onChange={(e) => setEditUploaderNom(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink-primary mb-1">Email de l&apos;auteur</label>
                  <input
                    type="email"
                    value={editUploaderEmail}
                    onChange={(e) => setEditUploaderEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-brand min-h-[42px]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setEditingEpreuve(null)}
                  className="px-4 py-2.5 text-xs font-bold text-ink-secondary hover:bg-slate-100 rounded-xl transition-colors"
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
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BARRE D'ACTIONS EN MASSE (flottante, adaptée mobile) */}
      {/* ============================================================ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.25rem)] sm:w-auto max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-3 sm:px-4 py-2.5 sm:py-3 border border-white/10 overflow-x-auto no-scrollbar">
            {/* Compteur & désélectionner */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-3 border-r border-white/20 shrink-0">
              <CheckSquare className="w-4 h-4 text-brand" />
              <span className="text-xs font-bold whitespace-nowrap">
                {selectedIds.size} <span className="hidden sm:inline">sélectionnée{selectedIds.size > 1 ? 's' : ''}</span>
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
              title="Télécharger la sélection en archive ZIP"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs shrink-0"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-emerald-300" />
              )}
              <span className="whitespace-nowrap"><span className="hidden sm:inline">Exporter </span>ZIP</span>
            </button>

            {/* Valider en masse */}
            <button
              type="button"
              onClick={() => handleBulkAction('approuve')}
              disabled={isBulkLoading}
              title="Valider toutes les sélectionnées"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {isBulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span className="whitespace-nowrap">Valider<span className="hidden sm:inline"> tout</span></span>
            </button>

            {/* Rejeter en masse */}
            <button
              type="button"
              onClick={() => handleBulkAction('rejete')}
              disabled={isBulkLoading}
              title="Rejeter toutes les sélectionnées"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {isBulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span className="whitespace-nowrap">Rejeter<span className="hidden sm:inline"> tout</span></span>
            </button>

            {/* Supprimer en masse */}
            {bulkDeleteConfirm ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-red-400 font-bold animate-pulse whitespace-nowrap">Sûr ?</span>
                <button
                  type="button"
                  onClick={() => handleBulkAction('delete')}
                  disabled={isBulkLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="whitespace-nowrap">Oui</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={isBulkLoading}
                title="Supprimer définitivement toutes les sélectionnées"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/30 transition-colors disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Supprimer</span>
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
