const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({
    adapter
});

async function main() {

    // ==========================================
    // ADMIN ACCOUNT DETAILS
    // CHANGE THESE VALUES
    // ==========================================

    const fullName = process.env.ADMIN_NAME;
    const phone = process.env.ADMIN_PHONE;
    const password = process.env.ADMIN_PASSWORD;

    if (!fullName || !phone || !password) {
        throw new Error("Set ADMIN_NAME, ADMIN_PHONE, and ADMIN_PASSWORD in .env before creating an admin.");
    }


    // ==========================================
    // CHECK IF PHONE ALREADY EXISTS
    // ==========================================

    const existingUser = await prisma.user.findUnique({
        where: {
            phone: phone
        }
    });

    if (existingUser) {
        console.log("A user with this phone number already exists.");
        return;
    }


    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const passwordHash = await bcrypt.hash(
        password,
        12
    );


    // ==========================================
    // CREATE ADMIN
    // ==========================================

    const admin = await prisma.user.create({
        data: {
            fullName: fullName,
            phone: phone,
            passwordHash: passwordHash,
            role: "ADMIN"
        },
        select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            createdAt: true
        }
    });


    // ==========================================
    // SHOW RESULT
    // ==========================================

    console.log("Admin created successfully:");
    console.log(admin);
}


// ==============================================
// RUN
// ==============================================

main()
    .catch((error) => {
        console.error("Error creating admin:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });