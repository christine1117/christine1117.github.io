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

// Caps how many probe requests are actually in flight at once. Discovery logic
// below still "asks" for everything in parallel (all series, all frames, all
// extensions), but firing that literally all at once — hundreds to low
// thousands of requests in a single burst — got flagged as abuse by GitHub
// Pages' host and started returning rate-limit errors. Now that discovery is
// also windowed (see discoverContiguous below) total request volume is bounded
// by actual content instead of the max range, so this can sit well above a
// single browser connection's limit — GitHub Pages/Fastly multiplexes plenty
// of concurrent requests fine, it was the raw burst size that got flagged.
function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];
  function next() {
    if (active >= maxConcurrent || queue.length === 0) return;
    active++;
    const { fn, resolve } = queue.shift();
    fn().then((result) => {
      active--;
      resolve(result);
      next();
    });
  }
  return function run(fn) {
    return new Promise((resolve) => {
      queue.push({ fn, resolve });
      next();
    });
  };
}
const limitProbe = createLimiter(16);

// Existence-check only — deliberately doesn't use the pixel data. An earlier
// version loaded the full image (new Image()) during discovery to also read
// its dimensions, which meant every real photo was fully downloaded before a
// single gallery tile could appear on screen. A HEAD request confirms
// existence in a fraction of the bytes; the real <img> tags (added by
// buildSeriesTile/buildFlatTile) do the actual full download when the browser
// gets to them, and measure their own natural size once loaded.
function probeImage(url) {
  return limitProbe(async () => {
    if (location.protocol !== "file:") {
      try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok ? { url, isVideo: false } : null;
      } catch {
        return null;
      }
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ url, isVideo: false });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  });
}

// Existence-check for video files. fetch() is the reliable path (fast, and a
// <video> element's load events can hang indefinitely for some servers/codecs)
// but fetch is blocked by CORS on file:// — so opening index.html directly
// falls back to a <video> element probe instead, capped with a timeout so an
// unresponsive one can't stall discovery. Width/height aren't needed either
// way: video tiles use a uniform crop or fall back to a default aspect-ratio.
function probeVideo(url) {
  return limitProbe(async () => {
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
  });
}

async function findFrame(basePath, seriesNum, frameNum) {
  const num = String(frameNum).padStart(2, "0");
  const results = await Promise.all(
    IMAGE_EXTENSIONS.map((ext) => probeImage(`${basePath}series-${seriesNum}/${num}.${ext}`))
  );
  return results.find(Boolean) || null;
}

// Probes in small windows instead of one shot up to maxCount — firing every
// slot up front (e.g. up to 30 frames x 4 extensions each) meant almost all of
// those requests were guaranteed 404s past the real content, and once probes
// are concurrency-limited (see limitProbe above) that waste turns into real
// waiting time. Checking a window at a time and stopping as soon as one comes
// back with a gap keeps requests roughly proportional to actual content.
async function discoverContiguous(maxCount, prober, windowSize = 6) {
  const items = [];
  let start = 1;
  while (start <= maxCount) {
    const end = Math.min(start + windowSize - 1, maxCount);
    const batch = [];
    for (let i = start; i <= end; i++) batch.push(prober(i));
    const results = await Promise.all(batch);
    let hitGap = false;
    for (const item of results) {
      if (!item) {
        hitGap = true;
        break;
      }
      items.push(item);
    }
    if (hitGap) break;
    start = end + 1;
  }
  return items;
}

async function discoverSeries(basePath, maxSeries = 15, maxFrames = 30, windowSize = 3) {
  const series = [];
  let start = 1;
  while (start <= maxSeries) {
    const end = Math.min(start + windowSize - 1, maxSeries);
    const batch = [];
    for (let s = start; s <= end; s++) batch.push(discoverContiguous(maxFrames, (f) => findFrame(basePath, s, f)));
    const results = await Promise.all(batch);
    let hitEmpty = false;
    for (const frames of results) {
      if (frames.length === 0) {
        hitEmpty = true;
        break;
      }
      series.push(frames);
    }
    if (hitEmpty) break;
    start = end + 1;
  }
  return series;
}

function buildSeriesTile(seriesIndex, frames) {
  const figure = document.createElement("figure");
  figure.className = "series-tile";

  const strip = document.createElement("div");
  strip.className = "series-strip";
  frames.forEach((frame, frameIndex) => {
    const img = document.createElement("img");
    img.src = frame.url;
    img.loading = "lazy";
    img.alt = `Series ${seriesIndex}, frame ${frameIndex + 1}`;
    // Size the tile to the cover photo's real orientation instead of forcing
    // every photo into the same portrait crop — landscape shots stay landscape.
    // Set once the actual image loads rather than from a pre-fetched probe,
    // since discovery no longer downloads full images just to read dimensions.
    if (frameIndex === 0) {
      img.addEventListener("load", () => {
        figure.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      });
    }
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
  const imageResults = await Promise.all(
    IMAGE_EXTENSIONS.map((ext) => probeImage(`${basePath}${num}.${ext}`))
  );
  const imageMatch = imageResults.find(Boolean);
  if (imageMatch) return imageMatch;
  const videoResults = await Promise.all(
    VIDEO_EXTENSIONS.map((ext) => probeVideo(`${basePath}${num}.${ext}`))
  );
  return videoResults.find(Boolean) || null;
}

async function discoverFlatImages(basePath, maxFrames = 60) {
  return discoverContiguous(maxFrames, (f) => findFlatFrame(basePath, f));
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
  // Set once the actual media loads rather than from a pre-fetched probe, since
  // discovery no longer downloads full images/videos just to read dimensions.
  if (!uniformCrop && !frame.isVideo) {
    media.addEventListener("load", () => {
      media.style.aspectRatio = `${media.naturalWidth} / ${media.naturalHeight}`;
    });
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
