
(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */

  const SELECTORS = {
    reveal: "[data-reveal]"
  };

  const isReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const isSameOrigin = (url) => {
    return url.origin === window.location.origin;
  };

  const isModifiedClick = (event) => {
    return (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    );
  };

  /* ------------------------------------------------------------------------
     SCROLL RESTORATION
     ------------------------------------------------------------------------ */

  // Tell the browser that this site wants to manage scroll position itself.
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  /*
   * Instantly move to the top without triggering a visible smooth scroll.
   * This is intentionally separate from the site's animation system.
   */
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant"
    });
  }

  /* ------------------------------------------------------------------------
     FRESH PAGE LOAD
     ------------------------------------------------------------------------ */

  /*
   * A fresh page load should always begin at the top.

   * We do this more than once because browsers can restore scroll position
   * at slightly different stages of the loading process.
   */

  function resetFreshPagePosition() {
    if (window.location.hash) return;

    scrollToTop();

    requestAnimationFrame(() => {
      scrollToTop();

      requestAnimationFrame(() => {
        scrollToTop();
      });
    });
  }

  /*
   * Only treat the initial document load as a fresh page.

   * Back/forward navigation is deliberately NOT forced to the top.
   * This preserves normal browser navigation behaviour.
   */
  if (
    performance.getEntriesByType &&
    performance.getEntriesByType("navigation").length
  ) {
    const navigation = performance.getEntriesByType("navigation")[0];

    if (navigation.type === "reload" || navigation.type === "navigate") {
      resetFreshPagePosition();
    }
  } else {
    resetFreshPagePosition();
  }

  window.addEventListener("load", () => {
    resetFreshPagePosition();
  });

  /* ------------------------------------------------------------------------
     INTERNAL PAGE NAVIGATION
     ------------------------------------------------------------------------ */

  document.addEventListener("click", (event) => {
    if (isModifiedClick(event)) return;

    const link = event.target.closest("a");

    if (!link) return;

    /*
     * Don't interfere with:
     * - New tabs/windows
     * - Downloads
     * - Email links
     * - Telephone links
     * - JavaScript links
     * - External websites
     * - Same-page anchor links
     */

    if (
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const rawHref = link.getAttribute("href");

    if (!rawHref) return;

    if (
      rawHref.startsWith("#") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:") ||
      rawHref.startsWith("javascript:")
    ) {
      return;
    }

    let destination;

    try {
      destination = new URL(rawHref, window.location.href);
    } catch {
      return;
    }

    if (!isSameOrigin(destination)) return;

    /*
     * If the destination contains a hash, let the browser handle the anchor.
     *
     * Example:
     * about.html#story
     */
    if (destination.hash) return;

    /*
     * For normal internal page navigation, reset scroll before leaving.
     * The new page will also initialize itself at the top.
     */
    scrollToTop();
  });

  /* ------------------------------------------------------------------------
     ANCHOR LINKS
     ------------------------------------------------------------------------ */

  /*
   * Same-page anchors are intentionally allowed to scroll normally.

   * This prevents the page initializer from breaking things like:
   *
   * <a href="#consultation-form">Book a consultation</a>
   */

  /* ------------------------------------------------------------------------
     REVEAL INITIALIZATION
     ------------------------------------------------------------------------ */

  function initializeReveals() {
    if (typeof window.initReveals !== "function") {
      return;
    }

    const revealElements = document.querySelectorAll(
      SELECTORS.reveal
    );

    if (!revealElements.length) {
      return;
    }

    window.initReveals(revealElements);
  }

  /*
   * Initialize reveals as soon as the DOM is ready.
   */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeReveals,
      { once: true }
    );
  } else {
    initializeReveals();
  }

  /*
   * Initialize again after the complete page has loaded.

   * This is useful for content that appears after images, fonts, or
   * other resources have finished loading.
   */

  window.addEventListener(
    "load",
    initializeReveals,
    { once: true }
  );

  /* ------------------------------------------------------------------------
     DYNAMIC REVEAL SUPPORT
     ------------------------------------------------------------------------ */

  /*
   * Your main.js generates some content dynamically, such as the services
   * explorer. A MutationObserver lets this file notice newly-added
   * [data-reveal] elements automatically.

   * This means future dynamically generated sections can simply use:

       <div data-reveal>

   * without requiring additional page-specific animation code.
   */

  if (
    "MutationObserver" in window &&
    typeof window.initReveals === "function"
  ) {
    let revealTimer = null;

    const observer = new MutationObserver(() => {
      clearTimeout(revealTimer);

      revealTimer = setTimeout(() => {
        initializeReveals();
      }, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* ------------------------------------------------------------------------
     LAYOUT SETTLING
     ------------------------------------------------------------------------ */

  /*
   * Images and fonts can change the page height after the initial render.

   * We don't repeatedly force the page to the top because that can become
   * annoying while the user is interacting with the page.

   * Instead, we make one final correction shortly after load.
   */

  window.addEventListener("load", () => {
    if (window.location.hash) return;

    const settle = () => {
      scrollToTop();
    };

    if (isReducedMotion) {
      settle();
      return;
    }

    setTimeout(settle, 100);
    setTimeout(settle, 400);
  });

  /* ------------------------------------------------------------------------
     HASH / ANCHOR HANDLING
     ------------------------------------------------------------------------ */

  /*
   * If somebody intentionally opens:
   *
   * contact.html#consultation-form
   *
   * we respect that and DO NOT force them to the top.
   */

  function scrollToHash() {
    if (!window.location.hash) return;

    const id = decodeURIComponent(
      window.location.hash.substring(1)
    );

    const target = document.getElementById(id);

    if (!target) return;

    /*
     * Give the page a moment to finish laying out before scrolling to
     * the requested section.
     */

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: isReducedMotion ? "auto" : "smooth",
          block: "start"
        });
      });
    });
  }

  window.addEventListener("load", scrollToHash);

  /* ------------------------------------------------------------------------
     PAGE VISIBILITY
     ------------------------------------------------------------------------ */

  /*
   * If the user returns to the page from another application/tab,
   * don't reset their scroll position.

   * The browser should preserve where they were.
   */

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      initializeReveals();
    }
  });

})();