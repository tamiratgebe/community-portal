require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");
const {
    PrismaBetterSqlite3
} = require("@prisma/adapter-better-sqlite3");

const app = express();
const PORT = 3000;

// ==================================================
// PRISMA DATABASE CONNECTION
// ==================================================

const adapter = new PrismaBetterSqlite3({
    url: "./dev.db"
});

const prisma = new PrismaClient({
    adapter
});

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.json());

// ==================================================
// JWT CONFIGURATION
// ==================================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is missing from .env");
    process.exit(1);
}

// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Authorization token is required"
        });
    }

    const parts = authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {
        return res.status(401).json({
            error: "Invalid authorization format"
        });
    }

    const token = parts[1];

    try {

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
}

// ==================================================
// ADMIN AUTHORIZATION MIDDLEWARE
// ==================================================

function requireAdmin(req, res, next) {

    if (!req.user) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            error: "Admin access required"
        });
    }

    next();
}

// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {

    res.json({
        message: "Community Portal Backend is running!",
        status: "OK"
    });
});

// ==================================================
// AUTH LOGIN
// ==================================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const {
                phone,
                password
            } = req.body;

            if (!phone || !password) {
                return res.status(400).json({
                    error: "Phone and password are required"
                });
            }

            const user =
                await prisma.user.findUnique({
                    where: {
                        phone: phone
                    }
                });

            if (!user) {
                return res.status(401).json({
                    error:
                        "Invalid phone number or password"
                });
            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.passwordHash
                );

            if (!passwordCorrect) {
                return res.status(401).json({
                    error:
                        "Invalid phone number or password"
                });
            }

            const token =
                jwt.sign(
                    {
                        userId: user.id,
                        role: user.role
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            res.json({
                message: "Login successful",

                token,

                user: {
                    id: user.id,
                    fullName: user.fullName,
                    phone: user.phone,
                    role: user.role
                }
            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({
                error: "Login failed"
            });
        }
    }
);

// ==================================================
// CURRENT USER
// ==================================================

app.get(
    "/api/auth/me",
    authenticateToken,
    async (req, res) => {

        try {

            const user =
                await prisma.user.findUnique({
                    where: {
                        id: req.user.userId
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true,
                        createdAt: true
                    }
                });

            if (!user) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            res.json(user);

        } catch (error) {

            console.error(
                "Auth/me error:",
                error
            );

            res.status(500).json({
                error: "Failed to retrieve user"
            });
        }
    }
);

// ==================================================
// ADMIN TEST
// ==================================================

app.get(
    "/api/admin/test",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        res.json({
            message:
                "Admin authentication successful",

            userId: req.user.userId,

            role: req.user.role
        });
    }
);

// ==================================================
// GET ALL MEMBERS
// ADMIN ONLY
// ==================================================

app.get(
    "/api/members",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const members =
                await prisma.user.findMany({

                    where: {
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true,
                        createdAt: true
                    },

                    orderBy: {
                        id: "asc"
                    }
                });

            res.json(members);

        } catch (error) {

            console.error(
                "Error getting members:",
                error
            );

            res.status(500).json({
                error: "Failed to retrieve members"
            });
        }
    }
);

// ==================================================
// CREATE MEMBER
// ADMIN ONLY
// ==================================================

app.post(
    "/api/members",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                fullName,
                phone,
                password
            } = req.body;

            if (
                !fullName ||
                !phone ||
                !password
            ) {
                return res.status(400).json({
                    error:
                        "Full name, phone and password are required"
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    error:
                        "Password must be at least 8 characters"
                });
            }

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        phone: phone
                    }
                });

            if (existingUser) {
                return res.status(409).json({
                    error:
                        "A user with this phone number already exists"
                });
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            const member =
                await prisma.user.create({

                    data: {
                        fullName: fullName,
                        phone: phone,
                        passwordHash: passwordHash,
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true,
                        createdAt: true
                    }
                });

            res.status(201).json({
                message: "Member created successfully",
                member
            });

        } catch (error) {

            console.error(
                "Error creating member:",
                error
            );

            res.status(500).json({
                error: "Failed to create member"
            });
        }
    }
);

