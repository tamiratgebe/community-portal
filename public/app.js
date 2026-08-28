/* =====================================================
   COMMUNITY PORTAL
   Main JavaScript
===================================================== */


/* =====================================================
   MOBILE NAVIGATION
===================================================== */

const menuToggle =
    document.getElementById("menuToggle");

const navLinks =
    document.getElementById("navLinks");


if (menuToggle && navLinks) {

    menuToggle.addEventListener(
        "click",
        () => {

            navLinks.classList.toggle("open");

        }
    );


    navLinks
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    navLinks.classList.remove(
                        "open"
                    );

                }
            );

        });

}


/* =====================================================
   PUBLIC DASHBOARD COUNTERS
===================================================== */

async function loadPublicStats() {

    try {

        const response =
            await fetch("/api/public/stats");

        if (!response.ok) {
            throw new Error(
                "Failed to load public statistics"
            );
        }

        const stats =
            await response.json();

        const counters =
            document.querySelectorAll(
                ".dashboard-number"
            );

        if (counters.length < 4) {
            return;
        }

        /*
         * Set real database values
         */

        counters[0].dataset.target =
            stats.totalMembers;

        counters[0].dataset.prefix = "";

        counters[1].dataset.target =
            Math.round(stats.totalContributions);

        counters[1].dataset.prefix = "Br ";

        counters[2].dataset.target =
            stats.upcomingMeetings;

        counters[2].dataset.prefix = "";

        counters[3].dataset.target =
            stats.announcementCount;

        counters[3].dataset.prefix = "";


        /*
         * Animate counters
         */

        function animateCounter(counter) {

            const target =
                Number(counter.dataset.target);

            const prefix =
                counter.dataset.prefix || "";

            const duration = 1200;

            const start =
                performance.now();


            function update(time) {

                const elapsed =
                    time - start;

                const progress =
                    Math.min(
                        elapsed / duration,
                        1
                    );

                const eased =
                    1 -
                    Math.pow(
                        1 - progress,
                        3
                    );

                const value =
                    Math.floor(
                        target * eased
                    );

                counter.textContent =
                    prefix +
                    value.toLocaleString();


                if (progress < 1) {

                    requestAnimationFrame(
                        update
                    );

                } else {

                    counter.textContent =
                        prefix +
                        target.toLocaleString();

                }

            }

            requestAnimationFrame(update);

        }


        /*
         * Start animation when dashboard
         * becomes visible
         */

        const dashboard =
            document.getElementById(
                "dashboard"
            );

        if (dashboard) {

            const observer =
                new IntersectionObserver(
                    entries => {

                        if (
                            entries.some(
                                entry =>
                                    entry.isIntersecting
                            )
                        ) {

                            counters.forEach(
                                animateCounter
                            );

                            observer.disconnect();

                        }

                    },
                    {
                        threshold: 0.25
                    }
                );

            observer.observe(dashboard);

        } else {

            counters.forEach(
                animateCounter
            );

        }

    } catch (error) {

        console.error(
            "Public dashboard error:",
            error
        );

    }

}


/*
 * Load public statistics
 */

loadPublicStats();
/* =====================================================
   MONTHLY CONTRIBUTIONS
===================================================== */

const monthsContainer =
    document.getElementById(
        "monthsContainer"
    );


const months = [

    {
        english: "Meskerem",
        amharic: "መስከረም"
    },

    {
        english: "Tikimt",
        amharic: "ጥቅምት"
    },

    {
        english: "Hidar",
        amharic: "ህዳር"
    },

    {
        english: "Tahsas",
        amharic: "ታህሳስ"
    },

    {
        english: "Tir",
        amharic: "ጥር"
    },

    {
        english: "Yekatit",
        amharic: "የካቲት"
    },

    {
        english: "Megabit",
        amharic: "መጋቢት"
    },

    {
        english: "Miyazya",
        amharic: "ሚያዝያ"
    },

    {
        english: "Ginbot",
        amharic: "ግንቦት"
    },

    {
        english: "Sene",
        amharic: "ሰኔ"
    },

    {
        english: "Hamle",
        amharic: "ሐምሌ"
    },

    {
        english: "Nehase",
        amharic: "ነሐሴ"
    }

];


