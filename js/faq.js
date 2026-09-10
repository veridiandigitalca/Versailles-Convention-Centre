  /* ============================================================
     FAQ ACCORDION — unchanged interaction (grid-template-rows
     already animates height smoothly); ARIA state kept in sync.
     ============================================================ */
  document.querySelectorAll("[data-faq]").forEach(item => {
    const q = item.querySelector(".faq-q");
    q?.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", String(open));
    });
  });