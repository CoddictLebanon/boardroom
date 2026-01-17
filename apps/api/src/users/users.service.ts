import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSignature(userId: string, signatureUrl: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { signatureUrl },
    });
  }
}
