import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyBQCqtKKHXUdBrSvKvQFN1hHct119Yp-Yo",
  authDomain: "flo-property-media-fbbf4.firebaseapp.com",
  projectId: "flo-property-media-fbbf4",
  storageBucket: "flo-property-media-fbbf4.firebasestorage.app",
  messagingSenderId: "779116796984",
  appId: "1:779116796984:web:23a54ccbbee15491611acd",
  measurementId: "G-52R9RP4JWM"
};


// ======================================================
// INITIALISE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();


// ======================================================
// ADMIN EMAIL
// ======================================================

const ADMIN_EMAIL = "flopropertymedia@gmail.com";

// ======================================================
// CUSTOMER EMAIL — CLOUDFLARE WORKER
// ======================================================

const BOOKING_EMAIL_WORKER =
  "https://flo-booking-email.flopropertymedia.workers.dev";


async function sendCustomerBookingEmail(booking, statusData) {

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Admin authentication required."
    );
  }

  const idToken =
    await user.getIdToken();

  const response =
    await fetch(
      BOOKING_EMAIL_WORKER,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${idToken}`
        },

        body: JSON.stringify({

          // --------------------------------------------------
          // CUSTOMER DETAILS
          // --------------------------------------------------

          customerName:
            booking.name ||
            booking.clientName ||
            "",

          customerEmail:
            booking.email ||
            "",

          mobile:
            booking.mobile ||
            "",

          // --------------------------------------------------
          // PROPERTY
          // --------------------------------------------------

          propertyAddress:
            booking.propertyAddress ||
            booking.address ||
            "",

          // --------------------------------------------------
          // BOOKING DATE / TIME
          // --------------------------------------------------

          preferredDate:
            booking.preferredDate ||
            booking.date ||
            "",

          preferredTime:
            booking.preferredTime ||
            "",

          proposedDate:
            booking.proposedDate ||
            "",

          proposedTime:
            booking.proposedTime ||
            "",

          // --------------------------------------------------
          // SERVICES / PACKAGE
          // --------------------------------------------------

          packageName:
            booking.package ||
            booking.packageName ||
            "",

          services:
            Array.isArray(
              booking.services
            )
              ? booking.services
              : [],

          // --------------------------------------------------
          // PAYMENT / MESSAGE
          // --------------------------------------------------

          paymentMethod:
            booking.paymentMethod ||
            "",

          message:
            booking.message ||
            "",

          // --------------------------------------------------
          // BOOKING INFORMATION
          // --------------------------------------------------

          source:
            booking.source ||
            "Website booking form",

          createdAt:
            booking.createdAt ||
            null,

          // --------------------------------------------------
          // PROPOSAL / DECLINE INFORMATION
          // --------------------------------------------------

          proposalMessage:
            booking.proposalMessage ||
            "",

          declineReason:
            booking.declineReason ||
            "",

          declineMessage:
            booking.declineMessage ||
            "",

          // --------------------------------------------------
          // STATUS DATA
          // --------------------------------------------------

          ...statusData

        })
      }
    );

  const result =
    await response.json();

  if (!response.ok) {

    throw new Error(
      result.error ||
      "Customer email could not be sent."
    );

  }

  return result;

}

// ======================================================
// DOM ELEMENTS
// ======================================================

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");

const googleLogin = document.getElementById("googleLogin");
const logoutButton = document.getElementById("logoutButton");

const loginError = document.getElementById("loginError");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userInitial = document.getElementById("userInitial");

const pageTitle = document.getElementById("pageTitle");


// ======================================================
// GOOGLE LOGIN
// ======================================================

googleLogin.addEventListener("click", async () => {

  loginError.textContent = "";

  googleLogin.disabled = true;

  googleLogin.innerHTML = `
    <span>Signing in...</span>
  `;

  try {

    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    const user = result.user;

    if (
      user.email !== ADMIN_EMAIL ||
      !user.emailVerified
    ) {

      await signOut(auth);

      throw new Error(
        "This Google account is not authorised for the FLO admin portal."
      );
    }

  } catch (error) {

    console.error(error);

    loginError.textContent =
      error.message ||
      "Unable to sign in. Please try again.";

    googleLogin.disabled = false;

    googleLogin.innerHTML = `
      <span class="google-icon">G</span>
      <span>Continue with Google</span>
    `;
  }

});


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    loginScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");

    return;
  }


  // Extra frontend protection
  if (
    user.email !== ADMIN_EMAIL ||
    !user.emailVerified
  ) {

    await signOut(auth);

    loginError.textContent =
      "This Google account is not authorised for the FLO admin portal.";

    return;
  }


  // Show dashboard

  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");


  // User information

  userName.textContent =
    user.displayName || "FLO Admin";

  userEmail.textContent =
    user.email;

  userInitial.textContent =
    (
      user.displayName ||
      user.email ||
      "F"
    )
      .charAt(0)
      .toUpperCase();


  // Load dashboard data

  await loadDashboard();
});


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener("click", async () => {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }

});


// ======================================================
// NAVIGATION
// ======================================================

const navItems =
  document.querySelectorAll(".nav-item");

const sections = {
  overview: document.getElementById("overviewSection"),
  bookings: document.getElementById("bookingsSection"),
  clients: document.getElementById("clientsSection"),
  projects: document.getElementById("projectsSection"),
  quotes: document.getElementById("quotesSection")
};


function showSection(sectionName) {

  Object.values(sections).forEach(section => {
    section.classList.add("hidden");
  });


  if (sections[sectionName]) {
    sections[sectionName].classList.remove("hidden");
  }


  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.section === sectionName
    );

  });


  const titles = {
    overview: "Overview",
    bookings: "Bookings",
    clients: "Clients",
    projects: "Projects",
    quotes: "Quotes"
  };

  pageTitle.textContent =
    titles[sectionName] || "Overview";
}


navItems.forEach(item => {

  item.addEventListener("click", () => {

    showSection(
      item.dataset.section
    );

  });

});


document
  .querySelectorAll("[data-section-link]")
  .forEach(button => {

    button.addEventListener("click", () => {

      showSection(
        button.dataset.sectionLink
      );

    });

  });


// ======================================================
// FIRESTORE
// ======================================================

async function getCollectionCount(collectionName) {

  try {

    const snapshot =
      await getDocs(
        collection(db, collectionName)
      );

    return snapshot.size;

  } catch (error) {

    console.error(
      `Unable to load ${collectionName}:`,
      error
    );

    return 0;
  }
}


// ======================================================
// BOOKING MANAGEMENT STATE
// ======================================================

let currentBookings = [];
let activeBooking = null;


// ======================================================
// LOAD DASHBOARD
// ======================================================

async function loadDashboard() {

  console.log("Loading FLO admin dashboard...");

  // -----------------------------------------
  // BOOKINGS
  // -----------------------------------------

  try {

    const bookingsSnapshot =
      await getDocs(
        collection(db, "bookings")
      );

    console.log(
      "Bookings loaded:",
      bookingsSnapshot.size
    );


    const bookingData =
      bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));


    const newBookings =
      bookingData.filter(
        booking =>
          !booking.status ||
          booking.status === "New"
      );


    const confirmedBookings =
      bookingData.filter(
        booking =>
          booking.status === "Confirmed"
      );


    document.getElementById(
      "newBookingsCount"
    ).textContent =
      newBookings.length;


    document.getElementById(
      "upcomingCount"
    ).textContent =
      confirmedBookings.length;


    renderBookings(bookingData);

    renderRecentBookings(bookingData);


  } catch (error) {

    console.error(
      "BOOKINGS ERROR:",
      error
    );

    const bookingsList =
      document.getElementById("bookingsList");

    if (bookingsList) {
      bookingsList.innerHTML =
        "Unable to load bookings.";
    }

  }


  // -----------------------------------------
  // CLIENTS
  // -----------------------------------------

  try {

    const clientsSnapshot =
      await getDocs(
        collection(db, "clients")
      );


    document.getElementById(
      "clientsCount"
    ).textContent =
      clientsSnapshot.size;


    renderClients(clientsSnapshot);


  } catch (error) {

    console.error(
      "CLIENTS ERROR:",
      error
    );

    document.getElementById(
      "clientsCount"
    ).textContent = "0";

  }


  // -----------------------------------------
  // PROJECTS
  // -----------------------------------------

  try {

    const projectsSnapshot =
      await getDocs(
        collection(db, "projects")
      );


    document.getElementById(
      "projectsCount"
    ).textContent =
      projectsSnapshot.size;


    renderProjects(projectsSnapshot);


  } catch (error) {

    console.error(
      "PROJECTS ERROR:",
      error
    );

    document.getElementById(
      "projectsCount"
    ).textContent = "0";

  }


  // -----------------------------------------
  // QUOTES
  // -----------------------------------------

  try {

    const quotesSnapshot =
      await getDocs(
        collection(db, "quotes")
      );


    renderQuotes(quotesSnapshot);


  } catch (error) {

    console.error(
      "QUOTES ERROR:",
      error
    );

  }


  console.log(
    "FLO admin dashboard finished loading."
  );

}


// ======================================================
// BOOKINGS
// ======================================================

function renderBookings(bookings) {

  const container =
    document.getElementById("bookingsList");

  currentBookings = bookings;

  if (!bookings.length) {
    container.innerHTML = `
      <div class="booking-empty">
        No bookings yet.
      </div>
    `;
    return;
  }


  // -----------------------------------------
  // DATE SORTING
  // -----------------------------------------

  function getBookingDate(booking) {

    const date =
      booking.status === "Date Proposed"
        ? booking.proposedDate
        : booking.preferredDate;

    if (!date) {
      return Number.MAX_SAFE_INTEGER;
    }

    const parsed =
      new Date(date);

    return isNaN(parsed.getTime())
      ? Number.MAX_SAFE_INTEGER
      : parsed.getTime();
  }


  // -----------------------------------------
  // STATUS GROUPS
  // -----------------------------------------

  const groups = [
  {
    status: "New",
    label: "NEW",
    className: "booking-group-new"
  },
  {
    status: "Confirmed",
    label: "ACCEPTED",
    className: "booking-group-confirmed"
  },
  {
    status: "Date Proposed",
    label: "DATE PROPOSED",
    className: "booking-group-proposed"
  },
  {
    status: "Declined",
    label: "DECLINED",
    className: "booking-group-declined"
  },
  {
    status: "Completed",
    label: "COMPLETED",
    className: "booking-group-completed"
  },
  {
    status: "Closed",
    label: "CLOSED",
    className: "booking-group-closed"
  }
];


  let output = "";


  // -----------------------------------------
  // RENDER EACH GROUP
  // -----------------------------------------

groups.forEach(group => {
    const groupBookings =
      bookings
        .filter(booking => {

          const status =
            booking.status || "New";

          return group.status === status;

        })
        .sort(
          (a, b) =>
            getBookingDate(a) -
            getBookingDate(b)
        );


    if (!groupBookings.length) {
      return;
    }


    output += `

      <div class="booking-status-group ${group.className}">

        <div class="booking-status-group-header">

          <span>
            ${group.label}
          </span>

          <small>
            ${groupBookings.length}
          </small>

        </div>

        <div class="booking-group-list">

          ${groupBookings
            .map(booking => {

              const client =
                booking.clientName ||
                booking.name ||
                "—";


              const property =
                booking.propertyAddress ||
                booking.address ||
                "—";


              const date =
                booking.status === "Date Proposed"
                  ? (
                      booking.proposedDate ||
                      booking.preferredDate ||
                      "—"
                    )
                  : (
                      booking.preferredDate ||
                      booking.date ||
                      "—"
                    );


              const packageName =
                booking.package ||
                booking.packageName ||
                "—";


              const status =
                booking.status ||
                "New";


              return `

                <button
                  type="button"
                  class="booking-row"
                  data-booking-id="${booking.id}"
                >

                  <span>
                    ${escapeHTML(client)}
                  </span>

                  <span>
                    ${escapeHTML(property)}
                  </span>

                  <span>
                    ${escapeHTML(date)}
                  </span>

                  <span>
                    ${escapeHTML(packageName)}
                  </span>

                  <span>

                    <b class="status-badge status-${status
                      .toLowerCase()
                      .replaceAll(" ", "-")}"
                    >
                      ${escapeHTML(status)}
                    </b>

                  </span>

                </button>

              `;

            })
            .join("")}

        </div>

      </div>

    `;

  });


  if (!output) {

    output = `
      <div class="booking-empty">
        No active bookings.
      </div>
    `;

  }


  container.innerHTML =
    output;


  // -----------------------------------------
  // CLICK HANDLERS
  // -----------------------------------------

  container
    .querySelectorAll(".booking-row")
    .forEach(row => {

      row.addEventListener(
        "click",
        () => {

          const bookingId =
            row.dataset.bookingId;

          openBookingModal(
            bookingId
          );

        }
      );

    });

}

// ======================================================
// BOOKING MODAL
// ======================================================

function openBookingModal(bookingId) {

  activeBooking =
    currentBookings.find(
      booking => booking.id === bookingId
    );


  if (!activeBooking) {
    return;
  }


  let modal =
    document.getElementById("bookingModal");


  if (!modal) {

    createBookingModal();

    modal =
      document.getElementById("bookingModal");

  }


  populateBookingModal();

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");
}


function createBookingModal() {

  const modal =
    document.createElement("div");

  modal.id = "bookingModal";

  modal.className = "booking-modal hidden";


  modal.innerHTML = `

    <div class="booking-modal-overlay"
         data-close-booking-modal></div>


    <div class="booking-modal-card">

      <button
        type="button"
        class="booking-modal-close"
        data-close-booking-modal
        aria-label="Close"
      >
        ×
      </button>


      <div class="booking-modal-header">

        <span class="panel-eyebrow">
          BOOKING
        </span>

        <h2 id="bookingModalName">
          Booking
        </h2>

        <div id="bookingModalStatus"></div>

      </div>


      <div class="booking-details">


        <div class="booking-detail">

          <span>PROPERTY</span>

          <strong id="bookingModalProperty">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>EMAIL</span>

          <strong id="bookingModalEmail">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>MOBILE</span>

          <strong id="bookingModalMobile">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>REQUESTED DATE</span>

          <strong id="bookingModalDate">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>PREFERRED TIME</span>

          <strong id="bookingModalTime">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>PACKAGE</span>

          <strong id="bookingModalPackage">
            —
          </strong>

        </div>


        <div class="booking-detail">

          <span>PAYMENT</span>

          <strong id="bookingModalPayment">
            —
          </strong>

        </div>


        <div class="booking-detail booking-detail-full">

          <span>SERVICES</span>

          <div id="bookingModalServices">
            —
          </div>

        </div>


        <div class="booking-detail booking-detail-full">

          <span>CLIENT MESSAGE</span>

          <p id="bookingModalMessage">
            —
          </p>

        </div>


      </div>


      <div class="booking-actions">

  <button
    type="button"
    class="booking-action booking-action-primary"
    id="acceptBookingButton"
  >
    Accept booking
  </button>

  <button
    type="button"
    class="booking-action"
    id="proposeDateButton"
  >
    Propose different date
  </button>

  <button
    type="button"
    class="booking-action booking-action-danger"
    id="declineBookingButton"
  >
    Decline / booked out
  </button>

  <button
    type="button"
    class="booking-action booking-action-complete"
    id="completeBookingButton"
  >
    Complete booking
  </button>

  <button
    type="button"
    class="booking-action booking-action-close"
    id="closeBookingButton"
  >
    Close request
  </button>

  <button
    type="button"
    class="booking-action booking-action-delete"
    id="deleteBookingButton"
  >
    Delete booking
  </button>

</div>

  `;


  document.body.appendChild(modal);


  modal
    .querySelectorAll("[data-close-booking-modal]")
    .forEach(element => {

      element.addEventListener(
        "click",
        closeBookingModal
      );

    });


  document
    .getElementById("acceptBookingButton")
    .addEventListener(
      "click",
      acceptBooking
    );


  document
    .getElementById("proposeDateButton")
    .addEventListener(
      "click",
      proposeBookingDate
    );


  document
    .getElementById("declineBookingButton")
    .addEventListener(
      "click",
      declineBooking
    );
  document
    .getElementById("completeBookingButton")
    .addEventListener(
      "click",
      completeBooking
    );
  document
  .getElementById("closeBookingButton")
  .addEventListener(
    "click",
    closeBooking
  );

document
  .getElementById("deleteBookingButton")
  .addEventListener(
    "click",
    deleteBooking
  );
}


function populateBookingModal() {

  const booking =
    activeBooking;


  document.getElementById(
    "bookingModalName"
  ).textContent =
    booking.name ||
    booking.clientName ||
    "Booking";


  document.getElementById(
    "bookingModalProperty"
  ).textContent =
    booking.propertyAddress ||
    booking.address ||
    "—";


  document.getElementById(
    "bookingModalEmail"
  ).textContent =
    booking.email ||
    "—";


  document.getElementById(
    "bookingModalMobile"
  ).textContent =
    booking.mobile ||
    "—";


  document.getElementById(
    "bookingModalDate"
  ).textContent =
    booking.preferredDate ||
    booking.date ||
    "—";


  document.getElementById(
    "bookingModalTime"
  ).textContent =
    booking.preferredTime ||
    "—";


  document.getElementById(
    "bookingModalPackage"
  ).textContent =
    booking.package ||
    booking.packageName ||
    "—";


  document.getElementById(
    "bookingModalPayment"
  ).textContent =
    booking.paymentMethod ||
    "—";


  const services =
    Array.isArray(booking.services)
      ? booking.services
      : [];


  document.getElementById(
    "bookingModalServices"
  ).innerHTML =
    services.length
      ? services
          .map(service => `
            <span class="service-tag">
              ${escapeHTML(service)}
            </span>
          `)
          .join("")
      : "—";


  document.getElementById(
    "bookingModalMessage"
  ).textContent =
    booking.message ||
    "No message provided.";


  const status =
    booking.status ||
    "New";


  document.getElementById(
    "bookingModalStatus"
  ).innerHTML = `
    <span class="status-badge status-${status
      .toLowerCase()
      .replaceAll(" ", "-")}">
      ${escapeHTML(status)}
    </span>
  `;


  const message =
    document.getElementById(
      "bookingActionMessage"
    );

  message.textContent = "";


  // Disable actions where appropriate

  const acceptButton =
    document.getElementById(
      "acceptBookingButton"
    );

  const proposeButton =
    document.getElementById(
      "proposeDateButton"
    );

  const declineButton =
    document.getElementById(
      "declineBookingButton"
    );


  acceptButton.disabled =
  status !== "New";

proposeButton.disabled =
  status !== "New";

declineButton.disabled =
  status !== "New" &&
  status !== "Date Proposed";

const completeButton =
  document.getElementById(
    "completeBookingButton"
  );

if (completeButton) {

  completeButton.disabled =
    status !== "Confirmed" &&
    status !== "Date Proposed";

}
const closeButton =
  document.getElementById(
    "closeBookingButton"
  );

if (closeButton) {

  closeButton.disabled =
    status !== "Declined";

}

const deleteButton =
  document.getElementById(
    "deleteBookingButton"
  );

if (deleteButton) {

  deleteButton.disabled =
    status !== "Completed" &&
    status !== "Closed";

}
}


function closeBookingModal() {

  const modal =
    document.getElementById(
      "bookingModal"
    );


  if (modal) {
    modal.classList.add("hidden");
  }


  document.body.classList.remove(
    "modal-open"
  );

  activeBooking = null;
}

// ======================================================
// ACCEPT BOOKING
// ======================================================

async function acceptBooking() {

  if (!activeBooking) {
    return;
  }

  // Prevent duplicate confirmation emails
  if (activeBooking.confirmedEmailSentAt) {
    showBookingActionMessage(
      "This booking has already been confirmed and the customer has already been notified.",
      "info"
    );
    return;
  }

  const confirmed =
    confirm("Confirm this booking and notify the customer?");

  if (!confirmed) {
    return;
  }

  const button =
    document.querySelector("#bookingConfirmBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Confirming...";
  }

  try {

    // Update booking status
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        status: "Confirmed",
        confirmedAt: serverTimestamp()
      }
    );

    // Send customer email
    await sendCustomerBookingEmail(
      activeBooking,
      {
        status: "Confirmed"
      }
    );

    // Mark confirmation email as sent
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        confirmedEmailSentAt: serverTimestamp()
      }
    );

    // Update local booking object
    activeBooking.status = "Confirmed";
    activeBooking.confirmedEmailSentAt = true;

    // Refresh dashboard
    await loadDashboard();

    closeBookingModal();

    showBookingActionMessage(
      "Booking confirmed and customer notified.",
      "success"
    );

  } catch (error) {

    console.error(
      "Accept booking error:",
      error
    );

    showBookingActionMessage(
      "Booking was updated, but the customer email could not be sent. Please try again.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Accept Booking";
    }
  }
}

// ======================================================
// COMPLETE BOOKING
// ======================================================

async function completeBooking() {

  if (!activeBooking) {
    return;
  }

  if (activeBooking.completedEmailSentAt) {

  showBookingActionMessage(
    "Completion email has already been sent for this booking."
  );

  return;
}

  const confirmed =
    confirm(
      "Mark this booking as completed?\n\nThis will send a completion email to the customer and a confirmation email to FLO."
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "completeBookingButton"
    );


  button.disabled = true;

  button.textContent =
    "Completing…";


  try {

    // --------------------------------------------------
    // 1. Send completion emails first
    // --------------------------------------------------

    await sendCustomerBookingEmail(
      activeBooking,
      {
        status: "Completed"
      }
    );


    // --------------------------------------------------
    // 2. Mark booking as completed
    // --------------------------------------------------

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status: "Completed",

        completedAt:
          serverTimestamp(),

        completedEmailSentAt:
          serverTimestamp()
      }
    );


    // --------------------------------------------------
    // 3. Update local booking
    // --------------------------------------------------

    activeBooking.status =
      "Completed";

    activeBooking.completedAt =
      new Date();

    activeBooking.completedEmailSentAt =
      new Date();


    // --------------------------------------------------
    // 4. Refresh booking lists
    // --------------------------------------------------

    renderBookings(
      currentBookings
    );

    renderRecentBookings(
      currentBookings
    );

    populateBookingModal();


    showBookingActionMessage(
      "Booking completed successfully."
    );


  } catch (error) {

    console.error(
      "Complete booking error:",
      error
    );


    showBookingActionMessage(
      error.message ||
      "Unable to complete this booking.",
      true
    );


    button.disabled = false;

    button.textContent =
      "Complete booking";

  }

}

// ======================================================
// PROPOSE DIFFERENT DATE
// ======================================================

async function proposeBookingDate() {

  if (!activeBooking) {
    return;
  }

  // Prevent duplicate proposal emails
  if (activeBooking.proposedEmailSentAt) {
    showBookingActionMessage(
      "An alternative date has already been proposed and the customer has already been notified.",
      "info"
    );
    return;
  }

  const date =
    prompt(
      "Enter the proposed date (e.g. 15/10/2026):"
    );

  if (!date) {
    return;
  }

  const time =
    prompt(
      "Enter the proposed time (e.g. 2:00 PM):"
    );

  if (!time) {
    return;
  }

  const messageOptions = [
  {
    name: "Requested time unavailable",
    text: "Unfortunately, we’re unavailable at the requested time. We’d be happy to accommodate your booking on the alternative date and time below."
  },
  {
    name: "Scheduling adjustment",
    text: "We’ve had a scheduling adjustment and would like to offer you the alternative date and time below."
  },
  {
    name: "Earlier appointment available",
    text: "We have an earlier appointment available and would be happy to accommodate your booking at the alternative date and time below."
  },
  {
    name: "Later appointment available",
    text: "We have a later appointment available and would be happy to accommodate your booking at the alternative date and time below."
  },
  {
    name: "Other",
    text: ""
  }
];

const messageMenu =
  messageOptions
    .map(
      (option, index) =>
        `${index + 1}. ${option.name}`
    )
    .join("\n");

const messageSelection =
  prompt(
    `Select a message for the customer:\n\n${messageMenu}\n\nEnter the number:`
  );

if (!messageSelection) {
  return;
}

const messageIndex =
  Number(messageSelection) - 1;

if (
  !Number.isInteger(messageIndex) ||
  messageIndex < 0 ||
  messageIndex >= messageOptions.length
) {
  alert("Please select a valid message.");
  return;
}

let message =
  messageOptions[messageIndex].text;

if (messageOptions[messageIndex].name === "Other") {

  message =
    prompt(
      "Enter your message for the customer:"
    );

  if (!message) {
    return;
  }
}

  const confirmed =
    confirm(
      `Propose ${date} at ${time} to the customer?`
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.querySelector("#bookingProposeBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  try {

    // Save proposed date to Firestore
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        status: "Date Proposed",
        proposedDate: date,
        proposedTime: time,
        proposalMessage: message,
        proposedAt: serverTimestamp()
      }
    );

    // Send customer email
    await sendCustomerBookingEmail(
      activeBooking,
      {
        status: "Date Proposed",
        proposedDate: date,
        proposedTime: time,
        proposalMessage: message
      }
    );

    // Mark proposal email as sent
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        proposedEmailSentAt: serverTimestamp()
      }
    );

    // Update local booking object
    activeBooking.status = "Date Proposed";
    activeBooking.proposedDate = date;
    activeBooking.proposedTime = time;
    activeBooking.proposalMessage = message;
    activeBooking.proposedEmailSentAt = true;

    // Refresh dashboard
    await loadDashboard();

    closeBookingModal();

    showBookingActionMessage(
      "Alternative date saved and customer notified.",
      "success"
    );

  } catch (error) {

    console.error(
      "Propose booking error:",
      error
    );

    showBookingActionMessage(
      "The alternative date was saved, but the customer email could not be sent. Please try again.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Propose New Date";
    }
  }
}


// ======================================================
// DECLINE BOOKING
// ======================================================

async function declineBooking() {

  if (!activeBooking) {
    return;
  }

  // Prevent duplicate decline emails
  if (activeBooking.declinedEmailSentAt) {
    showBookingActionMessage(
      "This booking has already been declined and the customer has already been notified.",
      "info"
    );
    return;
  }

  const reasonOptions = [
  {
    name: "Date unavailable",
    text: "Unfortunately, we’re unable to accommodate this booking on the requested date due to availability."
  },
  {
    name: "Time unavailable",
    text: "Unfortunately, we’re unable to accommodate the requested time due to availability."
  },
  {
    name: "Outside service area",
    text: "Unfortunately, this property is outside our current service area."
  },
  {
    name: "Service unavailable",
    text: "Unfortunately, we’re unable to provide the requested service on this occasion."
  },
  {
    name: "Booking conflict",
    text: "Unfortunately, we’re unable to accommodate this booking due to an existing booking conflict."
  },
  {
    name: "Other",
    text: ""
  }
];

const reasonMenu =
  reasonOptions
    .map(
      (option, index) =>
        `${index + 1}. ${option.name}`
    )
    .join("\n");

const selection =
  prompt(
    `Select a reason for declining:\n\n${reasonMenu}\n\nEnter the number:`
  );

if (!selection) {
  return;
}

const selectedIndex =
  Number(selection) - 1;

if (
  !Number.isInteger(selectedIndex) ||
  selectedIndex < 0 ||
  selectedIndex >= reasonOptions.length
) {
  alert("Please select a valid reason.");
  return;
}

let reason =
  reasonOptions[selectedIndex].text;

if (reasonOptions[selectedIndex].name === "Other") {

  reason =
    prompt(
      "Enter the reason for declining:"
    );

  if (!reason) {
    return;
  }
}

const message =
  prompt(
    "Additional message for the customer:",
    "Please feel free to contact us if you would like to arrange another date or time."
  ) || "";

  const confirmed =
    confirm(
      "Decline this booking and notify the customer?"
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.querySelector("#bookingDeclineBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Declining...";
  }

  try {

    // Update booking status
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        status: "Declined",
        declineReason: reason,
        declineMessage: message,
        declinedAt: serverTimestamp()
      }
    );

    // Send customer email
    await sendCustomerBookingEmail(
      activeBooking,
      {
        status: "Declined",
        declineReason: reason,
        declineMessage: message
      }
    );

    // Mark decline email as sent
    await updateDoc(
      doc(db, "bookings", activeBooking.id),
      {
        declinedEmailSentAt: serverTimestamp()
      }
    );

    // Update local booking object
    activeBooking.status = "Declined";
    activeBooking.declineReason = reason;
    activeBooking.declineMessage = message;
    activeBooking.declinedEmailSentAt = true;

    // Refresh dashboard
    await loadDashboard();

    closeBookingModal();

    showBookingActionMessage(
      "Booking declined and customer notified.",
      "success"
    );

  } catch (error) {

    console.error(
      "Decline booking error:",
      error
    );

    showBookingActionMessage(
      "Booking was updated, but the customer email could not be sent. Please try again.",
      "error"
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Decline Booking";
    }
  }
}

// ======================================================
// CLOSE DECLINED BOOKING
// ======================================================

async function closeBooking() {

  if (!activeBooking) {
    return;
  }

  if (activeBooking.status !== "Declined") {
    return;
  }

  const confirmed =
    confirm(
      "Close this declined booking?\n\nIt will be moved to the CLOSED section but will not be deleted."
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.getElementById(
      "closeBookingButton"
    );

  button.disabled = true;

  button.textContent =
    "Closing…";

  try {

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status: "Closed",
        closedAt: serverTimestamp()
      }
    );

    await loadDashboard();

    closeBookingModal();

  } catch (error) {

    console.error(
      "Close booking error:",
      error
    );

    showBookingActionMessage(
      error.message ||
      "Unable to close this booking.",
      true
    );

    button.disabled = false;

    button.textContent =
      "Close request";

  }

}


// ======================================================
// DELETE BOOKING
// ======================================================

async function deleteBooking() {

  if (!activeBooking) {
    return;
  }

  const allowedStatuses = [
    "Completed",
    "Closed"
  ];

  if (
    !allowedStatuses.includes(
      activeBooking.status
    )
  ) {
    return;
  }

  const confirmed =
    confirm(
      "Permanently delete this booking?\n\nThis cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.getElementById(
      "deleteBookingButton"
    );

  button.disabled = true;

  button.textContent =
    "Deleting…";

  try {

    await deleteDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      )
    );

    await loadDashboard();

    closeBookingModal();

  } catch (error) {

    console.error(
      "Delete booking error:",
      error
    );

    showBookingActionMessage(
      error.message ||
      "Unable to delete this booking.",
      true
    );

    button.disabled = false;

    button.textContent =
      "Delete booking";

  }

}
// ======================================================
// ACTION MESSAGE
// ======================================================

function showBookingActionMessage(
  message,
  isError = false
) {

  const element =
    document.getElementById(
      "bookingActionMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.classList.toggle(
    "error",
    isError
  );

}


function renderRecentBookings(bookings) {

  const container =
    document.getElementById(
      "recentBookings"
    );


  if (!bookings.length) {

    container.innerHTML = `
      <span>—</span>
      <p>No bookings yet.</p>
    `;

    return;
  }


  const latest =
    bookings.slice(0, 5);


  container.innerHTML =
    latest
      .map(booking => {

        const name =
          booking.clientName ||
          booking.name ||
          "New booking";

        const date =
          booking.preferredDate ||
          booking.date ||
          "";

        return `
          <div class="recent-booking">
            <strong>
              ${escapeHTML(name)}
            </strong>

            <small>
              ${escapeHTML(date)}
            </small>
          </div>
        `;

      })
      .join("");
}


// ======================================================
// CLIENTS
// ======================================================

function renderClients(snapshot) {

  const container =
    document.getElementById(
      "clientsGrid"
    );


  if (snapshot.empty) {

    container.innerHTML = `
      <div class="large-empty">
        No clients yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    snapshot.docs
      .map(doc => {

        const client =
          doc.data();

        return `
          <div class="client-card">

            <span class="panel-eyebrow">
              CLIENT
            </span>

            <h3>
              ${escapeHTML(
                client.name || "Unnamed client"
              )}
            </h3>

            <p>
              ${escapeHTML(
                client.email || ""
              )}
            </p>

          </div>
        `;

      })
      .join("");
}


