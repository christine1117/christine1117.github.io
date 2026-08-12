// Scroll-reveal for hero, category blocks, and the about section
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

function observeReveal(el, delayMs) {
  el.classList.add("reveal");
  if (delayMs) el.style.transitionDelay = `${delayMs}ms`;
  revealObserver.observe(el);
}

document.querySelectorAll(".reveal, .category").forEach((el) => revealObserver.observe(el));

// Title-swap word: hovering any category on the right swaps that word to
// name what you're pointing at, then eases back on mouseleave — a
// typewriter effect (backspaces the old word, types the new one).
document.querySelectorAll(".title-swap").forEach((swapEl) => {
  // Hover targets usually live in the same <section> as the title, but the
  // flying title sits in .hero while its targets are in the sibling
  // .work-section — data-hover-scope points explicitly at that case.
  const scope = (swapEl.dataset.hoverScope && document.querySelector(swapEl.dataset.hoverScope)) ||
    swapEl.closest("section") ||
    document;
  const defaultText = swapEl.dataset.default || swapEl.textContent;
  let typingId = 0;

  const typeSwapText = (text) => {
    const id = ++typingId;

    const typeStep = (i) => {
      if (id !== typingId) return;
      swapEl.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(() => typeStep(i + 1), 38);
    };

    const eraseStep = () => {
      if (id !== typingId) return;
      const current = swapEl.textContent;
      if (current.length > 0) {
        swapEl.textContent = current.slice(0, -1);
        setTimeout(eraseStep, 18);
      } else {
        typeStep(0);
      }
    };

    eraseStep();
  };

  scope.querySelectorAll(".category[data-hover-word]").forEach((category) => {
    category.addEventListener("mouseenter", () => typeSwapText(category.dataset.hoverWord));
    category.addEventListener("mouseleave", () => typeSwapText(defaultText));
  });
});

// Back-to-top button
const toTopBtn = document.querySelector(".to-top");
window.addEventListener("scroll", () => {
  toTopBtn.classList.toggle("visible", window.scrollY > 600);
});
toTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// The hero title physically flies from its centered starting spot down into
// a pinned position on the left of the work section, tracking scroll — one
// element, repositioned with a transform each frame (a FLIP-style handoff),
// not two separate elements crossfading into each other.
(function initFlyingTitle() {
  const flyingTitle = document.getElementById("flying-title");
  const heroSection = document.querySelector(".hero");
  const landingSpot = document.getElementById("title-landing-spot");
  const workSection = document.querySelector(".work-section");
  if (!flyingTitle || !heroSection || !landingSpot || !workSection) return;
  if (window.innerWidth <= 960) return; // narrow screens keep the plain stacked layout

  let start = null; // { left, top, width, height } — natural centered position, measured at scrollY 0
  let end = null; // { left, width } — resting column position (horizontal only)
  const endTopVh = 0.36; // where the title rests vertically once landed, as a fraction of viewport height
  const flightDistance = () => Math.max(heroSection.offsetHeight * 0.35, 1);

  function measure() {
    const wasFlying = flyingTitle.classList.contains("flying");
    if (wasFlying) flyingTitle.classList.remove("flying");
    const rect = flyingTitle.getBoundingClientRect();
    start = { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    if (wasFlying) flyingTitle.classList.add("flying");
    const landRect = landingSpot.getBoundingClientRect();
    end = { left: landRect.left, width: landRect.width };
  }

  let ticking = false;
  function update() {
    ticking = false;
    if (!start || !end) return;

    const progress = Math.min(Math.max(window.scrollY / flightDistance(), 0), 1);
    const scrollForNatural = Math.min(window.scrollY, flightDistance());
    const naturalTop = start.top - scrollForNatural;
    const targetTop = window.innerHeight * endTopVh;

    const top = naturalTop + (targetTop - naturalTop) * progress;
    const left = start.left + (end.left - start.left) * progress;
    const scale = 1 + (end.width / start.width - 1) * progress;

    flyingTitle.classList.add("flying");
    flyingTitle.style.left = `${left}px`;
    flyingTitle.style.top = `${top}px`;
    flyingTitle.style.width = `${start.width}px`;
    flyingTitle.style.transform = `scale(${scale})`;

    // Once landed, fade out as the work section's bottom catches up to the
    // title's own bottom edge, so it doesn't float over Exhibition/Travel/
    // About further down.
    if (progress >= 1) {
      const workRect = workSection.getBoundingClientRect();
      const titleBottom = top + start.height * scale;
      const fadeMargin = 140;
      const distanceToEnd = workRect.bottom - titleBottom;
      const opacity = Math.min(Math.max(distanceToEnd / fadeMargin, 0), 1);
      flyingTitle.style.opacity = String(opacity);
      flyingTitle.style.visibility = opacity <= 0 ? "hidden" : "visible";
    } else {
      flyingTitle.style.opacity = "1";
      flyingTitle.style.visibility = "visible";
    }
  }

  function requestUpdate() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    requestUpdate();
  });

  measure();
  requestUpdate();
})();