function createMonthCard(
    month,
    index
) {

    const card =
        document.createElement(
            "button"
        );


    card.type = "button";

    card.className =
        "month-card";


    card.innerHTML = `

        <span class="month-number">
            ${index + 1}
        </span>

        <strong>
            ${month.english}
        </strong>

        <span>
            ${month.amharic}
        </span>

        <small>
            Monthly contribution:
            <b>300 Birr</b>
        </small>

        <em>
            View Payment Details →
        </em>

    `;


    card.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(

                    `Payment Information

Month:
${month.english}

Monthly contribution:
300 Birr

Telebirr:
0921782267

After payment, please submit
your receipt to the official
community Telegram group.

Open Telegram?`

                );


            if (confirmed) {

                window.open(
                    "https://t.me/+ynOLqAQXmv85ODM8",
                    "_blank",
                    "noopener"
                );

            }

        }
    );


    return card;

}


if (monthsContainer) {

    months.forEach(
        (month, index) => {

            monthsContainer.appendChild(
                createMonthCard(
                    month,
                    index
                )
            );

        }
    );

}


/* =====================================================
   MEMBER ABSENCE REQUEST
===================================================== */

const excuseForm =
    document.getElementById("excuseForm");

const meetingSelect =
    document.getElementById("meeting");

const meetingDate =
    document.getElementById("meetingDate");

const formMessage =
    document.getElementById("formMessage");


/* =====================================================
   LOAD MEETINGS
===================================================== */

if (meetingSelect) {

    async function loadMeetings() {

        try {

            const token =
                localStorage.getItem("token");

            if (!token) {

                meetingSelect.innerHTML = `
                    <option value="">
                        Please login first
                    </option>
                `;

                return;
            }


            const response =
                await fetch(
                    "/api/meetings",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Failed to load meetings"
                );

            }


            const data =
                await response.json();


            /*
             * Your backend currently returns
             * one meeting object.
             *
             * This converts it into an array
             * so the frontend can handle it.
             */

            const meetings =
                Array.isArray(data)
                    ? data
                    : [data];


            meetingSelect.innerHTML = `
                <option value="">
                    Select a meeting
                </option>
            `;


            meetings.forEach(
                meeting => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        meeting.id;

                    option.textContent =
                        `${meeting.title} - ${
                            new Date(
                                meeting.date
                            ).toLocaleDateString()
                        }`;

                    option.dataset.date =
                        meeting.date;

                    meetingSelect.appendChild(
                        option
                    );

                }
            );


        } catch (error) {

            console.error(
                "Error loading meetings:",
                error
            );

            meetingSelect.innerHTML = `
                <option value="">
                    Unable to load meetings
                </option>
            `;

        }

    }


    loadMeetings();


    /* =================================================
       UPDATE MEETING DATE
    ================================================= */

    meetingSelect.addEventListener(
        "change",
        () => {

            const selectedOption =
                meetingSelect
                    .selectedOptions[0];


            if (
                selectedOption &&
                selectedOption.dataset.date
            ) {

                const date =
                    new Date(
                        selectedOption.dataset.date
                    );


                meetingDate.value =
                    date.toISOString()
                        .split("T")[0];

            } else {

                meetingDate.value = "";

            }

        }
    );

}


/* =====================================================
   SUBMIT ABSENCE REQUEST
===================================================== */

