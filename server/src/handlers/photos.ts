import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { type UploadPhotoInput } from '../schema';

// Define constants for photo handling
const UPLOAD_DIR = 'uploads/photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'gif'];
const THUMBNAIL_MAX_SIZE = 200 * 1024; // 200KB for thumbnails

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadPhoto(input: UploadPhotoInput): Promise<{ url: string; fileName: string }> {
  try {
    // Validate photo format first
    const validation = await validatePhotoFormat(input.file_data);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid photo format');
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Decode base64 data
    const base64Data = input.file_data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = validation.format || 'jpg';
    const fileName = `${timestamp}_${input.file_name}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Write file to disk
    await writeFile(filePath, buffer);

    return {
      url: `/uploads/photos/${fileName}`,
      fileName: fileName
    };
  } catch (error) {
    console.error('Photo upload failed:', error);
    throw error;
  }
}

export async function getPhoto(fileName: string): Promise<Buffer | null> {
  try {
    // Validate filename to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Invalid filename');
    }

    const filePath = join(UPLOAD_DIR, fileName);

    // Check if file exists before reading
    if (!existsSync(filePath)) {
      return null;
    }

    // Read and return file buffer
    const buffer = await readFile(filePath);
    return buffer;
  } catch (error) {
    console.error('Photo retrieval failed:', error);
    return null;
  }
}

export async function deletePhoto(fileName: string): Promise<void> {
  // Validate filename to prevent directory traversal - throw immediately if invalid
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid filename');
  }

  try {
    const filePath = join(UPLOAD_DIR, fileName);

    // Check if file exists before deleting
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    // If file doesn't exist, that's fine - no error should be thrown
  } catch (error) {
    console.error('Photo deletion failed:', error);
    // Don't rethrow file system errors for non-existent files
    // Only validation errors (thrown above) should be rethrown
  }
}

export async function validatePhotoFormat(fileData: string): Promise<{ valid: boolean; format?: string; error?: string }> {
  try {
    // Extract MIME type from base64 data header
    const mimeMatch = fileData.match(/^data:image\/(\w+);base64,/);
    if (!mimeMatch) {
      return {
        valid: false,
        error: 'Invalid base64 image data format'
      };
    }

    const format = mimeMatch[1].toLowerCase();

    // Check if format is allowed
    if (!ALLOWED_FORMATS.includes(format)) {
      return {
        valid: false,
        error: `Unsupported image format: ${format}. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`
      };
    }

    // Extract base64 data without header
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    
    // Validate base64 format - allow empty strings and be more lenient
    if (base64Data && !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      return {
        valid: false,
        error: 'Invalid base64 encoding'
      };
    }

    // Check decoded size
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Basic image header validation
    const isValidImage = validateImageHeader(buffer, format);
    if (!isValidImage) {
      return {
        valid: false,
        error: 'File does not appear to be a valid image'
      };
    }

    return {
      valid: true,
      format: format
    };
  } catch (error) {
    console.error('Photo validation failed:', error);
    return {
      valid: false,
      error: 'Validation error occurred'
    };
  }
}

export async function generatePhotoThumbnail(fileData: string): Promise<string> {
  try {
    // Validate the input first
    const validation = await validatePhotoFormat(fileData);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid photo format');
    }

    // Extract base64 data
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // For thumbnail generation, we'll simulate a simple resize by
    // reducing quality/size. In a real implementation, you'd use
    // an image processing library like Sharp or Jimp
    const originalSize = buffer.length;
    
    if (originalSize <= THUMBNAIL_MAX_SIZE) {
      // If already small enough, return as-is
      return fileData;
    }

    // Simulate thumbnail generation by calculating a compression ratio
    // In real implementation, this would be actual image resizing
    const compressionRatio = THUMBNAIL_MAX_SIZE / originalSize;
    const thumbnailSize = Math.floor(originalSize * compressionRatio);
    
    // Create a simulated thumbnail (truncated version for demonstration)
    // Ensure we don't break base64 padding by making size divisible by 3
    const adjustedSize = Math.max(Math.floor(thumbnailSize / 3) * 3, 1024);
    const thumbnailBuffer = buffer.slice(0, adjustedSize);
    const thumbnailBase64 = thumbnailBuffer.toString('base64');
    
    // Reconstruct the data URL with proper MIME type
    const mimeType = validation.format === 'jpg' ? 'jpeg' : validation.format;
    return `data:image/${mimeType};base64,${thumbnailBase64}`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
}

// Helper function to validate image file headers
function validateImageHeader(buffer: Buffer, format: string): boolean {
  if (buffer.length < 8) return false;

  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      // JPEG files start with FF D8 FF
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    
    case 'png':
      // PNG files start with 89 50 4E 47 0D 0A 1A 0A
      return buffer[0] === 0x89 && buffer[1] === 0x50 && 
             buffer[2] === 0x4E && buffer[3] === 0x47 &&
             buffer[4] === 0x0D && buffer[5] === 0x0A &&
             buffer[6] === 0x1A && buffer[7] === 0x0A;
    
    case 'gif':
      // GIF files start with GIF87a or GIF89a
      const header = buffer.slice(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    
    default:
      return false;
  }
}