// Series tile: explicit prev/next arrows step through that series' photos
// one at a time — no hover-driven auto-movement, so it stays in your control.
function addSeriesNav(figure, strip, frameCount) {
  if (frameCount <= 1) return;

  let currentIndex = 0;
  let prevBtn, nextBtn;

  // Clamped, not looped — the first photo has no "previous" and the last
  // has no "next", so the arrows disappear at each end instead of wrapping.
  const applyFrame = (index) => {
    currentIndex = Math.min(Math.max(index, 0), frameCount - 1);
    strip.style.transform = `translateX(-${currentIndex * 100}%)`;
    prevBtn.style.visibility = currentIndex === 0 ? "hidden" : "visible";
    nextBtn.style.visibility = currentIndex === frameCount - 1 ? "hidden" : "visible";
  };

  const makeButton = (className, label, step) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `series-nav ${className}`;
    btn.setAttribute("aria-label", label);
    btn.textContent = step < 0 ? "‹" : "›";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFrame(currentIndex + step);
    });
    return btn;
  };

  prevBtn = makeButton("series-nav-prev", "Previous photo", -1);
  nextBtn = makeButton("series-nav-next", "Next photo", 1);
  figure.appendChild(prevBtn);
  figure.appendChild(nextBtn);
  applyFrame(0);
}

// Auto-discovery: finds series-N/ folders and numbered photos inside them without
// any manifest file — just tries loading 01/02/03... of each known extension until
// one is missing. Works because <img> loading doesn't need a directory listing.
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];

function probeImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight, isVideo: false });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Existence-check for video files. fetch() is the reliable path (fast, and a
// <video> element's load events can hang indefinitely for some servers/codecs)
// but fetch is blocked by CORS on file:// — so opening index.html directly
// falls back to a <video> element probe instead, capped with a timeout so an
// unresponsive one can't stall discovery. Width/height aren't needed either
// way: video tiles use a uniform crop or fall back to a default aspect-ratio.
async function probeVideo(url) {
  if (location.protocol !== "file:") {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok ? { url, width: 0, height: 0, isVideo: true } : null;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    video.onloadedmetadata = () => finish({ url, width: video.videoWidth, height: video.videoHeight, isVideo: true });
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 3000);
    video.src = url;
  });
}

async function findFrame(basePath, seriesNum, frameNum) {
  const num = String(frameNum).padStart(2, "0");
  for (const ext of IMAGE_EXTENSIONS) {
    const url = `${basePath}series-${seriesNum}/${num}.${ext}`;
    const frame = await probeImage(url);
    if (frame) return frame;
  }
  return null;
}

async function discoverSeries(basePath, maxSeries = 15, maxFrames = 30) {
  const series = [];
  for (let s = 1; s <= maxSeries; s++) {
    const frames = [];
    for (let f = 1; f <= maxFrames; f++) {
      const frame = await findFrame(basePath, s, f);
      if (!frame) break;
      frames.push(frame);
    }
    if (frames.length === 0) break;
    series.push(frames);
  }
  return series;
}

