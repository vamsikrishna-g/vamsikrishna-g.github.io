
// ==========================================
// 1. MOVE CONTAINER TO TOP AND REDIRECT
// ==========================================

function moveToTop(event, url) {

    event.preventDefault();

    document.getElementById('container').classList.add('moved');

    setTimeout(function() {
        window.location.href = url;
    }, 2000);
}


// ==========================================
// 2. NAVIGATION: SHOW CONTENT ON CLICK
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    // Hide all sections initially
    var sections = document.querySelectorAll("main section");

    sections.forEach(function(section) {
        section.style.display = "none";
    });

    // Add click event listeners to navigation links
    var navLinks = document.querySelectorAll("nav a");

    navLinks.forEach(function(link) {

        link.addEventListener("click", function(event) {

            event.preventDefault();

            var targetId = link.getAttribute("href").substring(1);

            var targetSection = document.getElementById(targetId);

            if (targetSection) {

                // Hide all sections
                sections.forEach(function(section) {
                    section.style.display = "none";
                });

                // Show selected section
                targetSection.style.display = "block";
            }
        });
    });

});
