export const validateImageDimensions = (file: File | null | undefined, reqWidth: number, reqHeight: number, label = 'Image'): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, JPEG).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== reqWidth || img.height !== reqHeight) {
          reject(
            new Error(
              `Invalid ${label} Dimensions! Must be exactly ${reqWidth}x${reqHeight} pixels. (Selected image is ${img.width}x${img.height} px).`
            )
          );
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};
