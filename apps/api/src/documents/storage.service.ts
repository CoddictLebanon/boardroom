import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir: string;

  constructor(private readonly configService: ConfigService) {
    // Use uploads directory in the app root, or a configured path
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR') || path.join(process.cwd(), 'uploads');

    // Ensure the uploads directory exists
    this.ensureDirectoryExists(this.uploadsDir);

    this.logger.log(`Storage service initialized with local filesystem at: ${this.uploadsDir}`);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const filePath = path.join(this.uploadsDir, key);
      const fileDir = path.dirname(filePath);

      // Ensure the directory structure exists
      this.ensureDirectoryExists(fileDir);

      // Write the file
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadsDir, key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted successfully: ${key}`);
      } else {
        this.logger.warn(`File not found for deletion: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // For local filesystem, return a direct download URL endpoint
    // The actual file serving will be handled by a separate endpoint
    const baseUrl = this.configService.get<string>('API_URL') || 'http://localhost:3001';
    return `${baseUrl}/api/v1/documents/download/${encodeURIComponent(key)}`;
  }

  getFilePath(key: string): string {
    return path.join(this.uploadsDir, key);
  }

  fileExists(key: string): boolean {
    const filePath = path.join(this.uploadsDir, key);
    return fs.existsSync(filePath);
  }

  readFile(key: string): Buffer {
    const filePath = path.join(this.uploadsDir, key);
    return fs.readFileSync(filePath);
  }

  generateStorageKey(companyId: string, fileName: string, timestamp: number = Date.now()): string {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `companies/${companyId}/documents/${timestamp}-${sanitizedFileName}`;
  }
}
