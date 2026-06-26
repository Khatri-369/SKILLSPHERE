import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

// Configure Cloudinary SDK if credentials are present and not placeholders
const isCloudinaryConfigured =
  config.cloudinary.cloudName &&
  config.cloudinary.cloudName !== 'your_cloudinary_cloud_name' &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiKey !== 'your_cloudinary_api_key' &&
  config.cloudinary.apiSecret &&
  config.cloudinary.apiSecret !== 'your_cloudinary_api_secret';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

/**
 * Uploads a local file to Cloudinary and deletes it locally.
 * Includes a mock fallback if Cloudinary is not configured.
 * @param {string} localFilePath - Path to the file on local disk
 * @returns {Promise<object>} Cloudinary upload response or mock object
 */
export const uploadToCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    // 1. Fallback to Mock Upload in development if credentials are empty
    if (!isCloudinaryConfigured) {
      const fileName = path.basename(localFilePath);
      console.log(`☁️  [MOCK CLOUDINARY UPLOAD] Uploading: ${fileName}`);
      
      // Clean up the local temporary file from disk
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`🧹 [MOCK CLOUDINARY UPLOAD] Deleted temporary local file: ${localFilePath}`);
      }

      // Return a simulated Cloudinary response
      return {
        secure_url: `https://res.cloudinary.com/demo/image/upload/v123456/${fileName}`,
        public_id: `mock_public_id_${Date.now()}`,
      };
    }

    // 2. Perform Real Cloudinary Upload
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto', // Detects image/document automatically
      ...options,
    });

    // 3. Clean up the local temporary file from disk
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log(`🧹 Deleted temporary local file: ${localFilePath}`);
    }

    return response;
  } catch (error) {
    // Make sure to clean up the file even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log(`🧹 Cleaned up local file after failed upload: ${localFilePath}`);
    }
    console.error('Cloudinary upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};
