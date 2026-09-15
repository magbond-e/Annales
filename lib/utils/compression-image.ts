/**
 * Compression d'image côté client avant upload.
 * Cible : réduire sous 1 Mo sans perte de lisibilité pour les examens/devoirs photographiés.
 */
export async function compressImageClient(file: File): Promise<File> {
  // Ne pas compresser les PDF
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  // Si l'image fait déjà moins de 800 Ko, pas besoin de compression agressive
  if (file.size <= 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Redimensionnement si dimensions gigantesques
        const maxDimension = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fond blanc pour éviter les transparences noires si conversion JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export en JPEG qualité 0.82 (excellent ratio texte / taille)
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Si la compression n'améliore pas, garder l'original
              resolve(file);
              return;
            }

            const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
            const compressedFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
}
