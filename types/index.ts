export type TypeEpreuve = 'devoir' | 'rattrapage';

export type StatutEpreuve = 'en_attente' | 'approuve' | 'rejete';

export type TypeFichier = 'pdf' | 'jpg' | 'png' | 'heic';

export interface BulkUploadItem {
  id: string;
  file: File;
  files: File[];
  fileName: string;
  fileSize: number;
  isMerged?: boolean;
  corrigeFile?: File | null;
  corrigeFiles?: File[];
  matiereNom: string;
  niveau: string;
  anneeAcademique: string;
  type: TypeEpreuve;
  titre: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
  uploadedEpreuveId?: string;
}

export type NiveauOption = 
  | '1ère année'
  | '2ème année'
  | '3ème année'
  | '4ème année'
  | '5ème année'
  | string;

export interface Matiere {
  id: string; // m_ + 6 alphanum
  nom: string;
  created_by_email: string;
  created_at: string;
}

export interface Epreuve {
  id: string; // e_ + 6 alphanum
  uploader_email: string;
  uploader_nom: string;
  matiere_id: string;
  matiere_nom: string;
  niveau: string;
  annee_academique: string; // AAAA-AAAA
  type: TypeEpreuve;
  titre?: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  taille_octets: number;
  type_fichier: TypeFichier;
  nb_telechargements: number;
  statut: StatutEpreuve;
  created_at: string;
  // Neon Object Storage (miroir S3)
  s3_key?: string;
  s3_url?: string;
  // Corrigé & Barème
  has_corrige?: boolean;
  corrige_url?: string;
  corrige_cloudinary_public_id?: string;
  corrige_s3_key?: string;
  corrige_type_fichier?: TypeFichier;
  corrige_taille_octets?: number;
  // Alias utilisé par certains composants
  telechargements_count?: number;
}

export interface Profil {
  email: string;
  nom: string;
  niveau: string;
  created_at: string;
}

export interface EpreuvesFilterParams {
  niveau?: string;
  matiere?: string | string[];
  annee?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
  uploader_email?: string;
  statut?: StatutEpreuve | 'all';
}

export interface EpreuvesListResponse {
  epreuves: Epreuve[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