// ======================================================
// PROJECTS
// ======================================================

function renderProjects(snapshot) {

  const container =
    document.getElementById(
      "projectsGrid"
    );


  if (snapshot.empty) {

    container.innerHTML = `
      <div class="large-empty">
        No projects yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    snapshot.docs
      .map(doc => {

        const project =
          doc.data();

        return `
          <div class="project-card">

            <span class="panel-eyebrow">
              PROJECT
            </span>

            <h3>
              ${escapeHTML(
                project.name ||
                project.propertyName ||
                "Unnamed project"
              )}
            </h3>

            <p>
              ${escapeHTML(
                project.status || "Active"
              )}
            </p>

          </div>
        `;

      })
      .join("");
}


// ======================================================
// QUOTES
// ======================================================

function renderQuotes(snapshot) {

  const container =
    document.getElementById(
      "quotesGrid"
    );


  if (snapshot.empty) {

    container.innerHTML = `
      <div class="large-empty">
        No quotes yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    snapshot.docs
      .map(doc => {

        const quote =
          doc.data();

        return `
          <div class="quote-card">

            <span class="panel-eyebrow">
              QUOTE
            </span>

            <h3>
              ${escapeHTML(
                quote.clientName ||
                quote.name ||
                "Unnamed client"
              )}
            </h3>

            <p>
              ${escapeHTML(
                quote.amount ||
                quote.total ||
                ""
              )}
            </p>

          </div>
        `;

      })
      .join("");
}


// ======================================================
// HTML SAFETY
// ======================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
