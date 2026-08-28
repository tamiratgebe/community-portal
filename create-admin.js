require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const {
    PrismaBetterSqlite3
} = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcrypt");

// Connect to SQLite
const adapter = new PrismaBetterSqlite3({
    url: "./dev.db"
});

const prisma = new PrismaClient({
    adapter
});

async function main() {

    // ==========================================
    // ADMIN ACCOUNT DETAILS
    // CHANGE THESE VALUES
    // ==========================================

    const fullName = "TamiratG.Bekele";
    const phone = "0970255380";
    const password = "community21!";


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