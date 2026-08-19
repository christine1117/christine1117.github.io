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

// Hero title types itself out line by line, with a blinking cursor at the
// end of whichever line is currently being typed. Runs once, the first time
// the hero scrolls into view (page load, since it's already on screen).
(function initHeroTypewriter() {
  const heroInner = document.querySelector(".hero .hero-inner");
  const lines = heroInner ? [...heroInner.querySelectorAll(".hero-line")] : [];
  if (!heroInner || lines.length === 0) return;

  const fullTexts = lines.map((el) => el.textContent);
  lines.forEach((el) => { el.textContent = ""; });

  function typeLine(index) {
    if (index >= lines.length) return;
    const el = lines[index];
    const text = fullTexts[index];
    el.classList.add("typing");
    let i = 0;
    (function step() {
      el.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) {
        setTimeout(step, 28);
      } else {
        el.classList.remove("typing");
        setTimeout(() => typeLine(index + 1), 250);
      }
    })();
  }

  const heroTypeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          typeLine(0);
          heroTypeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  heroTypeObserver.observe(heroInner);
})();

// Project cards show a cover image, index/category, title, blurb, and tags —
// clicking one opens the full write-up (tags, achievement, meta, overview)
// in a shared modal, built by cloning the card's title/tags/blurb plus its
// hidden .project-details into the modal body.
(function initProjectModal() {
  const modal = document.getElementById("project-modal");
  const modalBody = modal ? modal.querySelector(".project-modal-body") : null;
  const cards = document.querySelectorAll(".project-card");
  if (!modal || !modalBody || cards.length === 0) return;

  function openModal(card) {
    const cover = card.querySelector(".project-cover");
    const title = card.querySelector(".project-title");
    const tags = card.querySelector(".project-tags");
    const details = card.querySelector(".project-details");
    modalBody.innerHTML = "";

    if (cover) {
      const img = document.createElement("img");
      img.className = "project-modal-cover";
      img.src = cover.src;
      img.alt = cover.alt;
      modalBody.appendChild(img);
    }
    if (title) {
      const heading = document.createElement("h3");
      heading.className = "project-title";
      heading.textContent = title.textContent;
      modalBody.appendChild(heading);
    }
    if (tags) {
      modalBody.appendChild(tags.cloneNode(true));
    }
    if (details) {
      const clone = details.cloneNode(true);
      clone.hidden = false;
      modalBody.appendChild(clone);
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => openModal(card));
  });

  modal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
})();

// Featured Projects masonry: cards render at their own height (each cover
// keeps its natural aspect ratio, no cropping), but neither CSS Grid nor
// CSS multi-column can give a consistent gap under every card without
// breaking something else — Grid's row height is set by the row's tallest
// card, so shorter cards get a bigger gap than taller ones; multi-column
// fills one column completely before starting the next, which scrambles
// the 01/02/03... reading order. This places each card into whichever
// column is currently shortest, in source order, so the gap stays even
// and the numbering still reads left to right, top to bottom.
(function initProjectMasonry() {
  const grid = document.querySelector(".project-grid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".project-card"));
  if (cards.length === 0) return;

  const ROW_GAP = 12;
  const COLUMN_GAP = 20;

  function columnCountFor(viewportWidth) {
    if (viewportWidth <= 480) return 1;
    if (viewportWidth <= 720) return 2;
    if (viewportWidth <= 1000) return 3;
    return 4;
  }

  function layout() {
    const gridWidth = grid.clientWidth;
    const columns = columnCountFor(window.innerWidth);
    const columnWidth = (gridWidth - COLUMN_GAP * (columns - 1)) / columns;
    const columnHeights = new Array(columns).fill(0);

    cards.forEach((card, index) => {
      card.style.width = `${columnWidth}px`;
      // Straight left-to-right column order (not "whichever column is
      // shortest"): the gap under each card is always exactly ROW_GAP
      // either way, since it's just that column's running height — but
      // round-robin keeps cards 05/06/... packed snugly next to each
      // other instead of scattering across whichever columns happened to
      // be shortest, which left visible gaps in a mostly-empty last row.
      const col = index % columns;
      card.style.left = `${col * (columnWidth + COLUMN_GAP)}px`;
      card.style.top = `${columnHeights[col]}px`;
      columnHeights[col] += card.offsetHeight + ROW_GAP;
      card.classList.add("is-positioned");
    });

    grid.style.height = `${Math.max(...columnHeights) - ROW_GAP}px`;
  }

  layout();
  window.addEventListener("load", layout);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });
})();

