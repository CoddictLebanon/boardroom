import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../documents/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
        phone: true,
        position: true,
        signatureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { phone?: string | null; position?: string | null; signatureUrl?: string | null }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.signatureUrl !== undefined && { signatureUrl: data.signatureUrl }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
        phone: true,
        position: true,
        signatureUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSignature(userId: string, signatureUrl: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { signatureUrl },
    });
  }

  /**
   * Get a fresh signature URL for a user.
   * The stored signatureUrl contains a pre-signed URL that expires.
   * This method extracts the storage key and generates a fresh pre-signed URL.
   */
  async getFreshSignatureUrl(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureUrl: true },
    });

    if (!user || !user.signatureUrl) {
      return null;
    }

    // Extract the storage key from the URL
    // URL format: http://localhost:3001/api/v1/documents/download/path/to/file?expires=...&signature=...
    const storageKey = this.extractStorageKeyFromUrl(user.signatureUrl);
    if (!storageKey) {
      return user.signatureUrl; // Fallback to original URL
    }

    // Generate a fresh pre-signed URL
    return this.storageService.getPresignedUrl(storageKey);
  }

  /**
   * Get fresh signature URLs for multiple users
   */
  async getFreshSignatureUrls(userIds: string[]): Promise<Record<string, string | null>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, signatureUrl: true },
    });

    const result: Record<string, string | null> = {};
    for (const user of users) {
      if (!user.signatureUrl) {
        result[user.id] = null;
        continue;
      }

      const storageKey = this.extractStorageKeyFromUrl(user.signatureUrl);
      if (storageKey) {
        result[user.id] = await this.storageService.getPresignedUrl(storageKey);
      } else {
        result[user.id] = user.signatureUrl;
      }
    }

    return result;
  }

  private extractStorageKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Path is like /api/v1/documents/download/companyId/documents/filename
      const pathParts = urlObj.pathname.split('/api/v1/documents/download/');
      if (pathParts.length > 1) {
        return decodeURIComponent(pathParts[1]);
      }
    } catch {
      // If it's not a valid URL, it might already be a storage key
      return url;
    }
    return null;
  }
}
