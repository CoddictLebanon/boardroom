import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsDir: string;
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    // Use uploads directory in the app root, or a configured path
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR') || path.join(process.cwd(), 'uploads');

    // Secret for signing download URLs - use a dedicated secret or fall back to CLERK_SECRET_KEY
    const configuredSecret = this.configService.get<string>('DOWNLOAD_SIGNING_SECRET') ||
                             this.configService.get<string>('CLERK_SECRET_KEY');

    if (!configuredSecret) {
      this.logger.error(
        'CRITICAL: No signing secret configured! Set DOWNLOAD_SIGNING_SECRET in environment variables. ' +
        'Using insecure default - DO NOT USE IN PRODUCTION!'
      );
      this.signingSecret = 'insecure-default-do-not-use-in-production';
    } else {
      this.signingSecret = configuredSecret;
    }

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

  /**
   * Validates that a file path stays within the uploads directory
   * Prevents path traversal attacks (e.g., using ../ to escape)
   */
  private validatePathWithinUploads(key: string): string {
    // Resolve the full path
    const filePath = path.resolve(this.uploadsDir, key);
    const uploadsPath = path.resolve(this.uploadsDir);

    // Ensure the resolved path starts with the uploads directory
    if (!filePath.startsWith(uploadsPath + path.sep) && filePath !== uploadsPath) {
      this.logger.warn(`Path traversal attempt detected: ${key}`);
      throw new ForbiddenException('Invalid file path');
    }

    return filePath;
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      // Validate path to prevent traversal attacks
      const filePath = this.validatePathWithinUploads(key);
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
      // Validate path to prevent traversal attacks
      const filePath = this.validatePathWithinUploads(key);

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
    // For local filesystem, generate a signed URL with expiration
    const baseUrl = this.configService.get<string>('API_URL') || 'http://localhost:3001';
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = this.generateSignature(key, expires);

    return `${baseUrl}/api/v1/documents/download/${encodeURIComponent(key)}?expires=${expires}&signature=${signature}`;
  }

  generateSignature(key: string, expires: number): string {
    const data = `${key}:${expires}`;
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(data)
      .digest('hex');
  }

  verifySignature(key: string, expires: number, signature: string): boolean {
    // Check if URL has expired
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false;
    }

    // Verify signature
    const expectedSignature = this.generateSignature(key, expires);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  getFilePath(key: string): string {
    // Validate path to prevent traversal attacks
    return this.validatePathWithinUploads(key);
  }

  fileExists(key: string): boolean {
    // Validate path to prevent traversal attacks
    const filePath = this.validatePathWithinUploads(key);
    return fs.existsSync(filePath);
  }

  readFile(key: string): Buffer {
    // Validate path to prevent traversal attacks
    const filePath = this.validatePathWithinUploads(key);
    return fs.readFileSync(filePath);
  }

  generateStorageKey(companyId: string, fileName: string, timestamp: number = Date.now()): string {
    // Extract the extension from the original filename (only the last extension)
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';

    // Validate extension against allowed types (matches controller validation)
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
    const safeExtension = allowedExtensions.includes(extension) ? extension : 'bin';

    // Generate a random component to prevent filename guessing
    const randomPart = crypto.randomBytes(8).toString('hex');

    // Use only the sanitized base name (remove all dots to prevent double extensions)
    const baseName = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

    return `companies/${companyId}/documents/${timestamp}-${randomPart}-${sanitizedBaseName}.${safeExtension}`;
  }
}
