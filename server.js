require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");
const {
    PrismaBetterSqlite3
} = require("@prisma/adapter-better-sqlite3");

const app = express();
app.use(express.static("public"));
const PORT = process.env.PORT || 3000;
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
// MEMBER SELF-SERVICE
// ==================================================

// --------------------------------------------------
// GET MY PROFILE
// --------------------------------------------------

app.get(
    "/api/member/me",
    authenticateToken,
    async (req, res) => {

        try {

            const member =
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

            if (!member) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            if (member.role !== "MEMBER") {
                return res.status(403).json({
                    error: "Member access required"
                });
            }

            res.json(member);

        } catch (error) {

            console.error(
                "Error getting member profile:",
                error
            );

            res.status(500).json({
                error: "Failed to retrieve member profile"
            });
        }
    }
);


// --------------------------------------------------
// GET MY PAYMENT HISTORY
// --------------------------------------------------

app.get(
    "/api/member/payments",
    authenticateToken,
    async (req, res) => {

        try {

            const member =
                await prisma.user.findUnique({
                    where: {
                        id: req.user.userId
                    },

                    select: {
                        id: true,
                        role: true
                    }
                });

            if (!member) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            if (member.role !== "MEMBER") {
                return res.status(403).json({
                    error: "Member access required"
                });
            }

            const payments =
                await prisma.payment.findMany({
                    where: {
                        memberId: member.id
                    },

                    orderBy: {
                        id: "desc"
                    }
                });

            const totalPaid =
                payments.reduce(
                    (total, payment) =>
                        total + Number(payment.amount),
                    0
                );

            res.json({
                totalPayments: payments.length,
                totalPaid: totalPaid,
                payments: payments
            });

        } catch (error) {

            console.error(
                "Error getting member payments:",
                error
            );

            res.status(500).json({
                error: "Failed to retrieve payment history"
            });
        }
    }
);
// ==================================================
// ADMIN PAYMENT VERIFICATION
// ==================================================

app.patch(
    "/api/admin/payments/:id/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const paymentId =
                Number(req.params.id);

            if (
                !Number.isInteger(paymentId) ||
                paymentId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid payment ID"
                });
            }

            const { status } = req.body;

            const allowedStatuses = [
                "PENDING",
                "VERIFIED",
                "REJECTED"
            ];

            if (
                typeof status !== "string" ||
                !allowedStatuses.includes(status)
            ) {
                return res.status(400).json({
                    error:
                        "Status must be PENDING, VERIFIED, or REJECTED"
                });
            }

            const payment =
                await prisma.payment.findUnique({
                    where: {
                        id: paymentId
                    }
                });

            if (!payment) {
                return res.status(404).json({
                    error: "Payment not found"
                });
            }

            const updatedPayment =
                await prisma.payment.update({
                    where: {
                        id: paymentId
                    },

                    data: {
                        status: status,
                        verifiedById:
                            req.user.userId,
                        paidAt:
                            status === "VERIFIED"
                                ? new Date()
                                : null
                    }
                });

            res.json({
                message:
                    "Payment status updated successfully",

                payment: updatedPayment
            });

        } catch (error) {

            console.error(
                "Error updating payment status:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to update payment status"
            });
        }
    }
);
// ==================================================
// ADMIN UNPAID PAYMENTS
// ==================================================

