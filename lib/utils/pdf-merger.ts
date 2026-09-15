import { PDFDocument } from 'pdf-lib';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 18;

/**
 * Convertit n'importe quelle image supportée par le navigateur en buffer JPEG via Canvas.
 * Permet de supporter PNG avec transparence (fond blanc), WebP, JPEG ré-encodé, etc.
 */
async function imageToJpegBuffer(file: File | Blob): Promise<ArrayBuffer> {
  if (typeof window === 'undefined') {
    return await file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 2400; // résolution maximale pour qualité de lecture optimale
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          file.arrayBuffer().then(resolve).catch(reject);
          return;
        }

        // Fond blanc obligatoire pour éviter les fonds noirs en PDF
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              file.arrayBuffer().then(resolve).catch(reject);
              return;
            }
            const buffer = await blob.arrayBuffer();
            resolve(buffer);
          },
          'image/jpeg',
          0.88 // excellente qualité pour les textes d'épreuves
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        file.arrayBuffer().then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      file.arrayBuffer().then(resolve).catch(reject);
    };

    img.src = url;
  });
}

/**
 * Fusionne plusieurs fichiers (PDF ou images) en un seul document PDF unifié.
 * 
 * @param files Tableau de fichiers ou blobs à fusionner (dans l'ordre désiré).
 * @param outputFileName Nom du fichier PDF final généré.
 * @returns Fichier File de type application/pdf prêt pour l'upload ou l'affichage.
 */
export async function mergeFilesToPdf(
  files: (File | Blob)[],
  outputFileName: string = 'epreuve_fusionnee.pdf'
): Promise<File> {
  if (!files || files.length === 0) {
    throw new Error('Aucun fichier fourni pour la fusion.');
  }

  // Si un seul fichier et que c'est déjà un PDF, pas besoin de refusionner
  if (files.length === 1 && files[0] instanceof File && (files[0].type === 'application/pdf' || files[0].name.toLowerCase().endsWith('.pdf'))) {
    return files[0];
  }

  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mimeType = (file.type || '').toLowerCase();
    const fileName = (file instanceof File ? file.name : '').toLowerCase();
    const isPdf = mimeType.includes('pdf') || fileName.endsWith('.pdf');

    if (isPdf) {
      try {
        const pdfBytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        console.warn(`Impossible de lire le PDF [${fileName}] lors de la fusion:`, err);
      }
    } else {
      // C'est une image (JPG, PNG, HEIC, WEBP, etc.)
      try {
        const jpegBuffer = await imageToJpegBuffer(file);
        let embeddedImage;

        try {
          embeddedImage = await mergedPdf.embedJpg(jpegBuffer);
        } catch {
          // Si embedJpg échoue, tenter en PNG
          const origBuffer = await file.arrayBuffer();
          embeddedImage = await mergedPdf.embedPng(origBuffer);
        }

        if (embeddedImage) {
          const imgWidth = embeddedImage.width;
          const imgHeight = embeddedImage.height;

          // Dimensionner la page : standard A4 avec marges
          const maxWidth = A4_WIDTH - MARGIN * 2;
          const maxHeight = A4_HEIGHT - MARGIN * 2;

          const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
          const drawWidth = imgWidth * scale;
          const drawHeight = imgHeight * scale;

          // Centrer l'image sur la page A4
          const x = (A4_WIDTH - drawWidth) / 2;
          const y = (A4_HEIGHT - drawHeight) / 2;

          const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
          page.drawImage(embeddedImage, {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
          });
        }
      } catch (err) {
        console.error(`Erreur d'intégration de l'image [${fileName}] dans le PDF:`, err);
      }
    }
  }

  if (mergedPdf.getPageCount() === 0) {
    throw new Error('La fusion n\'a pu générer aucune page valide.');
  }

  const mergedPdfBytes = await mergedPdf.save();
  const safeName = outputFileName.toLowerCase().endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`;

  return new File([mergedPdfBytes as any], safeName, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}
