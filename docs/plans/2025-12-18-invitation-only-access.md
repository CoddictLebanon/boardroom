# Invitation-Only Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert from public sign-up to invitation-only access where Owners/Admins invite users by email, and invitees auto-join the inviting company.

**Architecture:**
- Remove public landing page, redirect `/` to Clerk sign-in
- Add `Invitation` model to track pending invitations with tokens
- Backend API to create/accept invitations with email sending
- Clerk webhook processes invitation acceptance when user signs up
- Frontend Members page gets real invite functionality

**Tech Stack:** NestJS, Prisma, Clerk, Resend (email), Next.js

---

## Task 1: Add Invitation Model to Database

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add Invitation model to schema**

Add after the `CompanyMember` model (around line 75):

```prisma
// Pending invitations
model Invitation {
  id        String           @id @default(cuid())
  email     String
  companyId String
  role      MemberRole       @default(BOARD_MEMBER)
  title     String?
  token     String           @unique @default(cuid())
  status    InvitationStatus @default(PENDING)
  invitedBy String
  expiresAt DateTime
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  inviter User    @relation(fields: [invitedBy], references: [id])

  @@unique([email, companyId])
  @@index([email])
  @@index([token])
  @@index([status])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

**Step 2: Add relation to Company model**

In the `Company` model, add:
```prisma
  invitations Invitation[]
```

**Step 3: Add relation to User model**

In the `User` model, add:
```prisma
  sentInvitations Invitation[]
```

**Step 4: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_invitations
```