app.get(
    "/api/admin/payments/unpaid",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const month = Number(req.query.month);
            const year = Number(req.query.year);

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    error: "Invalid month. Use 1-12."
                });
            }

            if (
                !Number.isInteger(year) ||
                year < 2000
            ) {
                return res.status(400).json({
                    error: "Invalid year."
                });
            }

            // Get all members
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

            // Get verified payments for this month/year
            const payments =
                await prisma.payment.findMany({
                    where: {
                        month: month,
                        year: year,
                        status: "VERIFIED"
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
                year: year,
                totalMembers: members.length,
                paidMembers: paidMemberIds.size,
                unpaidMembers: unpaidMembers.length,
                members: unpaidMembers
            });

        } catch (error) {

            console.error(
                "Error finding unpaid members:",
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
// MEMBER DASHBOARD
// ==================================================

app.get(
    "/api/member/dashboard",
    authenticateToken,
    async (req, res) => {

        try {

            // Get the logged-in user
            const member =
                await prisma.user.findUnique({
                    where: {
                        id: req.user.userId
                    },

                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        role: true
                    }
                });

            if (!member) {
                return res.status(404).json({
                    error: "Member not found"
                });
            }

            // Only members can use this dashboard
            if (member.role !== "MEMBER") {
                return res.status(403).json({
                    error: "Member access required"
                });
            }

            // Get this member's payments
            const payments =
                await prisma.payment.findMany({
                    where: {
                        memberId: member.id
                    },

                    orderBy: [
                        {
                            year: "desc"
                        },
                        {
                            month: "desc"
                        }
                    ],

                    select: {
                        id: true,
                        amount: true,
                        type: true,
                        month: true,
                        year: true,
                        method: true,
                        reference: true,
                        status: true,
                        paidAt: true,
                        createdAt: true
                    }
                });

            res.json({
                member: member,
                payments: payments
            });

        } catch (error) {

            console.error(
                "Error loading member dashboard:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to load member dashboard"
            });
        }
    }
);
// ==================================================
// START SERVER
// ==================================================
// ==================================================
// ANNOUNCEMENTS
// ==================================================

// MEMBER - GET ANNOUNCEMENTS
app.get(
    "/api/announcements",
    authenticateToken,
    async (req, res) => {

        try {

            const announcements =
                await prisma.announcement.findMany({
                    orderBy: {
                        createdAt: "desc"
                    }
                });

            res.json(announcements);

        } catch (error) {

            console.error(
                "Error fetching announcements:",
                error
            );

            res.status(500).json({
                error: "Failed to fetch announcements"
            });

        }

    }
);
// ADMIN - CREATE ANNOUNCEMENT
app.post(
    "/api/admin/announcements",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const { title, content } = req.body;

            if (!title || !content) {
                return res.status(400).json({
                    error: "Title and content are required"
                });
            }

            const announcement =
                await prisma.announcement.create({
                    data: {
                        title: title.trim(),
                        content: content.trim()
                    }
                });

            res.status(201).json(announcement);

        } catch (error) {

            console.error(
                "Error creating announcement:",
                error
            );

            res.status(500).json({
                error: "Failed to create announcement"
            });

        }

    }
);

// ==================================================
// ABSENCE REQUESTS
// ==================================================
// ==================================================
// MEMBER - GET OWN ABSENCE REQUESTS
// ==================================================

app.get(
    "/api/member/absence-requests",
    authenticateToken,
    async (req, res) => {

        try {

            if (req.user.role !== "MEMBER") {
                return res.status(403).json({
                    error: "Member access required"
                });
            }

            const requests =
                await prisma.absenceRequest.findMany({

                    where: {
                        memberId: req.user.id
                    },

                    orderBy: {
                        createdAt: "desc"
                    },

                    include: {
                        meeting: true
                    }

                });

            res.json(requests);

        } catch (error) {

            console.error(
                "Error fetching member absence requests:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to fetch absence requests"
            });

        }

    }
);

// MEMBER CREATES ABSENCE REQUEST

