import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seeds/permissions';

const prisma = new PrismaClient();

async function main() {
  await seedPermissions(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
