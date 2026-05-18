const microButtons = document.querySelectorAll(".micro-button");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

function setupGsapButtonMotion(button) {
  const overlay = button.querySelector(".micro-button__text--hover");

  gsap.set(button, {
    borderRadius: "0px",
    force3D: true,
  });

  gsap.set(overlay, {
    y: "-101%",
    force3D: true,
  });

  let active = false;

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = reduceMotion.matches;

    gsap.to(button, {
      borderRadius: nextActive ? "24px" : "0px",
      duration: instant ? 0.001 : nextActive ? 0.46 : 0.36,
      ease: nextActive ? "expo.out" : "power3.inOut",
      overwrite: "auto",
    });

    gsap.to(overlay, {
      y: nextActive ? "0%" : "-101%",
      duration: instant ? 0.001 : nextActive ? 0.42 : 0.32,
      ease: nextActive ? "power3.out" : "power3.inOut",
      overwrite: "auto",
    });
  }

  bindInteractiveState(button, animate);
}

function setupFallbackButtonMotion(button) {
  const overlay = button.querySelector(".micro-button__text--hover");
  let active = false;
  let radiusAnimation;
  let revealAnimation;

  overlay.style.transform = "translateY(-101%)";

  function animate(nextActive) {
    if (nextActive === active) {
      return;
    }

    active = nextActive;
    const instant = reduceMotion.matches;
    radiusAnimation?.cancel();
    revealAnimation?.cancel();

    radiusAnimation = button.animate(
      {
        borderRadius: nextActive ? ["0px", "24px"] : ["24px", "0px"],
      },
      {
        duration: instant ? 1 : nextActive ? 460 : 360,
        easing: nextActive
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      },
    );

    revealAnimation = overlay.animate(
      {
        transform: nextActive
          ? ["translateY(-101%)", "translateY(0%)"]
          : ["translateY(0%)", "translateY(-101%)"],
      },
      {
        duration: instant ? 1 : nextActive ? 420 : 320,
        easing: nextActive
          ? "cubic-bezier(0.22, 1, 0.36, 1)"
          : "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      },
    );
  }

  bindInteractiveState(button, animate);
}

microButtons.forEach((button) => {
  if (window.gsap) {
    setupGsapButtonMotion(button);
    return;
  }

  setupFallbackButtonMotion(button);
});
