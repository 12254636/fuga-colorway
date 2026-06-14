"use client";

import {
  Archive,
  BadgeCheck,
  Boxes,
  ChevronDown,
  Circle,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Grid2X2,
  Heart,
  ImagePlus,
  Layers3,
  Link2,
  Loader2,
  Maximize2,
  Minus,
  Palette,
  Plus,
  Replace,
  RotateCcw,
  Save,
  ScanLine,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  Zap
} from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Region = {
  id: string;
  label: string;
  hex: string;
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Colorway = {
  id: string;
  name: string;
  palette: string[];
  tags: string[];
  rating: number;
  favorite: boolean;
};

const regions: Region[] = [
  { id: "A", label: "Region A", hex: "#E6E3DA", role: "Upper mesh", x: 15, y: 34, w: 36, h: 22 },
  { id: "B", label: "Region B", hex: "#111111", role: "Cage overlay", x: 40, y: 26, w: 26, h: 30 },
  { id: "C", label: "Region C", hex: "#D94C38", role: "Heel counter", x: 63, y: 37, w: 16, h: 24 },
  { id: "D", label: "Region D", hex: "#B9FF39", role: "Midsole insert", x: 30, y: 58, w: 38, h: 14 },
  { id: "E", label: "Region E", hex: "#6E7377", role: "Outsole lug", x: 21, y: 71, w: 55, h: 10 }
];

const paletteSeed = [
  "#F2F1E8",
  "#D9E2DE",
  "#9DAE9F",
  "#323B34",
  "#C6FF2E",
  "#FF5C39",
  "#6157FF",
  "#0E0E0E",
  "#A7A29A",
  "#7A8C95",
  "#F4B740",
  "#6DD3F5"
];

const themes = ["Trail Running", "Outdoor", "Race", "Urban", "Minimal", "Future Tech"];
const counts = [10, 20, 50];

const variationNames = [
  "Alpine Signal",
  "Volcanic Pace",
  "Moss Index",
  "Summit Trace",
  "Night Split",
  "Carbon Lake",
  "Race Delta",
  "Glacier Grid",
  "Urban Static",
  "Slate Pulse",
  "Lab Marker",
  "Off Trail",
  "Ion Field",
  "Cinder Block",
  "Terrain Code",
  "Whiteout",
  "Solar Cut",
  "Deep Canopy",
  "Future Proof",
  "Stone Relay"
];

function makeColorways(mode: string, theme: string): Colorway[] {
  return Array.from({ length: 20 }, (_, index) => {
    const start = (index * 3 + mode.length + theme.length) % paletteSeed.length;
    const palette = Array.from({ length: 5 }, (__, offset) => paletteSeed[(start + offset * 2) % paletteSeed.length]);
    return {
      id: `${mode}-${theme}-${index}`,
      name: variationNames[index],
      palette,
      tags: [mode, index % 2 ? "CMF" : theme, index % 3 ? "Review" : "Priority"],
      rating: 3 + (index % 3),
      favorite: index === 1 || index === 7
    };
  });
}

function ProductVisual({
  palette,
  activeRegion,
  analyzing,
  compact = false
}: {
  palette: string[];
  activeRegion?: string | null;
  analyzing?: boolean;
  compact?: boolean;
}) {
  const [upper = "#E6E3DA", cage = "#111111", heel = "#D94C38", midsole = "#B9FF39", sole = "#6E7377"] = palette;

  return (
    <div className={cn("relative mx-auto w-full max-w-[780px]", compact ? "h-44" : "h-[46vh] min-h-[380px]")}>
      <svg viewBox="0 0 900 520" className="h-full w-full drop-shadow-[0_30px_80px_rgba(0,0,0,0.75)]">
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="16" stdDeviation="16" floodOpacity=".38" />
          </filter>
          <linearGradient id="shine" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".26" />
            <stop offset=".45" stopColor="#ffffff" stopOpacity=".04" />
            <stop offset="1" stopColor="#000000" stopOpacity=".24" />
          </linearGradient>
        </defs>
        <ellipse cx="460" cy="425" rx="330" ry="38" fill="#050505" />
        <path
          d="M142 312 C194 222 286 152 432 133 C534 120 620 148 705 216 C767 266 812 289 828 333 C746 368 606 380 452 376 C319 372 211 354 142 312Z"
          fill={upper}
          filter="url(#softShadow)"
        />
        <path
          d="M194 305 C248 242 333 198 430 190 C523 184 612 205 690 258 C645 287 556 305 450 306 C344 307 256 306 194 305Z"
          fill={cage}
          opacity=".92"
        />
        <path
          d="M610 214 C675 233 745 277 814 326 C776 340 720 346 657 343 C652 295 638 253 610 214Z"
          fill={heel}
        />
        <path
          d="M138 323 C267 364 578 369 830 333 C821 366 791 390 728 400 C552 429 313 414 137 355 C127 346 128 334 138 323Z"
          fill={midsole}
        />
        <path
          d="M154 363 C307 414 557 425 728 400 C721 426 693 442 639 446 C478 457 294 439 157 394 C142 385 141 374 154 363Z"
          fill={sole}
        />
        <path d="M270 216 L356 320 M364 190 L427 324 M470 178 L511 326 M572 190 L586 320" stroke="#F6F6F2" strokeOpacity=".7" strokeWidth="10" strokeLinecap="round" />
        <path d="M232 289 C324 268 524 267 681 298" stroke="url(#shine)" strokeWidth="48" strokeLinecap="round" fill="none" opacity=".65" />
        <circle cx="443" cy="162" r="16" fill="#050505" opacity=".7" />
        <path d="M412 158 C456 146 501 149 548 165" stroke="#F3F3EF" strokeOpacity=".72" strokeWidth="8" strokeLinecap="round" fill="none" />
      </svg>

      {regions.map((region) => (
        <div
          key={region.id}
          className={cn(
            "pointer-events-none absolute rounded-full border transition duration-200",
            activeRegion === region.id
              ? "border-white bg-white/10 shadow-[0_0_0_999px_rgba(0,0,0,0.08),0_0_34px_rgba(255,255,255,0.35)]"
              : "border-transparent"
          )}
          style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }}
        />
      ))}

      {analyzing ? (
        <div className="absolute inset-0 overflow-hidden rounded-xl border border-studio-border bg-black/30">
          <div className="scan-line absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-transparent via-white/25 to-transparent" />
          <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-xs uppercase tracking-[.18em] text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing Product
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moodInputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [regionsReady, setRegionsReady] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string | null>("A");
  const [palette, setPalette] = useState<string[]>(paletteSeed.slice(0, 8));
  const [targetPalette, setTargetPalette] = useState<string[]>(paletteSeed.slice(4, 9));
  const [selectedOriginal, setSelectedOriginal] = useState("A");
  const [mode, setMode] = useState("Manual");
  const [shuffleCount, setShuffleCount] = useState(20);
  const [theme, setTheme] = useState("Trail Running");
  const [generating, setGenerating] = useState(false);
  const [gallery, setGallery] = useState<Colorway[]>(makeColorways("Manual", "Trail Running"));
  const [view, setView] = useState<"single" | "compare2" | "compare4">("compare4");
  const [toast, setToast] = useState("");

  const mappedPalette = useMemo(() => {
    const source = regions.map((region) => region.hex);
    return source.map((color, index) => targetPalette[index] ?? color);
  }, [targetPalette]);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleUpload = (event?: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>) => {
    event?.preventDefault();
    setUploaded(true);
    setAnalyzing(true);
    setRegionsReady(false);
    window.setTimeout(() => {
      setAnalyzing(false);
      setRegionsReady(true);
      setToast("AI detection complete: 5 editable color regions found.");
      window.setTimeout(() => setToast(""), 2600);
    }, 1600);
  };

  const extractPalette = () => {
    setPalette([...paletteSeed].sort(() => Math.random() - 0.5).slice(0, 10));
    setToast("Reference palette extracted from inspiration image.");
    window.setTimeout(() => setToast(""), 2400);
  };

  const connectColor = (color: string) => {
    const index = regions.findIndex((region) => region.id === selectedOriginal);
    const next = [...targetPalette];
    next[index] = color;
    setTargetPalette(next);
  };

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGallery(makeColorways(mode, mode === "AI Explore" ? theme : `${shuffleCount}`));
      setGenerating(false);
      setToast("20 colorways generated for review.");
      window.setTimeout(() => setToast(""), 2600);
    }, 1300);
  };

  const exportMock = (format: string) => {
    setToast(`${format} export prepared successfully.`);
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-studio-bg text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-studio-border bg-black px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-studio-border bg-white text-black">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Colorway Studio</div>
            <div className="text-[10px] uppercase tracking-[.24em] text-studio-muted">Concept Validation Prototype</div>
          </div>
        </div>
        <nav className="hidden items-center gap-1 rounded-md border border-studio-border bg-studio-surface p-1 lg:flex">
          {["Upload", "Regions", "Palette", "Mapping", "Generate", "Review"].map((item, index) => (
            <button key={item} className={cn("rounded px-3 py-1.5 text-xs text-studio-muted transition hover:bg-studio-card hover:text-white", index === 3 && "bg-studio-card text-white")}>
              {item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost"><RotateCcw className="h-4 w-4" />Reset</Button>
          <Button size="sm" variant="secondary"><Save className="h-4 w-4" />Save Palette</Button>
          <Button size="sm" variant="primary" onClick={generate}><Wand2 className="h-4 w-4" />Generate Colorways</Button>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[280px_minmax(520px,1fr)_340px] grid-rows-[1fr_210px] overflow-hidden">
        <aside className="studio-scrollbar row-span-2 overflow-y-auto border-r border-studio-border bg-studio-surface">
          <div className="border-b border-studio-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Product Input</h2>
              <span className="rounded border border-studio-border px-2 py-1 font-numbers text-lg leading-none text-studio-accent">01</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <div
              role="button"
              tabIndex={0}
              onClick={triggerUpload}
              onDrop={handleUpload}
              onDragOver={(event) => event.preventDefault()}
              className={cn(
                "group flex h-52 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#3A3A3A] bg-black text-center transition hover:border-studio-accent hover:bg-[#080808]",
                uploaded && "border-solid border-studio-border"
              )}
            >
              {uploaded ? (
                <ProductVisual palette={mappedPalette} compact activeRegion={activeRegion} analyzing={analyzing} />
              ) : (
                <>
                  <Upload className="mb-4 h-8 w-8 text-studio-accent transition group-hover:scale-105" />
                  <p className="text-sm font-medium">Upload product image</p>
                  <p className="mt-2 max-w-44 text-xs leading-5 text-studio-muted">Shoes, apparel, bags, accessories, outdoor equipment</p>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-studio-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Detected Regions</h2>
              {regionsReady ? <BadgeCheck className="h-4 w-4 text-[#C6FF2E]" /> : <ScanLine className="h-4 w-4 text-studio-muted" />}
            </div>
            <div className="space-y-2">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onMouseEnter={() => setActiveRegion(region.id)}
                  onClick={() => {
                    setActiveRegion(region.id);
                    setSelectedOriginal(region.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border border-studio-border bg-studio-card p-3 text-left transition hover:border-[#555] hover:bg-[#1D1D1D]",
                    activeRegion === region.id && "border-studio-accent"
                  )}
                >
                  <span className="h-8 w-8 rounded border border-white/15" style={{ backgroundColor: region.hex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{region.label}</span>
                    <span className="block truncate text-xs text-studio-muted">{region.role}</span>
                  </span>
                  <span className="font-mono text-xs text-studio-muted">{region.hex}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Reference Palette</h2>
              <Button size="icon" variant="ghost" onClick={() => moodInputRef.current?.click()}><ImagePlus className="h-4 w-4" /></Button>
            </div>
            <input ref={moodInputRef} type="file" accept="image/*" className="hidden" onChange={extractPalette} />
            <Button className="mb-3 w-full" variant="secondary" onClick={extractPalette}><Sparkles className="h-4 w-4" />Extract From Moodboard</Button>
            <div className="grid grid-cols-4 gap-2">
              {palette.map((color) => (
                <button key={color} onClick={() => connectColor(color)} className="group h-14 rounded-md border border-studio-border transition hover:scale-[1.04] hover:border-white" style={{ backgroundColor: color }}>
                  <span className="sr-only">{color}</span>
                  <Trash2 className="mx-auto h-4 w-4 text-black/0 transition group-hover:text-black/60" />
                </button>
              ))}
              <button onClick={() => setPalette([...palette, "#FFFFFF"])} className="flex h-14 items-center justify-center rounded-md border border-dashed border-studio-border text-studio-muted hover:border-white hover:text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-col overflow-hidden bg-black">
          <div className="flex h-11 items-center justify-between border-b border-studio-border bg-[#060606] px-4">
            <div className="flex items-center gap-2 text-xs text-studio-muted">
              <Layers3 className="h-4 w-4" />
              Product Canvas
              <span className="rounded border border-studio-border px-2 py-0.5">Live Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost"><Minus className="h-4 w-4" /></Button>
              <span className="px-2 font-numbers text-xl text-studio-accent">86%</span>
              <Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost"><Maximize2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="checkerboard relative flex flex-1 items-center justify-center overflow-hidden p-8">
            {!uploaded ? (
              <div className="flex flex-col items-center text-center">
                <Boxes className="mb-5 h-14 w-14 text-studio-muted" />
                <h1 className="text-3xl font-semibold tracking-tight">Drop a product to begin color exploration</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-studio-muted">The prototype will simulate segmentation, palette extraction, color mapping, and review-ready generated variations.</p>
                <Button className="mt-6" variant="primary" onClick={triggerUpload}><Upload className="h-4 w-4" />Upload Product</Button>
              </div>
            ) : (
              <ProductVisual palette={mappedPalette} activeRegion={activeRegion} analyzing={analyzing} />
            )}
          </div>
          <div className="flex h-12 items-center justify-between border-t border-studio-border bg-[#050505] px-4 text-xs text-studio-muted">
            <div className="flex items-center gap-4">
              <span><kbd className="rounded border border-studio-border px-1.5 py-0.5">V</kbd> Select</span>
              <span><kbd className="rounded border border-studio-border px-1.5 py-0.5">C</kbd> Connect</span>
              <span><kbd className="rounded border border-studio-border px-1.5 py-0.5">G</kbd> Generate</span>
            </div>
            <span>{regionsReady ? "Segmentation confidence 94%" : "Awaiting detection"}</span>
          </div>
        </section>

        <aside className="studio-scrollbar row-span-2 overflow-y-auto border-l border-studio-border bg-studio-surface">
          <div className="border-b border-studio-border p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Color Mapping</h2>
            <div className="grid grid-cols-[1fr_36px_1fr] gap-2">
              <div className="space-y-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedOriginal(region.id)}
                    className={cn("flex h-10 w-full items-center gap-2 rounded-md border border-studio-border bg-studio-card px-2 text-xs transition hover:border-white", selectedOriginal === region.id && "border-studio-accent")}
                  >
                    <span className="h-5 w-5 rounded" style={{ backgroundColor: region.hex }} />
                    {region.id}
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-center justify-around py-1 text-studio-muted">
                {regions.map((region) => (
                  <Link2 key={region.id} className={cn("h-4 w-4", selectedOriginal === region.id && "text-white")} />
                ))}
              </div>
              <div className="space-y-2">
                {regions.map((region, index) => (
                  <div key={region.id} className="flex h-10 items-center gap-2 rounded-md border border-studio-border bg-studio-card px-2 text-xs">
                    <span className="h-5 w-5 rounded" style={{ backgroundColor: targetPalette[index] }} />
                    <button className="text-studio-muted hover:text-white" onClick={() => connectColor(palette[(index + 3) % palette.length])}>
                      Replace
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-b border-studio-border p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Generate Colorways</h2>
            <div className="grid grid-cols-3 gap-2">
              {["Manual", "Shuffle", "AI Explore"].map((item) => (
                <button key={item} onClick={() => setMode(item)} className={cn("rounded-md border border-studio-border px-2 py-2 text-xs text-studio-muted transition hover:border-white hover:text-white", mode === item && "border-studio-accent bg-studio-card text-white")}>
                  {item}
                </button>
              ))}
            </div>
            {mode === "Shuffle" ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {counts.map((count) => (
                  <button key={count} onClick={() => setShuffleCount(count)} className={cn("rounded-md border border-studio-border py-2 font-numbers text-2xl text-studio-muted", shuffleCount === count && "border-studio-accent text-white")}>{count}</button>
                ))}
              </div>
            ) : null}
            {mode === "AI Explore" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {themes.map((item) => (
                  <button key={item} onClick={() => setTheme(item)} className={cn("rounded-md border border-studio-border px-2 py-2 text-xs text-studio-muted transition hover:text-white", theme === item && "border-studio-accent bg-studio-card text-white")}>{item}</button>
                ))}
              </div>
            ) : null}
            <Button className="mt-4 w-full" variant="primary" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "Shuffle" ? <Shuffle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {generating ? "Generating" : "Generate 20 Variations"}
            </Button>
          </div>

          <div className="border-b border-studio-border p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Review Mode</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["single", "Single", Eye],
                ["compare2", "2 Up", Replace],
                ["compare4", "4 Up", Grid2X2]
              ].map(([key, label, Icon]) => {
                const ViewIcon = Icon as typeof Eye;
                return (
                  <button key={key as string} onClick={() => setView(key as typeof view)} className={cn("flex items-center justify-center gap-1 rounded-md border border-studio-border px-2 py-2 text-xs text-studio-muted hover:text-white", view === key && "border-studio-accent bg-studio-card text-white")}>
                    <ViewIcon className="h-4 w-4" />{label as string}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">Export</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["PNG", FileImage],
                ["JPG", FileImage],
                ["PDF", FileText],
                ["ZIP", FileArchive]
              ].map(([format, Icon]) => {
                const ExportIcon = Icon as typeof FileImage;
                return <Button key={format as string} variant="secondary" size="sm" onClick={() => exportMock(format as string)}><ExportIcon className="h-4 w-4" />{format as string}</Button>;
              })}
            </div>
          </div>
        </aside>

        <section className="col-start-2 col-end-3 border-t border-studio-border bg-studio-surface">
          <div className="flex h-11 items-center justify-between border-b border-studio-border px-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-studio-muted">
              <Archive className="h-4 w-4" />
              Review Wall
            </div>
            <div className="flex items-center gap-3 text-xs text-studio-muted">
              <Circle className="h-2 w-2 fill-[#C6FF2E] text-[#C6FF2E]" />
              {gallery.length} Concepts
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
          <div className={cn("studio-scrollbar grid h-[158px] gap-3 overflow-y-auto p-3", view === "single" ? "grid-cols-1" : view === "compare2" ? "grid-cols-2" : "grid-cols-4")}>
            {gallery.map((item) => (
              <article key={item.id} className="group min-w-0 rounded-md border border-studio-border bg-studio-card p-2 transition hover:-translate-y-0.5 hover:border-[#555]">
                <div className="relative rounded bg-black">
                  <ProductVisual palette={item.palette} compact />
                  <button className="absolute right-2 top-2 rounded border border-white/10 bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
                    <Heart className={cn("h-4 w-4", item.favorite && "fill-white")} />
                  </button>
                </div>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-medium">{item.name}</h3>
                    <div className="mt-1 flex gap-1">
                      {item.palette.map((color) => <span key={color} className="h-2 w-6 rounded-full" style={{ backgroundColor: color }} />)}
                    </div>
                  </div>
                  <div className="flex shrink-0 text-studio-accent">
                    {Array.from({ length: item.rating }, (_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-studio-border bg-[#151515] px-4 py-3 text-sm shadow-panel">
          <Download className="h-4 w-4 text-studio-accent" />
          {toast}
        </div>
      ) : null}
    </main>
  );
}
