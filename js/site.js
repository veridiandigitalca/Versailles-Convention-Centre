/*!
 * Versailles Convention Centre — site interactions & motion system
 * Progressive enhancement only: every feature below checks that its
 * target exists before touching it, and every animated behaviour is
 * skipped in favour of an immediately-usable state when the visitor
 * has requested reduced motion.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setupMobileNav();
    setupHeaderScrollState();
    setupScrollProgress();
    setupScrollReveal(reduceMotion);
    setupCountUp(reduceMotion);
    if (!reduceMotion) setupParallax();
    setupLightbox();
    setupForm();
  }

  /* ---------------------------------------------------------------
   * Mobile navigation: open/close, closes on link click, Escape,
   * and outside click. Purely additive to the existing toggle markup.
   * ------------------------------------------------------------- */
  function setupMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav-links");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "\u2715" : "\u2630";
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("open"));
    });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
  }

  /* ---------------------------------------------------------------
   * Header: transitions from transparent (over the hero) to a
   * solid, legible state once the visitor scrolls.
   * ------------------------------------------------------------- */
  function setupHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------
   * A very thin, understated scroll-progress indicator.
   * ------------------------------------------------------------- */
  function setupScrollProgress() {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var update = function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  /* ---------------------------------------------------------------
   * Scroll-reveal: tags the existing content structure with
   * data-reveal / data-reveal-group attributes at runtime (no HTML
   * changes needed) and fades/lifts each piece into place the first
   * time it enters the viewport, once, via IntersectionObserver.
   * ------------------------------------------------------------- */
  function setupScrollReveal(reduceMotion) {
    var targets = [];

    document.querySelectorAll("main > section").forEach(function (section) {
      if (section.classList.contains("hero") || section.classList.contains("page-hero")) return;

      // Grouped, staggered content: card grids, stat rows, the gallery grid.
      section.querySelectorAll(".cards, .stats, .gallery").forEach(function (group) {
        if (!group.hasAttribute("data-reveal-group")) {
          group.setAttribute("data-reveal-group", "");
          targets.push(group);
        }
      });

      // Photography gets a gentle scale-settle as it reveals.
      section.querySelectorAll(".media, .tile").forEach(function (media) {
        if (!media.hasAttribute("data-reveal") && !media.closest("[data-reveal-group]")) {
          media.setAttribute("data-reveal", "image");
          targets.push(media);
        }
      });

      // Everything else at the top level of a section's content column(s).
      var textHolders = section.querySelectorAll(
        ":scope > .container > *, :scope > .container > .split > *, :scope > .container > .editorial > *"
      );
      textHolders.forEach(function (el) {
        if (el.matches(".cards, .stats, .gallery, .media, .tile")) return;
        if (el.hasAttribute("data-reveal") || el.hasAttribute("data-reveal-group")) return;
        // Skip if an ancestor (not itself) is already being revealed — avoids compounding motion.
        if (el.parentElement && el.parentElement.closest("[data-reveal],[data-reveal-group]")) return;
        el.setAttribute("data-reveal", "fade-up");
        targets.push(el);
      });
    });

    document.querySelectorAll(".footer-grid, .footer-bottom").forEach(function (el) {
      if (!el.hasAttribute("data-reveal-group")) {
        el.setAttribute("data-reveal-group", "");
        targets.push(el);
      }
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
    );
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
   * Statistic count-up (22,000 / 4 / 1,375 / 2,875 etc.), triggered
   * once each stat scrolls into view. Falls back to the plain final
   * number immediately when reduced motion is requested.
   * ------------------------------------------------------------- */
  function setupCountUp(reduceMotion) {
    var strongs = document.querySelectorAll(".stat strong");
    if (!strongs.length) return;

    strongs.forEach(function (strong) {
      var digits = strong.textContent.replace(/[^0-9]/g, "");
      if (!digits) return;
      strong.setAttribute("data-target", digits);
      if (!reduceMotion) strong.textContent = "0";
    });

    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll(".stat strong[data-target]").forEach(function (s) { io.observe(s); });
  }

  function animateCount(strong) {
    var target = parseInt(strong.getAttribute("data-target"), 10);
    if (isNaN(target)) return;
    var duration = 1100;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      strong.textContent = Math.round(eased * target).toLocaleString("en-US");
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        strong.textContent = target.toLocaleString("en-US");
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------
   * Extremely subtle parallax on architectural / editorial imagery.
   * Movement is clamped to roughly ±14px — depth, not distraction.
   * ------------------------------------------------------------- */
  function setupParallax() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll(".media img, .tile img"));
    if (!imgs.length) return;

    var ticking = false;

    function apply() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      imgs.forEach(function (img) {
        var rect = img.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return; // skip far-offscreen work
        var center = rect.top + rect.height / 2;
        var offset = ((center - vh / 2) / vh) * 14;
        img.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(apply);
        ticking = true;
      }
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------------------------------------------------------------
   * Gallery lightbox: smooth open/close, Previous/Next, keyboard
   * arrows, Escape, and simple focus trapping while open.
   * ------------------------------------------------------------- */
  function setupLightbox() {
    var lightbox = document.querySelector(".lightbox");
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    if (!lightbox || !buttons.length) return;

    var img = lightbox.querySelector("img");
    if (!img) return;

    var currentIndex = 0;
    var lastFocused = null;

    var prevBtn = lightbox.querySelector("[data-prev]");
    var nextBtn = lightbox.querySelector("[data-next]");
    var closeBtn = lightbox.querySelector("[data-close]");

    if (!prevBtn) {
      prevBtn = document.createElement("button");
      prevBtn.setAttribute("data-prev", "");
      prevBtn.setAttribute("aria-label", "Previous image");
      prevBtn.innerHTML = "&#8249;";
      lightbox.appendChild(prevBtn);
    }
    if (!nextBtn) {
      nextBtn = document.createElement("button");
      nextBtn.setAttribute("data-next", "");
      nextBtn.setAttribute("aria-label", "Next image");
      nextBtn.innerHTML = "&#8250;";
      lightbox.appendChild(nextBtn);
    }

    function openAt(index) {
      currentIndex = (index + buttons.length) % buttons.length;
      var btn = buttons[currentIndex];
      var src = btn.getAttribute("data-lightbox");
      var label = btn.getAttribute("aria-label") || "";

      img.classList.remove("is-loaded");
      img.src = src;
      img.alt = label;

      var showLoaded = function () { img.classList.add("is-loaded"); };
      if (img.complete) {
        requestAnimationFrame(showLoaded);
      } else {
        img.addEventListener("load", showLoaded, { once: true });
      }

      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lb-lock");
      lastFocused = document.activeElement;
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lb-lock");
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { openAt(i); });
    });
    prevBtn.addEventListener("click", function () { openAt(currentIndex - 1); });
    nextBtn.addEventListener("click", function () { openAt(currentIndex + 1); });
    if (closeBtn) closeBtn.addEventListener("click", close);

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowRight") { openAt(currentIndex + 1); return; }
      if (e.key === "ArrowLeft") { openAt(currentIndex - 1); return; }
      if (e.key === "Tab") {
        var focusables = Array.prototype.slice.call(lightbox.querySelectorAll("button"));
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------------------------------------------------------------
   * Event inquiry form: unchanged field behaviour and validation,
   * with a brief, honest "sending" state before the success notice.
   * ------------------------------------------------------------- */
  function setupForm() {
    var form = document.querySelector("#event-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var successNotice = document.querySelector("#form-success");
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.textContent : null;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending\u2026";
      }

      window.setTimeout(function () {
        form.hidden = true;
        if (submitBtn && originalLabel) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        if (successNotice) {
          successNotice.hidden = false;
          successNotice.focus();
        }
      }, 300);
    });
  }
})();
