import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Plans
  const plans = [
    {
      name: 'Free',
      price: 0.00,
      maxUsers: 5,
      maxProjects: 3,
      storageLimitGB: 2,
    },
    {
      name: 'Pro',
      price: 19.00,
      maxUsers: 50,
      maxProjects: 50,
      storageLimitGB: 50,
    },
    {
      name: 'Enterprise',
      price: 99.00,
      maxUsers: 9999,
      maxProjects: 9999,
      storageLimitGB: 1000,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
