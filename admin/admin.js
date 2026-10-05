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
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyBQCqtKKHXUdBrSvKvQFN1hHct119Yp-Yo",
  authDomain: "flo-property-media-fbb4.firebaseapp.com",
  projectId: "flo-property-media-fbb4",
  storageBucket: "flo-property-media-fbb4.firebasestorage.app",
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
window.testDb = db;

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

const loginScreen =
  document.getElementById("loginScreen");

const dashboard =
  document.getElementById("dashboard");

const googleLogin =
  document.getElementById("googleLogin");

const logoutButton =
  document.getElementById("logoutButton");

const loginError =
  document.getElementById("loginError");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userInitial =
  document.getElementById("userInitial");

const pageTitle =
  document.getElementById("pageTitle");


// ======================================================
// GOOGLE LOGIN
// ======================================================

googleLogin.addEventListener(
  "click",
  async () => {

    loginError.textContent = "";

    googleLogin.disabled = true;

    googleLogin.innerHTML = `
      <span>Signing in...</span>
    `;

    try {

      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );

      const user =
        result.user;

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

  }
);


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      loginScreen.classList.remove(
        "hidden"
      );

      dashboard.classList.add(
        "hidden"
      );

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

    loginScreen.classList.add(
      "hidden"
    );

    dashboard.classList.remove(
      "hidden"
    );


    // User information

    userName.textContent =
      user.displayName ||
      "FLO Admin";

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


    // Load CRM features

    await initCRMFeatures();

  }
);


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }
);


// ======================================================
// NAVIGATION
// ======================================================

const navItems =
  document.querySelectorAll(
    ".nav-item"
  );

const sections = {

  overview:
    document.getElementById(
      "overviewSection"
    ),

  bookings:
    document.getElementById(
      "bookingsSection"
    ),

  clients:
    document.getElementById(
      "clientsSection"
    ),

  projects:
    document.getElementById(
      "projectsSection"
    ),

  quotes:
    document.getElementById(
      "quotesSection"
    )

};


function showSection(sectionName) {

  Object.values(sections)
    .forEach(
      section => {

        if (section) {
          section.classList.add(
            "hidden"
          );
        }

      }
    );


  if (sections[sectionName]) {

    sections[sectionName]
      .classList.remove(
        "hidden"
      );

  }


  navItems.forEach(
    item => {

      item.classList.toggle(
        "active",
        item.dataset.section ===
          sectionName
      );

    }
  );


  const titles = {

    overview:
      "Overview",

    bookings:
      "Bookings",

    clients:
      "Clients",

    projects:
      "Projects",

    quotes:
      "Quotes"

  };


  pageTitle.textContent =
    titles[sectionName] ||
    "Overview";

}


navItems.forEach(
  item => {

    item.addEventListener(
      "click",
      () => {

        showSection(
          item.dataset.section
        );

      }
    );

  }
);


document
  .querySelectorAll(
    "[data-section-link]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          showSection(
            button.dataset.sectionLink
          );

        }
      );

    }
  );


// ======================================================
// FIRESTORE
// ======================================================