// ==================================================
// GET ONE MEMBER
// ADMIN ONLY
// ==================================================

app.get(
    "/api/members/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId =
                Number(req.params.id);

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid member ID"
                });
            }

            const member =
                await prisma.user.findFirst({

                    where: {
                        id: memberId,
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true,
                        createdAt: true
                    }
                });

            if (!member) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            res.json(member);

        } catch (error) {

            console.error(
                "Error getting member:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve member"
            });
        }
    }
);

// ==================================================
// UPDATE MEMBER
// ADMIN ONLY
// ==================================================

app.patch(
    "/api/members/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId =
                Number(req.params.id);

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid member ID"
                });
            }

            const {
                fullName,
                phone,
                password
            } = req.body;

            const existingMember =
                await prisma.user.findFirst({

                    where: {
                        id: memberId,
                        role: "MEMBER"
                    }
                });

            if (!existingMember) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            const updateData = {};

            // ------------------------------------------
            // UPDATE NAME
            // ------------------------------------------

            if (fullName !== undefined) {

                if (
                    typeof fullName !== "string" ||
                    fullName.trim() === ""
                ) {
                    return res.status(400).json({
                        error:
                            "Full name cannot be empty"
                    });
                }

                updateData.fullName =
                    fullName.trim();
            }

            // ------------------------------------------
            // UPDATE PHONE
            // ------------------------------------------

            if (phone !== undefined) {

                if (
                    typeof phone !== "string" ||
                    phone.trim() === ""
                ) {
                    return res.status(400).json({
                        error:
                            "Phone number cannot be empty"
                    });
                }

                const phoneOwner =
                    await prisma.user.findUnique({
                        where: {
                            phone: phone
                        }
                    });

                if (
                    phoneOwner &&
                    phoneOwner.id !== memberId
                ) {
                    return res.status(409).json({
                        error:
                            "That phone number is already in use"
                    });
                }

                updateData.phone =
                    phone.trim();
            }

            // ------------------------------------------
            // UPDATE PASSWORD
            // ------------------------------------------

            if (password !== undefined) {

                if (
                    typeof password !== "string" ||
                    password.length < 8
                ) {
                    return res.status(400).json({
                        error:
                            "Password must be at least 8 characters"
                    });
                }

                updateData.passwordHash =
                    await bcrypt.hash(
                        password,
                        12
                    );
            }

            // ------------------------------------------
            // MAKE SURE SOMETHING WAS PROVIDED
            // ------------------------------------------

            if (
                Object.keys(updateData).length === 0
            ) {
                return res.status(400).json({
                    error:
                        "No fields were provided for update"
                });
            }

            const updatedMember =
                await prisma.user.update({

                    where: {
                        id: memberId
                    },

                    data: updateData,

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true,
                        createdAt: true
                    }
                });

            res.json({
                message:
                    "Member updated successfully",

                member: updatedMember
            });

        } catch (error) {

            console.error(
                "Error updating member:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to update member"
            });
        }
    }
);
// ==================================================
// PAYMENT ROUTES
// ==================================================

// --------------------------------------------------
// CREATE PAYMENT
// ADMIN ONLY
// --------------------------------------------------

