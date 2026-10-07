/* =========================================================
   FLO PROPERTY MEDIA
   WEBSITE JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================================================
   MOBILE MENU
   ========================================================= */

const menuToggle =
    document.getElementById("menuToggle");

const mobileMenu =
    document.getElementById("mobileMenu");

const mobileMenuClose =
    document.getElementById("mobileMenuClose");


if (menuToggle && mobileMenu) {

    /* -------------------------
       OPEN / CLOSE MENU
       ------------------------- */

    menuToggle.onclick = function (event) {

        event.preventDefault();
        event.stopPropagation();

        const isOpen =
            mobileMenu.classList.toggle("open");

        menuToggle.classList.toggle(
            "active",
            isOpen
        );

        document.body.classList.toggle(
            "menu-open",
            isOpen
        );

        menuToggle.setAttribute(
            "aria-label",
            isOpen
                ? "Close menu"
                : "Open menu"
        );
    };


    /* -------------------------
       CLOSE BUTTON — X
       ------------------------- */

    if (mobileMenuClose) {

        mobileMenuClose.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                mobileMenu.classList.remove(
                    "open"
                );

                menuToggle.classList.remove(
                    "active"
                );

                document.body.classList.remove(
                    "menu-open"
                );

                menuToggle.setAttribute(
                    "aria-label",
                    "Open menu"
                );
            };
    }


    /* -------------------------
       CLOSE WHEN LINK IS CLICKED
       ------------------------- */

    mobileMenu
        .querySelectorAll("a")
        .forEach(function (link) {

            link.addEventListener(
                "click",
                function () {

                    mobileMenu.classList.remove(
                        "open"
                    );

                    menuToggle.classList.remove(
                        "active"
                    );

                    document.body.classList.remove(
                        "menu-open"
                    );

                    menuToggle.setAttribute(
                        "aria-label",
                        "Open menu"
                    );

                }
            );

        });


    /* -------------------------
       CLOSE WITH ESCAPE
       ------------------------- */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                mobileMenu.classList.contains("open")
            ) {

                mobileMenu.classList.remove(
                    "open"
                );

                menuToggle.classList.remove(
                    "active"
                );

                document.body.classList.remove(
                    "menu-open"
                );

                menuToggle.setAttribute(
                    "aria-label",
                    "Open menu"
                );

            }

        }
    );

}


    /* =====================================================
       NAVIGATION
       ===================================================== */

    const nav =
        document.querySelector(".nav");

    window.addEventListener(
        "scroll",
        function () {

            if (!nav) return;

            if (window.scrollY > 40) {

                nav.classList.add("scrolled");

            } else {

                nav.classList.remove("scrolled");

            }

        },
        {
            passive: true
        }
    );


    /* =====================================================
       SMOOTH SCROLL
       ===================================================== */

    document
        .querySelectorAll('a[href^="#"]')
        .forEach(function (link) {

            link.addEventListener(
                "click",
                function (event) {

                    const targetID =
                        link.getAttribute("href");

                    if (
                        !targetID ||
                        targetID === "#"
                    ) {
                        return;
                    }

                    const target =
                        document.querySelector(targetID);

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    const navHeight =
                        nav
                            ? nav.offsetHeight
                            : 0;

                    const position =
                        target.getBoundingClientRect().top
                        +
                        window.scrollY
                        -
                        navHeight
                        -
                        15;

                    window.scrollTo({
                        top: Math.max(position, 0),
                        behavior: "smooth"
                    });

                }
            );

        });


    /* =====================================================
       FAQ ACCORDION
       ===================================================== */

    const faqItems =
        document.querySelectorAll(".faq-item");

    faqItems.forEach(function (item) {

        const question =
            item.querySelector(".faq-question");

        if (!question) return;

        question.addEventListener(
            "click",
            function () {

                const wasOpen =
                    item.classList.contains("open");

                faqItems.forEach(
                    function (otherItem) {

                        otherItem.classList.remove("open");

                        const otherQuestion =
                            otherItem.querySelector(
                                ".faq-question"
                            );

                        if (otherQuestion) {

                            otherQuestion.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }

                    }
                );

                if (!wasOpen) {

                    item.classList.add("open");

                    question.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                }

            }
        );

    });


    /* =====================================================
       FUTURE DATE ONLY
       ===================================================== */

    const dateInput =
        document.querySelector(
            'input[name="preferred_date"]'
        );

    if (dateInput) {

        const today = new Date();

        const tomorrow =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() + 1
            );

        const year =
            tomorrow.getFullYear();

        const month =
            String(
                tomorrow.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                tomorrow.getDate()
            ).padStart(2, "0");

        dateInput.min =
            `${year}-${month}-${day}`;

        dateInput.addEventListener(
            "change",
            function () {

                if (!dateInput.value) return;

                const selected =
                    new Date(
                        dateInput.value +
                        "T00:00:00"
                    );

                const todayOnly =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                    );

                if (selected <= todayOnly) {

                    dateInput.value = "";

                    alert(
                        "Please select a future date."
                    );

                }

            }
        );

    }


    /* =====================================================
       PACKAGE SELECTION
       ===================================================== */

    const packageSelect =
        document.querySelector(
            'select[name="package"]'
        );

    const packageButtons =
        document.querySelectorAll(
            ".package-button[data-package]"
        );

    packageButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const packageName =
                        button.dataset.package;

                    if (
                        packageSelect &&
                        packageName
                    ) {

                        packageSelect.value =
                            packageName;

                    }

                }
            );

        }
    );


    /* =====================================================
       BOOKING FORM VALIDATION
       ===================================================== */

    const form =
        document.querySelector(".booking-form");

    if (form) {

        form.addEventListener(
            "submit",
            function (event) {

                let valid = true;

                const requiredFields =
                    form.querySelectorAll("[required]");

                requiredFields.forEach(
                    function (field) {

                        field.classList.remove(
                            "field-error"
                        );

                        if (
                            !field.value.trim()
                        ) {

                            field.classList.add(
                                "field-error"
                            );

                            valid = false;

                        }

                    }
                );

                if (!valid) {

                    event.preventDefault();

                    alert(
                        "Please complete all required fields."
                    );

                    return;

                }

                if (
                    dateInput &&
                    dateInput.value
                ) {

                    const selected =
                        new Date(
                            dateInput.value +
                            "T00:00:00"
                        );

                    const today =
                        new Date();

                    today.setHours(
                        0,
                        0,
                        0,
                        0
                    );

                    if (selected <= today) {

                        event.preventDefault();

                        alert(
                            "Please select a future booking date."
                        );

                        dateInput.focus();

                        return;

                    }

                }

            }
        );

    }


    /* =====================================================
       ADDRESS SERVICE AREA NOTICE
       ===================================================== */

    const addressInput =
        document.querySelector(
            'input[name="property_address"]'
        );

    const travelNotice =
        document.querySelector("#travelNotice");

    if (
        addressInput &&
        travelNotice
    ) {

        addressInput.addEventListener(
            "input",
            function () {

                const address =
                    addressInput.value.trim();

                if (!address) {

                    travelNotice.classList.remove(
                        "show"
                    );

                    return;

                }

                travelNotice.classList.add("show");

                travelNotice.textContent =
                    "Melbourne service area. Properties beyond 25 km may incur a $1 travel surcharge.";

            }
        );

    }


    /* =====================================================
       SUBTLE CARD GLOW
       ===================================================== */

    const glowCards =
        document.querySelectorAll(
            ".service-card, .package, .project-image, .booking-form"
        );

    if (
        window.matchMedia(
            "(pointer: fine)"
        ).matches
    ) {

        glowCards.forEach(
            function (card) {

                card.addEventListener(
                    "pointermove",
                    function (event) {

                        const rect =
                            card.getBoundingClientRect();

                        const x =
                            (
                                (event.clientX -
                                rect.left)
                                /
                                rect.width
                            ) * 100;

                        const y =
                            (
                                (event.clientY -
                                rect.top)
                                /
                                rect.height
                            ) * 100;

                        card.style.setProperty(
                            "--mouse-x",
                            `${x}%`
                        );

                        card.style.setProperty(
                            "--mouse-y",
                            `${y}%`
                        );

                    }
                );

                card.addEventListener(
                    "pointerleave",
                    function () {

                        card.style.removeProperty(
                            "--mouse-x"
                        );

                        card.style.removeProperty(
                            "--mouse-y"
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       HERO PARALLAX
       ===================================================== */

    const heroImage =
        document.querySelector(".hero-image");

    if (
        heroImage &&
        window.matchMedia(
            "(prefers-reduced-motion: no-preference)"
        ).matches
    ) {

        window.addEventListener(
            "scroll",
            function () {

                const scroll =
                    window.scrollY;

                if (
                    scroll <
                    window.innerHeight
                ) {

                    heroImage.style.transform =
                        `scale(1.04) translateY(${scroll * 0.06}px)`;

                }

            },
            {
                passive: true
            }
        );

    }

});
