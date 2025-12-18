import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private readonly configService;
    private readonly logger;
    private readonly uploadsDir;
    constructor(configService: ConfigService);
    private ensureDirectoryExists;
    uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
    deleteFile(key: string): Promise<void>;
    getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
    getFilePath(key: string): string;
    fileExists(key: string): boolean;
    readFile(key: string): Buffer;
    generateStorageKey(companyId: string, fileName: string, timestamp?: number): string;
}