async function getCollectionCount(
  collectionName
) {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          collectionName
        )
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

  console.log(
    "Loading FLO admin dashboard..."
  );


  // -----------------------------------------
  // BOOKINGS
  // -----------------------------------------

  try {

    const bookingsSnapshot =
      await getDocs(
        collection(
          db,
          "bookings"
        )
      );

    console.log(
      "Bookings loaded:",
      bookingsSnapshot.size
    );

    console.log(
      "Booking document IDs:",
      bookingsSnapshot.docs.map(
        documentSnapshot =>
          documentSnapshot.id
      )
    );


    const bookingData =
      bookingsSnapshot.docs.map(
        documentSnapshot => ({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        })
      );


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


    const newBookingsCount =
      document.getElementById(
        "newBookingsCount"
      );

    if (newBookingsCount) {

      newBookingsCount.textContent =
        newBookings.length;

    }


    const upcomingCount =
      document.getElementById(
        "upcomingCount"
      );

    if (upcomingCount) {

      upcomingCount.textContent =
        confirmedBookings.length;

    }


    // Render main bookings list

    renderBookings(
      bookingData
    );


    // Render recent bookings separately

    try {

      renderRecentBookings(
        bookingData
      );

    } catch (recentError) {

      console.error(
        "RECENT BOOKINGS RENDER ERROR:",
        recentError
      );

    }


  } catch (error) {

    console.error(
      "BOOKINGS ERROR:",
      error
    );


    const bookingsList =
      document.getElementById(
        "bookingsList"
      );

    if (bookingsList) {

      bookingsList.innerHTML = `
        <div class="empty-state">
          <p>Unable to load bookings.</p>
        </div>
      `;

    }

  }


  // -----------------------------------------
  // CLIENTS
  // -----------------------------------------

  try {

    const clientsSnapshot =
      await getDocs(
        collection(
          db,
          "clients"
        )
      );


    const clientsCount =
      document.getElementById(
        "clientsCount"
      );


    if (clientsCount) {

      clientsCount.textContent =
        clientsSnapshot.size;

    }


    renderClients(
      clientsSnapshot
    );


  } catch (error) {

    console.error(
      "CLIENTS ERROR:",
      error
    );


    const clientsCount =
      document.getElementById(
        "clientsCount"
      );

    if (clientsCount) {

      clientsCount.textContent =
        "0";

    }

  }


  // -----------------------------------------
  // PROJECTS
  // -----------------------------------------

  try {

    const projectsSnapshot =
      await getDocs(
        collection(
          db,
          "projects"
        )
      );


    const projectsCount =
      document.getElementById(
        "projectsCount"
      );


    if (projectsCount) {

      projectsCount.textContent =
        projectsSnapshot.size;

    }


    renderProjects(
      projectsSnapshot
    );


  } catch (error) {

    console.error(
      "PROJECTS ERROR:",
      error
    );


    const projectsCount =
      document.getElementById(
        "projectsCount"
      );

    if (projectsCount) {

      projectsCount.textContent =
        "0";

    }

  }


  // -----------------------------------------
  // QUOTES
  // -----------------------------------------

  try {

    const quotesSnapshot =
      await getDocs(
        collection(
          db,
          "quotes"
        )
      );


    renderQuotes(
      quotesSnapshot
    );


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

  if (!container) {
    console.error(
      "bookingsList element not found."
    );
    return;
  }

  // Keep the complete Firestore result available
  // to the modal/actions.
  currentBookings =
    Array.isArray(bookings)
      ? bookings
      : [];

  bookings =
    currentBookings;

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

    return isNaN(
      parsed.getTime()
    )
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

  groups.forEach(
    group => {

      const groupBookings =
        bookings
          .filter(
            booking => {

              const rawStatus =
                String(
                  booking.status ||
                  "New"
                ).trim();

              const status =
                rawStatus.toLowerCase() ===
                  "new"
                  ? "New"
                  : rawStatus.toLowerCase() ===
                      "confirmed"
                    ? "Confirmed"
                    : rawStatus.toLowerCase() ===
                        "date proposed"
                      ? "Date Proposed"
                      : rawStatus.toLowerCase() ===
                          "declined"
                        ? "Declined"
                        : rawStatus.toLowerCase() ===
                            "completed"
                          ? "Completed"
                          : rawStatus.toLowerCase() ===
                              "closed"
                            ? "Closed"
                            : "New";

              return (
                group.status ===
                status
              );

            }
          )
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
              .map(
                booking => {

                  const client =
                    booking.clientName ||
                    booking.name ||
                    "—";


                  const property =
                    booking.propertyAddress ||
                    booking.address ||
                    "—";


                  const date =
                    booking.status ===
                      "Date Proposed"

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


                  const rawStatus =
                    String(
                      booking.status ||
                      "New"
                    ).trim();


                  const status =
                    [
                      "New",
                      "Confirmed",
                      "Date Proposed",
                      "Declined",
                      "Completed",
                      "Closed"
                    ]
                      .find(
                        value =>
                          value.toLowerCase() ===
                          rawStatus.toLowerCase()
                      ) ||
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

                        <b
                          class="status-badge status-${status
                            .toLowerCase()
                            .replaceAll(
                              " ",
                              "-"
                            )}"
                        >
                          ${escapeHTML(status)}
                        </b>

                      </span>

                    </button>

                  `;

                }
              )
              .join("")}

          </div>

        </div>

      `;

    }
  );


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

  container.onclick =
    function (event) {

      const row =
        event.target.closest(
          ".booking-row"
        );

      if (
        !row ||
        !container.contains(row)
      ) {
        return;
      }


      const bookingId =
        row.getAttribute(
          "data-booking-id"
        );


      if (!bookingId) {
        return;
      }


      console.log(
        "Opening booking:",
        bookingId
      );


      openBookingModal(
        bookingId
      );

    };

}


// ======================================================
// BOOKING MODAL
// ======================================================

function openBookingModal(
  bookingId
) {

  activeBooking =
    currentBookings.find(
      booking =>
        booking.id ===
        bookingId
    );


  if (!activeBooking) {
    return;
  }


  let modal =
    document.getElementById(
      "bookingModal"
    );


  if (!modal) {

    createBookingModal();

    modal =
      document.getElementById(
        "bookingModal"
      );

  }


  populateBookingModal();

  ensureBookingClientButton();

  modal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

}


function createBookingModal() {

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "bookingModal";

  modal.className =
    "booking-modal hidden";


  modal.innerHTML = `

    <div
      class="booking-modal-overlay"
      data-close-booking-modal
    ></div>


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


      <div
        id="bookingActionMessage"
        class="booking-action-message"
        aria-live="polite"
      ></div>


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

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(
      "[data-close-booking-modal]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          closeBookingModal
        );

      }
    );


  document
    .getElementById(
      "acceptBookingButton"
    )
    .addEventListener(
      "click",
      acceptBooking
    );


  document
    .getElementById(
      "proposeDateButton"
    )
    .addEventListener(
      "click",
      proposeBookingDate
    );


  document
    .getElementById(
      "declineBookingButton"
    )
    .addEventListener(
      "click",
      declineBooking
    );


  document
    .getElementById(
      "completeBookingButton"
    )
    .addEventListener(
      "click",
      completeBooking
    );


  document
    .getElementById(
      "closeBookingButton"
    )
    .addEventListener(
      "click",
      closeBooking
    );


  document
    .getElementById(
      "deleteBookingButton"
    )
    .addEventListener(
      "click",
      deleteBooking
    );

}


function populateBookingModal() {

  const booking =
    activeBooking;

  if (!booking) {
    return;
  }


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
    Array.isArray(
      booking.services
    )
      ? booking.services
      : [];


  document.getElementById(
    "bookingModalServices"
  ).innerHTML =
    services.length

      ? services
          .map(
            service => `
              <span class="service-tag">
                ${escapeHTML(service)}
              </span>
            `
          )
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

    <span
      class="status-badge status-${status
        .toLowerCase()
        .replaceAll(
          " ",
          "-"
        )}"
    >
      ${escapeHTML(status)}
    </span>

  `;


  const message =
    document.getElementById(
      "bookingActionMessage"
    );

  message.textContent =
    "";


  // -----------------------------------------
  // DISABLE ACTIONS WHERE APPROPRIATE
  // -----------------------------------------

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

    modal.classList.add(
      "hidden"
    );

  }


  document.body.classList.remove(
    "modal-open"
  );


  activeBooking =
    null;

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
    // 1. Send completion email
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
      name:
        "Requested time unavailable",

      text:
        "Unfortunately, we’re unavailable at the requested time. We’d be happy to accommodate your booking on the alternative date and time below."
    },

    {
      name:
        "Scheduling adjustment",

      text:
        "We’ve had a scheduling adjustment and would like to offer you the alternative date and time below."
    },

    {
      name:
        "Earlier appointment available",

      text:
        "We have an earlier appointment available and would be happy to accommodate your booking at the alternative date and time below."
    },

    {
      name:
        "Later appointment available",

      text:
        "We have a later appointment available and would be happy to accommodate your booking at the alternative date and time below."
    },

    {
      name:
        "Other",

      text:
        ""
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

    alert(
      "Please select a valid message."
    );

    return;
  }


  let message =
    messageOptions[
      messageIndex
    ].text;


  if (
    messageOptions[
      messageIndex
    ].name === "Other"
  ) {

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
    document.getElementById(
      "proposeDateButton"
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      "Sending...";

  }


  try {

    // Save proposed date to Firestore

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status:
          "Date Proposed",

        proposedDate:
          date,

        proposedTime:
          time,

        proposalMessage:
          message,

        proposedAt:
          serverTimestamp()
      }
    );


    // Send customer email

    await sendCustomerBookingEmail(
      activeBooking,
      {
        status:
          "Date Proposed",

        proposedDate:
          date,

        proposedTime:
          time,

        proposalMessage:
          message
      }
    );


    // Mark proposal email as sent

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        proposedEmailSentAt:
          serverTimestamp()
      }
    );


    // Update local booking object

    activeBooking.status =
      "Date Proposed";

    activeBooking.proposedDate =
      date;

    activeBooking.proposedTime =
      time;

    activeBooking.proposalMessage =
      message;

    activeBooking.proposedEmailSentAt =
      true;


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

      button.textContent =
        "Propose New Date";

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
      name:
        "Date unavailable",

      text:
        "Unfortunately, we’re unable to accommodate this booking on the requested date due to availability."
    },

    {
      name:
        "Time unavailable",

      text:
        "Unfortunately, we’re unable to accommodate the requested time due to availability."
    },

    {
      name:
        "Outside service area",

      text:
        "Unfortunately, this property is outside our current service area."
    },

    {
      name:
        "Service unavailable",

      text:
        "Unfortunately, we’re unable to provide the requested service on this occasion."
    },

    {
      name:
        "Booking conflict",

      text:
        "Unfortunately, we’re unable to accommodate this booking due to an existing booking conflict."
    },

    {
      name:
        "Other",

      text:
        ""
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

    alert(
      "Please select a valid reason."
    );

    return;
  }


  let reason =
    reasonOptions[
      selectedIndex
    ].text;


  if (
    reasonOptions[
      selectedIndex
    ].name === "Other"
  ) {

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
    document.getElementById(
      "declineBookingButton"
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      "Declining...";

  }


  try {

    // Update booking status

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status:
          "Declined",

        declineReason:
          reason,

        declineMessage:
          message,

        declinedAt:
          serverTimestamp()
      }
    );


    // Send customer email

    await sendCustomerBookingEmail(
      activeBooking,
      {
        status:
          "Declined",

        declineReason:
          reason,

        declineMessage:
          message
      }
    );


    // Mark decline email as sent

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        declinedEmailSentAt:
          serverTimestamp()
      }
    );


    // Update local booking object

    activeBooking.status =
      "Declined";

    activeBooking.declineReason =
      reason;

    activeBooking.declineMessage =
      message;

    activeBooking.declinedEmailSentAt =
      true;


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

      button.textContent =
        "Decline Booking";

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


  if (
    activeBooking.status !==
    "Declined"
  ) {
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
        status:
          "Closed",

        closedAt:
          serverTimestamp()
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


// ======================================================
// RECENT BOOKINGS
// ======================================================

function renderRecentBookings(
  bookings
) {

  const container =
    document.getElementById(
      "recentBookings"
    );


  // The recent-bookings card is optional.
  // Never allow its absence to break
  // the main dashboard.

  if (!container) {

    console.warn(
      "recentBookings element not found; skipping recent bookings panel."
    );

    return;
  }


  if (
    !Array.isArray(bookings) ||
    !bookings.length
  ) {

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
      .map(
        booking => {

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

        }
      )
      .join("");

}


// ======================================================
// CLIENTS
// ======================================================

function renderClients(
  snapshot
) {

  const container =
    document.getElementById(
      "clientsGrid"
    );


  if (!container) {
    return;
  }


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
      .map(
        documentSnapshot => {

          const client =
            documentSnapshot.data();


          return `

            <div class="client-card">

              <span class="panel-eyebrow">
                CLIENT
              </span>

              <h3>
                ${escapeHTML(
                  client.name ||
                  "Unnamed client"
                )}
              </h3>

              <p>
                ${escapeHTML(
                  client.email ||
                  ""
                )}
              </p>

            </div>

          `;

        }
      )
      .join("");

}


// ======================================================
// PROJECTS
// ======================================================

function renderProjects(
  snapshot
) {

  const container =
    document.getElementById(
      "projectsGrid"
    );


  if (!container) {
    return;
  }


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
      .map(
        documentSnapshot => {

          const project =
            documentSnapshot.data();


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
                  project.status ||
                  "Active"
                )}
              </p>

            </div>

          `;

        }
      )
      .join("");

}


// ======================================================
// QUOTES
// ======================================================

function renderQuotes(
  snapshot
) {

  const container =
    document.getElementById(
      "quotesGrid"
    );


  if (!container) {
    return;
  }


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
      .map(
        documentSnapshot => {

          const quote =
            documentSnapshot.data();


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

        }
      )
      .join("");

}


// ======================================================
// HTML SAFETY
// ======================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ======================================================
// FLO CRM / PROJECTS / CUSTOM QUOTES
// ======================================================

let crmInitialised = false;


const FLO_SERVICES = [

  "Photography",
  "Video",
  "Drone",
  "2D Floorplan",
  "3D Floorplan",
  "Twilight"

];


const FLO_PACKAGES = [

  {
    name: "Photography",
    price: 150
  },

  {
    name: "Mixed Media",
    price: 450
  },

  {
    name: "Premium Media",
    price: 700
  }

];


// ======================================================
// CRM INITIALISATION
// ======================================================

async function initCRMFeatures() {

  if (crmInitialised) {
    return;
  }


  crmInitialised = true;


  injectCRMToolbar(
    "clientsSection",
    "clientsGrid",
    "CLIENTS",
    [
      {
        label: "Add Client",
        action: openAddClientModal,
        primary: true
      }
    ]
  );


  injectCRMToolbar(
    "projectsSection",
    "projectsGrid",
    "PROJECTS",
    [
      {
        label: "Add Project",
        action: openAddProjectModal,
        primary: true
      }
    ]
  );


  injectCRMToolbar(
    "quotesSection",
    "quotesGrid",
    "QUOTES",
    [
      {
        label: "Calculate Quote",
        action: openCreateQuoteModal,
        primary: true
      }
    ]
  );


  await refreshCRMData();

}


// ======================================================
// TOOLBAR
// ======================================================

function injectCRMToolbar(
  sectionId,
  gridId,
  eyebrow,
  buttons
) {

  const section =
    document.getElementById(
      sectionId
    );


  const grid =
    document.getElementById(
      gridId
    );


  if (!section || !grid) {
    return;
  }


  if (
    section.querySelector(
      `[data-crm-toolbar="${gridId}"]`
    )
  ) {
    return;
  }


  const toolbar =
    document.createElement(
      "div"
    );


  toolbar.className =
    "crm-section-toolbar";


  toolbar.dataset.crmToolbar =
    gridId;


  toolbar.innerHTML = `

    <div class="crm-toolbar-title">

      <span class="panel-eyebrow">
        ${escapeHTML(eyebrow)}
      </span>

    </div>


    <div class="crm-toolbar-actions">

      ${buttons
        .map(
          (button, index) => `

            <button
              type="button"
              class="
                crm-toolbar-button
                ${button.primary ? "primary" : ""}
              "
              data-crm-action="${gridId}-${index}"
            >
              ${escapeHTML(
                button.label
              )}
            </button>

          `
        )
        .join("")}

    </div>

  `;


  grid.parentNode.insertBefore(
    toolbar,
    grid
  );


  buttons.forEach(
    (button, index) => {

      const element =
        toolbar.querySelector(
          `[data-crm-action="${gridId}-${index}"]`
        );


      if (element) {

        element.addEventListener(
          "click",
          button.action
        );

      }

    }
  );

}


// ======================================================
// CRM DATA REFRESH
// ======================================================

async function refreshCRMData() {

  try {

    const [
      clientsSnapshot,
      projectsSnapshot,
      quotesSnapshot
    ] =
      await Promise.all([
              getDocs(
        collection(db, "clients")
      ),

      getDocs(
        collection(db, "projects")
      ),

      getDocs(
        collection(db, "quotes")
      )

    ]);


    renderEnhancedClients(
      clientsSnapshot
    );

    renderEnhancedProjects(
      projectsSnapshot
    );

    renderEnhancedQuotes(
      quotesSnapshot
    );


  } catch (error) {

    console.error(
      "CRM refresh error:",
      error
    );

  }

}


// ======================================================
// ENHANCED CLIENTS
// ======================================================

function renderEnhancedClients(
  snapshot
) {

  const container =
    document.getElementById(
      "clientsGrid"
    );

  if (!container) {
    return;
  }


  if (snapshot.empty) {

    container.innerHTML = `

      <div class="large-empty crm-empty">

        <span class="panel-eyebrow">
          CLIENTS
        </span>

        <h3>
          No clients yet
        </h3>

        <p>
          Add your first client to start
          building your FLO client database.
        </p>

        <button
          type="button"
          class="crm-inline-button"
          id="emptyAddClientButton"
        >
          Add Client
        </button>

      </div>

    `;


    const emptyButton =
      document.getElementById(
        "emptyAddClientButton"
      );


    if (emptyButton) {

      emptyButton.addEventListener(
        "click",
        openAddClientModal
      );

    }


    return;
  }


  const clients =
    snapshot.docs.map(
      clientDoc => ({

        id:
          clientDoc.id,

        ...clientDoc.data()

      })
    );


  container.innerHTML =
    clients
      .map(
        client => {

          const status =
            client.status ||
            "Active";


          const projectCount =
            Number(
              client.projectCount ||
              0
            );


          const quoteCount =
            Number(
              client.quoteCount ||
              0
            );


          return `

            <article
              class="client-card crm-record-card"
              data-client-id="${escapeHTML(
                client.id
              )}"
            >

              <div class="crm-record-top">

                <span class="panel-eyebrow">
                  CLIENT
                </span>

                <span
                  class="
                    crm-status
                    crm-status-${escapeHTML(
                      status
                        .toLowerCase()
                        .replaceAll(
                          " ",
                          "-"
                        )
                    )}
                  "
                >
                  ${escapeHTML(status)}
                </span>

              </div>


              <h3>
                ${escapeHTML(
                  client.name ||
                  "Unnamed client"
                )}
              </h3>


              <p>
                ${escapeHTML(
                  client.email ||
                  ""
                )}
              </p>


              <p>
                ${escapeHTML(
                  client.mobile ||
                  ""
                )}
              </p>


              <p>
                ${escapeHTML(
                  client.propertyAddress ||
                  client.address ||
                  ""
                )}
              </p>


              <div class="crm-record-meta">

                <span>
                  ${projectCount}
                  ${
                    projectCount === 1
                      ? "project"
                      : "projects"
                  }
                </span>

                <span>
                  ${quoteCount}
                  ${
                    quoteCount === 1
                      ? "quote"
                      : "quotes"
                  }
                </span>

              </div>


              <div class="crm-card-actions">

                <button
                  type="button"
                  class="crm-small-button"
                  data-edit-client="${escapeHTML(
                    client.id
                  )}"
                >
                  Edit
                </button>


                <button
                  type="button"
                  class="crm-small-button"
                  data-client-project="${escapeHTML(
                    client.id
                  )}"
                >
                  + Project
                </button>


                <button
                  type="button"
                  class="crm-small-button"
                  data-client-quote="${escapeHTML(
                    client.id
                  )}"
                >
                  + Quote
                </button>


                <button
                  type="button"
                  class="crm-small-button crm-danger-button"
                  data-archive-client="${escapeHTML(
                    client.id
                  )}"
                >
                  Archive
                </button>


                <button
                  type="button"
                  class="crm-small-button crm-danger-button"
                  data-delete-client="${escapeHTML(
                    client.id
                  )}"
                >
                  Delete
                </button>

              </div>

            </article>

          `;

        }
      )
      .join("");


  container
    .querySelectorAll(
      "[data-edit-client]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openEditClientModal(
              button.dataset.editClient
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-client-project]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openAddProjectModal(
              button.dataset.clientProject
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-client-quote]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openCreateQuoteModal(
              button.dataset.clientQuote
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-archive-client]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            archiveClient(
              button.dataset.archiveClient
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-delete-client]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            deleteClientRecord(
              button.dataset.deleteClient
            );

          }
        );

      }
    );

}


// ======================================================
// ADD CLIENT
// ======================================================

function openAddClientModal(
  prefill = {}
) {

  openCRMFormModal({

    title:
      "Add Client",

    eyebrow:
      "CLIENT",

    fields: [

      {
        name:
          "name",

        label:
          "Client name",

        type:
          "text",

        required:
          true,

        value:
          prefill.name ||
          ""
      },


      {
        name:
          "email",

        label:
          "Email",

        type:
          "email",

        required:
          true,

        value:
          prefill.email ||
          ""
      },


      {
        name:
          "mobile",

        label:
          "Mobile",

        type:
          "tel",

        value:
          prefill.mobile ||
          ""
      },


      {
        name:
          "propertyAddress",

        label:
          "Property / address",

        type:
          "text",

        value:
          prefill.propertyAddress ||
          ""
      },


      {
        name:
          "status",

        label:
          "Client status",

        type:
          "select",

        options: [
          "Active",
          "Completed",
          "Archived"
        ],

        value:
          "Active"
      },


      {
        name:
          "notes",

        label:
          "Notes",

        type:
          "textarea"
      }

    ],


    submitLabel:
      "Add Client",


    onSubmit:
      async values => {

        const existing =
          await findClientByEmail(
            values.email
          );


        if (existing) {

          throw new Error(
            "A client with this email already exists."
          );

        }


        await addDoc(
          collection(
            db,
            "clients"
          ),
          {

            name:
              values.name.trim(),

            email:
              values.email.trim(),

            mobile:
              values.mobile.trim(),

            propertyAddress:
              values.propertyAddress.trim(),

            status:
              values.status ||
              "Active",

            notes:
              values.notes.trim(),

            projectCount:
              0,

            quoteCount:
              0,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }
        );


        await refreshCRMData();


        showCRMToast(
          "Client added successfully."
        );

      }

  });

}


// ======================================================
// CLIENT ARCHIVE / DELETE
// ======================================================

async function archiveClient(
  clientId
) {

  if (!clientId) {
    return;
  }


  const confirmed =
    confirm(
      "Archive this client? They will remain in Firestore but will be marked Archived."
    );


  if (!confirmed) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "clients",
        clientId
      ),
      {
        status:
          "Archived",

        updatedAt:
          serverTimestamp()
      }
    );


    await refreshCRMData();


    showCRMToast(
      "Client archived."
    );


  } catch (error) {

    console.error(
      "Archive client error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to archive client.",
      true
    );

  }

}


async function deleteClientRecord(
  clientId
) {

  if (!clientId) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this client permanently? This cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "clients",
        clientId
      )
    );


    await refreshCRMData();


    showCRMToast(
      "Client deleted."
    );


  } catch (error) {

    console.error(
      "Delete client error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to delete client.",
      true
    );

  }

}


// ======================================================
// EDIT CLIENT
// ======================================================

async function openEditClientModal(
  clientId
) {

  const clientRef =
    doc(
      db,
      "clients",
      clientId
    );


  const snapshot =
    await getDocs(
      collection(
        db,
        "clients"
      )
    );


  const found =
    snapshot.docs.find(
      item =>
        item.id ===
        clientId
    );


  if (!found) {
    return;
  }


  const client =
    found.data();


  openCRMFormModal({

    title:
      "Edit Client",

    eyebrow:
      "CLIENT",

    fields: [

      {
        name:
          "name",

        label:
          "Client name",

        type:
          "text",

        required:
          true,

        value:
          client.name ||
          ""
      },


      {
        name:
          "email",

        label:
          "Email",

        type:
          "email",

        required:
          true,

        value:
          client.email ||
          ""
      },


      {
        name:
          "mobile",

        label:
          "Mobile",

        type:
          "tel",

        value:
          client.mobile ||
          ""
      },


      {
        name:
          "propertyAddress",

        label:
          "Property / address",

        type:
          "text",

        value:
          client.propertyAddress ||
          ""
      },


      {
        name:
          "status",

        label:
          "Client status",

        type:
          "select",

        options: [
          "Active",
          "Completed",
          "Archived"
        ],

        value:
          client.status ||
          "Active"
      },


      {
        name:
          "notes",

        label:
          "Notes",

        type:
          "textarea",

        value:
          client.notes ||
          ""
      }

    ],


    submitLabel:
      "Save Changes",


    onSubmit:
      async values => {

        await updateDoc(
          clientRef,
          {

            name:
              values.name.trim(),

            email:
              values.email.trim(),

            mobile:
              values.mobile.trim(),

            propertyAddress:
              values.propertyAddress.trim(),

            status:
              values.status,

            notes:
              values.notes.trim(),

            updatedAt:
              serverTimestamp()

          }
        );


        await refreshCRMData();


        showCRMToast(
          "Client updated."
        );

      }

  });

}


// ======================================================
// FIND CLIENT
// ======================================================

async function findClientByEmail(
  email
) {

  if (!email) {
    return null;
  }


  const snapshot =
    await getDocs(
      collection(
        db,
        "clients"
      )
    );


  const target =
    email
      .trim()
      .toLowerCase();


  const found =
    snapshot.docs.find(
      clientDoc => {

        const data =
          clientDoc.data();


        return (
          String(
            data.email ||
            ""
          )
            .trim()
            .toLowerCase() ===
          target
        );

      }
    );


  if (!found) {
    return null;
  }


  return {
    id:
      found.id,

    ...found.data()
  };

}


// ======================================================
// BOOKING → CLIENT
// ======================================================

function ensureBookingClientButton() {

  const modal =
    document.getElementById(
      "bookingModal"
    );


  if (
    !modal ||
    !activeBooking
  ) {
    return;
  }


  if (
    modal.querySelector(
      "#addBookingClientButton"
    )
  ) {
    return;
  }


  const actions =
    modal.querySelector(
      ".booking-actions"
    );


  if (!actions) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";

  button.id =
    "addBookingClientButton";

  button.className =
    "booking-action crm-booking-client-button";

  button.textContent =
    "Add to Clients";


  actions.parentNode.insertBefore(
    button,
    actions
  );


  button.addEventListener(
    "click",
    addActiveBookingToClient
  );

}


// ======================================================
// ADD BOOKING CUSTOMER TO CLIENTS
// ======================================================

async function addActiveBookingToClient() {

  if (!activeBooking) {
    return;
  }


  const button =
    document.getElementById(
      "addBookingClientButton"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Checking...";

  }


  try {

    const email =
      activeBooking.email ||
      "";


    const existing =
      await findClientByEmail(
        email
      );


    if (existing) {

      if (button) {

        button.textContent =
          "Already a Client";

      }


      showCRMToast(
        "This customer is already in Clients."
      );


      return;
    }


    await addDoc(
      collection(
        db,
        "clients"
      ),
      {

        name:
          activeBooking.name ||
          activeBooking.clientName ||
          "",

        email:
          activeBooking.email ||
          "",

        mobile:
          activeBooking.mobile ||
          "",

        propertyAddress:
          activeBooking.propertyAddress ||
          "",

        status:
          "Active",

        notes:
          activeBooking.message ||
          "",

        source:
          "Website booking",

        bookingId:
          activeBooking.id,

        projectCount:
          0,

        quoteCount:
          0,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    if (button) {

      button.textContent =
        "Added to Clients";

    }


    showCRMToast(
      "Customer added to Clients."
    );


    await refreshCRMData();


  } catch (error) {

    console.error(
      "Unable to add booking customer:",
      error
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Add to Clients";

    }


    showCRMToast(
      error.message ||
      "Unable to add client.",
      true
    );

  }

}


// ======================================================
// PROJECTS
// ======================================================

function renderEnhancedProjects(
  snapshot
) {

  const container =
    document.getElementById(
      "projectsGrid"
    );


  if (!container) {
    return;
  }


  if (snapshot.empty) {

    container.innerHTML = `

      <div class="large-empty crm-empty">

        <h3>
          No projects yet
        </h3>

        <p>
          Create a project and connect it
          to one of your clients.
        </p>

        <button
          type="button"
          class="crm-inline-button"
          id="emptyAddProjectButton"
        >
          Add Project
        </button>

      </div>

    `;


    document
      .getElementById(
        "emptyAddProjectButton"
      )
      ?.addEventListener(
        "click",
        () =>
          openAddProjectModal()
      );


    return;
  }


  const projects =
    snapshot.docs.map(
      projectDoc => ({

        id:
          projectDoc.id,

        ...projectDoc.data()

      })
    );


  container.innerHTML =
    projects
      .map(
        project => `

          <article
            class="project-card crm-record-card"
          >

            <div class="crm-record-top">

              <span class="panel-eyebrow">
                PROJECT
              </span>

              <span
                class="
                  crm-status
                  crm-project-status-${escapeHTML(
                    (
                      project.status ||
                      "Upcoming"
                    )
                      .toLowerCase()
                      .replaceAll(
                        " ",
                        "-"
                      )
                  )}
                "
              >
                ${escapeHTML(
                  project.status ||
                  "Upcoming"
                )}
              </span>

            </div>


            <h3>
              ${escapeHTML(
                project.name ||
                project.propertyName ||
                "Unnamed project"
              )}
            </h3>


            <p>
              ${escapeHTML(
                project.clientName ||
                ""
              )}
            </p>


            <p>
              ${escapeHTML(
                project.propertyAddress ||
                ""
              )}
            </p>


            <div class="crm-record-meta">

              <span>
                ${escapeHTML(
                  project.startDate ||
                  "No start date"
                )}
              </span>

              <span>
                ${escapeHTML(
                  project.dueDate ||
                  "No due date"
                )}
              </span>

            </div>


            <div class="crm-card-actions">

              <button
                type="button"
                class="crm-small-button"
                data-edit-project="${escapeHTML(
                  project.id
                )}"
              >
                Edit Status
              </button>

              ${
                project.status !==
                "Completed"
                  ? `
                    <button
                      type="button"
                      class="crm-small-button"
                      data-complete-project="${escapeHTML(
                        project.id
                      )}"
                    >
                      Complete
                    </button>
                  `
                  : ""
              }

              ${
                project.status !==
                "Archived"
                  ? `
                    <button
                      type="button"
                      class="crm-small-button"
                      data-archive-project="${escapeHTML(
                        project.id
                      )}"
                    >
                      Archive
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                class="crm-small-button crm-danger-button"
                data-delete-project="${escapeHTML(
                  project.id
                )}"
              >
                Delete
              </button>

            </div>

          </article>

        `
      )
      .join("");


  container
    .querySelectorAll(
      "[data-edit-project]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            openEditProjectModal(
              button.dataset.editProject
            )
        );

      }
    );


  container
    .querySelectorAll(
      "[data-complete-project]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            completeProject(
              button.dataset.completeProject
            )
        );

      }
    );


  container
    .querySelectorAll(
      "[data-archive-project]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            archiveProject(
              button.dataset.archiveProject
            )
        );

      }
    );


  container
    .querySelectorAll(
      "[data-delete-project]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            deleteProjectRecord(
              button.dataset.deleteProject
            )
        );

      }
    );

}