app.post(
    "/api/payments",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                memberId,
                amount,
                method,
                month,
                paidIt,
                type
            } = req.body;

            // Required fields
            if (
                memberId === undefined ||
                amount === undefined ||
                method === undefined ||
                month === undefined ||
                type === undefined
            ) {
                return res.status(400).json({
                    error:
                        "memberId, amount, method, month and type are required"
                });
            }

            const memberIdNumber = Number(memberId);
            const amountNumber = Number(amount);
            const monthNumber = Number(month);

            // Validate member ID
            if (
                !Number.isInteger(memberIdNumber) ||
                memberIdNumber <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid member ID"
                });
            }

            // Validate amount
            if (
                !Number.isFinite(amountNumber) ||
                amountNumber <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid payment amount"
                });
            }

            // Validate month
            if (
                !Number.isInteger(monthNumber) ||
                monthNumber < 1 ||
                monthNumber > 12
            ) {
                return res.status(400).json({
                    error: "Month must be between 1 and 12"
                });
            }

            // Validate payment type
            if (
                type !== "MONTHLY" &&
                type !== "SPECIAL"
            ) {
                return res.status(400).json({
                    error:
                        "Type must be MONTHLY or SPECIAL"
                });
            }

            // Check member exists
            const member =
                await prisma.user.findFirst({
                    where: {
                        id: memberIdNumber,
                        role: "MEMBER"
                    }
                });

            if (!member) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            // Create payment
            const payment =
    await prisma.payment.create({
        data: {
            amount: amountNumber,
            memberId: memberIdNumber,
            method: method,
            month: monthNumber,
            type: type,
            paidAt:
                paidIt === false
                    ? null
                    : new Date()
        }
    });

            res.status(201).json({
                message:
                    "Payment recorded successfully",
                payment: payment
            });

        } catch (error) {

            console.error(
                "Error creating payment:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to record payment"
            });
        }
    }
);


// --------------------------------------------------
// GET ALL PAYMENTS
// ADMIN ONLY
// --------------------------------------------------

app.get(
    "/api/payments",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const payments =
                await prisma.payment.findMany({
                    orderBy: {
                        id: "desc"
                    }
                });

            res.json(payments);

        } catch (error) {

            console.error(
                "Error getting payments:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve payments"
            });
        }
    }
);


// --------------------------------------------------
// GET PAYMENTS FOR ONE MEMBER
// ADMIN ONLY
// --------------------------------------------------

app.get(
    "/api/members/:id/payments",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId =
                Number(req.params.id);

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid member ID"
                });
            }

            const member =
                await prisma.user.findFirst({
                    where: {
                        id: memberId,
                        role: "MEMBER"
                    }
                });

            if (!member) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            const payments =
                await prisma.payment.findMany({
                    where: {
                        memberId: memberId
                    },
                    orderBy: {
                        id: "desc"
                    }
                });

            res.json({
                member: {
                    id: member.id,
                    fullName: member.fullName,
                    phone: member.phone
                },
                payments: payments
            });

        } catch (error) {

            console.error(
                "Error getting member payments:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve member payments"
            });
        }
    }
);
// ==================================================
// PAYMENT MONTHLY STATUS
// ADMIN ONLY
// ==================================================

app.get(
    "/api/payments/monthly-status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const month = Number(req.query.month);

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    error: "Month must be between 1 and 12"
                });
// ==================================================
// GET UNPAID MEMBERS FOR A MONTH
// ADMIN ONLY
// ==================================================

