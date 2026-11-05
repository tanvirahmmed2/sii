import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_NAME, CLOUDINARY_API, CLOUDINARY_API_SECRET } from './secret.js';

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file, File/Blob instance, base64 string, URL, or local path to Cloudinary
 * Supports images, PDFs, raw documents, and media assets.
 * @param {string|File|Blob|Buffer} fileInput - Web File/Blob, base64 data URI, URL, or local path
 * @param {string} [folder] - folder in Cloudinary
 * @param {object} [options] - additional Cloudinary upload options (e.g. { resource_type: 'auto' })
 * @returns {Promise<{url: string, publicId: string, id: string, secure_url: string, bytes: number, format: string, original_filename: string}>}
 */
export const uploadImage = async (fileInput, folder = 'school', options = {}) => {
  try {
    let fileToUpload = fileInput;
    let detectedMime = 'image/jpeg';
    let originalName = '';

    // If fileInput is a Web API File or Blob (from request.formData())
    if (fileInput && typeof fileInput === 'object' && typeof fileInput.arrayBuffer === 'function') {
      const bytes = await fileInput.arrayBuffer();
      const buffer = Buffer.from(bytes);
      originalName = fileInput.name || '';
      detectedMime =
        fileInput.type ||
        (originalName.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'application/octet-stream');
      fileToUpload = `data:${detectedMime};base64,${buffer.toString('base64')}`;
    } else if (Buffer.isBuffer(fileInput)) {
      fileToUpload = `data:application/octet-stream;base64,${fileInput.toString('base64')}`;
    }

    const isPdf =
      detectedMime === 'application/pdf' ||
      originalName.toLowerCase().endsWith('.pdf') ||
      (typeof fileToUpload === 'string' && fileToUpload.startsWith('data:application/pdf'));

    const uploadOptions = {
      folder: folder,
      resource_type: options.resource_type || (isPdf ? 'auto' : 'auto'),
      ...options,
    };

    const uploadResponse = await cloudinary.uploader.upload(fileToUpload, uploadOptions);
    return {
      url: uploadResponse.secure_url || uploadResponse.url,
      publicId: uploadResponse.public_id,
      id: uploadResponse.public_id,
      secure_url: uploadResponse.secure_url || uploadResponse.url,
      format: uploadResponse.format || (isPdf ? 'pdf' : ''),
      bytes: uploadResponse.bytes || 0,
      resource_type: uploadResponse.resource_type,
      original_filename: uploadResponse.original_filename || originalName,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Deletes an asset (image, raw file, pdf) from Cloudinary using its public ID
 * @param {string} publicId - Cloudinary public ID
 * @param {object} [options] - { resource_type: 'image' | 'raw' | 'video' }
 * @returns {Promise<any>}
 */
export const deleteImage = async (publicId, options = {}) => {
  if (!publicId) return null;
  try {
    const resourceType = options.resource_type || 'image';
    let deleteResponse = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      ...options,
    });
    // If not found as image, attempt raw deletion (common for PDFs / raw documents)
    if (deleteResponse?.result === 'not found' && resourceType !== 'raw') {
      deleteResponse = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
        ...options,
      });
    }
    return deleteResponse;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

export const uploadFile = uploadImage;
export const deleteFile = deleteImage;
export const uploadPdf = (fileInput, folder = 'school/notices', options = {}) =>
  uploadImage(fileInput, folder, { resource_type: 'auto', ...options });
export const deletePdf = (publicId) =>
  deleteImage(publicId, { resource_type: 'raw' });

export default cloudinary;

// Aliases used by marketing routes
export const uploadToCloudinary = uploadImage;
export const deleteFromCloudinary = deleteImage;