// ======================================================
// PROJECT MANAGEMENT
// ======================================================

async function openEditProjectModal(
  projectId
) {

  const snapshot =
    await getDocs(
      collection(
        db,
        "projects"
      )
    );


  const found =
    snapshot.docs.find(
      item =>
        item.id ===
        projectId
    );


  if (!found) {
    return;
  }


  const project =
    found.data();


  openCRMFormModal({

    title:
      "Edit Project",

    eyebrow:
      "PROJECT",

    fields: [

      {
        name:
          "status",

        label:
          "Project status",

        type:
          "select",

        options: [
          "Upcoming",
          "In Progress",
          "Awaiting Client",
          "Completed",
          "Cancelled",
          "Archived"
        ],

        value:
          project.status ||
          "Upcoming"
      },


      {
        name:
          "notes",

        label:
          "Project notes",

        type:
          "textarea",

        value:
          project.notes ||
          ""
      }

    ],


    submitLabel:
      "Save Changes",


    onSubmit:
      async values => {

        await updateDoc(
          doc(
            db,
            "projects",
            projectId
          ),
          {

            status:
              values.status,

            notes:
              values.notes.trim(),

            updatedAt:
              serverTimestamp()

          }
        );


        await refreshCRMData();


        showCRMToast(
          "Project updated."
        );

      }

  });

}


