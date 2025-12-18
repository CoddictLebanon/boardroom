"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let StorageService = StorageService_1 = class StorageService {
    configService;
    logger = new common_1.Logger(StorageService_1.name);
    uploadsDir;
    constructor(configService) {
        this.configService = configService;
        this.uploadsDir = this.configService.get('UPLOADS_DIR') || path.join(process.cwd(), 'uploads');
        this.ensureDirectoryExists(this.uploadsDir);
        this.logger.log(`Storage service initialized with local filesystem at: ${this.uploadsDir}`);
    }
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            this.logger.log(`Created directory: ${dirPath}`);
        }
    }
    async uploadFile(key, buffer, mimeType) {
        try {
            const filePath = path.join(this.uploadsDir, key);
            const fileDir = path.dirname(filePath);
            this.ensureDirectoryExists(fileDir);
            fs.writeFileSync(filePath, buffer);
            this.logger.log(`File uploaded successfully: ${key}`);
            return key;
        }
        catch (error) {
            this.logger.error(`Failed to upload file: ${key}`, error);
            throw error;
        }
    }
    async deleteFile(key) {
        try {
            const filePath = path.join(this.uploadsDir, key);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`File deleted successfully: ${key}`);
            }
            else {
                this.logger.warn(`File not found for deletion: ${key}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${key}`, error);
            throw error;
        }
    }
    async getPresignedUrl(key, expiresIn = 3600) {
        const baseUrl = this.configService.get('API_URL') || 'http://localhost:3001';
        return `${baseUrl}/api/v1/documents/download/${encodeURIComponent(key)}`;
    }
    getFilePath(key) {
        return path.join(this.uploadsDir, key);
    }
    fileExists(key) {
        const filePath = path.join(this.uploadsDir, key);
        return fs.existsSync(filePath);
    }
    readFile(key) {
        const filePath = path.join(this.uploadsDir, key);
        return fs.readFileSync(filePath);
    }
    generateStorageKey(companyId, fileName, timestamp = Date.now()) {
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `companies/${companyId}/documents/${timestamp}-${sanitizedFileName}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map