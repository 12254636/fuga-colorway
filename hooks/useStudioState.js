export function createStudioState() {
  return {
    entered: false,
    product: null,
    references: [],
    referencePalette: [],
    regions: [],
    mappings: {},
    selectedRegion: null,
    selectedPalette: null,
    colorCount: 6,
    generationMode: "Systematic",
    generationCount: 10,
    colorways: [],
    activeColorway: null,
    busy: false,
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
  };
}
