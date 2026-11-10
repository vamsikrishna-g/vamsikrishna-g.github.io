

        // JavaScript to move the container to the top of the page
        function moveToTop(event, id) { // Function to move the container to the top of the page
            event.preventDefault(); // Prevents the default behavior of the link
            document.getElementById('container').classList.add('moved'); // Adds the 'moved' class to the container
            setTimeout(function() { // Sets a timeout to wait for the transition to complete
                window.location.href = url; // Redirects to the specified URL
            }, 2000); // Match the transition duration
        }
        
        // JavaScript to show content on click
        document.addEventListener("DOMContentLoaded", function() { // Listens for when the DOM content is fully loaded
            // Hide all sections initially
            var sections = document.querySelectorAll("main section"); // Selects all sections in the main element
            sections.forEach(function(section) { // Iterates over each section
                section.style.display = "none";// Hides the section
            });

            // Add click event listeners to navigation links
            var navLinks = document.querySelectorAll("nav a"); // Selects all navigation links
            navLinks.forEach(function(link) {// Iterates over each navigation link
                link.addEventListener("click", function(event) {// Adds a click event listener
                    event.preventDefault();// Prevents the default behavior of the link
                    var targetId = link.getAttribute("href").substring(1); // Gets the target section ID
                    var targetSection = document.getElementById(targetId);// Gets the target section
                    if (targetSection) {// Checks if the target section exists
                        // Hide all sections
                        sections.forEach(function(section) {// Iterates over each section
                            section.style.display = "none";// Hides the section
                        });
                        // Show the clicked section
                        targetSection.style.display = "block";// Displays the target section
                    }
                });
            });
        });

        


        document.addEventListener('DOMContentLoaded', (event) => { /* Listens for when the DOM content is fully loaded */
            const texts = ["my", "Gunturu Vamsi Krishna's"]; /* Array of texts for typing effect */
            const typingElement = document.getElementById('typing'); /* Gets the element for dynamic typing */
            const typingSpeed = 100; // typing speed in milliseconds
            const eraseSpeed = 50; // erasing speed in milliseconds
            const delayBetweenIterations = 2000; // delay before starting to erase
            const delayAfterErase = 1000; // delay before starting to type again
            let textIndex = 0; /* Index of current text in texts array */
            let charIndex = 0; /* Index of current character in current text */
            let isErasing = false; /* Flag to indicate whether erasing is in progress */

            function type() {
                const currentText = texts[textIndex]; /* Gets the current text */
                if (charIndex < currentText.length && !isErasing) { /* Checks if typing is not complete and not erasing */
                    typingElement.textContent += currentText.charAt(charIndex); /* Types the next character */
                    charIndex++; /* Moves to the next character */
                    setTimeout(type, typingSpeed); /* Calls type function recursively with a delay */
                } else if (charIndex === currentText.length) { /* Checks if typing is complete */
                    setTimeout(() => {
                        isErasing = true; /* Sets the flag to indicate erasing */
                        erase(); /* Calls erase function */
                    }, delayBetweenIterations); /* Waits for a delay before starting to erase */
                }
            }

        });

