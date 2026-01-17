import {
  Controller,
  Put,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
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
  async updateSignature(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSignatureDto,
  ) {
    return this.usersService.updateSignature(userId, dto.signatureUrl ?? null);
  }
}
