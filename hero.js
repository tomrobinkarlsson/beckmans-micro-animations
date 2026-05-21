const hero = document.querySelector("[data-hero]");
const heroBounds = document.querySelector("[data-hero-bounds]");
const heroDefault = document.querySelector("[data-hero-default]");
const heroTriggers = document.querySelectorAll("[data-course]");
const heroStates = document.querySelectorAll("[data-state]");
const heroOrigins = document.querySelectorAll("[data-origin]");
const heroReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let activeCourse;
let activeTimeline;
let collapseDebounce;
let resizeDebounce;

function getStateMeta(course) {
  const state = document.querySelector(`[data-state="${course}"]`);
  const origin = document.querySelector(`[data-origin="${course}"]`);

  if (!state || !origin) {
    return null;
  }

  return {
    state,
    origin,
    mask: state.querySelector("[data-mask]"),
    content: state.querySelector("[data-content]"),
    alpha: state.querySelector(".hero-state__alpha"),
    copy: state.querySelectorAll("[data-state-copy]"),
  };
}

function getBoundsRect() {
  return heroBounds.getBoundingClientRect();
}

function getOriginRect(origin) {
  const bounds = getBoundsRect();
  const rect = origin.getBoundingClientRect();

  return {
    top: rect.top - bounds.top,
    left: rect.left - bounds.left,
    width: rect.width,
    height: rect.height,
  };
}

function setContentSize(content) {
  const bounds = getBoundsRect();
  content.style.width = `${bounds.width}px`;
  content.style.height = `${bounds.height}px`;
}

function setLayerWindow(content, rect) {
  setContentSize(content);
  content.style.transform = `translate3d(${-rect.left}px, ${-rect.top}px, 0)`;
}

function setMask(meta, rect) {
  setLayerWindow(meta.content, rect);
  meta.mask.style.top = `${rect.top}px`;
  meta.mask.style.left = `${rect.left}px`;
  meta.mask.style.width = `${rect.width}px`;
  meta.mask.style.height = `${rect.height}px`;
  meta.mask.style.borderRadius = "0px";
}

function getFullRect() {
  const bounds = getBoundsRect();

  return {
    top: 0,
    left: 0,
    width: bounds.width,
    height: bounds.height,
  };
}

function getCoverCircleRect(rect) {
  const diameter = Math.ceil(Math.hypot(rect.width, rect.height)) + 8;

  return {
    top: rect.top + (rect.height - diameter) / 2,
    left: rect.left + (rect.width - diameter) / 2,
    width: diameter,
    height: diameter,
    radius: diameter / 2,
  };
}

function cancelScheduledCollapse() {
  if (window.gsap) {
    collapseDebounce?.kill();
  } else {
    window.clearTimeout(collapseDebounce);
  }

  collapseDebounce = undefined;
}

function scheduleCollapse() {
  cancelScheduledCollapse();

  const delay = heroReduceMotion.matches ? 0 : 0.075;

  if (window.gsap) {
    collapseDebounce = gsap.delayedCall(delay, () => {
      collapseDebounce = undefined;
      collapseCourse();
    });
    return;
  }

  collapseDebounce = window.setTimeout(() => {
    collapseDebounce = undefined;
    collapseCourse();
  }, delay * 1000);
}

function prepareHiddenStates() {
  syncOriginThumbnails();

  heroStates.forEach((state) => {
    const course = state.dataset.state;
    const meta = getStateMeta(course);

    if (!meta) {
      return;
    }

    setMask(meta, getOriginRect(meta.origin));
  });
}

function syncOriginThumbnails() {
  heroOrigins.forEach((origin) => {
    const content = origin.querySelector("[data-thumb-content]");

    if (!content) {
      return;
    }

    setLayerWindow(content, getOriginRect(origin));
  });
}

function showAllOrigins() {
  heroOrigins.forEach((origin) => {
    if (window.gsap) {
      gsap.set(origin, {
        autoAlpha: 1,
      });
      return;
    }

    origin.style.opacity = "1";
    origin.style.visibility = "visible";
  });
}

function hideOrigin(origin) {
  if (window.gsap) {
    gsap.set(origin, {
      autoAlpha: 0,
    });
    return;
  }

  origin.style.opacity = "0";
  origin.style.visibility = "hidden";
}

function showOrigin(origin) {
  if (window.gsap) {
    gsap.set(origin, {
      autoAlpha: 1,
    });
    return;
  }

  origin.style.opacity = "1";
  origin.style.visibility = "visible";
}

