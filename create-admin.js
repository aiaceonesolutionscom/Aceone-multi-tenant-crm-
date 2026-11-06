require("dotenv").config();
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@aceone.com";
  const password = "Password@123";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: "AceOne Super Admin",
      email,
      username: "superadmin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`\n======================================================`);
  console.log(`✅ SUPER ADMIN READY:`);
  console.log(`👉 Email:    ${user.email}`);
  console.log(`👉 Password: ${password}`);
  console.log(`👉 Role:     ${user.role}`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error creating admin:", e.message);
  })
  .finally(() => prisma.$disconnect());