app.post(
    "/api/member/absence-requests",
    authenticateToken,
    async (req, res) => {

        try {

            if (req.user.role !== "MEMBER") {
                return res.status(403).json({
                    error: "Member access required"
                });
            }

            const {
                reason,
                meetingId
            } = req.body;

            if (
                typeof reason !== "string" ||
                reason.trim() === ""
            ) {
                return res.status(400).json({
                    error: "Reason is required"
                });
            }

            const parsedMeetingId =
                Number(meetingId);

            if (
                !Number.isInteger(parsedMeetingId) ||
                parsedMeetingId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid meeting ID"
                });
            }

            const meeting =
                await prisma.meeting.findUnique({
                    where: {
                        id: parsedMeetingId
                    }
                });

            if (!meeting) {
                return res.status(404).json({
                    error: "Meeting not found"
                });
            }

            const request =
                await prisma.absenceRequest.create({

                    data: {
                        reason: reason.trim(),

                        memberId:
                            req.user.userId,

                        meetingId:
                            parsedMeetingId
                    },

                    include: {
                        meeting: true
                    }
                });

            res.status(201).json({
                message:
                    "Absence request submitted successfully",

                request: request
            });

        } catch (error) {

            console.error(
                "Error creating absence request:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to create absence request"
            });
        }
    }
);
// ==================================================
// GET ALL MEETINGS
// ==================================================

app.get(
    "/api/meetings",
    authenticateToken,
    async (req, res) => {

        try {

            const meetings =
                await prisma.meeting.findMany({
                    orderBy: {
                        date: "asc"
                    }
                });

            res.json(meetings);

        } catch (error) {

            console.error(
                "Error fetching meetings:",
                error
            );

            res.status(500).json({
                error: "Failed to fetch meetings"
            });
        }
    }
);
// ==================================================
// CREATE MEETING
// ==================================================

app.post(
    "/api/meetings",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                title,
                date,
                location,
                description
            } = req.body;

            if (
                typeof title !== "string" ||
                title.trim() === ""
            ) {
                return res.status(400).json({
                    error: "Meeting title is required"
                });
            }

            if (
                typeof date !== "string" ||
                date.trim() === ""
            ) {
                return res.status(400).json({
                    error: "Meeting date is required"
                });
            }

            const meetingDate = new Date(date);

            if (Number.isNaN(meetingDate.getTime())) {
                return res.status(400).json({
                    error: "Invalid meeting date"
                });
            }

            if (
                typeof location !== "string" ||
                location.trim() === ""
            ) {
                return res.status(400).json({
                    error: "Meeting location is required"
                });
            }

            const meeting =
                await prisma.meeting.create({
                    data: {
                        title: title.trim(),
                        date: meetingDate,
                        location: location.trim(),
                        description:
                            typeof description === "string"
                                ? description.trim()
                                : null
                    }
                });

            res.status(201).json({
                message: "Meeting created successfully",
                meeting: meeting
            });

        } catch (error) {

            console.error(
                "Error creating meeting:",
                error
            );

            res.status(500).json({
                error: "Failed to create meeting"
            });
        }
    }
);
// ==================================================
// ADMIN - LIST ABSENCE REQUESTS
// ==================================================

app.get(
    "/api/admin/absence-requests",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const requests =
                await prisma.absenceRequest.findMany({
                    orderBy: {
                        createdAt: "desc"
                    },

                    include: {
                        member: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true
                            }
                        },

                        meeting: true
                    }
                });

            res.json(requests);

        } catch (error) {

            console.error(
                "Error fetching absence requests:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to fetch absence requests"
            });
        }
    }
);
// ==================================================
// ADMIN - APPROVE / REJECT ABSENCE REQUEST
// ==================================================

app.patch(
    "/api/admin/absence-requests/:id/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const requestId =
                Number(req.params.id);

            if (
                !Number.isInteger(requestId) ||
                requestId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid absence request ID"
                });
            }

            const { status } = req.body;

            if (
                status !== "APPROVED" &&
                status !== "REJECTED"
            ) {
                return res.status(400).json({
                    error:
                        "Status must be APPROVED or REJECTED"
                });
            }

            const existingRequest =
                await prisma.absenceRequest.findUnique({
                    where: {
                        id: requestId
                    }
                });

            if (!existingRequest) {
                return res.status(404).json({
                    error: "Absence request not found"
                });
            }

            const updatedRequest =
                await prisma.absenceRequest.update({
                    where: {
                        id: requestId
                    },

                    data: {
                        status: status
                    },

                    include: {
                        member: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true
                            }
                        },

                        meeting: true
                    }
                });

            res.json({
                message:
                    `Absence request ${status.toLowerCase()} successfully`,

                request: updatedRequest
            });

        } catch (error) {

            console.error(
                "Error updating absence request:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to update absence request"
            });
        }
    }
);
// ==================================================
// UPDATE MEETING
// ADMIN ONLY
// ==================================================

