import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { TypeEpreuve } from '@/types';

/**
 * Vérifie si Cloudinary est configuré
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Configure le SDK Cloudinary (appelé automatiquement au premier usage)
 */
export function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

interface UploadParams {
  buffer:           Buffer;
  originalFilename: string;
  mimeType:         string;
  anneeAcademique:  string;
  matiereNom:       string;
  epreuveId:        string;
  type:             TypeEpreuve;
}

interface UploadResult {
  publicId: string;
  url:      string;
}

/**
 * Uploade un fichier sur Cloudinary.
 *
 * Structure des dossiers : annale229/{annee}/{matiere}/{epreuveId}-{type}
 * - Important : Les PDF sont uploadés avec resource_type: 'image' et format: 'pdf'.
 *   Cela permet à Cloudinary d'afficher le fichier dans la Media Library standard,
 *   de générer des vignettes de la page 1 automatiquement et d'éviter l'erreur 401 de livraison raw.
 */
export async function uploadToCloudinary(params: UploadParams): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary non configuré (variables CLOUDINARY_* manquantes).');
  }

  configureCloudinary();

  // Dossier propre : remplace les caractères spéciaux pour les paths Cloudinary
  const sanitize = (s: string) =>
    s.trim()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '') // retire les accents
     .replace(/[^a-zA-Z0-9_-]/g, '_')
     .replace(/_+/g, '_')
     .toLowerCase();

  const anneeClean   = sanitize(params.anneeAcademique || 'annee_inconnue');
  const matiereClean = sanitize(params.matiereNom || 'matiere_inconnue');
  const folder       = `annale229/${anneeClean}/${matiereClean}`;

  const isPdf = params.mimeType === 'application/pdf' || params.originalFilename.toLowerCase().endsWith('.pdf');
  const publicId = `${folder}/${params.epreuveId}-${params.type}`;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, any> = {
      public_id:     publicId,
      resource_type: 'image', // Cloudinary gère les PDF comme type 'image' pour vignettes & previews
      type:          'upload',
      access_mode:   'public',
    };

    if (isPdf) {
      uploadOptions.format = 'pdf';
    } else {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Réponse Cloudinary vide'));
        }
        resolve({
          publicId: result.public_id,
          url:      result.secure_url,
        });
      }
    );

    // Convertir le Buffer en stream
    const stream = new Readable();
    stream.push(params.buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}

/**
 * Récupère le Buffer d'un fichier Cloudinary via une requête d'API signée et authentifiée.
 * Contourne systématiquement l'erreur HTTP 401 que Cloudinary applique par défaut
 * sur la livraison publique directe des fichiers PDF / RAW.
 */
export async function fetchCloudinaryBuffer(
  publicId: string,
  preferredFormat: string = 'pdf'
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isCloudinaryConfigured() || !publicId || publicId.startsWith('mock_')) {
    return null;
  }

  configureCloudinary();

  const cleanPublicId = publicId.replace(/\.pdf$/i, '');
  const format = preferredFormat?.toLowerCase().replace(/^\./, '') || 'pdf';

  // 1. Tenter avec resource_type: 'image'
  try {
    const downloadUrl = cloudinary.utils.private_download_url(
      cleanPublicId,
      format,
      {
        resource_type: 'image',
        type: 'upload',
        attachment: false,
      }
    );
    const res = await fetch(downloadUrl);
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuf),
        contentType: res.headers.get('content-type') || (format === 'pdf' ? 'application/pdf' : 'image/jpeg'),
      };
    }
  } catch (err) {
    console.warn(`[Cloudinary] Échec tentative image pour ${publicId}:`, err);
  }

  // 2. Tenter avec resource_type: 'raw' (pour les anciens uploads créés en raw)
  try {
    const rawPublicId = publicId.endsWith('.pdf') ? publicId : `${publicId}.pdf`;
    const downloadUrlRaw = cloudinary.utils.private_download_url(
      rawPublicId,
      format,
      {
        resource_type: 'raw',
        type: 'upload',
        attachment: false,
      }
    );
    const resRaw = await fetch(downloadUrlRaw);
    if (resRaw.ok) {
      const arrayBuf = await resRaw.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuf),
        contentType: resRaw.headers.get('content-type') || 'application/pdf',
      };
    }
  } catch (err) {
    console.warn(`[Cloudinary] Échec tentative raw pour ${publicId}:`, err);
  }

  return null;
}

/**
 * Supprime un fichier sur Cloudinary par son public_id.
 * Tente d'abord en tant qu'image, puis en tant que raw (PDF).
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured() || !publicId || publicId.startsWith('mock_')) {
    return true;
  }

  configureCloudinary();

  try {
    // Essai image
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (res.result === 'ok') return true;

    // Essai raw (PDF)
    const res2 = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return res2.result === 'ok';
  } catch (err) {
    console.error('Erreur suppression Cloudinary:', err);
    return false;
  }
}

/**
 * Génère une URL de prévisualisation Cloudinary optimisée.
 * - Image : thumbnail 800px
 * - PDF : conversion automatique de la page 1 en image JPG (100% visible sans 401 !)
 */
export function getCloudinaryPreviewUrl(publicId: string, isPdf: boolean = false): string {
  if (!publicId || publicId.startsWith('mock_')) return publicId;
  configureCloudinary();

  const cleanId = publicId.replace(/\.pdf$/i, '');

  if (isPdf) {
    // Rend la première page du PDF sous forme d'image JPEG
    return cloudinary.url(cleanId, {
      resource_type: 'image',
      format:        'jpg',
      page:          1,
      width:         800,
      crop:          'limit',
      quality:       'auto',
    });
  }

  return cloudinary.url(cleanId, {
    resource_type: 'image',
    width:         800,
    crop:          'limit',
    quality:       'auto',
    fetch_format:  'auto',
  });
}
