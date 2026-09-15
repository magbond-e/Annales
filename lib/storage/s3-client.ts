/**
 * Neon Object Storage S3 Client
 * Utilise le SDK AWS S3 standard avec les credentials Neon injectés dans .env.local
 * Bucket : annales229 (public_read, us-east-2)
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// ─── Configuration ────────────────────────────────────────────────────────────

export function isNeonStorageConfigured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_REGION
  );
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Requis : Neon utilise le path-style addressing
  });
}

const BUCKET_NAME = 'annales229';

// ─── Fonctions d'accès ────────────────────────────────────────────────────────

/**
 * Upload un fichier dans le bucket Neon Object Storage
 * @returns La clé S3 et l'URL publique du fichier
 */
export async function uploadToNeonStorage(params: {
  buffer: Buffer;
  key: string;        // ex: "epreuves/e_abc123/sujet.pdf"
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
      // public_read bucket → pas de ACL nécessaire
    })
  );

  const url = `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKET_NAME}/${params.key}`;
  return { key: params.key, url };
}

/**
 * Supprime un fichier du bucket Neon Object Storage
 */
export async function deleteFromNeonStorage(key: string): Promise<boolean> {
  try {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error(`Erreur suppression S3 (clé: ${key}):`, err);
    return false;
  }
}

/**
 * Télécharge un fichier depuis le bucket Neon Object Storage en tant que Buffer
 * Retourne null si le fichier n'existe pas ou en cas d'erreur
 */
export async function getNeonStorageBuffer(key: string): Promise<Buffer | null> {
  try {
    const s3 = getS3Client();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    if (!response.Body) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error(`Erreur téléchargement S3 (clé: ${key}):`, err);
    return null;
  }
}

/**
 * Construit une clé S3 normalisée pour une épreuve
 */
export function buildEpreuveS3Key(epreuveId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
  return `epreuves/${epreuveId}/sujet.${ext}`;
}

/**
 * Construit une clé S3 normalisée pour un corrigé
 */
export function buildCorrigeS3Key(epreuveId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
  return `epreuves/${epreuveId}/corrige.${ext}`;
}
