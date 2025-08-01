import { deleteFileFromSpaces, getSignedUrl, listFilesInFolder, s3, BUCKET_NAME } from "@/config/digitalOceanSpaces";
import { HeadObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

export class FileService {
  /**
   * Delete a file from DigitalOcean Spaces
   * @param fileUrl - The full URL of the file to delete
   * @returns Promise<boolean> - Success status
   */
  static async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract the key from the full URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remove leading slash
      
      return await deleteFileFromSpaces(key);
    } catch (error) {
      console.error('Error in FileService.deleteFile:', error);
      return false;
    }
  }

  /**
   * Delete a file by its key directly
   * @param fileKey - The key/path of the file in the bucket
   * @returns Promise<boolean> - Success status
   */
  static async deleteFileByKey(fileKey: string): Promise<boolean> {
    return await deleteFileFromSpaces(fileKey);
  }

  /**
   * Get a signed URL for private file access
   * @param fileKey - The key/path of the file in the bucket
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Promise<string> - Signed URL
   */
  static async getPrivateFileUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    return await getSignedUrl(fileKey, expiresIn);
  }

  /**
   * List files in a specific folder
   * @param folderPath - The folder path to list files from
   * @returns Promise<any[]> - Array of file objects
   */
  static async listFiles(folderPath: string = ''): Promise<any[]> {
    return await listFilesInFolder(folderPath);
  }

  /**
   * Get file metadata
   * @param fileKey - The key/path of the file in the bucket
   * @returns Promise<any | null> - File metadata or null if not found
   */
  static async getFileMetadata(fileKey: string): Promise<any | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      });
      
      const result = await s3.send(command);
      return result;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Copy a file within the same bucket
   * @param sourceKey - Source file key
   * @param destinationKey - Destination file key
   * @returns Promise<boolean> - Success status
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
        ACL: 'public-read',
      });
      
      await s3.send(command);
      console.log(`File copied from ${sourceKey} to ${destinationKey}`);
      return true;
    } catch (error) {
      console.error('Error copying file:', error);
      return false;
    }
  }

  /**
   * Move a file (copy then delete original)
   * @param sourceKey - Source file key
   * @param destinationKey - Destination file key
   * @returns Promise<boolean> - Success status
   */
  static async moveFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      // First copy the file
      const copySuccess = await this.copyFile(sourceKey, destinationKey);
      
      if (copySuccess) {
        // Then delete the original
        const deleteSuccess = await this.deleteFileByKey(sourceKey);
        return deleteSuccess;
      }
      
      return false;
    } catch (error) {
      console.error('Error moving file:', error);
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param fileKey - The key/path of the file in the bucket
   * @returns Promise<boolean> - Whether the file exists
   */
  static async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      });
      
      await s3.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size
   * @param fileKey - The key/path of the file in the bucket
   * @returns Promise<number | null> - File size in bytes or null if not found
   */
  static async getFileSize(fileKey: string): Promise<number | null> {
    try {
      const metadata = await this.getFileMetadata(fileKey);
      return metadata?.ContentLength || null;
    } catch (error) {
      console.error('Error getting file size:', error);
      return null;
    }
  }

  /**
   * Generate a unique filename with timestamp and random string
   * @param originalName - Original filename
   * @param prefix - Optional prefix for the filename
   * @returns string - Unique filename
   */
  static generateUniqueFilename(originalName: string, prefix: string = ''): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    
    const prefixPart = prefix ? `${prefix}-` : '';
    return `${prefixPart}${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Get the folder path based on file type
   * @param mimetype - File mimetype
   * @returns string - Folder path
   */
  static getFolderByMimeType(mimetype: string): string {
    if (mimetype.startsWith('image/')) {
      return 'images';
    } else if (mimetype.startsWith('video/')) {
      return 'videos';
    } else if (mimetype.includes('pdf') || 
               mimetype.includes('document') || 
               mimetype.includes('spreadsheet') || 
               mimetype.includes('presentation')) {
      return 'documents';
    } else {
      return 'uploads';
    }
  }
}