function buildSeriesTile(seriesIndex, frames) {
  const figure = document.createElement("figure");
  figure.className = "series-tile";

  // Size the tile to the cover photo's real orientation instead of forcing
  // every photo into the same portrait crop — landscape shots stay landscape.
  const cover = frames[0];
  if (cover.width && cover.height) {
    figure.style.aspectRatio = `${cover.width} / ${cover.height}`;
  }

  const strip = document.createElement("div");
  strip.className = "series-strip";
  frames.forEach((frame, frameIndex) => {
    const img = document.createElement("img");
    img.src = frame.url;
    img.loading = "lazy";
    img.alt = `Series ${seriesIndex}, frame ${frameIndex + 1}`;
    strip.appendChild(img);
  });
  figure.appendChild(strip);

  const caption = document.createElement("figcaption");
  caption.textContent = `Series ${seriesIndex}`;
  figure.appendChild(caption);

  addSeriesNav(figure, strip, frames.length);
  observeReveal(figure, ((seriesIndex - 1) % 6) * 70);
  return figure;
}

async function loadAutoGallery(container) {
  const basePath = container.dataset.base;
  const series = await discoverSeries(basePath);

  container.innerHTML = "";
  if (series.length === 0) {
    const empty = document.createElement("p");
    empty.className = "auto-gallery-empty";
    empty.textContent = `No photos yet — add ${basePath}series-1/01.jpg (and so on).`;
    container.appendChild(empty);
    return;
  }
  series.forEach((frames, i) => {
    container.appendChild(buildSeriesTile(i + 1, frames));
  });
}

document.querySelectorAll(".auto-gallery").forEach(loadAutoGallery);

// Flat auto-gallery: standalone numbered photos (and videos), no series
// subfolders — just 01.jpg, 02.jpg, 03.mp4... directly inside the category
// folder. Each number can be either an image or a video.
async function findFlatFrame(basePath, frameNum) {
  const num = String(frameNum).padStart(2, "0");
  for (const ext of IMAGE_EXTENSIONS) {
    const frame = await probeImage(`${basePath}${num}.${ext}`);
    if (frame) return frame;
  }
  for (const ext of VIDEO_EXTENSIONS) {
    const frame = await probeVideo(`${basePath}${num}.${ext}`);
    if (frame) return frame;
  }
  return null;
}

async function discoverFlatImages(basePath, maxFrames = 60) {
  const images = [];
  for (let f = 1; f <= maxFrames; f++) {
    const frame = await findFlatFrame(basePath, f);
    if (!frame) break;
    images.push(frame);
  }
  return images;
}

function buildFlatTile(frame, index, uniformCrop) {
  const figure = document.createElement("figure");
  figure.className = "tile";

  const media = document.createElement(frame.isVideo ? "video" : "img");
  media.src = frame.url;
  if (frame.isVideo) {
    media.controls = true;
    media.muted = true;
    media.playsInline = true;
    media.preload = "metadata";
  } else {
    media.loading = "lazy";
    media.alt = `Photograph ${index + 1}`;
  }
  // Uniform-crop galleries (e.g. Film) crop every tile to the same ratio via CSS.
  // Everything else keeps each photo's own orientation instead of force-cropping it.
  if (!uniformCrop && frame.width && frame.height) {
    media.style.aspectRatio = `${frame.width} / ${frame.height}`;
  }
  figure.appendChild(media);

  observeReveal(figure, (index % 6) * 70);
  return figure;
}

async function loadFlatGallery(container) {
  const basePath = container.dataset.base;
  const uniformCrop = container.classList.contains("uniform-crop");
  const images = await discoverFlatImages(basePath);

  container.innerHTML = "";
  if (images.length === 0) {
    const empty = document.createElement("p");
    empty.className = "auto-gallery-empty";
    empty.textContent = `No photos yet — add ${basePath}01.jpg (and so on).`;
    container.appendChild(empty);
    return;
  }
  images.forEach((frame, i) => {
    container.appendChild(buildFlatTile(frame, i, uniformCrop));
  });
}

document.querySelectorAll(".auto-gallery-flat").forEach(loadFlatGallery);