app.get(
    "/api/payments/unpaid",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const month = Number(req.query.month);

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    error: "Month must be between 1 and 12"
                });
            }

            const members =
                await prisma.user.findMany({
                    where: {
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true
                    },

                    orderBy: {
                        id: "asc"
                    }
                });

            const payments =
                await prisma.payment.findMany({
                    where: {
                        month: month,
                        type: "MONTHLY"
                    },

                    select: {
                        memberId: true
                    }
                });

            const paidMemberIds =
                new Set(
                    payments.map(
                        payment => payment.memberId
                    )
                );

            const unpaidMembers =
                members.filter(
                    member =>
                        !paidMemberIds.has(member.id)
                );

            res.json({
                month: month,

                totalUnpaid:
                    unpaidMembers.length,

                members:
                    unpaidMembers
            });

        } catch (error) {

            console.error(
                "Error getting unpaid members:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve unpaid members"
            });
        }
    }
);
            }

            const members =
                await prisma.user.findMany({
                    where: {
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true
                    },

                    orderBy: {
                        id: "asc"
                    }
                });

            const payments =
                await prisma.payment.findMany({
                    where: {
                        month: month,
                        type: "MONTHLY"
                    },

                    orderBy: {
                        id: "desc"
                    }
                });

            const result = members.map(member => {

                const memberPayments =
                    payments.filter(
                        payment =>
                            payment.memberId === member.id
                    );

                const totalPaid =
                    memberPayments.reduce(
                        (total, payment) =>
                            total + Number(payment.amount),
                        0
                    );

                return {
                    memberId: member.id,
                    fullName: member.fullName,
                    phone: member.phone,

                    paid:
                        memberPayments.length > 0,

                    totalPaid: totalPaid,

                    payments: memberPayments
                };
            });

            const paidMembers =
                result.filter(
                    member => member.paid
                ).length;

            const unpaidMembers =
                result.length - paidMembers;

            const totalCollected =
                result.reduce(
                    (total, member) =>
                        total + member.totalPaid,
                    0
                );

            res.json({
                month: month,

                summary: {
                    totalMembers: result.length,
                    paidMembers: paidMembers,
                    unpaidMembers: unpaidMembers,
                    totalCollected: totalCollected
                },

                members: result
            });

        } catch (error) {

            console.error(
                "Error getting monthly payment status:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve monthly payment status"
            });
        }
    }
);
// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "Unhandled server error:",
            err
        );

        res.status(500).json({
            error: "Internal server error"
        });
    }
);

// ==================================================
// GET UNPAID MEMBERS FOR A MONTH
// ADMIN ONLY
// ==================================================

app.get(
    "/api/payments/unpaid",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const month = Number(req.query.month);

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    error: "Month must be between 1 and 12"
                });
            }

            const members =
                await prisma.user.findMany({
                    where: {
                        role: "MEMBER"
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true
                    },

                    orderBy: {
                        id: "asc"
                    }
                });

            const payments =
                await prisma.payment.findMany({
                    where: {
                        month: month,
                        type: "MONTHLY"
                    },

                    select: {
                        memberId: true
                    }
                });

            const paidMemberIds =
                new Set(
                    payments.map(
                        payment => payment.memberId
                    )
                );

            const unpaidMembers =
                members.filter(
                    member =>
                        !paidMemberIds.has(member.id)
                );

            res.json({
                month: month,
                totalUnpaid: unpaidMembers.length,
                members: unpaidMembers
            });

        } catch (error) {

            console.error(
                "Error getting unpaid members:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve unpaid members"
            });
        }
    }
);
// ==================================================
// PAYMENT DASHBOARD SUMMARY
// ADMIN ONLY
// ==================================================

app.get(
    "/api/payments/summary",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const payments =
                await prisma.payment.findMany({
                    orderBy: {
                        id: "desc"
                    }
                });

            const totalPayments =
                payments.length;

            const totalCollected =
                payments.reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

            const monthlyPayments =
                payments.filter(
                    payment =>
                        payment.type === "MONTHLY"
                );

            const specialPayments =
                payments.filter(
                    payment =>
                        payment.type === "SPECIAL"
                );

            const monthlyTotal =
                monthlyPayments.reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

            const specialTotal =
                specialPayments.reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

            res.json({
                totalPayments: totalPayments,

                totalCollected: totalCollected,

                monthlyPayments:
                    monthlyPayments.length,

                monthlyTotal: monthlyTotal,

                specialPayments:
                    specialPayments.length,

                specialTotal: specialTotal
            });

        } catch (error) {

            console.error(
                "Error getting payment summary:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to retrieve payment summary"
            });
        }
    }
);
// ==================================================
// START SERVER
// ==================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );
    }
);