Expected: Migration succeeds, `Invitation` table created.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add Invitation model for invitation-only access"
```

---

## Task 2: Create Invitations Module (Backend)

**Files:**
- Create: `apps/api/src/invitations/invitations.module.ts`
- Create: `apps/api/src/invitations/invitations.service.ts`
- Create: `apps/api/src/invitations/invitations.controller.ts`
- Create: `apps/api/src/invitations/dto/create-invitation.dto.ts`
- Create: `apps/api/src/invitations/dto/index.ts`

**Step 1: Create DTO**

Create `apps/api/src/invitations/dto/create-invitation.dto.ts`:

```typescript
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email address to invite' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: MemberRole, description: 'Role for the invited user' })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @ApiPropertyOptional({ description: 'Title for the invited user' })
  @IsString()
  @IsOptional()
  title?: string;
}
```

**Step 2: Create DTO index**

Create `apps/api/src/invitations/dto/index.ts`:

```typescript
export * from './create-invitation.dto';
```

**Step 3: Create Service**

Create `apps/api/src/invitations/invitations.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MemberRole, MemberStatus, InvitationStatus } from '@prisma/client';
import { CreateInvitationDto } from './dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createInvitation(
    companyId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ) {
    // Verify inviter has permission (Owner or Admin)
    const inviterMembership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId: inviterId, companyId },
      },
    });

    if (!inviterMembership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    if (
      inviterMembership.role !== MemberRole.OWNER &&
      inviterMembership.role !== MemberRole.ADMIN
    ) {
      throw new ForbiddenException('Only Owners and Admins can invite members');
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.companyMember.findUnique({
        where: {
          userId_companyId: { userId: existingUser.id, companyId },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this company');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.invitation.findUnique({
      where: {
        email_companyId: { email: dto.email, companyId },
      },
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Create or update invitation (7-day expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.upsert({
      where: {
        email_companyId: { email: dto.email, companyId },
      },
      update: {
        role: dto.role || MemberRole.BOARD_MEMBER,
        title: dto.title,
        status: InvitationStatus.PENDING,
        invitedBy: inviterId,
        expiresAt,
      },
      create: {
        email: dto.email,
        companyId,
        role: dto.role || MemberRole.BOARD_MEMBER,
        title: dto.title,
        invitedBy: inviterId,
        expiresAt,
      },
      include: {
        company: { select: { id: true, name: true } },
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // TODO: Send invitation email (Task 3)
    this.logger.log(`Invitation created for ${dto.email} to company ${companyId}`);

    return invitation;
  }

  async listInvitations(companyId: string, userId: string) {
    // Verify user has access
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    return this.prisma.invitation.findMany({
      where: { companyId },
      include: {
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify user has permission
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId, companyId: invitation.companyId },
      },
    });

    if (
      !membership ||
      (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException('Only Owners and Admins can revoke invitations');
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  async acceptInvitationByEmail(email: string, userId: string) {
    // Find all pending invitations for this email
    const invitations = await this.prisma.invitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (invitations.length === 0) {
      this.logger.log(`No pending invitations found for ${email}`);
      return [];
    }

    const results = [];

    for (const invitation of invitations) {
      // Create company membership
      const member = await this.prisma.companyMember.create({
        data: {
          userId,
          companyId: invitation.companyId,
          role: invitation.role,
          title: invitation.title,
          status: MemberStatus.ACTIVE,
        },
      });

      // Mark invitation as accepted
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      this.logger.log(
        `User ${userId} accepted invitation to company ${invitation.companyId}`,
      );

      results.push(member);
    }

    return results;
  }
}
```

**Step 4: Create Controller**

Create `apps/api/src/invitations/invitations.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('companies/:companyId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invitation' })
  createInvitation(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(companyId, userId, dto);
  }

  @Get('companies/:companyId/invitations')
  @ApiOperation({ summary: 'List invitations for a company' })
  listInvitations(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.listInvitations(companyId, userId);
  }

  @Delete('invitations/:id')
  @ApiOperation({ summary: 'Revoke an invitation' })
  revokeInvitation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.revokeInvitation(id, userId);
  }
}
```

**Step 5: Create Module**

Create `apps/api/src/invitations/invitations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
```

**Step 6: Register module in AppModule**

Modify `apps/api/src/app.module.ts`:

Add import:
```typescript
import { InvitationsModule } from './invitations/invitations.module';
```

Add to imports array:
```typescript
InvitationsModule,
```

**Step 7: Build and verify**

```bash
cd apps/api
npm run build
```

Expected: Build succeeds with no errors.

**Step 8: Commit**

```bash
git add apps/api/src/invitations/ apps/api/src/app.module.ts
git commit -m "feat: add invitations API module"
```

---

## Task 3: Update Clerk Webhook to Accept Invitations

**Files:**
- Modify: `apps/api/src/auth/webhooks/clerk-webhook.controller.ts`

**Step 1: Import InvitationsService**

Add to imports:
```typescript
import { InvitationsService } from '../../invitations/invitations.service';
```

**Step 2: Inject InvitationsService in constructor**

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly configService: ConfigService,
  private readonly invitationsService: InvitationsService,
) {
```

**Step 3: Call acceptInvitationByEmail after user creation**

In the `user.created` event handler, after creating/upserting the user, add:

```typescript
// After user is created/upserted, check for pending invitations
await this.invitationsService.acceptInvitationByEmail(
  userData.email_addresses[0].email_address,
  userData.id,
);
```

**Step 4: Update module imports**

Modify `apps/api/src/auth/auth.module.ts` to import InvitationsModule:

```typescript
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [InvitationsModule],
  // ...
})
```

**Step 5: Build and verify**

```bash
cd apps/api
npm run build
```

Expected: Build succeeds.

**Step 6: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat: auto-accept invitations on user signup via webhook"
```

---

## Task 4: Remove Landing Page and Redirect to Sign-In

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/middleware.ts`

**Step 1: Replace landing page with redirect**

Replace entire content of `apps/web/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/sign-in");
  }
}
```

**Step 2: Update middleware to remove public routes**

Replace content of `apps/web/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Step 3: Verify in browser**

1. Start the app: `npm run dev`
2. Visit `http://localhost:3000`
3. Expected: Redirects to `/sign-in`

**Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/middleware.ts
git commit -m "feat: remove landing page, redirect to sign-in"
```

---

## Task 5: Create Sign-In Page (Clerk-Hosted)

**Files:**
- Create: `apps/web/app/sign-in/[[...sign-in]]/page.tsx`

**Step 1: Create sign-in page**

Create directory and file `apps/web/app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl={undefined} // Disable sign-up link
      />
    </div>
  );
}
```

**Step 2: Verify in browser**

1. Visit `http://localhost:3000/sign-in`
2. Expected: Clerk sign-in form appears with no sign-up link

**Step 3: Commit**

```bash
git add apps/web/app/sign-in/
git commit -m "feat: add dedicated sign-in page without sign-up link"
```

---

## Task 6: Update Members Page with Real Invite Functionality

**Files:**
- Modify: `apps/web/app/(dashboard)/members/page.tsx`

**Step 1: Replace the handleInvite function and add invitation fetching**

Update the members page to call the real API and display pending invitations. Replace the entire file with:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, Loader2, UserPlus, X, Clock } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type MemberRole = "OWNER" | "ADMIN" | "BOARD_MEMBER" | "OBSERVER";

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  title: string | null;
  status: string;
  expiresAt: string;
  inviter: { firstName: string | null; lastName: string | null };
}

interface Member {
  id: string;
  role: MemberRole;
  title: string | null;
  status: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
}

export default function MembersPage() {
  const { getToken } = useAuth();
  const { currentCompany } = useCurrentCompany();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("BOARD_MEMBER");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const resetForm = () => {
    setEmail("");
    setRole("BOARD_MEMBER");
    setTitle("");
  };

  const fetchData = async () => {
    if (!currentCompany) return;

    try {
      setIsLoading(true);
      const token = await getToken();

      const [companyRes, invitationsRes] = await Promise.all([
        fetch(`${API_URL}/companies/${currentCompany.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/companies/${currentCompany.id}/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (companyRes.ok) {
        const company = await companyRes.json();
        setMembers(company.members || []);
      }

      if (invitationsRes.ok) {
        const invites = await invitationsRes.json();
        setInvitations(invites.filter((i: Invitation) => i.status === "PENDING"));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentCompany]);

  const handleInvite = async () => {
    if (!email.trim() || !currentCompany) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/companies/${currentCompany.id}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            role,
            title: title.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      await fetchData();
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      const token = await getToken();
      await fetch(`${API_URL}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (error) {
      console.error("Error revoking invitation:", error);
    }
  };

  const getRoleBadgeVariant = (role: MemberRole) => {
    switch (role) {
      case "OWNER": return "default";
      case "ADMIN": return "secondary";
      default: return "outline";
    }
  };

  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board Members</h1>
          <p className="text-muted-foreground">Manage your board member directory</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {activeMembers.filter((m) => m.role === "OWNER").length} Owners,{" "}
              {activeMembers.filter((m) => m.role === "ADMIN").length} Admins
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                      <Mail className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {invitation.role} {invitation.title && `• ${invitation.title}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>Board members and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activeMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members yet</p>
          ) : (
            <div className="space-y-4">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {member.user.imageUrl && (
                        <AvatarImage src={member.user.imageUrl} />
                      )}
                      <AvatarFallback>
                        {member.user.firstName?.[0]}
                        {member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {member.title || member.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Board Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to join your board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="BOARD_MEMBER">Board Member</SelectItem>
                  <SelectItem value="OBSERVER">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Independent Director"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSubmitting || !email.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Verify in browser**

1. Navigate to Members page
2. Click "Invite Member"
3. Enter an email and submit
4. Expected: Invitation appears in "Pending Invitations" section

**Step 3: Commit**

```bash
git add apps/web/app/\\(dashboard\\)/members/page.tsx
git commit -m "feat: add real invitation functionality to members page"
```

---

## Task 7: Manual Clerk Configuration

**This task requires manual action in Clerk Dashboard.**

**Step 1: Disable public sign-up in Clerk Dashboard**

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to "User & Authentication" → "Email, Phone, Username"
4. Under "Sign-up mode", select "Restricted" (invitation-only)
5. Save changes

**Step 2: Configure redirect URLs**

1. Go to "Paths" in Clerk Dashboard
2. Set "Sign-in URL" to `/sign-in`
3. Set "After sign-in URL" to `/dashboard`
4. Remove or disable sign-up URLs

**Step 3: Verify configuration**

1. Open incognito browser
2. Visit your app
3. Expected: Only sign-in is available, no sign-up option

---

## Task 8: Final Verification

**Step 1: Full flow test**

1. As an existing Owner/Admin, go to Members page
2. Invite a new email address
3. Check that invitation appears in pending list
4. Sign out
5. In Clerk dashboard, manually create a user with the invited email (simulating them accepting)
6. The Clerk webhook should fire and auto-add them to the company
7. Sign in as the new user
8. Verify they have access to the company with the correct role

**Step 2: Verify no public access**

1. Open incognito browser
2. Visit `/`
3. Expected: Redirects to `/sign-in`
4. Visit `/dashboard`
5. Expected: Redirects to `/sign-in`
6. Verify no sign-up option is visible

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete invitation-only access implementation"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add Invitation model |
| `apps/api/src/invitations/*` | New invitations module |
| `apps/api/src/auth/webhooks/clerk-webhook.controller.ts` | Auto-accept invitations |
| `apps/api/src/app.module.ts` | Register InvitationsModule |
| `apps/web/app/page.tsx` | Redirect to sign-in |
| `apps/web/middleware.ts` | Remove public routes |
| `apps/web/app/sign-in/[[...sign-in]]/page.tsx` | New sign-in page |
| `apps/web/app/(dashboard)/members/page.tsx` | Real invite functionality |
| Clerk Dashboard | Restrict sign-up mode |