if (excuseForm) {

    excuseForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const token =
                localStorage.getItem("token");


            if (!token) {

                formMessage.textContent =
                    "Please login before submitting a request.";

                formMessage.className =
                    "form-message error";

                return;

            }


            const meetingId =
                Number(
                    meetingSelect.value
                );

            const reason =
                document
                    .getElementById("reason")
                    .value
                    .trim();


            if (!meetingId) {

                formMessage.textContent =
                    "Please select a meeting.";

                formMessage.className =
                    "form-message error";

                return;

            }


            if (!reason) {

                formMessage.textContent =
                    "Please enter a reason.";

                formMessage.className =
                    "form-message error";

                return;

            }


            formMessage.textContent =
                "Submitting request...";

            formMessage.className =
                "form-message";


            try {

                const response =
                    await fetch(
                        "/api/member/absence-requests",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify({
                                    meetingId:
                                        meetingId,

                                    reason:
                                        reason
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to submit request"
                    );

                }


                formMessage.textContent =
                    "Your absence request has been submitted successfully.";

                formMessage.className =
                    "form-message success";


                excuseForm.reset();

                meetingDate.value = "";


                /*
                 * Reload meetings so the
                 * form stays synchronized.
                 */

                if (meetingSelect) {

                    meetingSelect.dispatchEvent(
                        new Event("change")
                    );

                }


            } catch (error) {

                console.error(
                    "Absence request error:",
                    error
                );

                formMessage.textContent =
                    error.message ||
                    "Failed to submit request.";

                formMessage.className =
                    "form-message error";

            }

        }
    );

}
/* =====================================================
   MEMBER LOGIN
===================================================== */

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                document.getElementById(
                    "loginMessage"
                );

            const phone =
                document.getElementById(
                    "phone"
                ).value.trim();

            const password =
                document.getElementById(
                    "password"
                ).value;

            message.textContent =
                "Signing in...";

            message.className =
                "form-message";


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    phone:
                                        phone,

                                    password:
                                        password
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Login failed"
                    );

                }


                /*
                 * Save the JWT token.
                 * Other member services use
                 * this token to authenticate.
                 */

                localStorage.setItem(
                    "token",
                    data.token
                );


                /*
                 * Save the logged-in user
                 * when the backend provides it.
                 */

                if (data.user) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(
                            data.user
                        )
                    );

                }


                message.textContent =
                    "Login successful!";

                message.className =
                    "form-message success";


                /*
                 * Give the user a moment
                 * to see the success message.
                 */

setTimeout(
    () => {

        if (
            data.user &&
            data.user.role === "ADMIN"
        ) {

            window.location.href =
                "admin.html";

        } else {

            window.location.href =
                "index.html#memberDashboard";

        }

    },
    700
);

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                message.textContent =
                    error.message ||
                    "Unable to log in.";

                message.className =
                    "form-message error";

            }

        }
    );

}
/* =====================================================
   MEMBER DASHBOARD
===================================================== */

const memberDashboard =
    document.getElementById("memberDashboard");


