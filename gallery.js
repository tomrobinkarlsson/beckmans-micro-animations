const galleryTrack = document.querySelector(".gallery__track");
const gallerySequence = document.querySelector(".gallery__sequence");
const galleryViewport = document.querySelector(".gallery__viewport");
const galleryReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const animatedItems = new WeakSet();
const marqueePixelsPerSecond = 42;
const maskPointCount = 80;
const squircleExponent = 4.6;
let marqueeTween;
let marqueeAnimation;
let resizeDebounce;

function bindInteractiveState(target, onChange) {
  let pointerInside = false;
  let focusInside = false;

  function sync() {
    onChange(pointerInside || focusInside);
  }

  target.addEventListener("pointerenter", () => {
    pointerInside = true;
    sync();
  });

  target.addEventListener("pointerleave", () => {
    pointerInside = false;
    sync();
  });

  target.addEventListener("pointercancel", () => {
    pointerInside = false;
    sync();
  });

  target.addEventListener("focusin", () => {
    focusInside = true;
    sync();
  });

  target.addEventListener("focusout", () => {
    focusInside = false;
    sync();
  });
}

function getTrackGap() {
  const styles = window.getComputedStyle(galleryTrack);
  return parseFloat(styles.columnGap || styles.gap) || 16;
}

function getLoopDistance() {
  return gallerySequence.getBoundingClientRect().width + getTrackGap();
}

function getMaskPaths(item) {
  const squarePoints = [];
  const squirclePoints = [];
  const pointsPerSide = maskPointCount / 4;

  for (let index = 0; index < maskPointCount; index += 1) {
    const angle = (index / maskPointCount) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const side = Math.floor(index / pointsPerSide);
    const sideProgress = (index % pointsPerSide) / pointsPerSide;
    const squircleX =
      50 + Math.sign(cos) * Math.pow(Math.abs(cos), 2 / squircleExponent) * 50;
    const squircleY =
      50 + Math.sign(sin) * Math.pow(Math.abs(sin), 2 / squircleExponent) * 50;
    let squareX;
    let squareY;

    if (side === 0) {
      squareX = sideProgress <= 0.5 ? 100 : 100 - (sideProgress - 0.5) * 100;
      squareY = sideProgress <= 0.5 ? 50 + sideProgress * 100 : 100;
    } else if (side === 1) {
      squareX = sideProgress <= 0.5 ? 50 - sideProgress * 100 : 0;
      squareY = sideProgress <= 0.5 ? 100 : 100 - (sideProgress - 0.5) * 100;
    } else if (side === 2) {
      squareX = sideProgress <= 0.5 ? 0 : (sideProgress - 0.5) * 100;
      squareY = sideProgress <= 0.5 ? 50 - sideProgress * 100 : 0;
    } else {
      squareX = sideProgress <= 0.5 ? 50 + sideProgress * 100 : 100;
      squareY = sideProgress <= 0.5 ? 0 : (sideProgress - 0.5) * 100;
    }

    squarePoints.push(`${squareX.toFixed(3)}% ${squareY.toFixed(3)}%`);
    squirclePoints.push(`${squircleX.toFixed(3)}% ${squircleY.toFixed(3)}%`);
  }

  return {
    square: `polygon(${squarePoints.join(", ")})`,
    squircle: `polygon(${squirclePoints.join(", ")})`,
  };
}

function prepareCloneAccessibility(sequence) {
  sequence.setAttribute("aria-hidden", "true");
  sequence.querySelectorAll(".gallery-item").forEach((item) => {
    item.setAttribute("tabindex", "-1");
  });
}

function syncTrackClones() {
  galleryTrack.querySelectorAll("[data-gallery-clone]").forEach((clone) => clone.remove());

  const loopDistance = getLoopDistance();
  const minimumWidth = galleryViewport.clientWidth + loopDistance * 2;
  let trackWidth = loopDistance;

  while (trackWidth < minimumWidth) {
    const clone = gallerySequence.cloneNode(true);
    clone.dataset.galleryClone = "true";
    prepareCloneAccessibility(clone);
    galleryTrack.append(clone);
    trackWidth += loopDistance;
  }
}

