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
    throw new Error("Admin authentication required.");
  }

  const idToken =
    await user.getIdToken();

  const response =
    await fetch(
      BOOKING_EMAIL_WORKER,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },

        body: JSON.stringify({
          customerName:
            booking.name ||
            booking.clientName ||
            "",

          customerEmail:
            booking.email ||
            "",

          propertyAddress:
            booking.propertyAddress ||
            booking.address ||
            "",

          preferredDate:
            booking.preferredDate ||
            booking.date ||
            "",

          preferredTime:
            booking.preferredTime ||
            "",

          packageName:
            booking.package ||
            booking.packageName ||
            "",

          message:
            booking.message ||
            "",

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


  container.innerHTML =
    bookings
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
          booking.preferredDate ||
          booking.date ||
          "—";

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
                .replaceAll(" ", "-")}">
                ${escapeHTML(status)}
              </b>
            </span>

          </button>
        `;

      })
      .join("");


  container
    .querySelectorAll(".booking-row")
    .forEach(row => {

      row.addEventListener("click", () => {

        const bookingId =
          row.dataset.bookingId;

        openBookingModal(bookingId);

      });

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

      </div>


      <div
        id="bookingActionMessage"
        class="booking-action-message"
      ></div>


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
    status === "Confirmed" ||
    status === "Declined";


  proposeButton.disabled =
    status === "Confirmed" ||
    status === "Declined";


  declineButton.disabled =
    status === "Declined";

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


  const confirmed =
    confirm(
      "Accept this booking?"
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "acceptBookingButton"
    );


  button.disabled = true;

  button.textContent =
    "Accepting…";


  try {

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status: "Confirmed",
        confirmedAt: serverTimestamp()
      }
    );


    activeBooking.status =
      "Confirmed";


    renderBookings(currentBookings);

    renderRecentBookings(currentBookings);

    populateBookingModal();


    showBookingActionMessage(
      "Booking confirmed successfully."
    );


  } catch (error) {

    console.error(
      "Accept booking error:",
      error
    );


    showBookingActionMessage(
      "Unable to accept this booking.",
      true
    );


    button.disabled = false;

    button.textContent =
      "Accept booking";

  }

}


// ======================================================
// PROPOSE DIFFERENT DATE
// ======================================================

async function proposeBookingDate() {

  if (!activeBooking) {
    return;
  }


  const date =
    prompt(
      "Enter the proposed date (YYYY-MM-DD):",
      activeBooking.preferredDate || ""
    );


  if (!date) {
    return;
  }


  const time =
    prompt(
      "Enter the proposed time:",
      activeBooking.preferredTime || ""
    );


  if (!time) {
    return;
  }


  const message =
    prompt(
      "Message to the client:",
      "We are unavailable on your requested date. We would like to propose this alternative."
    );


  if (message === null) {
    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status: "Date Proposed",

        proposedDate: date,

        proposedTime: time,

        proposalMessage: message,

        proposedAt: serverTimestamp()
      }
    );


    activeBooking.status =
      "Date Proposed";

    activeBooking.proposedDate =
      date;

    activeBooking.proposedTime =
      time;

    activeBooking.proposalMessage =
      message;


    renderBookings(currentBookings);

    renderRecentBookings(currentBookings);

    populateBookingModal();


    showBookingActionMessage(
      "Alternative date saved successfully."
    );


  } catch (error) {

    console.error(
      "Propose date error:",
      error
    );


    showBookingActionMessage(
      "Unable to save the proposed date.",
      true
    );

  }

}


// ======================================================
// DECLINE BOOKING
// ======================================================

async function declineBooking() {

  if (!activeBooking) {
    return;
  }


  const reason =
    prompt(
      "Why are you declining this booking?",
      "Fully booked"
    );


  if (!reason) {
    return;
  }


  const message =
    prompt(
      "Message to the client:",
      "Unfortunately, we are unable to accommodate this booking on the requested date."
    );


  if (message === null) {
    return;
  }


  const confirmed =
    confirm(
      "Decline this booking?"
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "declineBookingButton"
    );


  button.disabled = true;

  button.textContent =
    "Declining…";


  try {

    await updateDoc(
      doc(
        db,
        "bookings",
        activeBooking.id
      ),
      {
        status: "Declined",

        declineReason: reason,

        declineMessage: message,

        declinedAt: serverTimestamp()
      }
    );


    activeBooking.status =
      "Declined";


    activeBooking.declineReason =
      reason;


    activeBooking.declineMessage =
      message;


    renderBookings(currentBookings);

    renderRecentBookings(currentBookings);

    populateBookingModal();


    showBookingActionMessage(
      "Booking declined."
    );


  } catch (error) {

    console.error(
      "Decline booking error:",
      error
    );


    showBookingActionMessage(
      "Unable to decline this booking.",
      true
    );


    button.disabled = false;

    button.textContent =
      "Decline / booked out";

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
