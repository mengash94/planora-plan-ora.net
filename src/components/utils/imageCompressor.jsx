/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size and improve performance
 */

/**
 * Compress an image file
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('הקובץ חייב להיות תמונה'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('שגיאה בדחיסת התמונה'));
                return;
              }

              // Create new file from blob
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
                {
                  type: mimeType,
                  lastModified: Date.now()
                }
              );

              console.log('[imageCompressor] Compression complete:', {
                originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
                compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB',
                reduction: ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%'
              });

              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('שגיאה בטעינת התמונה'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('שגיאה בקריאת הקובץ'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export const compressImages = async (files, options = {}) => {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
};