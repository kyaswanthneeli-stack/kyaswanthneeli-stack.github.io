/* NYK / Signal Space — interactive portfolio behaviors.
   All interfaces work with plain HTML and CSS when JavaScript is unavailable.
   Canvas is a conceptual visualization, not live telemetry or a model output.
*/
(() => {
  "use strict";

  // Clean shared portfolio URLs without altering the page, hash, or meaningful
  // non-tracking query parameters. The website did not create the UTM tags:
  // some sharing platforms append them to outbound links.
  try {
    const current = new URL(window.location.href);
    let changed = false;
    for (const key of [...current.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (normalized.startsWith("utm_") || normalized === "v" ||
          normalized === "fbclid" || normalized === "gclid" ||
          normalized === "mc_cid" || normalized === "mc_eid") {
        current.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed && window.history && window.history.replaceState) {
      window.history.replaceState(
        window.history.state,
        "",
        current.pathname + current.search + current.hash
      );
    }
  } catch (_) {
    // Privacy cleanup is an enhancement: don't block the portfolio.
  }

  const doc = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const paletteButton = document.getElementById("paletteSwitch");
  const openCommand = document.getElementById("commandOpen");
  const commandDialog = document.getElementById("commandDialog");
  const closeCommand = document.getElementById("commandClose");
  const commandSearch = document.getElementById("commandSearch");
  const commandItems = Array.from(document.querySelectorAll("#commandResults button[data-go]"));
  const art = document.getElementById("heroArt");
  const canvas = document.getElementById("signalCanvas");

  // Accent palette: same hierarchy, two coordinated art directions.
  if (paletteButton) {
    paletteButton.addEventListener("click", () => {
      const isIce = doc.dataset.palette !== "ice";
      if (isIce) doc.dataset.palette = "ice";
      else delete doc.dataset.palette;
      paletteButton.setAttribute("aria-pressed", String(isIce));
      paletteButton.setAttribute("title", isIce ? "Return to lime palette" : "Switch to ice palette");
    });
  }

  // Searchable native dialog: Cmd/Ctrl+K and "/" as discoverable shortcuts.
  function showCommand() {
    if (!commandDialog || typeof commandDialog.showModal !== "function") return;
    if (!commandDialog.open) commandDialog.showModal();
    if (commandSearch) {
      commandSearch.value = "";
      commandItems.forEach(item => { item.hidden = false; });
      commandSearch.focus();
    }
  }

  if (commandDialog) {
    openCommand?.addEventListener("click", showCommand);
    closeCommand?.addEventListener("click", () => commandDialog.close());
    commandDialog.addEventListener("click", (event) => {
      if (event.target === commandDialog) commandDialog.close();
    });
    commandSearch?.addEventListener("input", () => {
      const query = commandSearch.value.trim().toLowerCase();
      commandItems.forEach(item => {
        item.hidden = !item.textContent.toLowerCase().includes(query);
      });
    });
    commandSearch?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        const first = commandItems.find(item => !item.hidden);
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    commandItems.forEach(item => {
      item.addEventListener("click", () => {
        const target = item.dataset.go;
        commandDialog.close();
        if (target && target.startsWith("#")) {
          document.getElementById(target.slice(1))?.scrollIntoView({behavior: reduced.matches ? "auto" : "smooth"});
          if (window.history && window.history.replaceState) window.history.replaceState(null, "", target);
        } else if (target) {
          window.location.assign(target);
        }
      });
    });
    document.addEventListener("keydown", event => {
      const tag = event.target?.tagName || "";
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || event.target?.isContentEditable;
      const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (shortcut || slash) { event.preventDefault(); showCommand(); }
    });
  }

  // Progress bar is a subtle enhancement; layout does not depend on it.
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = distance > 0 ? Math.max(0, Math.min(100, window.scrollY / distance * 100)) : 0;
    doc.style.setProperty("--scroll-progress", percentage.toFixed(2) + "%");
  }
  window.addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
  }, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  updateScroll();

  // Progressive section reveals; no opacity changes for users requesting less motion.
  if (!reduced.matches && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.04, rootMargin: "0px 0px 60px 0px" });
    targets.forEach(item => io.observe(item));
    doc.classList.add("js-ready");
  }

  // Pointer tilt is gentle and disabled on touch devices.
  const pointer = { x: 0, y: 0 };
  if (art && precisePointer.matches && !reduced.matches) {
    let pending = false;
    art.addEventListener("pointermove", ev => {
      const rect = art.getBoundingClientRect();
      pointer.x = Math.max(-1, Math.min(1, ((ev.clientX - rect.left) / rect.width - 0.5) * 2));
      pointer.y = Math.max(-1, Math.min(1, ((ev.clientY - rect.top) / rect.height - 0.5) * 2));
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        art.style.setProperty("--visual-y", (pointer.x * 3.1).toFixed(2) + "deg");
        art.style.setProperty("--visual-x", (-pointer.y * 3.1).toFixed(2) + "deg");
      });
    }, { passive: true });
    art.addEventListener("pointerleave", () => {
      pointer.x = 0; pointer.y = 0;
      art.style.setProperty("--visual-x", "0deg");
      art.style.setProperty("--visual-y", "0deg");
    });
  }

  // A real-time, 3D-projected orbital node network rendered in HTML5 Canvas.
  // It represents an abstract software architecture, not live API activity.
  if (!canvas || !art) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let width = 600, height = 600, dpr = 1, active = true, frameId = 0, lastDraw = 0;
  let aspectScale = 1;
  let frameCount = 0;
  const nodeCount = 112;
  const nodes = [];
  const pairs = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  // Fibonacci sphere: evenly distributed nodes with stable topological links.
  for (let i = 0; i < nodeCount; i++) {
    const y = 1 - (i / (nodeCount - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y*y));
    const angle = phi * i;
    nodes.push({ x: Math.cos(angle)*r, y, z: Math.sin(angle)*r, size: 1.3 + (i%5)*.28 });
  }
  for (let i = 0; i < nodeCount; i++) {
    const close = [];
    const a = nodes[i];
    for (let j = i+1; j < nodeCount; j++) {
      const b = nodes[j];
      const d2 = (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2;
      if (d2 < .19) close.push({ j, d2 });
    }
    close.sort((x,y) => x.d2 - y.d2);
    close.slice(0, 3).forEach(x => pairs.push([i, x.j]));
  }

  function setCanvasSize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    dpr = Math.min(1.7, window.devicePixelRatio || 1);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    aspectScale = Math.min(width,height) * .33;
    draw(performance.now());
  }

  function themeColor(name) {
    return getComputedStyle(doc).getPropertyValue(name).trim();
  }

  function project3D(n, yaw, pitch, rad, scale) {
    const cosY=Math.cos(yaw), sinY=Math.sin(yaw),cosP=Math.cos(pitch),sinP=Math.sin(pitch);
    const x = n.x*cosY + n.z*sinY;
    const z = -n.x*sinY + n.z*cosY;
    const y = n.y*cosP - z*sinP;
    const zz = n.y*sinP + z*cosP;
    const perspective = 3.5/(3.5-zz);
    return {x:width/2 + x*rad*perspective, y:height/2 + y*rad*perspective,
            z:zz, radius:n.size*perspective*scale};
  }

  function draw(timestamp) {
    if (!width || !height) return;
    ctx.clearRect(0,0,width,height);
    const motion = reduced.matches ? 0 : timestamp * .00023;
    const yaw = .42 + motion + pointer.x*.21;
    const pitch = -.21 + Math.sin(motion*.61)*.13 - pointer.y*.17;
    const accent = themeColor("--acid") || "#c6f479";
    const violet = themeColor("--violet") || "#aa9cff";
    const cyan = themeColor("--cyan") || "#87e2de";
    const radius = aspectScale*.77;
    const small = width < 410;
    const centerX = width/2, centerY = height/2;

    // Dim nebula, subtle enough to keep floating HTML labels readable.
    const fog=ctx.createRadialGradient(centerX,centerY,15,centerX,centerY,aspectScale*1.35);
    fog.addColorStop(0,"rgba(167,151,255,0.16)");
    fog.addColorStop(.45,"rgba(114,235,219,0.06)");
    fog.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=fog;
    ctx.beginPath();ctx.arc(centerX,centerY,aspectScale*1.35,0,Math.PI*2);ctx.fill();

    // Thin coordinate circles.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(176,218,234,0.12)";
    for (const size of [.96,1.17]) {
      ctx.beginPath();
      ctx.ellipse(centerX,centerY,radius*size,radius*.38*size,-.45,0,Math.PI*2);
      ctx.stroke();
    }

    const visible = small ? nodes.filter((_,i)=>i%2===0) : nodes;
    const projections = nodes.map(node=>project3D(node,yaw,pitch,radius,small?.85:1));
    // Behind-front layering: farther edges are dimmer than nearer ones.
    ctx.lineWidth=small?.64:.84;
    pairs.forEach(([a,b]) => {
      if (small && (a%2 || b%2)) return;
      const p=projections[a],q=projections[b];
      ctx.globalAlpha=Math.max(.08,Math.min(.4,.16+(p.z+q.z)*.14));
      ctx.strokeStyle = accent;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    });
    ctx.globalAlpha=1;
    projections.forEach((p,i)=>{
      if(small && i%2) return;
      ctx.globalAlpha=.3+.7*(p.z+1)/2;
      ctx.fillStyle=i%9===0?violet:i%6===0?cyan:accent;
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.9,p.radius*(small?.7:1)),0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;

    // Discrete orbital satellites. Motion is deterministic, not fabricated system data.
    for (let i=0;i<4;i++){
      const a=motion*(i%2===0?1:-.7)+i*1.6;
      const x=centerX+Math.cos(a)*radius*1.11;
      const y=centerY+Math.sin(a)*radius*.43;
      const color=i%2===0?accent:violet;
      ctx.globalAlpha=.17;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    }
    frameCount++;
  }

  function tick(time) {
    frameId=0;
    if (!active || document.hidden) return;
    if (time-lastDraw>33) { draw(time); lastDraw=time; }
    if (!reduced.matches) frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (frameId || reduced.matches || !active || document.hidden) return;
    frameId=requestAnimationFrame(tick);
  }
  function stop(){if(frameId){cancelAnimationFrame(frameId);frameId=0;}}

  if ("ResizeObserver" in window) {
    new ResizeObserver(setCanvasSize).observe(canvas);
  } else {
    window.addEventListener("resize",setCanvasSize,{passive:true});
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      active=!!entries[0]?.isIntersecting;
      if(active) start();
      else stop();
    },{threshold:.01}).observe(art);
  }
  document.addEventListener("visibilitychange", () => { if(document.hidden)stop();else start(); });
  paletteButton?.addEventListener("click", () => { draw(performance.now()); });
  if(typeof reduced.addEventListener==="function"){
    reduced.addEventListener("change",()=>{
      if(reduced.matches){stop();draw(0);}
      else start();
    });
  }
  setCanvasSize();
  if(!reduced.matches)start();
})();