function setupGsapGalleryItem(item) {
  if (animatedItems.has(item)) {
    return;
  }

  animatedItems.add(item);
  const mediaMask = item.querySelector(".gallery-item__media-mask");
  const mediaImage = item.querySelector(".gallery-item__image");
  const tagGroup = item.querySelector(".gallery-item__tags");
  const tags = item.querySelectorAll(".gallery-item__tag");
  const maskPaths = getMaskPaths(item);
  let active = false;

  gsap.set(mediaMask, {
    clipPath: maskPaths.square,
    force3D: true,
  });

  gsap.set(mediaImage, {
    scale: 1,
    force3D: true,
    transformOrigin: "50% 50%",
  });

  gsap.set(tagGroup, {
    autoAlpha: 0,
    y: 8,
    xPercent: -50,
    yPercent: -50,
    force3D: true,
  });

  gsap.set(tags, {
    y: "-101%",
    force3D: true,
  });

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = galleryReduceMotion.matches;

    gsap.to(mediaMask, {
      clipPath: nextActive ? maskPaths.squircle : maskPaths.square,
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

    gsap.to(tagGroup, {
      autoAlpha: nextActive ? 1 : 0,
      y: nextActive ? 0 : 8,
      duration: instant ? 0.001 : nextActive ? 0.28 : 0.22,
      ease: nextActive ? "power3.out" : "power3.inOut",
      overwrite: "auto",
    });

    gsap.to(tags, {
      y: nextActive ? "0%" : "-101%",
      duration: instant ? 0.001 : nextActive ? 0.46 : 0.34,
      ease: nextActive ? "power3.out" : "power3.inOut",
      stagger: instant ? 0 : 0.075,
      overwrite: "auto",
    });
  }

  bindInteractiveState(item, animate);
}

function setupFallbackGalleryItem(item) {
  if (animatedItems.has(item)) {
    return;
  }

  animatedItems.add(item);
  const mediaMask = item.querySelector(".gallery-item__media-mask");
  const mediaImage = item.querySelector(".gallery-item__image");
  const tagGroup = item.querySelector(".gallery-item__tags");
  const tags = item.querySelectorAll(".gallery-item__tag");
  const maskPaths = getMaskPaths(item);
  let active = false;
  let maskAnimation;
  let imageAnimation;
  let tagGroupAnimation;
  let tagAnimations = [];

  mediaMask.style.clipPath = maskPaths.square;
  tagGroup.style.opacity = "0";
  tagGroup.style.transform = "translate3d(-50%, -50%, 0) translateY(8px)";
  tags.forEach((tag) => {
    tag.style.transform = "translateY(-101%)";
  });

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = galleryReduceMotion.matches;
    maskAnimation?.cancel();
    imageAnimation?.cancel();
    tagGroupAnimation?.cancel();
    tagAnimations.forEach((animation) => animation.cancel());

    maskAnimation = mediaMask.animate(
      {
        clipPath: nextActive
          ? [maskPaths.square, maskPaths.squircle]
          : [maskPaths.squircle, maskPaths.square],
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

    tagGroupAnimation = tagGroup.animate(
      {
        opacity: nextActive ? [0, 1] : [1, 0],
        transform: nextActive
          ? [
              "translate3d(-50%, -50%, 0) translateY(8px)",
              "translate3d(-50%, -50%, 0)",
            ]
          : [
              "translate3d(-50%, -50%, 0)",
              "translate3d(-50%, -50%, 0) translateY(8px)",
            ],
      },
      {
        duration: instant ? 1 : nextActive ? 280 : 220,
        easing: nextActive
          ? "cubic-bezier(0.22, 1, 0.36, 1)"
          : "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      },
    );

    tagAnimations = Array.from(tags, (tag, index) =>
      tag.animate(
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

  bindInteractiveState(item, animate);
}

function setupGalleryItems() {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    if (window.gsap) {
      setupGsapGalleryItem(item);
      return;
    }

    setupFallbackGalleryItem(item);
  });
}

function stopMarquee() {
  marqueeTween?.kill();
  marqueeAnimation?.cancel();
  marqueeTween = undefined;
  marqueeAnimation = undefined;
}

function setupGsapMarquee() {
  stopMarquee();
  gsap.set(galleryTrack, {
    x: 0,
    force3D: true,
  });

  if (galleryReduceMotion.matches) {
    return;
  }

  const distance = getLoopDistance();
  marqueeTween = gsap.to(galleryTrack, {
    x: -distance,
    duration: distance / marqueePixelsPerSecond,
    ease: "none",
    repeat: -1,
    overwrite: true,
  });
}

function setupFallbackMarquee() {
  stopMarquee();
  galleryTrack.style.transform = "translate3d(0, 0, 0)";

  if (galleryReduceMotion.matches) {
    return;
  }

  const distance = getLoopDistance();
  marqueeAnimation = galleryTrack.animate(
    {
      transform: ["translate3d(0, 0, 0)", `translate3d(${-distance}px, 0, 0)`],
    },
    {
      duration: (distance / marqueePixelsPerSecond) * 1000,
      easing: "linear",
      iterations: Infinity,
    },
  );
}

function setupMarquee() {
  syncTrackClones();
  setupGalleryItems();

  if (window.gsap) {
    setupGsapMarquee();
    return;
  }

  setupFallbackMarquee();
}

function scheduleResize() {
  if (window.gsap) {
    resizeDebounce?.kill();
    resizeDebounce = gsap.delayedCall(0.08, setupMarquee);
    return;
  }

  window.clearTimeout(resizeDebounce);
  resizeDebounce = window.setTimeout(setupMarquee, 80);
}

setupMarquee();
window.addEventListener("resize", scheduleResize);

if (galleryReduceMotion.addEventListener) {
  galleryReduceMotion.addEventListener("change", setupMarquee);
} else {
  galleryReduceMotion.addListener(setupMarquee);
}
