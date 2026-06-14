import { buildRegions, extractPaletteFromFiles, loadImage, recolorImageData, sampleImage } from "../lib/color.js";
import { blobToBytes, FileSaver, JSZip } from "../lib/export.js";
import { createStudioState } from "../hooks/useStudioState.js";

const app = document.getElementById("app");
const state = createStudioState();
const steps = ["SOURCE", "COMPOSE", "OUTPUT"];
const counts = [5, 10, 50];
const toolNames = ["Brush", "Eraser", "Polygon"];
const seasonalSets = [
  ["#F6F4EF", "#C7CBC8", "#6D716F", "#262626", "#050505"],
  ["#FFFFFF", "#D8D8D8", "#8C8C8C", "#343434", "#000000"],
  ["#EAE7DE", "#B6BBB7", "#4C514F", "#171717", "#F7F7F7"]
];
const names = [
  "ALPINE SIGNAL", "ASH RIDGE", "BLACK NEEDLE", "GREY LINE", "ICE FIELD",
  "NIGHT RUN", "STONE FLOW", "URBAN TRACE", "SILVER PASS", "FUTURE LOW",
  "MINERAL CODE", "WHITE PEAK", "CARBON SHIFT", "RIDGE TEST", "SHELTER PRO",
  "MONO S/LAB", "COLD INDEX", "TERRAIN 04", "DUSK FORM", "FIELD TEST",
  "RIDGE LOW", "GRAVEL LINE", "WINTER MAP", "ROCK PLANE", "DRY PATH",
  "MIST STUDY", "BLACK SURFACE", "TRACK FORM", "VOID WHITE", "COLD PLATE",
  "STONE INDEX", "SNOW UNIT", "BASE GRID", "LOW PROFILE", "HIGH ROUTE",
  "FROST MARK", "GREY AXIS", "PEAK OBJECT", "ROUTE CODE", "FUGA SYSTEM"
];

Object.assign(state, {
  entered: false,
  step: "SOURCE",
  generationMode: "Systematic",
  generationCount: 10,
  selectedTool: "Brush",
  brushSize: 12,
  polygonPoints: [],
  undoStack: [],
  redoStack: [],
  manualColorways: [],
  selectedColorwayIds: new Set(),
  favoriteColorwayIds: new Set(),
  generationHistory: [],
  activeHistoryId: null
});

function qs(id) {
  return document.getElementById(id);
}

function activeRegions() {
  return state.regions.filter((region) => !region.deleted);
}

function visibleRegions() {
  return activeRegions().filter((region) => !region.hidden);
}

function selectedRegion() {
  return activeRegions().find((region) => region.id === state.selectedRegion) || activeRegions()[0] || null;
}

function currentPalette() {
  const reference = state.referencePalette.map((color) => color.hex);
  const product = activeRegions().map((region) => state.mappings[region.cluster] || region.hex);
  return reference.length ? reference : product;
}

