import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_NAME, CLOUDINARY_API, CLOUDINARY_API_SECRET } from './secret';

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 string or file path to Cloudinary
 * @param {string} fileStr - base64 string, URL, or local path
 * @param {string} [folder] - folder in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImage = async (fileStr, folder = 'school') => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: folder,
    });
    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
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