async function completeProject(
  projectId
) {

  if (!projectId) {
    return;
  }


  const confirmed =
    confirm(
      "Mark this project as completed and notify the customer?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "projects"
        )
      );


    const found =
      snapshot.docs.find(
        item =>
          item.id ===
          projectId
      );


    if (!found) {
      return;
    }


    const project = {
      id:
        found.id,

      ...found.data()
    };


    await sendProjectCompletionEmail(
      project
    );


    await updateDoc(
      doc(
        db,
        "projects",
        projectId
      ),
      {

        status:
          "Completed",

        completedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    await refreshCRMData();


    showCRMToast(
      "Project completed and customer notified."
    );


  } catch (error) {

    console.error(
      "Complete project error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to complete project.",
      true
    );

  }

}


async function archiveProject(
  projectId
) {

  if (!projectId) {
    return;
  }


  const confirmed =
    confirm(
      "Archive this project?"
    );


  if (!confirmed) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "projects",
        projectId
      ),
      {

        status:
          "Archived",

        archivedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    await refreshCRMData();


    showCRMToast(
      "Project archived."
    );


  } catch (error) {

    console.error(
      "Archive project error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to archive project.",
      true
    );

  }

}


async function deleteProjectRecord(
  projectId
) {

  if (!projectId) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this project permanently? This cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "projects",
        projectId
      )
    );


    await refreshCRMData();


    showCRMToast(
      "Project deleted."
    );


  } catch (error) {

    console.error(
      "Delete project error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to delete project.",
      true
    );

  }

}


