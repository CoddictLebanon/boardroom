import {
  Controller,
  Put,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSignatureDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@Controller('users')
@UseGuards(ClerkAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me/signature')
  @HttpCode(HttpStatus.OK)
  async updateSignature(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSignatureDto,
  ) {
    return this.usersService.updateSignature(userId, dto.signatureUrl ?? null);
  }
}
