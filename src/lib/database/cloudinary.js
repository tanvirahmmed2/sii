import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_NAME, CLOUDINARY_API, CLOUDINARY_API_SECRET } from './secret';

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file, File/Blob instance, base64 string, URL, or local path to Cloudinary
 * @param {string|File|Blob|Buffer} fileInput - Web File/Blob, base64 data URI, URL, or local path
 * @param {string} [folder] - folder in Cloudinary
 * @returns {Promise<{url: string, publicId: string, id: string, secure_url: string}>}
 */
export const uploadImage = async (fileInput, folder = 'school') => {
  try {
    let fileToUpload = fileInput;

    // If fileInput is a Web API File or Blob (from request.formData())
    if (fileInput && typeof fileInput === 'object' && typeof fileInput.arrayBuffer === 'function') {
      const bytes = await fileInput.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mime = fileInput.type || 'image/jpeg';
      fileToUpload = `data:${mime};base64,${buffer.toString('base64')}`;
    } else if (Buffer.isBuffer(fileInput)) {
      fileToUpload = `data:image/jpeg;base64,${fileInput.toString('base64')}`;
    }

    const uploadResponse = await cloudinary.uploader.upload(fileToUpload, {
      folder: folder,
    });
    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      id: uploadResponse.public_id,
      secure_url: uploadResponse.secure_url,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Deletes an image from Cloudinary using its public ID
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<any>}
 */
export const deleteImage = async (publicId) => {
  try {
    const deleteResponse = await cloudinary.uploader.destroy(publicId);
    return deleteResponse;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

export default cloudinary;

// Aliases used by marketing routes
export const uploadToCloudinary = uploadImage;
export const deleteFromCloudinary = deleteImage;
