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
  limit
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
    document.getElementById(
      "bookingsList"
    );


  if (!bookings.length) {

    container.textContent =
      "No bookings yet.";

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
          <div class="booking-row">

            <span>${escapeHTML(client)}</span>

            <span>${escapeHTML(property)}</span>

            <span>${escapeHTML(date)}</span>

            <span>${escapeHTML(packageName)}</span>

            <span>
              <b class="status-badge">
                ${escapeHTML(status)}
              </b>
            </span>

          </div>
        `;

      })
      .join("");

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