// ======================================================
// PROJECT COMPLETION EMAIL
// ======================================================

async function sendProjectCompletionEmail(
  project
) {

  const completionRecord = {

    name:
      project.clientName ||
      "",

    clientName:
      project.clientName ||
      "",

    email:
      project.clientEmail ||
      "",

    propertyAddress:
      project.propertyAddress ||
      "",

    preferredDate:
      project.startDate ||
      "",

    proposedDate:
      project.dueDate ||
      "",

    services:
      Array.isArray(
        project.services
      )
        ? project.services
        : [],

    source:
      "FLO CRM project",

    projectName:
      project.name ||
      ""

  };


  return sendCustomerBookingEmail(
    completionRecord,
    {

      status:
        "Completed",

      type:
        "project-completed",

      adminEmail:
        ADMIN_EMAIL,

      projectId:
        project.id ||
        ""

    }
  );

}


// ======================================================
// ADD PROJECT
// ======================================================

async function openAddProjectModal(
  clientId = ""
) {

  const clients =
    await getClientOptions();


  if (!clients.length) {

    showCRMToast(
      "Add a client before creating a project.",
      true
    );

    return;
  }


  openCRMFormModal({

    title:
      "Add Project",

    eyebrow:
      "PROJECT",

    fields: [

      {
        name:
          "clientId",

        label:
          "Client",

        type:
          "select",

        options:
          clients.map(
            client => ({

              value:
                client.id,

              label:
                client.name ||
                client.email

            })
          ),

        value:
          clientId
      },


      {
        name:
          "name",

        label:
          "Project name",

        type:
          "text",

        required:
          true
      },


      {
        name:
          "propertyAddress",

        label:
          "Property / address",

        type:
          "text"
      },


      {
        name:
          "services",

        label:
          "Services",

        type:
          "multiselect",

        options:
          FLO_SERVICES
      },


      {
        name:
          "startDate",

        label:
          "Start date",

        type:
          "date"
      },


      {
        name:
          "dueDate",

        label:
          "Due date",

        type:
          "date"
      },


      {
        name:
          "status",

        label:
          "Project status",

        type:
          "select",

        options: [
          "Upcoming",
          "In Progress",
          "Awaiting Client",
          "Completed",
          "Cancelled"
        ],

        value:
          "Upcoming"
      },


      {
        name:
          "notes",

        label:
          "Project notes",

        type:
          "textarea"
      }

    ],


    submitLabel:
      "Create Project",


    onSubmit:
      async values => {

        const client =
          clients.find(
            item =>
              item.id ===
              values.clientId
          );


        await addDoc(
          collection(
            db,
            "projects"
          ),
          {

            clientId:
              values.clientId,

            clientName:
              client?.name ||
              "",

            clientEmail:
              client?.email ||
              "",

            name:
              values.name.trim(),

            propertyAddress:
              values.propertyAddress.trim(),

            services:
              values.services ||
              [],

            startDate:
              values.startDate ||
              "",

            dueDate:
              values.dueDate ||
              "",

            status:
              values.status,

            notes:
              values.notes.trim(),

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }
        );


        await refreshCRMData();


        showCRMToast(
          "Project created."
        );

      }

  });

}


