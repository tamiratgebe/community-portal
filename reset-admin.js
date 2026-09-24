const path = require("path");
const readline = require("readline");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });
const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => input.question(question, resolve));
}

async function main() {
    const phone = (process.env.ADMIN_PHONE || await ask("Admin phone number: ")).trim();
    const password = process.env.ADMIN_PASSWORD || await ask("New password (hidden only when supplied through environment): ");

    if (!phone || password.length < 8) {
        throw new Error("A phone number and a password of at least 8 characters are required.");
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
        throw new Error("No account was found with that phone number.");
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: await bcrypt.hash(password, 12),
            role: "ADMIN"
        },
        select: { id: true, fullName: true, phone: true, role: true }
    });

    console.log(`Admin password reset for ${updated.fullName} (${updated.phone}).`);
}

main()
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        input.close();
        await prisma.$disconnect();
    });