app.patch(
    "/api/meetings/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const meetingId = Number(req.params.id);

            if (
                !Number.isInteger(meetingId) ||
                meetingId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid meeting ID"
                });
            }

            const {
                title,
                date,
                location,
                description
            } = req.body;

            const existingMeeting =
                await prisma.meeting.findUnique({
                    where: {
                        id: meetingId
                    }
                });

            if (!existingMeeting) {
                return res.status(404).json({
                    error: "Meeting not found"
                });
            }

            const updateData = {};

            if (title !== undefined) {

                if (
                    typeof title !== "string" ||
                    title.trim() === ""
                ) {
                    return res.status(400).json({
                        error: "Meeting title cannot be empty"
                    });
                }

                updateData.title = title.trim();
            }

            if (date !== undefined) {

                if (
                    typeof date !== "string" ||
                    date.trim() === ""
                ) {
                    return res.status(400).json({
                        error: "Meeting date cannot be empty"
                    });
                }

                const meetingDate = new Date(date);

                if (Number.isNaN(meetingDate.getTime())) {
                    return res.status(400).json({
                        error: "Invalid meeting date"
                    });
                }

                updateData.date = meetingDate;
            }

            if (location !== undefined) {

                if (
                    typeof location !== "string" ||
                    location.trim() === ""
                ) {
                    return res.status(400).json({
                        error: "Meeting location cannot be empty"
                    });
                }

                updateData.location = location.trim();
            }

            if (description !== undefined) {

                if (
                    description !== null &&
                    typeof description !== "string"
                ) {
                    return res.status(400).json({
                        error: "Invalid description"
                    });
                }

                updateData.description =
                    description === null
                        ? null
                        : description.trim();
            }

            if (
                Object.keys(updateData).length === 0
            ) {
                return res.status(400).json({
                    error: "No fields were provided for update"
                });
            }

            const updatedMeeting =
                await prisma.meeting.update({
                    where: {
                        id: meetingId
                    },
                    data: updateData
                });

            res.json({
                message: "Meeting updated successfully",
                meeting: updatedMeeting
            });

        } catch (error) {

            console.error(
                "Error updating meeting:",
                error
            );

            res.status(500).json({
                error: "Failed to update meeting"
            });
        }
    }
);
// ==================================================
// DELETE MEETING
// ADMIN ONLY
// ==================================================

app.delete(
    "/api/meetings/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const meetingId = Number(req.params.id);

            if (
                !Number.isInteger(meetingId) ||
                meetingId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid meeting ID"
                });
            }

            const existingMeeting =
                await prisma.meeting.findUnique({
                    where: {
                        id: meetingId
                    }
                });

            if (!existingMeeting) {
                return res.status(404).json({
                    error: "Meeting not found"
                });
            }

            const existingRequests =
                await prisma.absenceRequest.count({
                    where: {
                        meetingId: meetingId
                    }
                });

            if (existingRequests > 0) {
                return res.status(409).json({
                    error:
                        "Cannot delete a meeting that has absence requests"
                });
            }

            await prisma.meeting.delete({
                where: {
                    id: meetingId
                }
            });

            res.json({
                message: "Meeting deleted successfully"
            });

        } catch (error) {

            console.error(
                "Error deleting meeting:",
                error
            );

            res.status(500).json({
                error: "Failed to delete meeting"
            });
        }
    }
);
app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );
    }
);