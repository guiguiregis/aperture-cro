import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@aperture.dev";
  const passwordHash = await bcrypt.hash("demo1234", 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Aperture Demo",
      passwordHash,
      plan: "PRO",
    },
  });

  console.log("Seeded demo user: demo@aperture.dev / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