function showFallbackCourse(course) {
  const meta = getStateMeta(course);

  if (!meta) {
    return;
  }

  const fullRect = getFullRect();
  activeCourse = course;
  hero.classList.add("is-active");

  heroStates.forEach((state) => {
    state.style.opacity = state === meta.state ? "1" : "0";
    state.style.visibility = state === meta.state ? "visible" : "hidden";
  });

  hideOrigin(meta.origin);
  const coverRect = getCoverCircleRect(fullRect);
  setMask(meta, coverRect);
  meta.mask.style.borderRadius = `${coverRect.radius}px`;
  meta.state.setAttribute("aria-hidden", "false");
  meta.alpha.style.opacity = "1";
  meta.copy.forEach((item) => {
    item.style.opacity = "1";
    item.style.transform = "translate3d(0, 0, 0)";
  });
}

function animateCourse(course) {
  cancelScheduledCollapse();

  if (course === activeCourse) {
    return;
  }

  const meta = getStateMeta(course);

  if (!meta) {
    return;
  }

  if (!window.gsap) {
    showFallbackCourse(course);
    return;
  }

  activeTimeline?.kill();
  activeTimeline = gsap.timeline();
  activeCourse = course;
  hero.classList.add("is-active");
  showAllOrigins();

  const instant = heroReduceMotion.matches;
  const originRect = getOriginRect(meta.origin);
  const fullRect = getFullRect();
  const coverRect = getCoverCircleRect(fullRect);
  const duration = instant ? 0.001 : 0.78;
  const takeoverEase = instant ? "none" : "power3.inOut";
  const isResumingState =
    meta.state.getAttribute("aria-hidden") === "false" &&
    gsap.getProperty(meta.state, "autoAlpha") > 0;

  if (!isResumingState) {
    setMask(meta, originRect);
  }

  hideOrigin(meta.origin);

  heroStates.forEach((state) => {
    state.setAttribute("aria-hidden", state === meta.state ? "false" : "true");

    if (state !== meta.state) {
      gsap.set(state, {
        autoAlpha: 0,
      });
    }
  });

  gsap.set(meta.state, {
    zIndex: 20,
    autoAlpha: 1,
  });

  gsap.set(meta.copy, {
    autoAlpha: 1,
    y: 0,
    force3D: true,
  });

  if (!isResumingState) {
    gsap.set(meta.alpha, {
      autoAlpha: 0,
    });
  }

  activeTimeline
    .to(
      meta.mask,
      {
        top: coverRect.top,
        left: coverRect.left,
        width: coverRect.width,
        height: coverRect.height,
        duration,
        ease: takeoverEase,
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.content,
      {
        x: -coverRect.left,
        y: -coverRect.top,
        duration,
        ease: takeoverEase,
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.mask,
      {
        borderRadius: instant ? 0 : coverRect.radius,
        duration: instant ? 0.001 : duration * (isResumingState ? 0.48 : 1),
        ease: takeoverEase,
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.alpha,
      {
        autoAlpha: 1,
        duration: instant ? 0.001 : isResumingState ? 0.18 : 0.34,
        ease: "power2.out",
        overwrite: "auto",
      },
      instant ? 0 : isResumingState ? 0 : 0.12,
    );

}

function collapseCourse() {
  cancelScheduledCollapse();

  if (!activeCourse) {
    return;
  }

  const meta = getStateMeta(activeCourse);
  activeCourse = undefined;
  hero.classList.remove("is-active");

  if (!meta) {
    return;
  }

  if (!window.gsap) {
    heroStates.forEach((state) => {
      state.style.opacity = "0";
      state.style.visibility = "hidden";
      state.setAttribute("aria-hidden", "true");
    });
    showOrigin(meta.origin);
    return;
  }

  activeTimeline?.kill();

  const instant = heroReduceMotion.matches;
  const originRect = getOriginRect(meta.origin);
  const fullRect = getFullRect();
  const coverRect = getCoverCircleRect(fullRect);
  const originRoundRadius = Math.min(originRect.width, originRect.height) / 2;
  const duration = instant ? 0.001 : 0.56;

  gsap.set(meta.copy, {
    autoAlpha: 1,
    y: 0,
  });

  activeTimeline = gsap
    .timeline({
      onComplete: () => {
        gsap.set(meta.state, {
          autoAlpha: 0,
        });
        gsap.set(meta.alpha, {
          autoAlpha: 0,
        });
        gsap.set(meta.copy, {
          autoAlpha: 1,
          y: 0,
        });
        meta.state.setAttribute("aria-hidden", "true");
        showOrigin(meta.origin);
      },
    })
    .to(
      meta.alpha,
      {
        autoAlpha: 0,
        duration: instant ? 0.001 : 0.2,
        ease: "power2.out",
        overwrite: "auto",
      },
      instant ? 0 : 0.14,
    )
    .to(
      meta.mask,
      {
        borderRadius: instant ? 0 : coverRect.radius,
        duration: instant ? 0.001 : duration * 0.16,
        ease: "sine.inOut",
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.mask,
      {
        top: originRect.top,
        left: originRect.left,
        width: originRect.width,
        height: originRect.height,
        duration,
        ease: instant ? "none" : "power3.inOut",
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.content,
      {
        x: -originRect.left,
        y: -originRect.top,
        duration,
        ease: instant ? "none" : "power3.inOut",
        overwrite: "auto",
      },
      0,
    )
    .to(
      meta.mask,
      {
        borderRadius: instant ? 0 : originRoundRadius,
        duration: instant ? 0.001 : duration * 0.5,
        ease: "sine.inOut",
        overwrite: "auto",
      },
      instant ? 0 : duration * 0.22,
    )
    .to(
      meta.mask,
      {
        borderRadius: 0,
        duration: instant ? 0.001 : duration * 0.28,
        ease: "sine.inOut",
        overwrite: "auto",
      },
      instant ? 0 : duration * 0.72,
    );
}

function setupIntro() {
  if (!window.gsap) {
    hero.classList.add("is-ready");
    return;
  }

  const introTargets = Array.from(
    document.querySelectorAll(
      ".hero-title--form, .hero-thumb--form, .hero-thumb--vk, .hero-title--mode, .hero-thumb--mode, .hero-title--vk",
    ),
  );

  gsap.set(".hero-nav", {
    y: -6,
  });

  gsap.set(introTargets, {
    y: 18,
    force3D: true,
  });

  gsap.set(".hero-thumb", {
    borderRadius: "50%",
    transformOrigin: "50% 50%",
  });

  gsap
    .timeline({ delay: heroReduceMotion.matches ? 0 : 0.08 })
    .to(".hero-nav", {
      y: 0,
      duration: heroReduceMotion.matches ? 0.001 : 0.28,
      ease: "power2.out",
    })
    .to(
      introTargets,
      {
        y: 0,
        duration: heroReduceMotion.matches ? 0.001 : 0.5,
        ease: "power3.out",
        stagger: heroReduceMotion.matches ? 0 : 0.055,
      },
      heroReduceMotion.matches ? 0 : 0.08,
    )
    .to(
      ".hero-thumb",
      {
        borderRadius: "0px",
        duration: heroReduceMotion.matches ? 0.001 : 0.68,
        ease: "expo.out",
      },
      heroReduceMotion.matches ? 0 : 0.16,
    );
}

function scheduleResize() {
  const rerender = () => {
    syncOriginThumbnails();

    if (activeCourse) {
      const meta = getStateMeta(activeCourse);

      if (meta) {
        const fullRect = getFullRect();
        const coverRect = getCoverCircleRect(fullRect);
        setMask(meta, coverRect);
        meta.mask.style.borderRadius = `${coverRect.radius}px`;
      }
      return;
    }

    prepareHiddenStates();
  };

  if (window.gsap) {
    resizeDebounce?.kill();
    resizeDebounce = gsap.delayedCall(0.08, rerender);
    return;
  }

  window.clearTimeout(resizeDebounce);
  resizeDebounce = window.setTimeout(rerender, 80);
}

if (hero && heroBounds && heroDefault) {
  prepareHiddenStates();

  heroTriggers.forEach((trigger) => {
    trigger.addEventListener("pointerenter", () => {
      animateCourse(trigger.dataset.course);
    });

    trigger.addEventListener("focus", () => {
      animateCourse(trigger.dataset.course);
    });

    trigger.addEventListener("pointerleave", scheduleCollapse);
  });

  heroBounds.addEventListener("pointerleave", scheduleCollapse);
  hero.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!hero.contains(document.activeElement)) {
        scheduleCollapse();
      }
    }, 0);
  });

  window.addEventListener("resize", scheduleResize);

  if (heroReduceMotion.addEventListener) {
    heroReduceMotion.addEventListener("change", scheduleResize);
  } else {
    heroReduceMotion.addListener(scheduleResize);
  }

  if (document.fonts) {
    document.fonts.ready.then(setupIntro);
  } else {
    setupIntro();
  }
}
