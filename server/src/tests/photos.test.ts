import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { type UploadPhotoInput } from '../schema';
import { 
  uploadPhoto, 
  getPhoto, 
  deletePhoto, 
  validatePhotoFormat, 
  generatePhotoThumbnail 
} from '../handlers/photos';

// Test constants
const UPLOAD_DIR = 'uploads/photos';

// Sample base64 encoded images (minimal valid headers)
const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGOEYu+RAAAAABJRU5ErkJggg==';

const validGifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const invalidBase64 = 'data:image/jpeg;base64,invalid-base64-data!@#$%^&*()';

const testInput: UploadPhotoInput = {
  file_data: validJpegBase64,
  file_name: 'test_photo'
};

describe('Photo Handlers', () => {
  // Clean up test files after each test
  afterEach(() => {
    if (existsSync(UPLOAD_DIR)) {
      rmSync(UPLOAD_DIR, { recursive: true, force: true });
    }
  });

  describe('validatePhotoFormat', () => {
    it('should validate JPEG format correctly', async () => {
      const result = await validatePhotoFormat(validJpegBase64);
      
      expect(result.valid).toBe(true);
      expect(result.format).toBe('jpeg');
      expect(result.error).toBeUndefined();
    });

    it('should validate PNG format correctly', async () => {
      const result = await validatePhotoFormat(validPngBase64);
      
      expect(result.valid).toBe(true);
      expect(result.format).toBe('png');
      expect(result.error).toBeUndefined();
    });

    it('should validate GIF format correctly', async () => {
      const result = await validatePhotoFormat(validGifBase64);
      
      expect(result.valid).toBe(true);
      expect(result.format).toBe('gif');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid base64 data', async () => {
      const result = await validatePhotoFormat(invalidBase64);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('base64');
    });

    it('should reject unsupported formats', async () => {
      const bmpData = 'data:image/bmp;base64,Qk0eAAAAAAAAAD4AAAAoAAAAAQAAAAEAAAABACAAAAAAAAAAAAATCwAAEwsAAAAAAAAAAAAAA==';
      const result = await validatePhotoFormat(bmpData);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should reject invalid data format', async () => {
      const result = await validatePhotoFormat('not-a-data-url');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid base64 image data format');
    });

    it('should reject files that are too large', async () => {
      // Create a large base64 string (simulating > 5MB)
      const largeData = 'A'.repeat(7 * 1024 * 1024); // 7MB of 'A' characters
      const largeBase64 = `data:image/jpeg;base64,${largeData}`;
      
      const result = await validatePhotoFormat(largeBase64);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum limit');
    });
  });

  describe('uploadPhoto', () => {
    it('should upload a valid photo', async () => {
      const result = await uploadPhoto(testInput);

      expect(result.url).toMatch(/^\/uploads\/photos\/\d+_test_photo\.jpeg$/);
      expect(result.fileName).toMatch(/^\d+_test_photo\.jpeg$/);
      
      // Verify file exists on disk
      const fileName = result.fileName;
      const filePath = join(UPLOAD_DIR, fileName);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should create upload directory if it does not exist', async () => {
      // Ensure directory doesn't exist initially
      if (existsSync(UPLOAD_DIR)) {
        rmSync(UPLOAD_DIR, { recursive: true, force: true });
      }

      const result = await uploadPhoto(testInput);

      expect(existsSync(UPLOAD_DIR)).toBe(true);
      expect(result.fileName).toBeDefined();
    });

    it('should reject invalid photo formats', async () => {
      const invalidInput: UploadPhotoInput = {
        file_data: invalidBase64,
        file_name: 'invalid_photo'
      };

      await expect(uploadPhoto(invalidInput)).rejects.toThrow(/base64|Invalid/);
    });

    it('should reject files that are too large', async () => {
      // Create a large base64 string
      const largeData = 'A'.repeat(7 * 1024 * 1024);
      const largeBase64 = `data:image/jpeg;base64,${largeData}`;
      const largeInput: UploadPhotoInput = {
        file_data: largeBase64,
        file_name: 'large_photo'
      };

      await expect(uploadPhoto(largeInput)).rejects.toThrow(/File size exceeds maximum limit/);
    });

    it('should generate unique filenames with timestamps', async () => {
      const result1 = await uploadPhoto(testInput);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result2 = await uploadPhoto(testInput);

      expect(result1.fileName).not.toEqual(result2.fileName);
      expect(result1.fileName).toMatch(/^\d+_test_photo\.jpeg$/);
      expect(result2.fileName).toMatch(/^\d+_test_photo\.jpeg$/);
    });
  });

  describe('getPhoto', () => {
    it('should retrieve an uploaded photo', async () => {
      // Upload a photo first
      const uploadResult = await uploadPhoto(testInput);
      
      // Retrieve the photo
      const buffer = await getPhoto(uploadResult.fileName);
      
      expect(buffer).not.toBeNull();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer!.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent photos', async () => {
      const buffer = await getPhoto('non_existent_photo.jpg');
      
      expect(buffer).toBeNull();
    });

    it('should reject invalid filenames with directory traversal', async () => {
      const buffer = await getPhoto('../../../etc/passwd');
      
      expect(buffer).toBeNull();
    });

    it('should reject filenames with path separators', async () => {
      const buffer1 = await getPhoto('folder/file.jpg');
      const buffer2 = await getPhoto('folder\\file.jpg');
      
      expect(buffer1).toBeNull();
      expect(buffer2).toBeNull();
    });
  });

  describe('deletePhoto', () => {
    it('should delete an existing photo', async () => {
      // Upload a photo first
      const uploadResult = await uploadPhoto(testInput);
      const filePath = join(UPLOAD_DIR, uploadResult.fileName);
      
      // Verify file exists
      expect(existsSync(filePath)).toBe(true);
      
      // Delete the photo
      await deletePhoto(uploadResult.fileName);
      
      // Verify file is deleted
      expect(existsSync(filePath)).toBe(false);
    });

    it('should not throw error when deleting non-existent photo', async () => {
      // This should complete without throwing an error
      await expect(async () => {
        await deletePhoto('non_existent_photo.jpg');
      }).not.toThrow();
    });

    it('should reject invalid filenames with directory traversal', async () => {
      await expect(deletePhoto('../../../important_file.txt')).rejects.toThrow(/Invalid filename/);
    });

    it('should reject filenames with path separators', async () => {
      await expect(deletePhoto('folder/file.jpg')).rejects.toThrow(/Invalid filename/);
      await expect(deletePhoto('folder\\file.jpg')).rejects.toThrow(/Invalid filename/);
    });
  });

  describe('generatePhotoThumbnail', () => {
    it('should generate thumbnail for valid image', async () => {
      const thumbnail = await generatePhotoThumbnail(validJpegBase64);
      
      expect(thumbnail).toMatch(/^data:image\/jpeg;base64,/);
      expect(thumbnail.length).toBeGreaterThan(0);
    });

    it('should return smaller data for large images', async () => {
      // Create a large valid base64 string by repeating valid base64 data
      const baseData = validJpegBase64.replace('data:image/jpeg;base64,', '');
      const repeatedData = baseData.repeat(1000); // Repeat 1000 times to ensure it's over 200KB threshold
      const largeImageData = `data:image/jpeg;base64,${repeatedData}`;
      
      // Verify the large image is actually large enough
      const largeBuffer = Buffer.from(repeatedData, 'base64');
      expect(largeBuffer.length).toBeGreaterThan(200 * 1024); // Should be > 200KB
      
      const thumbnail = await generatePhotoThumbnail(largeImageData);
      
      expect(thumbnail.length).toBeLessThan(largeImageData.length);
      expect(thumbnail).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should return original for small images', async () => {
      const thumbnail = await generatePhotoThumbnail(validPngBase64);
      
      // For very small images, should return as-is
      expect(thumbnail).toBe(validPngBase64);
    });

    it('should reject invalid image data', async () => {
      await expect(generatePhotoThumbnail(invalidBase64)).rejects.toThrow(/base64|Invalid/);
    });

    it('should handle different image formats', async () => {
      const pngThumbnail = await generatePhotoThumbnail(validPngBase64);
      const gifThumbnail = await generatePhotoThumbnail(validGifBase64);
      
      expect(pngThumbnail).toMatch(/^data:image\/png;base64,/);
      expect(gifThumbnail).toMatch(/^data:image\/gif;base64,/);
    });

    it('should maintain proper MIME type in thumbnail', async () => {
      const jpegThumbnail = await generatePhotoThumbnail(validJpegBase64);
      
      expect(jpegThumbnail).toMatch(/^data:image\/jpeg;base64,/);
      expect(jpegThumbnail).not.toMatch(/^data:image\/jpg;base64,/);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete photo workflow', async () => {
      // 1. Upload photo
      const uploadResult = await uploadPhoto(testInput);
      expect(uploadResult.fileName).toBeDefined();
      
      // 2. Retrieve photo
      const buffer = await getPhoto(uploadResult.fileName);
      expect(buffer).not.toBeNull();
      
      // 3. Generate thumbnail
      const thumbnail = await generatePhotoThumbnail(testInput.file_data);
      expect(thumbnail).toMatch(/^data:image\/jpeg;base64,/);
      
      // 4. Delete photo
      await deletePhoto(uploadResult.fileName);
      
      // 5. Verify deletion
      const deletedBuffer = await getPhoto(uploadResult.fileName);
      expect(deletedBuffer).toBeNull();
    });

    it('should validate photo before upload and thumbnail generation', async () => {
      const invalidInput: UploadPhotoInput = {
        file_data: 'data:image/invalid;base64,invalid-data',
        file_name: 'invalid'
      };

      // Both upload and thumbnail should fail for invalid data
      await expect(uploadPhoto(invalidInput)).rejects.toThrow();
      await expect(generatePhotoThumbnail(invalidInput.file_data)).rejects.toThrow();
    });
  });
});