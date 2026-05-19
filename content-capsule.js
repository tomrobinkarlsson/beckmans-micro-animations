const contentCapsule = document.querySelector(".content-capsule");
const contentCapsuleContent = document.querySelector(".content-capsule__content");
const contentCapsuleReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let contentCapsuleRaf;
let lastRenderedRadius = -1;
let lastRenderedParallax = -1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutQuad(progress) {
  return 1 - (1 - progress) * (1 - progress);
}

function getRoundedRadius(rect) {
  return Math.min(rect.width, rect.height) / 2;
}

function getCapsuleProgress(rect) {
  const viewportHeight = window.innerHeight;
  const styles = window.getComputedStyle(document.documentElement);
  const startOffset = parseFloat(styles.getPropertyValue("--capsule-start-offset")) || 0;
  const centeredTop = (viewportHeight - rect.height) / 2;
  const startTop = viewportHeight + startOffset;
  const travelDistance = Math.max(startTop - centeredTop, 1);

  return clamp(1 - (rect.top - centeredTop) / travelDistance, 0, 1);
}

function getTextParallax(progress) {
  if (contentCapsuleReduceMotion.matches) {
    return 0;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const maxParallax = parseFloat(styles.getPropertyValue("--capsule-text-parallax")) || 36;

  return (1 - progress) * maxParallax;
}

function getDelayedShapeProgress(progress) {
  if (contentCapsuleReduceMotion.matches) {
    return progress;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const delay = clamp(
    parseFloat(styles.getPropertyValue("--capsule-shape-delay")) || 0,
    0,
    0.85,
  );

  return clamp((progress - delay) / (1 - delay), 0, 1);
}

function renderCapsuleScrollState() {
  contentCapsuleRaf = undefined;

  const rect = contentCapsule.getBoundingClientRect();
  const progress = getCapsuleProgress(rect);
  const shapeProgress = getDelayedShapeProgress(progress);
  const easedShapeProgress = contentCapsuleReduceMotion.matches
    ? shapeProgress
    : easeOutQuad(shapeProgress);
  const easedTextProgress = contentCapsuleReduceMotion.matches ? progress : easeOutQuad(progress);
  const nextRadius = getRoundedRadius(rect) * easedShapeProgress;
  const nextParallax = getTextParallax(easedTextProgress);

  if (
    Math.abs(nextRadius - lastRenderedRadius) < 0.25 &&
    Math.abs(nextParallax - lastRenderedParallax) < 0.1
  ) {
    return;
  }

  lastRenderedRadius = nextRadius;
  lastRenderedParallax = nextParallax;

  if (window.gsap) {
    gsap.to(contentCapsule, {
      borderRadius: `${nextRadius}px`,
      duration: contentCapsuleReduceMotion.matches ? 0.001 : 0.18,
      ease: "power3.out",
      overwrite: "auto",
    });

    gsap.to(contentCapsuleContent, {
      "--capsule-text-y": `${nextParallax}px`,
      duration: contentCapsuleReduceMotion.matches ? 0.001 : 0.18,
      ease: "power3.out",
      overwrite: "auto",
    });
    return;
  }

  contentCapsule.style.borderRadius = `${nextRadius}px`;
  contentCapsuleContent.style.setProperty("--capsule-text-y", `${nextParallax}px`);
}

function scheduleCapsuleRender() {
  if (contentCapsuleRaf) {
    return;
  }

  contentCapsuleRaf = window.requestAnimationFrame(renderCapsuleScrollState);
}

if (contentCapsule && contentCapsuleContent) {
  window.addEventListener("scroll", scheduleCapsuleRender, { passive: true });
  window.addEventListener("resize", () => {
    lastRenderedRadius = -1;
    lastRenderedParallax = -1;
    scheduleCapsuleRender();
  });

  if (contentCapsuleReduceMotion.addEventListener) {
    contentCapsuleReduceMotion.addEventListener("change", () => {
      lastRenderedRadius = -1;
      lastRenderedParallax = -1;
      scheduleCapsuleRender();
    });
  } else {
    contentCapsuleReduceMotion.addListener(() => {
      lastRenderedRadius = -1;
      lastRenderedParallax = -1;
      scheduleCapsuleRender();
    });
  }

  scheduleCapsuleRender();
}
