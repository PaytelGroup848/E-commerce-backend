const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');

const UPLOAD_BASE = './uploads';

class UploadService {
  // Save base64 image
  async saveBase64Image(base64String, folder = 'products') {
    try {
      // Check if base64 string is valid
      if (!base64String || !base64String.startsWith('data:image')) {
        throw new ApiError(400, 'Invalid image format');
      }

      // Extract mime type and data
      const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new ApiError(400, 'Invalid image data');
      }

      const extension = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
      const folderPath = path.join(UPLOAD_BASE, folder);
      
      // Ensure folder exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Save file
      const filePath = path.join(folderPath, filename);
      fs.writeFileSync(filePath, buffer);

      // ✅ FIX: Return full URL with base URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const url = `${baseUrl}/uploads/${folder}/${filename}`;
      
      return {
        url: url, // ✅ Full URL now
        publicId: filename,
        filename: filename,
        path: filePath,
      };
    } catch (error) {
      console.error('Error saving image:', error);
      throw new ApiError(500, 'Failed to save image');
    }
  }

  // Delete image
  async deleteImage(filename, folder = 'products') {
    try {
      const filePath = path.join(UPLOAD_BASE, folder, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Get image full URL
  getFullUrl(relativePath) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${relativePath}`;
  }
}

module.exports = new UploadService();