// ======================================================
// CLIENT OPTIONS
// ======================================================

async function getClientOptions() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "clients"
      )
    );


  return snapshot.docs.map(
    clientDoc => ({

      id:
        clientDoc.id,

      ...clientDoc.data()

    })
  );

}


// ======================================================
// ENHANCED QUOTES
// ======================================================

function renderEnhancedQuotes(
  snapshot
) {

  const container =
    document.getElementById(
      "quotesGrid"
    );


  if (!container) {
    return;
  }


  if (snapshot.empty) {

    container.innerHTML = `

      <div class="large-empty crm-empty">

        <span class="panel-eyebrow">
          QUOTES
        </span>

        <h3>
          No quotes yet
        </h3>

        <p>
          Create a tailored quote for a
          client and calculate the total.
        </p>

        <button
          type="button"
          class="crm-inline-button"
          id="emptyCreateQuoteButton"
        >
          Calculate Quote
        </button>

      </div>

    `;


    document
      .getElementById(
        "emptyCreateQuoteButton"
      )
      ?.addEventListener(
        "click",
        openCreateQuoteModal
      );


    return;
  }


  const quotes =
    snapshot.docs.map(
      quoteDoc => ({

        id:
          quoteDoc.id,

        ...quoteDoc.data()

      })
    );


  container.innerHTML =
    quotes
      .map(
        quote => `

          <article
            class="quote-card crm-record-card"
          >

            <div class="crm-record-top">

              <span class="panel-eyebrow">
                QUOTE
              </span>

              <span class="crm-status">
                ${escapeHTML(
                  quote.status ||
                  "Draft"
                )}
              </span>

            </div>


            <h3>
              ${escapeHTML(
                quote.clientName ||
                quote.name ||
                "Unnamed client"
              )}
            </h3>


            <p>
              ${escapeHTML(
                quote.propertyAddress ||
                ""
              )}
            </p>


            <div class="crm-quote-total">

              $${Number(
                quote.total ||
                0
              ).toFixed(2)}

            </div>


            <div class="crm-card-actions">

              <button
                type="button"
                class="crm-small-button"
                data-view-quote="${escapeHTML(
                  quote.id
                )}"
              >
                View
              </button>

              ${
                quote.status !==
                "Archived"
                  ? `
                    <button
                      type="button"
                      class="crm-small-button"
                      data-archive-quote="${escapeHTML(
                        quote.id
                      )}"
                    >
                      Archive
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                class="crm-small-button crm-danger-button"
                data-delete-quote="${escapeHTML(
                  quote.id
                )}"
              >
                Delete
              </button>

            </div>

          </article>

        `
      )
      .join("");


  container
    .querySelectorAll(
      "[data-view-quote]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openQuoteViewModal(
              button.dataset.viewQuote
            );

          }
        );

      }
    );


  container
    .querySelectorAll(
      "[data-archive-quote]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            archiveQuote(
              button.dataset.archiveQuote
            )
        );

      }
    );


  container
    .querySelectorAll(
      "[data-delete-quote]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            deleteQuoteRecord(
              button.dataset.deleteQuote
            )
        );

      }
    );

}


// ======================================================
// QUOTE ARCHIVE / DELETE
// ======================================================

async function archiveQuote(
  quoteId
) {

  if (!quoteId) {
    return;
  }


  const confirmed =
    confirm(
      "Archive this quote?"
    );


  if (!confirmed) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "quotes",
        quoteId
      ),
      {

        status:
          "Archived",

        archivedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    await refreshCRMData();


    showCRMToast(
      "Quote archived."
    );


  } catch (error) {

    console.error(
      "Archive quote error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to archive quote.",
      true
    );

  }

}


async function deleteQuoteRecord(
  quoteId
) {

  if (!quoteId) {
    return;
  }


  const confirmed =
    confirm(
      "Delete this quote permanently? This cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(
      doc(
        db,
        "quotes",
        quoteId
      )
    );


    await refreshCRMData();


    showCRMToast(
      "Quote deleted."
    );


  } catch (error) {

    console.error(
      "Delete quote error:",
      error
    );


    showCRMToast(
      error.message ||
      "Unable to delete quote.",
      true
    );

  }

}


// ======================================================
// CREATE CUSTOM QUOTE
// ======================================================

async function openCreateQuoteModal(
  clientId = ""
) {

  const clients =
    await getClientOptions();


  if (!clients.length) {

    showCRMToast(
      "Add a client before creating a quote.",
      true
    );

    return;
  }


  const modal =
    createCRMModalShell(
      "Custom Quote",
      "QUOTE"
    );


  const body =
    modal.querySelector(
      ".crm-modal-body"
    );


  body.innerHTML = `

    <div class="crm-form-grid">

      <label class="crm-field">

        <span>
          Client
        </span>

        <select
          id="customQuoteClient"
          required
        >

          ${clients
            .map(
              client => `

                <option
                  value="${escapeHTML(
                    client.id
                  )}"
                  ${
                    client.id ===
                    clientId
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHTML(
                    client.name ||
                    client.email
                  )}
                </option>

              `
            )
            .join("")}

        </select>

      </label>


      <label class="crm-field">

        <span>
          Property / address
        </span>

        <input
          id="customQuoteAddress"
          type="text"
          placeholder="Property address"
        >

      </label>

    </div>


    <div class="crm-quote-builder">

      <div class="crm-quote-builder-header">

        <div>

          <span class="panel-eyebrow">
            SERVICES
          </span>

          <h3>
            Build your quote
          </h3>

        </div>

        <button
          type="button"
          class="crm-small-button"
          id="addQuoteOther"
        >
          + Other
        </button>

      </div>


      <div
        id="quoteServiceRows"
        class="quote-service-rows"
      ></div>


      <div
        id="quoteOtherRows"
        class="quote-other-rows"
      ></div>

    </div>


    <div class="crm-form-grid">

      <label class="crm-field">

        <span>
          Discount
        </span>

        <input
          id="customQuoteDiscount"
          type="number"
          min="0"
          step="0.01"
          value="0"
        >

      </label>


      <label class="crm-field">

        <span>
          GST
        </span>

        <select
          id="customQuoteGST"
        >

          <option value="0">
            No GST
          </option>

          <option
            value="10"
            selected
          >
            10% GST
          </option>

        </select>

      </label>

    </div>


    <div
      class="crm-quote-summary"
      id="customQuoteSummary"
    >

      <div>
        <span>Subtotal</span>
        <strong id="quoteSubtotal">
          $0.00
        </strong>
      </div>

      <div>
        <span>GST</span>
        <strong id="quoteGST">
          $0.00
        </strong>
      </div>

      <div>
        <span>Total</span>
        <strong id="quoteTotal">
          $0.00
        </strong>
      </div>

    </div>


    <label class="crm-field">

      <span>
        Quote notes
      </span>

      <textarea
        id="customQuoteNotes"
        rows="4"
        placeholder="Optional notes for this quote"
      ></textarea>

    </label>

  `;


  const footer =
    modal.querySelector(
      ".crm-modal-footer"
    );


  const saveButton =
    document.createElement(
      "button"
    );


  saveButton.type =
    "button";

  saveButton.className =
    "crm-modal-submit";

  saveButton.textContent =
    "Save Quote";


  footer.appendChild(
    saveButton
  );


  const serviceRows =
    document.getElementById(
      "quoteServiceRows"
    );


  const otherRows =
    document.getElementById(
      "quoteOtherRows"
    );


  FLO_SERVICES.forEach(
    service => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "quote-service-row";


      row.innerHTML = `

        <label>

          <input
            type="checkbox"
            value="${escapeHTML(
              service
            )}"
          >

          <span>
            ${escapeHTML(service)}
          </span>

        </label>


        <input
          class="quote-service-price"
          type="number"
          min="0"
          step="0.01"
          value="0"
          disabled
          aria-label="${escapeHTML(
            service
          )} price"
        >

      `;


      const checkbox =
        row.querySelector(
          "input[type='checkbox']"
        );


      const price =
        row.querySelector(
          ".quote-service-price"
        );


      checkbox.addEventListener(
        "change",
        () => {

          price.disabled =
            !checkbox.checked;


          if (
            checkbox.checked &&
            Number(price.value) === 0
          ) {

            const packagePreset =
              FLO_PACKAGES.find(
                item =>
                  item.name ===
                  service
              );


            if (packagePreset) {

              price.value =
                packagePreset.price;

            }

          }


          calculateCustomQuote();

        }
      );


      price.addEventListener(
        "input",
        calculateCustomQuote
      );


      serviceRows.appendChild(
        row
      );

    }
  );


  document
    .getElementById(
      "addQuoteOther"
    )
    .addEventListener(
      "click",
      () =>
        addOtherQuoteRow(
          otherRows
        )
    );


  document
    .getElementById(
      "customQuoteDiscount"
    )
    .addEventListener(
      "input",
      calculateCustomQuote
    );


  document
    .getElementById(
      "customQuoteGST"
    )
    .addEventListener(
      "change",
      calculateCustomQuote
    );


  saveButton.addEventListener(
    "click",
    async () => {

      try {

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Saving...";


        const selectedServices =
          [];


        serviceRows
          .querySelectorAll(
            ".quote-service-row"
          )
          .forEach(
            row => {

              const checkbox =
                row.querySelector(
                  "input[type='checkbox']"
                );


              const price =
                row.querySelector(
                  ".quote-service-price"
                );


              if (
                checkbox.checked
              ) {

                selectedServices.push({

                  name:
                    checkbox.value,

                  price:
                    Number(
                      price.value ||
                      0
                    )

                });

              }

            }
          );
        otherRows
          .querySelectorAll(
            ".quote-other-row"
          )
          .forEach(
            row => {

              const name =
                row.querySelector(
                  ".quote-other-name"
                );


              const price =
                row.querySelector(
                  ".quote-other-price"
                );


              if (
                name.value.trim()
              ) {

                selectedServices.push({

                  name:
                    name.value.trim(),

                  price:
                    Number(
                      price.value ||
                      0
                    ),

                  custom:
                    true

                });

              }

            }
          );


        if (
          !selectedServices.length
        ) {

          throw new Error(
            "Select at least one service."
          );

        }


        const selectedClient =
          document.getElementById(
            "customQuoteClient"
          ).value;


        const client =
          clients.find(
            item =>
              item.id ===
              selectedClient
          );


        const subtotal =
          selectedServices.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.price ||
                0
              ),
            0
          );


        const discount =
          Number(
            document.getElementById(
              "customQuoteDiscount"
            ).value ||
            0
          );


        const taxable =
          Math.max(
            subtotal -
            discount,
            0
          );


        const gstRate =
          Number(
            document.getElementById(
              "customQuoteGST"
            ).value ||
            0
          );


        const gst =
          taxable *
          (gstRate / 100);


        const total =
          taxable +
          gst;


        await addDoc(
          collection(
            db,
            "quotes"
          ),
          {

            clientId:
              selectedClient,

            clientName:
              client?.name ||
              "",

            clientEmail:
              client?.email ||
              "",

            propertyAddress:
              document.getElementById(
                "customQuoteAddress"
              ).value.trim(),

            services:
              selectedServices,

            subtotal:
              Number(
                subtotal.toFixed(2)
              ),

            discount:
              Number(
                discount.toFixed(2)
              ),

            gstRate,

            gst:
              Number(
                gst.toFixed(2)
              ),

            total:
              Number(
                total.toFixed(2)
              ),

            status:
              "Draft",

            notes:
              document.getElementById(
                "customQuoteNotes"
              ).value.trim(),

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()

          }
        );


        closeCRMModal();


        await refreshCRMData();


        showCRMToast(
          "Custom quote saved."
        );


      } catch (error) {

        console.error(
          "Quote error:",
          error
        );


        saveButton.disabled =
          false;

        saveButton.textContent =
          "Save Quote";


        showCRMToast(
          error.message ||
          "Unable to save quote.",
          true
        );

      }

    }
  );


  calculateCustomQuote();

}


// ======================================================
// OTHER QUOTE ROW
// ======================================================

function addOtherQuoteRow(
  container
) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    "quote-other-row";


  row.innerHTML = `

    <input
      class="quote-other-name"
      type="text"
      placeholder="Other service"
    >

    <input
      class="quote-other-price"
      type="number"
      min="0"
      step="0.01"
      value="0"
      placeholder="Price"
    >

    <button
      type="button"
      class="crm-small-button"
    >
      Remove
    </button>

  `;


  row
    .querySelector(
      "button"
    )
    .addEventListener(
      "click",
      () => {

        row.remove();

        calculateCustomQuote();

      }
    );


  row
    .querySelector(
      ".quote-other-price"
    )
    .addEventListener(
      "input",
      calculateCustomQuote
    );


  container.appendChild(
    row
  );

}


// ======================================================
// QUOTE CALCULATION
// ======================================================

function calculateCustomQuote() {

  const serviceRows =
    document.querySelectorAll(
      "#quoteServiceRows .quote-service-row"
    );


  const otherRows =
    document.querySelectorAll(
      "#quoteOtherRows .quote-other-row"
    );


  let subtotal = 0;


  serviceRows.forEach(
    row => {

      const checkbox =
        row.querySelector(
          "input[type='checkbox']"
        );


      const price =
        row.querySelector(
          ".quote-service-price"
        );


      if (
        checkbox &&
        checkbox.checked
      ) {

        subtotal +=
          Number(
            price.value ||
            0
          );

      }

    }
  );


  otherRows.forEach(
    row => {

      const price =
        row.querySelector(
          ".quote-other-price"
        );


      subtotal +=
        Number(
          price?.value ||
          0
        );

    }
  );


  const discount =
    Number(
      document.getElementById(
        "customQuoteDiscount"
      )?.value ||
      0
    );


  const taxable =
    Math.max(
      subtotal -
      discount,
      0
    );


  const gstRate =
    Number(
      document.getElementById(
        "customQuoteGST"
      )?.value ||
      0
    );


  const gst =
    taxable *
    gstRate /
    100;


  const total =
    taxable +
    gst;


  const subtotalElement =
    document.getElementById(
      "quoteSubtotal"
    );


  const gstElement =
    document.getElementById(
      "quoteGST"
    );


  const totalElement =
    document.getElementById(
      "quoteTotal"
    );


  if (subtotalElement) {

    subtotalElement.textContent =
      `$${subtotal.toFixed(2)}`;

  }


  if (gstElement) {

    gstElement.textContent =
      `$${gst.toFixed(2)}`;

  }


  if (totalElement) {

    totalElement.textContent =
      `$${total.toFixed(2)}`;

  }

}


// ======================================================
// QUOTE VIEW
// ======================================================

async function openQuoteViewModal(
  quoteId
) {

  const snapshot =
    await getDocs(
      collection(
        db,
        "quotes"
      )
    );


  const found =
    snapshot.docs.find(
      item =>
        item.id ===
        quoteId
    );


  if (!found) {
    return;
  }


  const quote =
    found.data();


  const services =
    Array.isArray(
      quote.services
    )
      ? quote.services
      : [];


  openCRMFormModal({

    title:
      "Quote Details",

    eyebrow:
      "QUOTE",

    readOnly:
      true,

    fields: [

      {
        name:
          "clientName",

        label:
          "Client",

        type:
          "text",

        value:
          quote.clientName ||
          ""
      },


      {
        name:
          "propertyAddress",

        label:
          "Property",

        type:
          "text",

        value:
          quote.propertyAddress ||
          ""
      },


      {
        name:
          "services",

        label:
          "Services",

        type:
          "textarea",

        value:
          services
            .map(
              item =>
                `${item.name} — $${Number(
                  item.price ||
                  0
                ).toFixed(2)}`
            )
            .join("\n")
      },


      {
        name:
          "subtotal",

        label:
          "Subtotal",

        type:
          "text",

        value:
          `$${Number(
            quote.subtotal ||
            0
          ).toFixed(2)}`
      },


      {
        name:
          "gst",

        label:
          "GST",

        type:
          "text",

        value:
          `$${Number(
            quote.gst ||
            0
          ).toFixed(2)}`
      },


      {
        name:
          "total",

        label:
          "Total",

        type:
          "text",

        value:
          `$${Number(
            quote.total ||
            0
          ).toFixed(2)}`
      }

    ],

    submitLabel:
      null

  });

}


// ======================================================
// GENERIC CRM FORM MODAL
// ======================================================

function createCRMModalShell(
  title,
  eyebrow
) {

  closeCRMModal();


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "crmModal";


  modal.className =
    "crm-modal";


  modal.innerHTML = `

    <div
      class="crm-modal-overlay"
      data-crm-close
    ></div>


    <div class="crm-modal-card">

      <button
        type="button"
        class="crm-modal-close"
        data-crm-close
        aria-label="Close"
      >
        ×
      </button>


      <div class="crm-modal-header">

        <span class="panel-eyebrow">
          ${escapeHTML(eyebrow)}
        </span>

        <h2>
          ${escapeHTML(title)}
        </h2>

      </div>


      <div class="crm-modal-body">
      </div>


      <div class="crm-modal-footer">
      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal
    .querySelectorAll(
      "[data-crm-close]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          closeCRMModal
        );

      }
    );


  return modal;

}


