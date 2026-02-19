import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSignatureDto, UpdateProfileDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@Controller('users')
@UseGuards(ClerkAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('me/signature')
  @HttpCode(HttpStatus.OK)
  async updateSignature(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSignatureDto,
  ) {
    return this.usersService.updateSignature(userId, dto.signatureUrl ?? null);
  }

  /**
   * Get fresh (non-expired) signature URLs for multiple users.
   * Used when generating PDFs that need to embed signature images.
   */
  @Post('signature-urls')
  @HttpCode(HttpStatus.OK)
  async getSignatureUrls(@Body('userIds') userIds: string[]) {
    return this.usersService.getFreshSignatureUrls(userIds);
  }
}