function toast(message) {
  const el = qs("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2400);
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeHex(value) {
  const clean = String(value || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return `#${clean.toUpperCase()}`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => clamp(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function rgbToHsv([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    if (max === g) h = (b - r) / delta + 2;
    if (max === b) h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round((max ? delta / max : 0) * 100), Math.round(max * 100)];
}

function hsvToRgb([h, s, v]) {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let rgb = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((value) => clamp((value + m) * 255));
}

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function shell() {
  app.innerHTML = `
    <section class="landing" id="landing">
      <div class="noise"></div>
      <div class="landing-inner">
        <p class="caption">FUGA DESIGN SYSTEM</p>
        <h1 class="hero-title metallic">FUGA COLORWAY STUDIO</h1>
        <p class="hero-subtitle">Intelligent Product Color Exploration System</p>
        <button class="cta" id="enterStudio">Start Creating &rarr;</button>
      </div>
    </section>
    <section class="studio-shell ${state.entered ? "" : "hidden"}" id="studioShell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">FG</div>
          <div>
            <strong>FUGA Colorway Studio</strong>
            <span>Intelligent Product Color Exploration System</span>
          </div>
        </div>
        <nav class="workflow-nav" id="workflowNav"></nav>
        <div class="top-actions">
          <button class="btn" id="topUpload">Upload Product</button>
          <button class="btn primary" id="topGenerate">Generate Variants</button>
        </div>
      </header>
      <section class="workflow-grid" id="workflowGrid">
        <aside class="panel-rail" id="leftPanel"></aside>
        <section class="product-area">
          <div class="stage-meta">
            <span id="stageLabel">Product Preview</span>
            <span id="status">Awaiting product image</span>
          </div>
          <div class="product-stage" id="stage"></div>
        </section>
        <aside class="panel-rail right" id="rightPanel"></aside>
        <section class="output-strip" id="bottomPanel"></section>
      </section>
    </section>
    <input id="productFile" type="file" accept="image/*" hidden>
    <input id="referenceFile" type="file" accept="image/*" multiple hidden>
    <div class="toast" id="toast"></div>
  `;
}

function enterStudio() {
  state.entered = true;
  qs("landing").classList.add("hidden");
  qs("studioShell").classList.remove("hidden");
  renderAll();
}

function renderNavigation() {
  const nav = qs("workflowNav");
  if (!nav) return;
  nav.innerHTML = steps.map((step) => `
    <button class="${state.step === step ? "active" : ""}" data-step="${step}">
      <span>${step}</span>
    </button>
  `).join("");
  nav.querySelectorAll("[data-step]").forEach((button) => {
    button.onclick = () => {
      state.step = button.dataset.step;
      renderAll();
    };
  });
}

function sourceLeft() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Product Upload</span><span>${state.product ? "READY" : "EMPTY"}</span></div>
      <button class="drop-zone" id="productDrop">
        <strong>${state.product ? "Replace Product Image" : "Upload Product Image"}</strong>
        <small>Shoes, apparel, bags, equipment</small>
      </button>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Extracted Product Palette</span><span class="metallic">${activeRegions().length}</span></div>
      <div class="palette-list" id="productPalette"></div>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Region Detection</span><span>${activeRegions().length}</span></div>
      <label class="range-row"><span>Target Palette Count</span><strong class="metallic" id="colorCountLabel">${state.colorCount}</strong></label>
      <input class="range" id="colorCount" type="range" min="2" max="12" value="${state.colorCount}">
      <div class="region-list compact" id="regions"></div>
    </section>
  `;
}

function sourceRight() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Reference Upload</span><span>${state.references.length}</span></div>
      <button class="drop-zone" id="referenceDrop">
        <strong>${state.references.length ? "Add Reference Images" : "Upload Reference Images"}</strong>
        <small>Multiple files supported</small>
      </button>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Extracted Reference Palette</span><span class="metallic">${state.referencePalette.length}</span></div>
      <div class="palette-list" id="referencePalette"></div>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Color Editor</span><span>LIVE</span></div>
      ${colorEditor()}
    </section>
  `;
}

function composeLeft() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Manual Region Tools</span><span>${state.selectedTool}</span></div>
      <div class="tool-grid" id="toolGrid"></div>
      <label class="range-row"><span>Brush Size</span><strong>${state.brushSize}</strong></label>
      <input class="range" id="brushSize" type="range" min="2" max="40" value="${state.brushSize}">
      <div class="control-grid">
        <button class="btn" id="undoEdit">Undo</button>
        <button class="btn" id="redoEdit">Redo</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Region Layer Panel</span><span>${activeRegions().length}</span></div>
      <div class="region-list" id="regions"></div>
      <div class="control-grid">
        <button class="btn" id="mergeRegion">Merge Region</button>
        <button class="btn" id="deleteRegion">Delete Region</button>
      </div>
    </section>
  `;
}

function composeRight() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Color Mapping</span><span>LIVE</span></div>
      <div class="mapping-list" id="mapping"></div>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Color Editor</span><span>${state.selectedPalette || "NONE"}</span></div>
      ${colorEditor()}
    </section>
  `;
}

function outputLeft() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Generate Variants</span><span class="metallic">${state.generationCount}</span></div>
      <div class="mode-grid" id="modes"></div>
      <div class="quantity-label">Variant Quantity</div>
      <div class="count-grid" id="counts"></div>
      <button class="btn primary full" id="generate">Generate Variants</button>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Manual Colorway Export</span><span>${state.manualColorways.length} Saved</span></div>
      <button class="btn full" id="saveManual">Save Manual Version</button>
      <div class="control-grid">
        <button class="btn" id="exportManualPng">Manual PNG</button>
        <button class="btn" id="exportManualZip">Manual ZIP</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-title"><span>AI Variant Actions</span><span>${state.selectedColorwayIds.size} Selected</span></div>
      <div class="control-grid">
        <button class="btn" id="selectAll">Select All</button>
        <button class="btn" id="clearSelection">Clear Selection</button>
      </div>
      <button class="btn full" id="exportSelected">Export Selected ZIP</button>
    </section>
    <section class="panel">
      <div class="panel-title"><span>AI Variant Export</span><span>${state.colorways.length || state.generationCount} Variants</span></div>
      <div class="export-grid">
        <button class="btn" id="exportPng">Active Variant PNG</button>
        <button class="btn" id="exportZip">AI ZIP</button>
        <button class="btn" id="exportPdf">PDF Contact Sheet</button>
      </div>
    </section>
  `;
}

function outputRight() {
  return `
    <section class="panel">
      <div class="panel-title"><span>Output Summary</span><span>${state.colorways.length}</span></div>
      <dl class="summary-list">
        <div><dt>Active Regions</dt><dd>${activeRegions().length}</dd></div>
        <div><dt>Reference Colors</dt><dd>${state.referencePalette.length}</dd></div>
        <div><dt>Generation Mode</dt><dd>${state.generationMode}</dd></div>
        <div><dt>Favorites</dt><dd>${state.favoriteColorwayIds.size}</dd></div>
      </dl>
    </section>
    <section class="panel">
      <div class="panel-title"><span>Generation History</span><span>${state.generationHistory.length}</span></div>
      <div class="history-list" id="historyList"></div>
    </section>
  `;
}

function colorEditor() {
  const color = state.selectedPalette || selectedRegion()?.hex || "#FFFFFF";
  const hsv = rgbToHsv(hexToRgb(color));
  return `
    <div class="color-editor">
      <div class="editor-preview" style="background:${color}"></div>
      <label class="field"><span>HEX</span><input id="hexInput" value="${color}"></label>
      <label class="range-row"><span>Hue</span><strong>${hsv[0]}</strong></label>
      <input class="range" id="hueInput" type="range" min="0" max="359" value="${hsv[0]}">
      <label class="range-row"><span>Saturation</span><strong>${hsv[1]}</strong></label>
      <input class="range" id="satInput" type="range" min="0" max="100" value="${hsv[1]}">
      <label class="range-row"><span>Brightness</span><strong>${hsv[2]}</strong></label>
      <input class="range" id="valInput" type="range" min="0" max="100" value="${hsv[2]}">
      <div class="control-grid">
        <button class="btn" id="deleteColor">Delete Color</button>
        <button class="btn" id="mergeColor">Merge Colors</button>
      </div>
    </div>
  `;
}

function renderPanels() {
  qs("leftPanel").innerHTML = state.step === "SOURCE" ? sourceLeft() : state.step === "COMPOSE" ? composeLeft() : outputLeft();
  qs("rightPanel").innerHTML = state.step === "SOURCE" ? sourceRight() : state.step === "COMPOSE" ? composeRight() : outputRight();
  qs("bottomPanel").innerHTML = `
    <div class="output-head">
      <span>Colorway Output</span>
      <span id="conceptCount">${state.colorways.length} Variants</span>
    </div>
    <div class="colorway-output" id="wall"></div>
  `;
}

async function analyzeProduct(file) {
  if (!file) return;
  state.busy = true;
  state.productFile = file;
  qs("status").textContent = "Reading pixels locally";
  renderStage(true);

  const image = await loadImage(file);
  const sampled = sampleImage(image, 340);
  state.product = buildRegions(sampled, state.colorCount);
  state.regions = state.product.regions.map((region) => ({
    ...region,
    name: region.label,
    hidden: false,
    locked: false
  }));
  state.mappings = Object.fromEntries(state.regions.map((region) => [region.cluster, region.hex]));
  state.selectedRegion = state.regions[0]?.id || null;
  state.selectedPalette = state.regions[0]?.hex || null;
  state.undoStack = [];
  state.redoStack = [];
  state.busy = false;
  qs("status").textContent = `${activeRegions().length} regions detected`;
  renderAll();
  toast("Product palette and regions extracted.");
}

async function analyzeReferences(files) {
  const list = [...files];
  if (!list.length) return;
  qs("status").textContent = "Extracting reference palette";
  state.references = list;
  state.referencePalette = await extractPaletteFromFiles(list, state.colorCount);
  state.selectedPalette = state.referencePalette[0]?.hex || state.selectedPalette;
  renderAll();
  toast("Reference palette extracted.");
}

function currentHiddenClusters() {
  return activeRegions().filter((region) => region.hidden).map((region) => region.cluster);
}

function maskedMappings(mappings = state.mappings, hiddenClusters = currentHiddenClusters()) {
  const result = { ...mappings };
  hiddenClusters.forEach((cluster) => {
    result[cluster] = "#000000";
  });
  return result;
}

function renderPreviewImageData(mappings = state.mappings, hiddenClusters = currentHiddenClusters()) {
  return recolorImageData(state.product, maskedMappings(mappings, hiddenClusters));
}

function drawPreviewToCanvas(canvas, mappings = state.mappings, hiddenClusters = currentHiddenClusters()) {
  canvas.width = state.product.width;
  canvas.height = state.product.height;
  canvas.getContext("2d").putImageData(renderPreviewImageData(mappings, hiddenClusters), 0, 0);
}

function renderStage(mask = true, mappings = state.mappings, host = qs("stage")) {
  if (!host) return;
  qs("stageLabel").textContent = state.step === "SOURCE" ? "Source Product" : state.step === "COMPOSE" ? "Large Product Preview" : "Output Preview";

  if (!state.product) {
    host.innerHTML = `
      <button class="empty-stage" id="stageUpload">
        <strong>Upload product to begin</strong>
        <span>SOURCE opens the local color extraction workflow.</span>
      </button>
    `;
    return;
  }

  host.innerHTML = `
    <canvas class="render-canvas"></canvas>
    <canvas class="mask-canvas"></canvas>
    ${state.polygonPoints.length ? `<svg class="polygon-overlay">${state.polygonPoints.map((point) => `<circle cx="${point.x}%" cy="${point.y}%" r="4"></circle>`).join("")}<polyline points="${state.polygonPoints.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline></svg>` : ""}
    ${state.busy ? `<div class="busy-state">Analyzing Product</div>` : ""}
  `;

  const canvas = host.querySelector(".render-canvas");
  const maskCanvas = host.querySelector(".mask-canvas");
  [canvas, maskCanvas].forEach((item) => {
    item.width = state.product.width;
    item.height = state.product.height;
  });

  drawPreviewToCanvas(canvas, mappings);

  const context = maskCanvas.getContext("2d");
  const data = context.createImageData(state.product.width, state.product.height);
  const region = selectedRegion();
  if (mask && region && !region.hidden) {
    for (let i = 0; i < state.product.assignments.length; i++) {
      if (state.product.assignments[i] !== region.cluster) continue;
      const p = i * 4;
      data.data[p] = 255;
      data.data[p + 1] = 255;
      data.data[p + 2] = 255;
      data.data[p + 3] = 46;
    }
  }
  context.putImageData(data, 0, 0);
  bindCanvasEditing();
}

function renderRegions() {
  const host = qs("regions");
  if (!host) return;
  host.innerHTML = activeRegions().map((region) => `
    <div class="region-row layer ${state.selectedRegion === region.id ? "active" : ""}" data-region="${region.id}">
      <span class="swatch" style="background:${state.mappings[region.cluster] || region.hex}"></span>
      <span>
        <input class="layer-name" data-rename="${region.id}" value="${region.name || region.label}">
        <small>${region.hex} / ${region.percentage.toFixed(1)}%</small>
      </span>
      <span class="layer-actions">
        <button class="${region.hidden ? "active" : ""}" data-hide="${region.id}">Hide</button>
        <button class="${region.locked ? "active" : ""}" data-lock="${region.id}">Lock</button>
      </span>
    </div>
  `).join("") || `<p class="empty-line">Upload a product to detect regions.</p>`;

  host.querySelectorAll("[data-region]").forEach((row) => {
    row.onclick = (event) => {
      if (event.target.closest("button") || event.target.closest("input")) return;
      state.selectedRegion = row.dataset.region;
      renderAll();
    };
    row.ondragover = (event) => event.preventDefault();
    row.ondrop = (event) => {
      event.preventDefault();
      state.selectedRegion = row.dataset.region;
      mapColorToRegion(event.dataTransfer.getData("text/color"));
    };
  });
  host.querySelectorAll("[data-rename]").forEach((input) => {
    input.onchange = () => {
      const region = state.regions.find((item) => item.id === input.dataset.rename);
      if (region) region.name = input.value.trim() || region.label;
      renderAll();
    };
  });
  host.querySelectorAll("[data-hide]").forEach((button) => {
    button.onclick = () => {
      const region = state.regions.find((item) => item.id === button.dataset.hide);
      if (region) region.hidden = !region.hidden;
      renderAll();
    };
  });
  host.querySelectorAll("[data-lock]").forEach((button) => {
    button.onclick = () => {
      const region = state.regions.find((item) => item.id === button.dataset.lock);
      if (region) region.locked = !region.locked;
      renderAll();
    };
  });
}

function renderProductPalette() {
  if (!qs("productPalette")) return;
  const product = activeRegions().map((region) => ({ hex: state.mappings[region.cluster] || region.hex, percentage: region.percentage }));
  renderPaletteRows(qs("productPalette"), product, "product");
}

function renderReferencePalette() {
  if (!qs("referencePalette")) return;
  const source = state.referencePalette.length
    ? state.referencePalette
    : activeRegions().map((region) => ({ hex: state.mappings[region.cluster] || region.hex, percentage: region.percentage }));
  renderPaletteRows(qs("referencePalette"), source, "reference");
}

function renderPaletteRows(host, colors, kind) {
  host.innerHTML = colors.map((color, index) => `
    <button class="palette-row ${state.selectedPalette === color.hex ? "active" : ""}" draggable="true" data-palette="${color.hex}">
      <span class="swatch" style="background:${color.hex}"></span>
      <span>
        <strong>${color.hex}</strong>
        <small>${kind === "product" ? "Product" : "Reference"} ${String(index + 1).padStart(2, "0")}</small>
      </span>
      <code>${(color.percentage || 0).toFixed(1)}%</code>
    </button>
  `).join("") || `<p class="empty-line">No palette available.</p>`;

  host.querySelectorAll("[data-palette]").forEach((button) => {
    button.onclick = () => {
      state.selectedPalette = button.dataset.palette;
      mapColorToRegion(button.dataset.palette);
    };
    button.ondragstart = (event) => event.dataTransfer.setData("text/color", button.dataset.palette);
  });
}

function renderMapping() {
  const host = qs("mapping");
  if (!host) return;
  host.innerHTML = activeRegions().map((region) => `
    <button class="mapping-row ${state.selectedRegion === region.id ? "active" : ""}" data-map="${region.id}">
      <span class="swatch" style="background:${region.hex}"></span>
      <span>
        <strong>${region.name || region.label}</strong>
        <small>${region.hex} to ${state.mappings[region.cluster] || region.hex}</small>
      </span>
      <span class="swatch" style="background:${state.mappings[region.cluster] || region.hex}"></span>
    </button>
  `).join("") || `<p class="empty-line">No active regions.</p>`;

  host.querySelectorAll("[data-map]").forEach((button) => {
    button.onclick = () => {
      state.selectedRegion = button.dataset.map;
      renderAll();
    };
    button.ondragover = (event) => event.preventDefault();
    button.ondrop = (event) => {
      event.preventDefault();
      state.selectedRegion = button.dataset.map;
      mapColorToRegion(event.dataTransfer.getData("text/color"));
    };
  });
}

function renderTools() {
  const host = qs("toolGrid");
  if (!host) return;
  host.innerHTML = toolNames.map((tool) => `
    <button class="tool-button ${state.selectedTool === tool ? "active" : ""}" data-tool="${tool}">${tool}</button>
  `).join("");
  host.querySelectorAll("[data-tool]").forEach((button) => {
    button.onclick = () => {
      state.selectedTool = button.dataset.tool;
      state.polygonPoints = [];
      renderAll();
    };
  });
}

function renderModes() {
  if (!qs("modes") || !qs("counts")) return;
  qs("modes").innerHTML = ["Systematic", "Randomized", "Seasonal"].map((mode) => `
    <button class="mode-button ${state.generationMode === mode ? "active" : ""}" data-mode="${mode}">${mode}</button>
  `).join("");
  qs("counts").innerHTML = counts.map((count) => `
    <button class="quantity-button metallic ${state.generationCount === count ? "active" : ""}" data-count="${count}">${count}</button>
  `).join("");

  qs("modes").querySelectorAll("[data-mode]").forEach((button) => {
    button.onclick = () => {
      state.generationMode = button.dataset.mode;
      renderAll();
    };
  });
  qs("counts").querySelectorAll("[data-count]").forEach((button) => {
    button.onclick = () => {
      state.generationCount = Number(button.dataset.count);
      renderAll();
    };
  });
}

function renderWall() {
  const host = qs("wall");
  if (!host) return;
  qs("conceptCount").textContent = `${state.colorways.length} Variants`;
  host.innerHTML = state.colorways.map((item) => `
    <article class="colorway-card ${state.activeColorway === item.id ? "active" : ""} ${state.selectedColorwayIds.has(item.id) ? "selected" : ""}" data-concept="${item.id}">
      <canvas></canvas>
      <div class="card-actions">
        <button data-favorite="${item.id}" class="${state.favoriteColorwayIds.has(item.id) ? "active" : ""}">Favorite</button>
        <button data-select="${item.id}" class="${state.selectedColorwayIds.has(item.id) ? "active" : ""}">Select</button>
      </div>
      <div class="card-meta">
        <strong>${item.name}</strong>
        <span>${String(item.id + 1).padStart(2, "0")}</span>
      </div>
      <div class="mini-palette">${Object.values(item.mappings).map((color) => `<i style="background:${color}"></i>`).join("")}</div>
    </article>
  `).join("") || `<p class="empty-line output-empty">Generate variants to populate Colorway Output.</p>`;

  host.querySelectorAll("[data-concept]").forEach((card) => {
    const item = state.colorways.find((entry) => entry.id === Number(card.dataset.concept));
    if (!item || !state.product) return;
    const canvas = card.querySelector("canvas");
    drawPreviewToCanvas(canvas, item.mappings, item.hiddenClusters);
    card.onclick = (event) => {
      if (event.target.closest("button")) return;
      state.activeColorway = item.id;
      state.mappings = { ...item.mappings };
      renderAll();
    };
  });
  host.querySelectorAll("[data-favorite]").forEach((button) => {
    button.onclick = () => toggleSet(state.favoriteColorwayIds, Number(button.dataset.favorite));
  });
  host.querySelectorAll("[data-select]").forEach((button) => {
    button.onclick = () => toggleSet(state.selectedColorwayIds, Number(button.dataset.select));
  });
}

function renderHistory() {
  const host = qs("historyList");
  if (!host) return;
  host.innerHTML = state.generationHistory.map((entry) => `
    <article class="history-card ${state.activeHistoryId === entry.id ? "active" : ""}">
      <img src="${entry.thumbnail}" alt="">
      <div>
        <strong>${entry.mode}</strong>
        <small>${entry.timestamp} / ${entry.count || entry.colorways.length} variants</small>
        <div class="mini-palette">${entry.palette.map((color) => `<i style="background:${color}"></i>`).join("")}</div>
      </div>
      <div class="history-actions">
        <button data-restore="${entry.id}">Restore</button>
        <button data-duplicate="${entry.id}">Duplicate</button>
        <button data-delete-history="${entry.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<p class="empty-line">Generate variants to create history.</p>`;

  host.querySelectorAll("[data-restore]").forEach((button) => button.onclick = () => restoreHistory(button.dataset.restore));
  host.querySelectorAll("[data-duplicate]").forEach((button) => button.onclick = () => duplicateHistory(button.dataset.duplicate));
  host.querySelectorAll("[data-delete-history]").forEach((button) => button.onclick = () => deleteHistory(button.dataset.deleteHistory));
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
  renderAll();
}

function mapColorToRegion(hex) {
  const region = selectedRegion();
  if (!region || !hex || region.locked) return;
  const color = normalizeHex(hex);
  if (!color) return;
  state.mappings[region.cluster] = color;
  state.selectedPalette = color;
  renderAll();
}

function updateSelectedColor(hex) {
  const color = normalizeHex(hex);
  if (!color) return;
  const previous = state.selectedPalette;
  state.selectedPalette = color;
  state.referencePalette = state.referencePalette.map((item) => item.hex === previous ? { ...item, hex: color } : item);
  const region = selectedRegion();
  if (region && !region.locked) state.mappings[region.cluster] = color;
  renderAll();
}

function deleteColor() {
  if (!state.selectedPalette) return;
  if (!state.referencePalette.length) {
    deleteRegion();
    return;
  }
  state.referencePalette = state.referencePalette.filter((item) => item.hex !== state.selectedPalette);
  const next = state.referencePalette[0]?.hex || activeRegions()[0]?.hex || null;
  state.selectedPalette = next;
  if (next) mapColorToRegion(next);
  else renderAll();
}

function mergeColors() {
  const palette = state.referencePalette.length ? state.referencePalette : activeRegions().map((region) => ({ hex: state.mappings[region.cluster] || region.hex, percentage: region.percentage }));
  if (palette.length < 2) return;
  if (!state.referencePalette.length) {
    mergeRegion();
    return;
  }
  const selected = palette.find((item) => item.hex === state.selectedPalette) || palette[0];
  const target = palette.find((item) => item.hex !== selected.hex);
  const mixed = rgbToHex(hexToRgb(selected.hex).map((value, index) => (value + hexToRgb(target.hex)[index]) / 2));
  state.referencePalette = palette.filter((item) => item.hex !== selected.hex && item.hex !== target.hex);
  state.referencePalette.unshift({ hex: mixed, percentage: (selected.percentage || 0) + (target.percentage || 0) });
  updateSelectedColor(mixed);
}

function deleteRegion() {
  const region = selectedRegion();
  if (!region || region.locked) return;
  pushUndo();
  region.deleted = true;
  state.selectedRegion = activeRegions()[0]?.id || null;
  renderAll();
  toast("Region removed from active mapping.");
}

function mergeRegion() {
  const visible = activeRegions().filter((region) => !region.locked);
  if (visible.length < 2 || !state.product) return;
  pushUndo();
  const current = visible.find((region) => region.id === state.selectedRegion) || visible[0];
  const target = visible.find((region) => region.id !== current.id);
  for (let i = 0; i < state.product.assignments.length; i++) {
    if (state.product.assignments[i] === target.cluster) state.product.assignments[i] = current.cluster;
  }
  current.percentage += target.percentage;
  target.deleted = true;
  state.selectedRegion = current.id;
  renderAll();
  toast("Region merged into selected mapping.");
}

function pushUndo() {
  if (!state.product) return;
  state.undoStack.push({
    assignments: new Uint8Array(state.product.assignments),
    regions: state.regions.map((region) => ({ ...region })),
    mappings: { ...state.mappings }
  });
  if (state.undoStack.length > 30) state.undoStack.shift();
  state.redoStack = [];
}

function restoreSnapshot(snapshot) {
  if (!snapshot || !state.product) return;
  state.product.assignments = new Uint8Array(snapshot.assignments);
  state.regions = snapshot.regions.map((region) => ({ ...region }));
  state.mappings = { ...snapshot.mappings };
  state.selectedRegion = selectedRegion()?.id || activeRegions()[0]?.id || null;
  renderAll();
}

function undo() {
  if (!state.undoStack.length || !state.product) return;
  state.redoStack.push({
    assignments: new Uint8Array(state.product.assignments),
    regions: state.regions.map((region) => ({ ...region })),
    mappings: { ...state.mappings }
  });
  restoreSnapshot(state.undoStack.pop());
}

function redo() {
  if (!state.redoStack.length || !state.product) return;
  const snapshot = state.redoStack.pop();
  state.undoStack.push({
    assignments: new Uint8Array(state.product.assignments),
    regions: state.regions.map((region) => ({ ...region })),
    mappings: { ...state.mappings }
  });
  if (state.undoStack.length > 30) state.undoStack.shift();
  restoreSnapshot(snapshot);
}

function bindCanvasEditing() {
  const canvas = qs("stage")?.querySelector(".render-canvas");
  if (!canvas || !state.product || state.step !== "COMPOSE") return;
  let drawing = false;
  canvas.onpointerdown = (event) => {
    const point = eventPoint(event, canvas);
    if (!point) return;
    if (state.selectedTool === "Polygon") {
      state.polygonPoints.push({ x: point.x / state.product.width * 100, y: point.y / state.product.height * 100 });
      if (event.detail > 1 && state.polygonPoints.length > 2) applyPolygon();
      else renderStage();
      return;
    }
    pushUndo();
    drawing = true;
    applyTool(point);
  };
  canvas.onpointermove = (event) => {
    if (!drawing || !["Brush", "Eraser"].includes(state.selectedTool)) return;
    applyTool(eventPoint(event, canvas), false);
  };
  canvas.onpointerup = () => {
    drawing = false;
    renderAll();
  };
  canvas.onpointerleave = () => {
    if (drawing) renderAll();
    drawing = false;
  };
}

function eventPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width * state.product.width, 0, state.product.width - 1),
    y: clamp((event.clientY - rect.top) / rect.height * state.product.height, 0, state.product.height - 1)
  };
}

