import { Module } from '@nestjs/common';
import { OrgRolesController } from './org-roles.controller';
import { OrgRolesService } from './org-roles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [OrgRolesController],
  providers: [OrgRolesService],
  exports: [OrgRolesService],
})
export class OrgRolesModule {}
