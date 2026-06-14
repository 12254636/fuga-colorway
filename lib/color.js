export const clamp = (value, min = 0, max = 255) => Math.max(min, Math.min(max, Math.round(value)));

export function rgbToHex(rgb) {
  return `#${rgb.map((value) => clamp(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

export function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb([h, s, l]) {
  if (s === 0) {
    const value = clamp(l * 255);
    return [value, value, value];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    clamp(hue2rgb(p, q, h + 1 / 3) * 255),
    clamp(hue2rgb(p, q, h) * 255),
    clamp(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

export function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

export function colorThiefPalette(pixels, count) {
  const bins = new Map();
  for (const pixel of pixels) {
    if (pixel[3] < 24) continue;
    const key = `${pixel[0] >> 4},${pixel[1] >> 4},${pixel[2] >> 4}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  return [...bins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key.split(",").map((part) => Math.min(255, parseInt(part, 10) * 16 + 8)));
}

export function kMeans(pixels, count, seeds = []) {
  let centers = seeds.slice(0, count);
  while (centers.length < count) {
    centers.push(pixels[Math.floor(Math.random() * pixels.length)].slice(0, 3));
  }
  const assignments = new Uint8Array(pixels.length);
  for (let iteration = 0; iteration < 12; iteration++) {
    const sums = Array.from({ length: count }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDistance = Infinity;
      for (let center = 0; center < count; center++) {
        const distance = colorDistance(pixels[i], centers[center]);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = center;
        }
      }
      assignments[i] = best;
      sums[best][0] += pixels[i][0];
      sums[best][1] += pixels[i][1];
      sums[best][2] += pixels[i][2];
      sums[best][3] += 1;
    }
    centers = sums.map((sum, index) => (sum[3] ? [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]] : centers[index]));
  }
  return { centers, assignments };
}

export async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

export function sampleImage(image, maxSize = 300) {
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const width = Math.max(32, Math.round(image.width * ratio));
  const height = Math.max(32, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], imageData.data[i + 3]]);
  }
  return { width, height, imageData, pixels };
}

export function buildRegions(analysis, count) {
  const seeds = colorThiefPalette(analysis.pixels, count);
  const clustered = kMeans(analysis.pixels, count, seeds);
  const totals = Array(count).fill(0);
  clustered.assignments.forEach((cluster) => totals[cluster]++);
  const order = [...Array(count).keys()].sort((a, b) => totals[b] - totals[a]);
  const remap = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const assignments = new Uint8Array(clustered.assignments.length);
  for (let i = 0; i < assignments.length; i++) assignments[i] = remap.get(clustered.assignments[i]);
  const centers = order.map((index) => clustered.centers[index]);
  const regions = centers.map((center, index) => {
    const total = assignments.reduce((sum, value) => sum + (value === index ? 1 : 0), 0);
    return {
      id: String.fromCharCode(65 + index),
      label: `Region ${String.fromCharCode(65 + index)}`,
      cluster: index,
      hex: rgbToHex(center),
      percentage: total / assignments.length * 100,
      deleted: false
    };
  }).filter((region) => region.percentage > 0.25);
  return { ...analysis, centers, assignments, regions };
}

export function recolorImageData(analysis, mappings) {
  const output = new ImageData(analysis.width, analysis.height);
  const source = analysis.imageData.data;
  for (let i = 0; i < analysis.assignments.length; i++) {
    const sourceIndex = i * 4;
    const cluster = analysis.assignments[i];
    const sourceRgb = [source[sourceIndex], source[sourceIndex + 1], source[sourceIndex + 2]];
    const sourceHsl = rgbToHsl(sourceRgb);
    const centerHsl = rgbToHsl(analysis.centers[cluster] || sourceRgb);
    const targetHsl = rgbToHsl(hexToRgb(mappings[cluster] || rgbToHex(analysis.centers[cluster] || sourceRgb)));
    const lightnessDelta = sourceHsl[2] - centerHsl[2];
    const next = hslToRgb([
      targetHsl[0],
      Math.max(0.02, targetHsl[1] * 0.92 + sourceHsl[1] * 0.08),
      Math.max(0, Math.min(1, targetHsl[2] + lightnessDelta * 0.92))
    ]);
    output.data[sourceIndex] = next[0];
    output.data[sourceIndex + 1] = next[1];
    output.data[sourceIndex + 2] = next[2];
    output.data[sourceIndex + 3] = source[sourceIndex + 3];
  }
  return output;
}

export async function extractPaletteFromFiles(files, count = 10) {
  const colors = new Map();
  for (const file of files) {
    const image = await loadImage(file);
    const sampled = sampleImage(image, 180);
    const palette = colorThiefPalette(sampled.pixels, count);
    const total = sampled.pixels.length;
    for (const color of palette) {
      const value = rgbToHex(color);
      colors.set(value, (colors.get(value) || 0) + Math.round(total / palette.length));
    }
  }
  const sum = [...colors.values()].reduce((acc, value) => acc + value, 0) || 1;
  return [...colors.entries()]
    .map(([hex, amount]) => ({ hex, percentage: amount / sum * 100 }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 16);
}
