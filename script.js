const card = document.querySelector(".card");
const mediaMask = document.querySelector(".card__media-mask");
const mediaImage = document.querySelector(".card__image");
const tagOverlays = document.querySelectorAll(".tag__text--hover");
const excerpt = document.querySelector(".card__excerpt");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const fullExcerpt = excerpt.textContent.replace(/\s+/g, " ").trim();
excerpt.setAttribute("aria-label", fullExcerpt);
let resizeDebounce;

function truncateExcerpt() {
  excerpt.textContent = fullExcerpt;

  const maxHeight = excerpt.clientHeight + 1;
  if (excerpt.scrollHeight <= maxHeight) {
    return;
  }

  let low = 0;
  let high = fullExcerpt.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${fullExcerpt.slice(0, mid).trimEnd()}...`;
    excerpt.textContent = candidate;

    if (excerpt.scrollHeight <= maxHeight) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  excerpt.textContent = best;
}

function setupHoverMotion() {
  gsap.set(mediaMask, {
    borderRadius: "0%",
    force3D: true,
  });

  gsap.set(mediaImage, {
    scale: 1,
    force3D: true,
    transformOrigin: "50% 50%",
  });

  gsap.set(tagOverlays, {
    y: "-101%",
    force3D: true,
  });

  let pointerInside = false;
  let focusInside = false;
  let active = false;

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = reduceMotion.matches;

    gsap.to(mediaMask, {
      borderRadius: nextActive ? "50%" : "0%",
      duration: instant ? 0.001 : nextActive ? 0.78 : 0.58,
      ease: nextActive ? "expo.out" : "power3.inOut",
      overwrite: "auto",
    });

    gsap.to(mediaImage, {
      scale: nextActive ? 1.05 : 1,
      duration: instant ? 0.001 : nextActive ? 0.82 : 0.62,
      ease: nextActive ? "expo.out" : "power3.inOut",
      overwrite: "auto",
    });

    gsap.to(tagOverlays, {
      y: nextActive ? "0%" : "-101%",
      duration: instant ? 0.001 : nextActive ? 0.46 : 0.34,
      ease: nextActive ? "power3.out" : "power3.inOut",
      stagger: instant ? 0 : 0.075,
      overwrite: "auto",
    });
  }

  function sync() {
    animate(pointerInside || focusInside);
  }

  card.addEventListener("pointerenter", () => {
    pointerInside = true;
    sync();
  });

  card.addEventListener("pointerleave", () => {
    pointerInside = false;
    sync();
  });

  card.addEventListener("pointercancel", () => {
    pointerInside = false;
    sync();
  });

  card.addEventListener("focusin", () => {
    focusInside = true;
    sync();
  });

  card.addEventListener("focusout", () => {
    focusInside = false;
    sync();
  });
}

function setupFallbackMotion() {
  let pointerInside = false;
  let focusInside = false;
  let active = false;
  let radiusAnimation;
  let imageAnimation;
  let tagAnimations = [];

  tagOverlays.forEach((tagOverlay) => {
    tagOverlay.style.transform = "translateY(-101%)";
  });

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = reduceMotion.matches;
    radiusAnimation?.cancel();
    imageAnimation?.cancel();
    tagAnimations.forEach((animation) => animation.cancel());

    radiusAnimation = mediaMask.animate(
      {
        borderRadius: nextActive ? ["0%", "50%"] : ["50%", "0%"],
      },
      {
        duration: instant ? 1 : nextActive ? 780 : 580,
        easing: nextActive
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      },
    );

    imageAnimation = mediaImage.animate(
      {
        transform: nextActive ? ["scale(1)", "scale(1.05)"] : ["scale(1.05)", "scale(1)"],
      },
      {
        duration: instant ? 1 : nextActive ? 820 : 620,
        easing: nextActive
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      },
    );

    tagAnimations = Array.from(tagOverlays, (tagOverlay, index) =>
      tagOverlay.animate(
        {
          transform: nextActive
            ? ["translateY(-101%)", "translateY(0%)"]
            : ["translateY(0%)", "translateY(-101%)"],
        },
        {
          delay: instant ? 0 : index * 75,
          duration: instant ? 1 : nextActive ? 460 : 340,
          easing: nextActive
            ? "cubic-bezier(0.22, 1, 0.36, 1)"
            : "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        },
      ),
    );
  }

  function sync() {
    animate(pointerInside || focusInside);
  }

  card.addEventListener("pointerenter", () => {
    pointerInside = true;
    sync();
  });

  card.addEventListener("pointerleave", () => {
    pointerInside = false;
    sync();
  });

  card.addEventListener("pointercancel", () => {
    pointerInside = false;
    sync();
  });

  card.addEventListener("focusin", () => {
    focusInside = true;
    sync();
  });

  card.addEventListener("focusout", () => {
    focusInside = false;
    sync();
  });
}

if (document.fonts) {
  document.fonts.ready.then(truncateExcerpt);
} else {
  truncateExcerpt();
}

window.addEventListener("resize", () => {
  if (window.gsap) {
    resizeDebounce?.kill();
    resizeDebounce = gsap.delayedCall(0.08, truncateExcerpt);
    return;
  }

  window.clearTimeout(resizeDebounce);
  resizeDebounce = window.setTimeout(truncateExcerpt, 80);
});

if (window.gsap) {
  setupHoverMotion();
} else {
  setupFallbackMotion();
}
