import imageCompression from 'browser-image-compression';

/**
 * Utility to compress images on the client side before uploading to Firebase.
 * Uses browser-image-compression to robustly handle HEIC, EXIF orientation, and memory limits.
 */
export const compressImage = async (file: File, maxWidth = 1280, quality = 0.7): Promise<File> => {
  // Ignore non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 1, // Will try to compress below 1MB
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Overwrite the file name so it matches standard structure (iOS HEIC fix)
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([compressedFile], fileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Compression library failed, falling back to original:', error);
    return file;
  }
};