if (memberDashboard) {

    const token =
        localStorage.getItem("token");


    // Only show the member dashboard
    // when the user is logged in.
    if (token) {

        loadMemberDashboard();

    }


    async function loadMemberDashboard() {

        try {

            const response =
                await fetch(
                    "/api/member/dashboard",
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to load member dashboard"
                );

            }


            /*
             * Show dashboard
             */

            memberDashboard.style.display =
                "block";


            /*
             * Member information
             */

            const memberName =
                document.getElementById(
                    "memberName"
                );

            const memberFullName =
                document.getElementById(
                    "memberFullName"
                );

            const memberPhone =
                document.getElementById(
                    "memberPhone"
                );


            if (memberName) {

                memberName.textContent =
                    data.member.fullName;

            }


            if (memberFullName) {

                memberFullName.textContent =
                    data.member.fullName;

            }


            if (memberPhone) {

                memberPhone.textContent =
                    data.member.phone;

            }


            /*
             * Payment count
             */

            const memberPaymentCount =
                document.getElementById(
                    "memberPaymentCount"
                );


            if (memberPaymentCount) {

                memberPaymentCount.textContent =
                    data.payments.length;

            }


            /*
             * Payment history
             */

            const memberPayments =
                document.getElementById(
                    "memberPayments"
                );


            if (!memberPayments) {
                return;
            }


            if (!data.payments.length) {

                memberPayments.innerHTML = `
                    <p>
                        No payment records found.
                    </p>
                `;

                return;

            }


            memberPayments.innerHTML =
                data.payments.map(
                    payment => `

                        <div class="payment-item">

                            <div>
                                <strong>
                                    ${payment.type}
                                </strong>

                                <small>
                                    ${payment.month}/${payment.year}
                                </small>
                            </div>

                            <div>
                                <strong>
                                    ${Number(payment.amount).toLocaleString()}
                                    Birr
                                </strong>

                                <small>
                                    ${payment.status}
                                </small>
                            </div>

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Member dashboard error:",
                error
            );

        }

    }


    /*
     * LOGOUT
     */

    const memberLogout =
        document.getElementById(
            "memberLogout"
        );

    if (memberLogout) {

        memberLogout.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                window.location.href =
                    "login.html";

            }
        );

    }


    /*
     * MEMBER ABSENCE REQUEST HISTORY
     */

    const memberAbsenceRequests =
        document.getElementById(
            "memberAbsenceRequests"
        );


    if (memberAbsenceRequests && token) {

        async function loadMemberAbsenceRequests() {

            try {

                const response =
                    await fetch(
                        "/api/member/absence-requests",
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            }
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Unable to load absence requests"
                    );

                }


                if (!data.length) {

                    memberAbsenceRequests.innerHTML = `
                        <p>
                            You have not submitted any absence requests.
                        </p>
                    `;

                    return;

                }


                memberAbsenceRequests.innerHTML =
                    data.map(
                        request => {

                            const meeting =
                                request.meeting || {};


                            const status =
                                request.status ||
                                "PENDING";


                            return `

                                <div
                                    class="payment-item"
                                    style="margin-bottom: 15px;">

                                    <div>

                                        <strong>
                                            ${meeting.title || "Unknown Meeting"}
                                        </strong>

                                        <small>

                                            ${
                                                meeting.date
                                                    ? new Date(
                                                        meeting.date
                                                      ).toLocaleDateString()
                                                    : "Date unavailable"
                                            }

                                        </small>

                                        <small>

                                            Reason:
                                            ${
                                                request.reason ||
                                                "No reason provided"
                                            }

                                        </small>

                                    </div>


                                    <div>

                                        <strong>
                                            ${status}
                                        </strong>

                                    </div>

                                </div>

                            `;

                        }
                    ).join("");


            } catch (error) {

                console.error(
                    "Member absence requests error:",
                    error
                );


                memberAbsenceRequests.innerHTML = `
                    <p>
                        Unable to load absence requests.
                    </p>
                `;

            }

        }


        loadMemberAbsenceRequests();

    }

}
/* =====================================================
   MEMBER DASHBOARD
===================================================== */



/* =====================================================
   ADMIN DASHBOARD
===================================================== */

const absenceRequests =
    document.getElementById("absenceRequests");

const adminMessage =
    document.getElementById("adminMessage");

const adminLogout =
    document.getElementById("adminLogout");


if (absenceRequests) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        absenceRequests.innerHTML = `
            <p>
                Please login first.
            </p>
        `;

    } else {


        async function loadAbsenceRequests() {

            try {

                const response =
                    await fetch(
                        "/api/admin/absence-requests",
                        {
                            method: "GET",

                            headers: {
                                Authorization:
                                    "Bearer " + token
                            }
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to load absence requests"
                    );

                }


                if (!Array.isArray(data)) {

                    throw new Error(
                        "Invalid response from server"
                    );

                }


                if (data.length === 0) {

                    absenceRequests.innerHTML = `
                        <div class="form-card">
                            <h2>
                                No Absence Requests
                            </h2>

                            <p>
                                There are currently no absence requests to review.
                            </p>
                        </div>
                    `;

                    return;

                }


                absenceRequests.innerHTML =
                    data.map(request => {

                        const member =
                            request.member || {};

                        const meeting =
                            request.meeting || {};


                        const status =
                            request.status ||
                            "PENDING";


                        return `

                            <div class="form-card"
                                 style="margin-bottom: 20px;">

                                <div class="form-header">

                                    <h2>
                                        ${member.fullName || "Unknown Member"}
                                    </h2>

                                    <p>
                                        Phone:
                                        ${member.phone || "N/A"}
                                    </p>

                                </div>


                                <p>
                                    <strong>
                                        Meeting:
                                    </strong>

                                    ${meeting.title || "Unknown Meeting"}
                                </p>


                                <p>
                                    <strong>
                                        Date:
                                    </strong>

                                    ${
                                        meeting.date
                                            ? new Date(
                                                meeting.date
                                              ).toLocaleDateString()
                                            : "N/A"
                                    }
                                </p>


                                <p>
                                    <strong>
                                        Reason:
                                    </strong>
                                </p>


                                <p>
                                    ${request.reason || "No reason provided"}
                                </p>


                                <p>
                                    <strong>
                                        Status:
                                    </strong>

                                    ${status}
                                </p>


                                ${
                                    status === "PENDING"
                                    ? `

                                        <div class="hero-actions">

                                            <button
                                                type="button"
                                                class="btn btn-primary approve-request"
                                                data-id="${request.id}">

                                                Approve

                                            </button>


                                            <button
                                                type="button"
                                                class="btn btn-outline reject-request"
                                                data-id="${request.id}">

                                                Reject

                                            </button>

                                        </div>

                                    `
                                    : ""
                                }

                            </div>

                        `;

                    }).join("");


                document
                    .querySelectorAll(".approve-request")
                    .forEach(button => {

                        button.addEventListener(
                            "click",
                            () => updateAbsenceRequest(
                                button.dataset.id,
                                "APPROVED"
                            )
                        );

                    });


                document
                    .querySelectorAll(".reject-request")
                    .forEach(button => {

                        button.addEventListener(
                            "click",
                            () => updateAbsenceRequest(
                                button.dataset.id,
                                "REJECTED"
                            )
                        );

                    });


            } catch (error) {

                console.error(
                    "Admin absence requests error:",
                    error
                );


                absenceRequests.innerHTML = `

                    <div class="form-card">

                        <h2>
                            Unable to load requests
                        </h2>

                        <p>
                            ${error.message}
                        </p>

                    </div>

                `;

            }

        }


        async function updateAbsenceRequest(
            requestId,
            status
        ) {

            try {

                const response =
                    await fetch(
                        `/api/admin/absence-requests/${requestId}/status`,
                        {
                            method: "PATCH",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    "Bearer " + token
                            },

                            body:
                                JSON.stringify({
                                    status: status
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to update request"
                    );

                }


                if (adminMessage) {

                    adminMessage.textContent =
                        status === "APPROVED"
                            ? "Absence request approved."
                            : "Absence request rejected.";

                    adminMessage.className =
                        "form-message success";

                }


                await loadAbsenceRequests();


            } catch (error) {

                console.error(
                    "Update absence request error:",
                    error
                );


                if (adminMessage) {

                    adminMessage.textContent =
                        error.message ||
                        "Failed to update request.";

                    adminMessage.className =
                        "form-message error";

                }

            }

        }


        loadAbsenceRequests();

    }

}


/* =====================================================
   ADMIN LOGOUT
===================================================== */

if (adminLogout) {

    adminLogout.addEventListener(
        "click",
        event => {

            event.preventDefault();

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );

            window.location.href =
                "login.html";

        }
    );

}
/* =====================================================
   ADMIN - CREATE ANNOUNCEMENT
===================================================== */

const announcementForm =
    document.getElementById("announcementForm");


if (announcementForm) {

    announcementForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const token =
                localStorage.getItem("token");


            const title =
                document.getElementById(
                    "announcementTitle"
                ).value.trim();


            const content =
                document.getElementById(
                    "announcementContent"
                ).value.trim();


            if (!token) {

                alert("Please login as an administrator.");

                return;

            }


            try {

                const response =
                    await fetch(
                        "/api/admin/announcements",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                title: title,
                                content: content
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to create announcement"
                    );

                }


                announcementForm.reset();


                if (adminMessage) {

                    adminMessage.textContent =
                        "Announcement published successfully.";

                    adminMessage.className =
                        "form-message success";

                }


            } catch (error) {

                console.error(
                    "Create announcement error:",
                    error
                );


                if (adminMessage) {

                    adminMessage.textContent =
                        error.message ||
                        "Failed to publish announcement.";

                    adminMessage.className =
                        "form-message error";

                }

            }

        }
    );

}
/* =====================================================
   COMMUNITY ANNOUNCEMENTS
===================================================== */

const announcementsList =
    document.getElementById("announcementsList");


if (announcementsList) {

    async function loadAnnouncements() {

        try {

            const token =
    localStorage.getItem("token");

const response =
    await fetch(
        "/api/announcements",
        {
            method: "GET",

            headers: {
                "Authorization":
                    `Bearer ${token}`
            }
        }
    );

            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to load announcements"
                );

            }


            if (!data.length) {

                announcementsList.innerHTML = `
                    <p>
                        No announcements at this time.
                    </p>
                `;

                return;

            }


            announcementsList.innerHTML =
                data.map(
                    announcement => `

                        <div
                            class="payment-item"
                            style="margin-bottom: 15px;">

                            <div>

                                <strong>
                                    ${announcement.title}
                                </strong>

                                <small>
                                    ${
                                        new Date(
                                            announcement.createdAt
                                        ).toLocaleDateString()
                                    }
                                </small>

                                <p>
                                    ${announcement.content}
                                </p>

                            </div>

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Announcements error:",
                error
            );


            announcementsList.innerHTML = `
                <p>
                    Unable to load announcements.
                </p>
            `;

        }

    }


    loadAnnouncements();

}
/*
=====================================================
   ADMIN - CREATE MEETING
=====================================================
*/