function applyTool(point, redraw = true) {
  if (!point || !state.product) return;
  const region = selectedRegion();
  if (!region || region.locked) return;
  if (state.selectedTool === "Brush") paintCircle(point, region.cluster);
  if (state.selectedTool === "Eraser") paintCircle(point, nearestUnlockedCluster(region.cluster));
  if (redraw) renderStage();
}

function nearestUnlockedCluster(excludeCluster) {
  return activeRegions().find((region) => !region.locked && region.cluster !== excludeCluster)?.cluster ?? excludeCluster;
}

function paintCircle(point, cluster) {
  const radius = state.brushSize;
  const width = state.product.width;
  const height = state.product.height;
  for (let y = Math.max(0, point.y - radius); y < Math.min(height, point.y + radius); y++) {
    for (let x = Math.max(0, point.x - radius); x < Math.min(width, point.x + radius); x++) {
      if ((x - point.x) ** 2 + (y - point.y) ** 2 <= radius ** 2) {
        state.product.assignments[y * width + x] = cluster;
      }
    }
  }
}

function applyPolygon() {
  const region = selectedRegion();
  if (!region || region.locked || state.polygonPoints.length < 3) return;
  pushUndo();
  const points = state.polygonPoints.map((point) => ({
    x: point.x / 100 * state.product.width,
    y: point.y / 100 * state.product.height
  }));
  for (let y = 0; y < state.product.height; y++) {
    for (let x = 0; x < state.product.width; x++) {
      if (pointInPolygon({ x, y }, points)) state.product.assignments[y * state.product.width + x] = region.cluster;
    }
  }
  state.polygonPoints = [];
  renderAll();
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function generateMappings(index) {
  const regions = visibleRegions();
  const source = currentPalette();
  const seasonal = seasonalSets[index % seasonalSets.length];
  const map = {};
  regions.forEach((region, regionIndex) => {
    if (state.generationMode === "Randomized") {
      map[region.cluster] = source[Math.floor(Math.random() * source.length)] || region.hex;
    } else if (state.generationMode === "Seasonal") {
      map[region.cluster] = seasonal[(regionIndex + index) % seasonal.length] || region.hex;
    } else {
      map[region.cluster] = source[(regionIndex + index) % source.length] || region.hex;
    }
  });
  return map;
}

function saveManualColorway() {
  if (!state.product) return toast("Upload a product first.");
  const entry = {
    id: Date.now(),
    name: `MANUAL ${String(state.manualColorways.length + 1).padStart(2, "0")}`,
    mappings: { ...state.mappings },
    hiddenClusters: currentHiddenClusters(),
    timestamp: new Date().toLocaleString()
  };
  state.manualColorways.push(entry);
  toast(`${entry.name} saved.`);
  renderAll();
}

function generateColorways() {
  if (!state.product) {
    toast("Upload a product first.");
    state.step = "SOURCE";
    renderAll();
    return;
  }
  state.colorways = Array.from({ length: state.generationCount }, (_, index) => ({
    id: Date.now() + index,
    name: names[index % names.length],
    mappings: generateMappings(index),
    hiddenClusters: currentHiddenClusters()
  }));
  state.selectedColorwayIds = new Set();
  state.activeColorway = state.colorways[0]?.id ?? null;
  saveHistory();
  state.step = "OUTPUT";
  renderAll();
  toast(`${state.colorways.length} variants generated.`);
}

function saveHistory() {
  const thumbnail = state.product ? canvasDataUrl(state.mappings, 220, 150) : "";
  const entry = {
    id: String(Date.now()),
    timestamp: new Date().toLocaleString(),
    mode: state.generationMode,
    count: state.colorways.length,
    palette: currentPalette().slice(0, 8),
    thumbnail,
    colorways: state.colorways.map((item) => ({ ...item, mappings: { ...item.mappings }, hiddenClusters: [...(item.hiddenClusters || [])] })),
    mappings: { ...state.mappings }
  };
  state.generationHistory.unshift(entry);
  state.activeHistoryId = entry.id;
  if (state.generationHistory.length > 12) state.generationHistory.pop();
}

function restoreHistory(id) {
  const entry = state.generationHistory.find((item) => item.id === id);
  if (!entry) return;
  state.colorways = entry.colorways.map((item) => ({ ...item, mappings: { ...item.mappings } }));
  state.mappings = { ...entry.mappings };
  state.generationMode = entry.mode;
  state.generationCount = entry.count || entry.colorways.length || state.generationCount;
  state.activeHistoryId = entry.id;
  renderAll();
}

function duplicateHistory(id) {
  const entry = state.generationHistory.find((item) => item.id === id);
  if (!entry) return;
  state.generationHistory.unshift({ ...entry, id: String(Date.now()), timestamp: new Date().toLocaleString() });
  renderAll();
}

function deleteHistory(id) {
  state.generationHistory = state.generationHistory.filter((item) => item.id !== id);
  if (state.activeHistoryId === id) state.activeHistoryId = state.generationHistory[0]?.id || null;
  renderAll();
}

function colorwaysForExport(selectedOnly = false) {
  if (!selectedOnly || !state.selectedColorwayIds.size) return state.colorways;
  return state.colorways.filter((item) => state.selectedColorwayIds.has(item.id));
}

function canvasBlobFor(mappings = state.mappings, hiddenClusters = currentHiddenClusters()) {
  const canvas = document.createElement("canvas");
  drawPreviewToCanvas(canvas, mappings, hiddenClusters);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function canvasDataUrl(mappings = state.mappings, width = 420, height = 260) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  const source = document.createElement("canvas");
  source.width = state.product.width;
  source.height = state.product.height;
  drawPreviewToCanvas(source, mappings);
  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", .86);
}

async function exportManualPng() {
  if (!state.product) return toast("Upload a product first.");
  FileSaver.saveAs(await canvasBlobFor(state.mappings), "fuga-manual-colorway.png");
  toast("Manual PNG exported.");
}

async function exportManualZip() {
  if (!state.product) return toast("Upload a product first.");
  const manual = state.manualColorways.length
    ? state.manualColorways
    : [{ id: Date.now(), name: "MANUAL CURRENT", mappings: { ...state.mappings }, hiddenClusters: currentHiddenClusters() }];
  const zip = new JSZip();
  for (const item of manual) {
    const slug = item.name.toLowerCase().replaceAll(" ", "-");
    zip.file(`${slug}.png`, await blobToBytes(await canvasBlobFor(item.mappings, item.hiddenClusters)));
  }
  FileSaver.saveAs(await zip.generateAsync(), "fuga-manual-colorways.zip");
  toast(`${manual.length} manual colorway${manual.length === 1 ? "" : "s"} exported.`);
}

async function exportAiPng() {
  if (!state.product) return toast("Upload a product first.");
  if (!state.colorways.length) return toast("Generate AI variants first.");
  const item = state.colorways.find((entry) => entry.id === state.activeColorway) || state.colorways[0];
  FileSaver.saveAs(await canvasBlobFor(item.mappings, item.hiddenClusters), `${item.name.toLowerCase().replaceAll(" ", "-")}.png`);
  toast("Active variant PNG exported.");
}

async function exportZip(selectedOnly = false) {
  if (!state.product) return toast("Upload a product first.");
  if (!state.colorways.length) return toast("Generate AI variants first.");
  const zip = new JSZip();
  const items = colorwaysForExport(selectedOnly);
  for (const item of items) {
    const slug = item.name.toLowerCase().replaceAll(" ", "-");
    zip.file(`${String(item.id).slice(-4)}-${slug}.png`, await blobToBytes(await canvasBlobFor(item.mappings, item.hiddenClusters)));
  }
  FileSaver.saveAs(await zip.generateAsync(), selectedOnly ? "fuga-selected-colorways.zip" : "fuga-colorway-output.zip");
  toast(`${items.length} variant${items.length === 1 ? "" : "s"} exported.`);
}

function exportPdf() {
  if (!state.product) return toast("Upload a product first.");
  const items = state.colorways;
  if (!items.length) return toast("Generate variants first.");
  const sheet = document.createElement("canvas");
  sheet.width = 1200;
  sheet.height = Math.max(900, 180 + Math.ceil(items.length / 3) * 300);
  const context = sheet.getContext("2d");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, sheet.width, sheet.height);
  context.fillStyle = "#F4F4F4";
  context.font = "32px Arial";
  context.fillText("FUGA COLORWAY OUTPUT", 60, 70);
  context.fillStyle = "#8D8D8D";
  context.font = "16px Arial";
  context.fillText(`${items.length} variants / ${new Date().toLocaleString()}`, 60, 104);
  items.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 60 + col * 370;
    const y = 150 + row * 300;
    const source = document.createElement("canvas");
    source.width = state.product.width;
    source.height = state.product.height;
    drawPreviewToCanvas(source, item.mappings, item.hiddenClusters);
    context.fillStyle = "#080808";
    context.fillRect(x, y, 330, 220);
    context.drawImage(source, x, y, 330, 220);
    context.fillStyle = "#F4F4F4";
    context.font = "15px Arial";
    context.fillText(item.name, x, y + 248);
  });
  FileSaver.saveAs(dataUrlPdfBlob(sheet.toDataURL("image/jpeg", .88), sheet.width, sheet.height), "fuga-contact-sheet.pdf");
}