// ======================================================
// OPEN CRM FORM
// ======================================================

function openCRMFormModal(
  config
) {

  const modal =
    createCRMModalShell(
      config.title,
      config.eyebrow
    );


  const body =
    modal.querySelector(
      ".crm-modal-body"
    );


  const footer =
    modal.querySelector(
      ".crm-modal-footer"
    );


  const form =
    document.createElement(
      "form"
    );


  form.id =
    "crmDynamicForm";


  form.className =
    "crm-form";


  config.fields.forEach(
    field => {

      const wrapper =
        document.createElement(
          "label"
        );


      wrapper.className =
        "crm-field";


      const label =
        document.createElement(
          "span"
        );


      label.textContent =
        field.label;


      wrapper.appendChild(
        label
      );


      let input;


      // --------------------------------------
      // TEXTAREA
      // --------------------------------------

      if (
        field.type ===
        "textarea"
      ) {

        input =
          document.createElement(
            "textarea"
          );

        input.rows =
          4;


      // --------------------------------------
      // SELECT
      // --------------------------------------

      } else if (
        field.type ===
        "select"
      ) {

        input =
          document.createElement(
            "select"
          );


        field.options.forEach(
          option => {

            const optionElement =
              document.createElement(
                "option"
              );


            if (
              typeof option ===
              "string"
            ) {

              optionElement.value =
                option;

              optionElement.textContent =
                option;


            } else {

              optionElement.value =
                option.value;

              optionElement.textContent =
                option.label;

            }


            if (
              optionElement.value ===
              field.value
            ) {

              optionElement.selected =
                true;

            }


            input.appendChild(
              optionElement
            );

          }
        );


      // --------------------------------------
      // MULTISELECT
      // --------------------------------------

      } else if (
        field.type ===
        "multiselect"
      ) {

        input =
          document.createElement(
            "div"
          );


        input.className =
          "crm-multiselect";


        field.options.forEach(
          option => {

            const optionLabel =
              document.createElement(
                "label"
              );


            optionLabel.className =
              "crm-check-option";


            optionLabel.innerHTML = `

              <input
                type="checkbox"
                value="${escapeHTML(
                  option
                )}"
              >

              <span>
                ${escapeHTML(option)}
              </span>

            `;


            input.appendChild(
              optionLabel
            );

          }
        );


      // --------------------------------------
      // STANDARD INPUT
      // --------------------------------------

      } else {

        input =
          document.createElement(
            "input"
          );


        input.type =
          field.type ||
          "text";

      }


      input.name =
        field.name;


      if (
        field.type !==
        "multiselect"
      ) {

        input.value =
          field.value ||
          "";

      }


      if (
        field.required
      ) {

        input.required =
          true;

      }


      if (
        config.readOnly
      ) {

        input.disabled =
          true;

      }


      wrapper.appendChild(
        input
      );


      form.appendChild(
        wrapper
      );

    }
  );


  body.appendChild(
    form
  );


  if (
    config.submitLabel
  ) {

    const submitButton =
      document.createElement(
        "button"
      );


    submitButton.type =
      "submit";


    submitButton.className =
      "crm-modal-submit";


    submitButton.textContent =
      config.submitLabel;


    submitButton.setAttribute(
      "form",
      "crmDynamicForm"
    );


    footer.appendChild(
      submitButton
    );


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        submitButton.disabled =
          true;


        submitButton.textContent =
          "Saving...";


        try {

          const values =
            {};


          config.fields.forEach(
            field => {

              if (
                field.type ===
                "multiselect"
              ) {

                values[
                  field.name
                ] =
                  Array.from(
                    form.querySelectorAll(
                      `input[type="checkbox"][value]`
                    )
                  )
                    .filter(
                      checkbox =>
                        checkbox.checked
                    )
                    .map(
                      checkbox =>
                        checkbox.value
                    );


              } else {

                values[
                  field.name
                ] =
                  form
                    .querySelector(
                      `[name="${field.name}"]`
                    )
                    ?.value ||
                  "";

              }

            }
          );


          await config.onSubmit(
            values
          );


          closeCRMModal();


        } catch (error) {

          console.error(
            "CRM form error:",
            error
          );


          submitButton.disabled =
            false;


          submitButton.textContent =
            config.submitLabel;


          showCRMToast(
            error.message ||
            "Unable to save.",
            true
          );

        }

      }
    );

  }


  return modal;

}


// ======================================================
// CLOSE CRM MODAL
// ======================================================

function closeCRMModal() {

  const modal =
    document.getElementById(
      "crmModal"
    );


  if (modal) {

    modal.remove();

  }

}


// ======================================================
// CRM TOAST
// ======================================================

function showCRMToast(
  message,
  isError = false
) {

  let toast =
    document.getElementById(
      "crmToast"
    );


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "crmToast";


    toast.className =
      "crm-toast";


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.classList.toggle(
    "error",
    isError
  );


  toast.classList.add(
    "visible"
  );


  clearTimeout(
    window.floCRMToastTimer
  );


  window.floCRMToastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "visible"
        );

      },
      3500
    );

}