const meetingForm =
    document.getElementById("meetingForm");

if (meetingForm) {

    meetingForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const token =
                localStorage.getItem("token");

            const title =
                document.getElementById(
                    "meetingTitle"
                ).value;

            const date =
                document.getElementById(
                    "meetingDate"
                ).value;

            const location =
                document.getElementById(
                    "meetingLocation"
                ).value;

            const description =
                document.getElementById(
                    "meetingDescription"
                ).value;


            if (!token) {

                alert(
                    "Please login as an administrator."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/meetings",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    "Bearer " + token
                            },

                            body:
                                JSON.stringify({
                                    title:
                                        title,

                                    date:
                                        date,

                                    location:
                                        location,

                                    description:
                                        description
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to create meeting"
                    );

                }


                if (adminMessage) {

                    adminMessage.textContent =
                        "Meeting created successfully.";

                    adminMessage.className =
                        "form-message success";

                }


                meetingForm.reset();


            } catch (error) {

                console.error(
                    "Create meeting error:",
                    error
                );


                if (adminMessage) {

                    adminMessage.textContent =
                        error.message ||
                        "Failed to create meeting.";

                    adminMessage.className =
                        "form-message error";

                }

            }

        }
    );
/*
=====================================================
   COMMUNITY MEETINGS
=====================================================
*/