function dataUrlPdfBlob(dataUrl, width, height) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const objects = [
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
    `2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj`,
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${width} ${height}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>endobj`,
    `4 0 obj<</Type/XObject/Subtype/Image/Width ${width}/Height ${height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${bytes.length}>>stream\n${binary}\nendstream endobj`,
    `5 0 obj<</Length ${String(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`).length}>>stream\nq ${width} 0 0 ${height} 0 0 cm /Im0 Do Q\nendstream endobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => pdf += `${String(offset).padStart(10, "0")} 00000 n \n`);
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  const pdfBytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) pdfBytes[i] = pdf.charCodeAt(i) & 255;
  return new Blob([pdfBytes], { type: "application/pdf" });
}

function bindControls() {
  if (qs("enterStudio")) qs("enterStudio").onclick = enterStudio;
  if (!state.entered) return;
  qs("topUpload").onclick = () => qs("productFile").click();
  qs("topGenerate").onclick = generateColorways;
  qs("productFile").onchange = (event) => analyzeProduct(event.target.files[0]);
  qs("referenceFile").onchange = (event) => analyzeReferences(event.target.files);

  if (qs("stageUpload")) qs("stageUpload").onclick = () => qs("productFile").click();
  if (qs("productDrop")) {
    qs("productDrop").onclick = () => qs("productFile").click();
    qs("productDrop").ondragover = (event) => event.preventDefault();
    qs("productDrop").ondrop = (event) => {
      event.preventDefault();
      analyzeProduct(event.dataTransfer.files[0]);
    };
  }
  if (qs("referenceDrop")) {
    qs("referenceDrop").onclick = () => qs("referenceFile").click();
    qs("referenceDrop").ondragover = (event) => event.preventDefault();
    qs("referenceDrop").ondrop = (event) => {
      event.preventDefault();
      analyzeReferences(event.dataTransfer.files);
    };
  }
  if (qs("colorCount")) {
    qs("colorCount").oninput = (event) => {
      state.colorCount = Number(event.target.value);
      qs("colorCountLabel").textContent = state.colorCount;
    };
    qs("colorCount").onchange = () => {
      if (state.productFile) analyzeProduct(state.productFile);
      if (state.references.length) analyzeReferences(state.references);
    };
  }
  if (qs("brushSize")) qs("brushSize").oninput = (event) => {
    state.brushSize = Number(event.target.value);
    renderAll();
  };
  if (qs("hexInput")) qs("hexInput").onchange = (event) => updateSelectedColor(event.target.value);
  ["hueInput", "satInput", "valInput"].forEach((id) => {
    if (!qs(id)) return;
    qs(id).oninput = () => {
      const next = rgbToHex(hsvToRgb([Number(qs("hueInput").value), Number(qs("satInput").value), Number(qs("valInput").value)]));
      updateSelectedColor(next);
    };
  });
  if (qs("deleteColor")) qs("deleteColor").onclick = deleteColor;
  if (qs("mergeColor")) qs("mergeColor").onclick = mergeColors;
  if (qs("mergeRegion")) qs("mergeRegion").onclick = mergeRegion;
  if (qs("deleteRegion")) qs("deleteRegion").onclick = deleteRegion;
  if (qs("undoEdit")) qs("undoEdit").onclick = undo;
  if (qs("redoEdit")) qs("redoEdit").onclick = redo;
  if (qs("generate")) qs("generate").onclick = generateColorways;
  if (qs("saveManual")) qs("saveManual").onclick = saveManualColorway;
  if (qs("exportManualPng")) qs("exportManualPng").onclick = exportManualPng;
  if (qs("exportManualZip")) qs("exportManualZip").onclick = exportManualZip;
  if (qs("exportPng")) qs("exportPng").onclick = exportAiPng;
  if (qs("exportZip")) qs("exportZip").onclick = () => exportZip(false);
  if (qs("exportPdf")) qs("exportPdf").onclick = exportPdf;
  if (qs("exportSelected")) qs("exportSelected").onclick = () => exportZip(true);
  if (qs("selectAll")) qs("selectAll").onclick = () => {
    state.selectedColorwayIds = new Set(state.colorways.map((item) => item.id));
    renderAll();
  };
  if (qs("clearSelection")) qs("clearSelection").onclick = () => {
    state.selectedColorwayIds = new Set();
    renderAll();
  };
}

function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (!state.entered || state.step !== "COMPOSE") return;
    if (event.ctrlKey && event.key.toLowerCase() === "z" && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (event.ctrlKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    }
  });
}

function renderAll() {
  if (!state.entered) {
    bindControls();
    return;
  }
  renderNavigation();
  renderPanels();
  renderStage();
  renderRegions();
  renderProductPalette();
  renderReferencePalette();
  renderMapping();
  renderTools();
  renderModes();
  renderWall();
  renderHistory();
  bindControls();
}

shell();
bindKeyboard();
bindControls();