// "How I Think" bento card: steps light up one at a time, connected by a
// fill line, with the description synced below. Starts once the card
// scrolls into view, then loops forever.
(function initThinkSteps() {
  const track = document.getElementById("think-steps");
  const fill = document.getElementById("think-fill");
  const desc = document.getElementById("think-desc");
  if (!track || !desc) return;

  const steps = Array.from(track.querySelectorAll(".think-step"));
  const descriptions = [
    "I start by noticing patterns and pain points in how people actually behave, not how they say they behave.",
    "I dig into the why behind those patterns, questioning assumptions before jumping to a solution.",
    "I reframe the problem so the real, addressable question comes into focus.",
    "I prototype quickly to test the reframed idea in something people can actually touch.",
    "I test with real users, then feed what I learn back into observing again.",
  ];

  // wrapping (Test back to Observe) skips the fill-bar's width transition,
  // so it resets instantly instead of visibly rewinding right-to-left —
  // that rewind read as a stutter/reset point rather than a clean loop.
  function setActive(index, skipFillTransition) {
    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
      step.classList.toggle("is-done", i < index);
    });
    if (fill) {
      if (skipFillTransition) fill.style.transition = "none";
      fill.style.width = `${(index / (steps.length - 1)) * 100}%`;
      if (skipFillTransition) {
        void fill.offsetWidth; // flush the instant width change first
        fill.style.transition = "";
      }
    }
    desc.textContent = descriptions[index];
  }

  let index = 0;
  let timer = null;

  function start() {
    if (timer) return;
    setActive(0, true);
    timer = setInterval(() => {
      const next = (index + 1) % steps.length;
      const wrapped = next === 0;
      index = next;
      setActive(index, wrapped);
    }, 2200);
  }

  const stepObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
          stepObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  stepObserver.observe(track);
})();

// "What I Build" bento card: the headline word slides up and out while the
// next one slides up into place, cycling forever. Starts once the card
// scrolls into view.
(function initBuildCycle() {
  const cycle = document.getElementById("build-cycle");
  if (!cycle) return;

  const words = Array.from(cycle.querySelectorAll(".build-word"));
  if (words.length < 2) return;

  let index = 0;
  let timer = null;

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      words[index].classList.remove("is-active");
      index = (index + 1) % words.length;
      words[index].classList.add("is-active");
    }, 2600);
  }

  const buildObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          start();
          buildObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  buildObserver.observe(cycle);
})();

// Back-to-top button
const toTopBtn = document.querySelector(".to-top");
window.addEventListener("scroll", () => {
  toTopBtn.classList.toggle("visible", window.scrollY > 600);
});
toTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

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

// Prefer the pre-generated manifest (js/gallery-manifest.js, built by
// scripts/generate_manifest.py) when present — it names the exact files that
// exist, so the page can skip probing entirely and show tiles immediately.
// Falls back to live probing below if the manifest is missing or stale (e.g.
// a photo was added without re-running the generator).
function manifestFor(basePath) {
  return window.GALLERY_MANIFEST && window.GALLERY_MANIFEST[basePath];
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
  const manifest = manifestFor(basePath);
  if (manifest && manifest.type === "series") {
    return manifest.series.map((urls) => urls.map((url) => ({ url })));
  }

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

function buildSeriesTile(seriesIndex, frames, uniformCrop) {
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
    // every photo into the same crop — landscape shots stay landscape. Skipped
    // in uniformCrop mode (e.g. the small "Also Me" highlight row), where every
    // tile should match size regardless of each photo's own orientation — the
    // fixed aspect-ratio comes from CSS there instead, cropped via object-fit.
    if (frameIndex === 0 && !uniformCrop) {
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
  const limit = parseInt(container.dataset.limit, 10) || null;
  const series = await discoverSeries(basePath);

  container.innerHTML = "";
  if (series.length === 0) {
    const empty = document.createElement("p");
    empty.className = "auto-gallery-empty";
    empty.textContent = `No photos yet — add ${basePath}series-1/01.jpg (and so on).`;
    container.appendChild(empty);
    return;
  }
  // Limited mode: a small fixed highlight, not the full growing gallery — only
  // the first N series show up, but each still keeps its own prev/next arrows
  // since a series can hold several photos, not just its cover.
  const shown = limit ? series.slice(0, limit) : series;
  shown.forEach((frames, i) => {
    container.appendChild(buildSeriesTile(i + 1, frames, Boolean(limit)));
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
  const manifest = manifestFor(basePath);
  if (manifest && manifest.type === "flat") {
    return manifest.items;
  }
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
  const limit = parseInt(container.dataset.limit, 10) || null;
  let images = await discoverFlatImages(basePath);
  if (limit) images = images.slice(0, limit);

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