const meetingsList =
    document.getElementById("meetingsList");

if (meetingsList) {

    async function loadMeetings() {

        try {

            const token =
                localStorage.getItem("token");

            if (!token) {

                meetingsList.innerHTML = `
                    <p>
                        Please login to view meetings.
                    </p>
                `;

                return;
            }


            const response =
                await fetch(
                    "/api/meetings",
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                "Bearer " + token
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to load meetings"
                );

            }


            if (!data.length) {

                meetingsList.innerHTML = `
                    <p>
                        No meetings have been scheduled.
                    </p>
                `;

                return;
            }


            meetingsList.innerHTML =
                data.map(
                    meeting => `

                        <div
                            class="payment-item"
                            style="margin-bottom: 15px;">

                            <div>

                                <strong>
                                    ${meeting.title}
                                </strong>

                                <small>
                                    Date:
                                    ${
                                        meeting.date
                                            ? new Date(
                                                meeting.date
                                              ).toLocaleString()
                                            : "Date unavailable"
                                    }
                                </small>

                                <small>
                                    Location:
                                    ${
                                        meeting.location ||
                                        "Location unavailable"
                                    }
                                </small>

                                ${
                                    meeting.description
                                        ? `
                                            <small>
                                                ${
                                                    meeting.description
                                                }
                                            </small>
                                          `
                                        : ""
                                }

                            </div>

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Meetings error:",
                error
            );


            meetingsList.innerHTML = `
                <p>
                    Unable to load meetings.
                </p>
            `;

        }

    }


    loadMeetings();

}
}
/*
=====================================================
   ADMIN - PAYMENT MANAGEMENT
=====================================================
*/

async function loadAdminPayments() {

    const paymentsContainer =
        document.getElementById("adminPayments");

    if (!paymentsContainer) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        /*
         * Load payment summary
         */

        const summaryResponse =
            await fetch(
                "/api/payments/summary",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const summary =
            await summaryResponse.json();

        if (!summaryResponse.ok) {
            throw new Error(
                summary.error ||
                "Failed to load payment summary"
            );
        }


        const totalPayments =
            document.getElementById(
                "adminTotalPayments"
            );

        const totalCollected =
            document.getElementById(
                "adminTotalCollected"
            );


        if (totalPayments) {

            totalPayments.textContent =
                summary.totalPayments;

        }


        if (totalCollected) {

            totalCollected.textContent =
                Number(
                    summary.totalCollected
                ).toLocaleString();

        }


        /*
         * Load all payments
         */

        const response =
            await fetch(
                "/api/payments",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const payments =
            await response.json();


        if (!response.ok) {

            throw new Error(
                payments.error ||
                "Failed to load payments"
            );

        }


        if (!payments.length) {

            paymentsContainer.innerHTML = `
                <p>
                    No payment records found.
                </p>
            `;

            return;

        }


        paymentsContainer.innerHTML =
            payments.map(payment => `

                <div
                    class="payment-item"
                    style="
                        margin-bottom: 15px;
                        padding: 18px;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                    ">

                    <div>

                        <strong>
                            Payment #${payment.id}
                        </strong>

                        <small>
                            Member ID:
                            ${payment.memberId}
                        </small>

                        <small>
                            ${payment.type || "PAYMENT"}
                            -
                            ${payment.month || "-"}
                            /
                            ${payment.year || "-"}
                        </small>

                    </div>


                    <div>

                        <strong>
                            ${Number(
                                payment.amount
                            ).toLocaleString()}
                            Birr
                        </strong>

                        <small>
                            Method:
                            ${payment.method || "-"}
                        </small>

                        <small>
                            Status:
                            ${payment.status}
                        </small>

                    </div>


                    <div
                        style="
                            margin-top: 12px;
                            display: flex;
                            gap: 10px;
                            flex-wrap: wrap;
                        ">

                        <button
                            class="btn btn-primary"
                            type="button"
                            onclick="updatePaymentStatus(
                                ${payment.id},
                                'VERIFIED'
                            )">

                            Verify

                        </button>


                        <button
                            class="btn"
                            type="button"
                            onclick="updatePaymentStatus(
                                ${payment.id},
                                'REJECTED'
                            )">

                            Reject

                        </button>

                    </div>

                </div>

            `).join("");


    } catch (error) {

        console.error(
            "Admin payment error:",
            error
        );

        paymentsContainer.innerHTML = `
            <p class="form-message error">
                ${error.message}
            </p>
        `;

    }

}


/*
=====================================================
   UPDATE PAYMENT STATUS
=====================================================
*/

async function updatePaymentStatus(
    paymentId,
    status
) {

    const token =
        localStorage.getItem("token");


    if (!token) {

        window.location.href =
            "login.html";

        return;

    }


    const confirmed =
        confirm(
            `Are you sure you want to mark payment #${paymentId} as ${status}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/payments/${paymentId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body:
                        JSON.stringify({
                            status: status
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to update payment"
            );

        }


        alert(
            "Payment status updated successfully."
        );


        loadAdminPayments();


    } catch (error) {

        console.error(
            "Payment status error:",
            error
        );

        alert(
            error.message ||
            "Failed to update payment status."
        );

    }

}


