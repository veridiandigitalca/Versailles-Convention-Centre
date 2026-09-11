document.addEventListener("DOMContentLoaded", () => {

    const faqItems = document.querySelectorAll(".faq-v2-item");

    faqItems.forEach((item) => {

        const button = item.querySelector(".faq-v2-question");

        button.addEventListener("click", () => {

            const isOpen = item.classList.contains("active");

            // Close all other FAQ items
            faqItems.forEach((otherItem) => {
                otherItem.classList.remove("active");

                const otherButton = otherItem.querySelector(
                    ".faq-v2-question"
                );

                otherButton.setAttribute("aria-expanded", "false");
            });

            // Open the clicked item if it wasn't already open
            if (!isOpen) {
                item.classList.add("active");
                button.setAttribute("aria-expanded", "true");
            }

        });

        // Accessibility
        button.setAttribute("aria-expanded", "false");

    });

});
