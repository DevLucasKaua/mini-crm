import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UNITS = [
  {
    slug: 'matriz',
    name: 'E3 Matriz',
    userEmailEnv: 'SEED_USER_MATRIZ_EMAIL',
    fallbackEmail: 'matriz@example.com',
  },
  {
    slug: 'filial',
    name: 'E3 Filial',
    userEmailEnv: 'SEED_USER_FILIAL_EMAIL',
    fallbackEmail: 'filial@example.com',
  },
];

async function main(): Promise<void> {
  for (const { slug, name, userEmailEnv, fallbackEmail } of UNITS) {
    const unit = await prisma.unit.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });

    const email = (process.env[userEmailEnv]?.trim() || fallbackEmail).toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: { unitId: unit.id },
      create: { email, unitId: unit.id },
    });

    console.log(`Seeded unit "${name}" with user ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
