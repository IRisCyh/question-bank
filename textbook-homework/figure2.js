const figure2Root = document.querySelector(".figure-2");

if (figure2Root) {
  const svg = figure2Root.querySelector(".figure2-svg");
  const controls = {
    mA: figure2Root.querySelector("#figure2-mA"),
    mB: figure2Root.querySelector("#figure2-mB"),
    uA: figure2Root.querySelector("#figure2-uA"),
    uB: figure2Root.querySelector("#figure2-uB")
  };
  const modeControls = [...figure2Root.querySelectorAll('input[name="figure2-collision-type"]')];
  const outputs = {
    mA: figure2Root.querySelector("#figure2-mA-value"),
    mB: figure2Root.querySelector("#figure2-mB-value"),
    uA: figure2Root.querySelector("#figure2-uA-value"),
    uB: figure2Root.querySelector("#figure2-uB-value"),
    vA: figure2Root.querySelector("#figure2-vA-value"),
    vB: figure2Root.querySelector("#figure2-vB-value"),
    status: figure2Root.querySelector("#figure2-status")
  };
  const substitutionPanel = document.querySelector("#figure2-substitution");
  const substitution = {
    mA: document.querySelector("#sub-mA"),
    mB: document.querySelector("#sub-mB"),
    mARhs: document.querySelector("#sub-mA-rhs"),
    mBRhs: document.querySelector("#sub-mB-rhs"),
    uA: document.querySelector("#sub-uA"),
    uB: document.querySelector("#sub-uB"),
    totalMass: document.querySelector("#sub-total-mass"),
    totalMomentum: document.querySelector("#sub-total-momentum"),
    finalV: document.querySelector("#sub-final-v")
  };
  const nodes = {
    uAArrow: figure2Root.querySelector("#figure2-uA-arrow"),
    uBArrow: figure2Root.querySelector("#figure2-uB-arrow"),
    vAArrow: figure2Root.querySelector("#figure2-vA-arrow"),
    vBArrow: figure2Root.querySelector("#figure2-vB-arrow"),
    vALabel: figure2Root.querySelector("#figure2-vA-label"),
    vBLabel: figure2Root.querySelector("#figure2-vB-label"),
    f1Label: figure2Root.querySelector("#figure2-f1-label"),
    f2Label: figure2Root.querySelector("#figure2-f2-label"),
    duringAArrow: figure2Root.querySelector("#figure2-during-a-arrow"),
    duringBArrow: figure2Root.querySelector("#figure2-during-b-arrow"),
    beforeA: figure2Root.querySelector("#figure2-before-a"),
    beforeB: figure2Root.querySelector("#figure2-before-b"),
    duringA: figure2Root.querySelector("#figure2-during-a"),
    duringB: figure2Root.querySelector("#figure2-during-b"),
    afterA: figure2Root.querySelector("#figure2-after-a"),
    afterB: figure2Root.querySelector("#figure2-after-b"),
    motionLayer: figure2Root.querySelector(".figure2-motion-layer"),
    motionA: figure2Root.querySelector(".figure2-motion-a"),
    motionB: figure2Root.querySelector(".figure2-motion-b")
  };

  const points = {
    beforeA: { x: 120, y: 44 },
    beforeB: { x: 259, y: 44 },
    duringY: 119,
    afterY: 194
  };
  const maxInputSpeed = 3;
  const maxVelocityArrowSpeed = 3;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, t) => start + (end - start) * t;

  let currentState = null;
  let animationFrame = null;
  let repaintFrame = null;

  function refreshMobileTextbookLayer() {
    const page = document.querySelector(".textbook-page");
    if (!page || window.matchMedia("(min-width: 681px)").matches) return;

    if (repaintFrame) {
      window.cancelAnimationFrame(repaintFrame);
    }

    page.classList.add("is-refreshing-layout");
    repaintFrame = window.requestAnimationFrame(() => {
      repaintFrame = window.requestAnimationFrame(() => {
        page.classList.remove("is-refreshing-layout");
        repaintFrame = null;
      });
    });
  }

  function values() {
    const mA = Number(controls.mA.value);
    const mB = Number(controls.mB.value);
    const uA = Number(controls.uA.value);
    const uB = Number(controls.uB.value);
    const collisionType = modeControls.find((control) => control.checked)?.value || "inelastic";
    const totalMass = mA + mB;
    const sharedV = (mA * uA + mB * uB) / totalMass;
    const elasticVA = ((mA - mB) * uA + 2 * mB * uB) / totalMass;
    const elasticVB = (2 * mA * uA + (mB - mA) * uB) / totalMass;
    const vA = collisionType === "inelastic" ? sharedV : elasticVA;
    const vB = collisionType === "inelastic" ? sharedV : elasticVB;
    const collides = uA > uB;
    return { mA, mB, uA, uB, vA, vB, sharedV, collisionType, collides };
  }

  function setTransform(node, x, y) {
    node.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  }

  function setArrow(node, x, y, speed) {
    const magnitude = Math.abs(speed);
    if (magnitude < 0.05) {
      node.setAttribute("x1", x);
      node.setAttribute("x2", x);
      node.setAttribute("y1", y);
      node.setAttribute("y2", y);
      node.style.opacity = "0.22";
      return;
    }

    const direction = speed >= 0 ? 1 : -1;
    const length = 14 + 42 * clamp(magnitude / maxVelocityArrowSpeed, 0, 1);
    const x2 = x + direction * length;
    node.setAttribute("x1", x.toFixed(2));
    node.setAttribute("x2", x2.toFixed(2));
    node.setAttribute("y1", y);
    node.setAttribute("y2", y);
    node.style.opacity = "1";
  }

  function setAfterRow(state, xA, xB) {
    setTransform(nodes.afterA, xA, points.afterY);
    setTransform(nodes.afterB, xB, points.afterY);
    setArrow(nodes.vAArrow, xA, 172, state.vA);
    setArrow(nodes.vBArrow, xB, 172, state.vB);
    nodes.vALabel.setAttribute("x", (xA - 20).toFixed(2));
    nodes.vBLabel.setAttribute("x", (xB - 19).toFixed(2));
  }

  function setAfterVelocityVisibility(isVisible) {
    const visibility = isVisible ? "visible" : "hidden";
    nodes.vAArrow.style.visibility = visibility;
    nodes.vBArrow.style.visibility = visibility;
    nodes.vALabel.style.visibility = visibility;
    nodes.vBLabel.style.visibility = visibility;
  }

  function setDuringForces(xA, xB, isVisible) {
    const leftLabelX = xA - 37;
    const rightLabelX = xB + 22;
    const visibility = isVisible ? "visible" : "hidden";

    nodes.f1Label.style.visibility = visibility;
    nodes.f2Label.style.visibility = visibility;
    nodes.duringAArrow.style.visibility = visibility;
    nodes.duringBArrow.style.visibility = visibility;
    nodes.f1Label.setAttribute("x", leftLabelX.toFixed(2));
    nodes.f1Label.setAttribute("y", 111);
    nodes.f2Label.setAttribute("x", rightLabelX.toFixed(2));
    nodes.f2Label.setAttribute("y", 111);
    nodes.duringAArrow.setAttribute("x1", xA.toFixed(2));
    nodes.duringAArrow.setAttribute("x2", (xA - 32).toFixed(2));
    nodes.duringAArrow.setAttribute("y1", points.duringY);
    nodes.duringAArrow.setAttribute("y2", points.duringY);
    nodes.duringBArrow.setAttribute("x1", xB.toFixed(2));
    nodes.duringBArrow.setAttribute("x2", (xB + 32).toFixed(2));
    nodes.duringBArrow.setAttribute("y1", points.duringY);
    nodes.duringBArrow.setAttribute("y2", points.duringY);
  }

  function afterPositions(state) {
    if (!state.collides) {
      return {
        a: noCollisionEnd(points.beforeA.x, state.uA),
        b: noCollisionEnd(points.beforeB.x, state.uB),
        contactA: points.beforeA.x,
        contactB: points.beforeB.x
      };
    }

    const contact = collisionPositions(state);
    if (state.collisionType === "inelastic") {
      const maxSpeed = Math.max(Math.abs(state.sharedV), 1);
      const drift = (state.sharedV / maxSpeed) * 86;
      const a = clamp(contact.a + drift, 42, 388);
      const b = clamp(a + 32, 74, 424);
      return { a, b, contactA: contact.a, contactB: contact.b };
    }

    const maxSpeed = Math.max(Math.abs(state.vA), Math.abs(state.vB), 1);
    let a = clamp(contact.a + (state.vA / maxSpeed) * 72, 42, 388);
    let b = clamp(contact.b + (state.vB / maxSpeed) * 92, 74, 424);

    if (b - a < 38) {
      const mid = (a + b) / 2;
      a = mid - 19;
      b = mid + 19;
    }

    return { a, b, contactA: contact.a, contactB: contact.b };
  }

  function noCollisionEnd(startX, speed) {
    return clamp(startX + (speed / maxInputSpeed) * 105, 34, 424);
  }

  function collisionPositions(state) {
    const closingDistance = points.beforeB.x - points.beforeA.x - 32;
    const relativeSpeed = state.uA - state.uB;
    const timeToCollision = closingDistance / relativeSpeed;
    const rawA = points.beforeA.x + state.uA * timeToCollision;
    const a = clamp(rawA, 182, 388);
    return { a, b: a + 32 };
  }

  function updateFigure() {
    const state = values();
    const after = afterPositions(state);

    currentState = { ...state, afterA: after.a, afterB: after.b, contactA: after.contactA, contactB: after.contactB };

    outputs.mA.textContent = `${state.mA.toFixed(1)} kg`;
    outputs.mB.textContent = `${state.mB.toFixed(1)} kg`;
    outputs.uA.textContent = `${state.uA.toFixed(1)} m/s`;
    outputs.uB.textContent = `${state.uB.toFixed(1)} m/s`;
    outputs.vA.textContent = `${state.vA.toFixed(2)} m/s`;
    outputs.vB.textContent = `${state.vB.toFixed(2)} m/s`;
    outputs.status.textContent = state.collides ? "click diagram to play" : "no collision: A cannot catch B";
    updateSubstitution(state);

    setArrow(nodes.uAArrow, points.beforeA.x + 1, 22, state.uA);
    setArrow(nodes.uBArrow, points.beforeB.x, 22, state.uB);
    setTransform(nodes.duringA, after.contactA, points.duringY);
    setTransform(nodes.duringB, after.contactB, points.duringY);
    setDuringForces(after.contactA, after.contactB, false);
    setAfterRow(state, after.contactA, after.contactB);
    setAfterVelocityVisibility(false);
  }

  function updateSubstitution(state) {
    if (!substitutionPanel || !substitution.mA) return;

    const showSubstitution = state.collisionType === "inelastic" && Math.abs(state.uB) < 0.001;
    substitutionPanel.hidden = !showSubstitution;
    if (!showSubstitution) return;

    const totalMass = state.mA + state.mB;
    const totalMomentum = state.mA * state.uA + state.mB * state.uB;
    const finalVelocity = totalMass ? totalMomentum / totalMass : 0;

    substitution.mA.textContent = state.mA.toFixed(1);
    substitution.mB.textContent = state.mB.toFixed(1);
    substitution.mARhs.textContent = state.mA.toFixed(1);
    substitution.mBRhs.textContent = state.mB.toFixed(1);
    substitution.uA.textContent = state.uA.toFixed(1);
    substitution.uB.textContent = state.uB.toFixed(1);
    substitution.totalMass.textContent = totalMass.toFixed(1);
    substitution.totalMomentum.textContent = totalMomentum.toFixed(1);
    substitution.finalV.textContent = `${finalVelocity.toFixed(2)} m/s`;
  }

  function stopAnimation({ completed = false, afterA = null, afterB = null } = {}) {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    nodes.motionLayer.style.opacity = "0";
    nodes.motionA.style.opacity = "0";
    nodes.motionB.style.opacity = "0";
    nodes.motionA.style.visibility = "visible";
    nodes.motionB.style.visibility = "visible";
    nodes.beforeA.style.visibility = "visible";
    nodes.beforeB.style.visibility = "visible";
    nodes.duringA.style.visibility = "visible";
    nodes.duringB.style.visibility = "visible";
    nodes.afterA.style.visibility = "visible";
    nodes.afterB.style.visibility = "visible";
    if (currentState) {
      if (completed && currentState.collides) {
        setTransform(nodes.beforeA, currentState.contactA, points.beforeA.y);
        setTransform(nodes.beforeB, currentState.contactB, points.beforeB.y);
      } else {
        setTransform(nodes.beforeA, points.beforeA.x, points.beforeA.y);
        setTransform(nodes.beforeB, points.beforeB.x, points.beforeB.y);
      }
      setAfterRow(currentState, afterA ?? currentState.afterA, afterB ?? currentState.afterB);
      setDuringForces(currentState.contactA, currentState.contactB, completed && currentState.collides);
    }
    setAfterVelocityVisibility(completed && currentState?.collides);
    svg.classList.remove("is-playing");
    svg.setAttribute("aria-label", "Play Figure 2 collision animation");
  }

  function setStaticVisibility(activePhase, collides, state) {
    const hideBefore = activePhase === "before";
    const hideAfter = collides && activePhase === "after";

    nodes.beforeA.style.visibility = hideBefore ? "hidden" : "visible";
    nodes.beforeB.style.visibility = hideBefore ? "hidden" : "visible";
    nodes.duringA.style.visibility = "visible";
    nodes.duringB.style.visibility = "visible";
    nodes.afterA.style.visibility = hideAfter ? "hidden" : "visible";
    nodes.afterB.style.visibility = hideAfter ? "hidden" : "visible";
    setDuringForces(state.contactA, state.contactB, collides && activePhase !== "before");

    if (collides && activePhase !== "after") {
      setAfterRow(state, state.contactA, state.contactB);
    } else if (state) {
      setAfterRow(state, state.afterA, state.afterB);
    }

    if (collides && activePhase !== "before") {
      setTransform(nodes.beforeA, state.contactA, points.beforeA.y);
      setTransform(nodes.beforeB, state.contactB, points.beforeB.y);
    } else {
      setTransform(nodes.beforeA, points.beforeA.x, points.beforeA.y);
      setTransform(nodes.beforeB, points.beforeB.x, points.beforeB.y);
    }
  }

  function phaseDurations(state) {
    if (!state.collides) {
      return { before: 1600, during: 0, after: 0, total: 1600 };
    }

    const relativeSpeed = Math.max(state.uA - state.uB, 0.05);
    const relativeShare = clamp(relativeSpeed / maxInputSpeed, 0, 1);
    const afterSpeed = Math.max(Math.abs(state.vA), Math.abs(state.vB), 0.05);
    const afterShare = clamp(afterSpeed / maxInputSpeed, 0, 1);
    const before = 720 + (1 - relativeShare) * 1280;
    const during = 360;
    const after = 720 + (1 - afterShare) * 680;

    return { before, during, after, total: before + during + after };
  }

  function motionPoint(start, contactX, endX, phase, phaseProgress, collides, initialSpeed) {
    if (!collides) {
      const drift = phaseProgress * (initialSpeed / maxInputSpeed) * 105;
      return { x: start.x + drift, y: start.y };
    }

    if (phase === "before") {
      return { x: lerp(start.x, contactX, phaseProgress), y: points.beforeA.y };
    }

    if (phase === "during") {
      return { x: contactX, y: points.duringY };
    }

    return { x: lerp(contactX, endX, phaseProgress), y: points.afterY };
  }

  function animationAfterEnd(contactX, staticEndX, speed) {
    if (Math.abs(speed) <= 0.05) {
      return staticEndX;
    }

    const distance = (speed / maxInputSpeed) * 185;
    return contactX + distance;
  }

  function playAnimation() {
    stopAnimation();

    const state = currentState || values();
    const durations = phaseDurations(state);
    const startTime = performance.now();

    nodes.motionLayer.style.opacity = "1";
    nodes.motionA.style.opacity = "1";
    nodes.motionB.style.opacity = "1";
    nodes.motionA.style.visibility = "visible";
    nodes.motionB.style.visibility = "visible";
    svg.classList.add("is-playing");
    svg.setAttribute("aria-label", "Figure 2 collision animation playing");
    setStaticVisibility("before", state.collides, state);
    setAfterVelocityVisibility(!state.collides);

    const contactA = state.collides ? state.contactA : state.afterA;
    const contactB = state.collides ? state.contactB : state.afterB;
    const endA = state.collides ? animationAfterEnd(contactA, state.afterA, state.vA) : state.afterA;
    const endB = state.collides ? animationAfterEnd(contactB, state.afterB, state.vB) : state.afterB;

    function frame(now) {
      const elapsed = now - startTime;
      let phase = "before";
      let phaseProgress = clamp(elapsed / durations.before, 0, 1);

      if (state.collides && elapsed >= durations.before + durations.during) {
        phase = "after";
        phaseProgress = clamp((elapsed - durations.before - durations.during) / durations.after, 0, 1);
      } else if (state.collides && elapsed >= durations.before) {
        phase = "during";
        phaseProgress = clamp((elapsed - durations.before) / durations.during, 0, 1);
      }

      setStaticVisibility(phase, state.collides, state);

      const a = motionPoint(points.beforeA, contactA, endA, phase, phaseProgress, state.collides, state.uA);
      const b = motionPoint(points.beforeB, contactB, endB, phase, phaseProgress, state.collides, state.uB);
      const showMotionBalls = !(state.collides && phase === "during");

      nodes.motionA.style.visibility = showMotionBalls ? "visible" : "hidden";
      nodes.motionB.style.visibility = showMotionBalls ? "visible" : "hidden";

      if (state.collides && phase === "after" && phaseProgress > 0.9) {
        setAfterRow(state, a.x, b.x);
        setAfterVelocityVisibility(true);
      } else {
        setAfterVelocityVisibility(!state.collides);
      }

      setTransform(nodes.motionA, a.x, a.y);
      setTransform(nodes.motionB, b.x, b.y);

      if (elapsed < durations.total) {
        animationFrame = window.requestAnimationFrame(frame);
      } else {
        stopAnimation({ completed: true, afterA: endA, afterB: endB });
      }
    }

    animationFrame = window.requestAnimationFrame(frame);
  }

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", () => {
      stopAnimation();
      updateFigure();
      refreshMobileTextbookLayer();
    });
  });
  modeControls.forEach((control) => {
    control.addEventListener("change", () => {
      stopAnimation();
      updateFigure();
      refreshMobileTextbookLayer();
    });
  });

  svg.addEventListener("click", playAnimation);
  svg.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      playAnimation();
    }
  });

  updateFigure();
}