/*
=====================================================
   LOAD ADMIN PAYMENTS
=====================================================
*/

if (
    document.getElementById(
        "adminPayments"
    )
) {

    loadAdminPayments();

}

/*
=====================================================
   MONTHLY PAYMENT STATUS
=====================================================
*/

async function loadMonthlyPaymentStatus() {

    const monthInput =
        document.getElementById("paymentStatusMonth");

    const yearInput =
        document.getElementById("paymentStatusYear");

    const totalMembers =
        document.getElementById("monthlyTotalMembers");

    const paidMembers =
        document.getElementById("monthlyPaidMembers");

    const unpaidMembers =
        document.getElementById("monthlyUnpaidMembers");

    const unpaidList =
        document.getElementById("monthlyUnpaidList");


    if (
        !monthInput ||
        !yearInput ||
        !totalMembers ||
        !paidMembers ||
        !unpaidMembers ||
        !unpaidList
    ) {
        return;
    }


    const month =
        Number(monthInput.value);

    const year =
        Number(yearInput.value);


    if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
    ) {

        alert("Please select a valid month.");

        return;
    }


    if (
        !Number.isInteger(year) ||
        year < 2000
    ) {

        alert("Please enter a valid year.");

        return;
    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        window.location.href =
            "login.html";

        return;
    }


    unpaidList.innerHTML = `
        <p>
            Loading payment status...
        </p>
    `;


    try {

        const response =
            await fetch(
                `/api/admin/payments/unpaid?month=${month}&year=${year}`,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to load payment status."
            );

        }


        totalMembers.textContent =
            data.totalMembers;

        paidMembers.textContent =
            data.paidMembers;

        unpaidMembers.textContent =
            data.unpaidMembers;


        if (!data.members || !data.members.length) {

            unpaidList.innerHTML = `
                <div class="form-message success">

                    <strong>
                        All members have paid.
                    </strong>

                    <p>
                        There are no unpaid members
                        for ${month}/${year}.
                    </p>

                </div>
            `;

            return;
        }


        unpaidList.innerHTML = `

            <h3>
                Unpaid Members
            </h3>

            <p>
                ${data.unpaidMembers}
                member(s) have not paid for
                ${month}/${year}.
            </p>


            <div>

                ${data.members.map(member => `

                    <div
                        class="payment-item"
                        style="
                            margin-bottom: 12px;
                            padding: 15px;
                            border: 1px solid #ddd;
                            border-radius: 10px;
                        ">

                        <strong>
                            ${member.fullName}
                        </strong>

                        <small>
                            Member ID:
                            ${member.id}
                        </small>

                        <small>
                            Phone:
                            ${member.phone || "-"}
                        </small>

                    </div>

                `).join("")}

            </div>

        `;


    } catch (error) {

        console.error(
            "Monthly payment status error:",
            error
        );

        unpaidList.innerHTML = `
            <p class="form-message error">
                ${error.message}
            </p>
        `;

    }

}


