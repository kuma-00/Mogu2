import { dlopen, FFIType, CString, ptr, type Pointer } from "bun:ffi";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LabelCategory =
  | "Food"
  | "Drink"
  | "Tableware"
  | "CookingTool"
  | "FoodContext"
  | "Other";

export type FoodKind =
  | "Bread"
  | "Rice"
  | "Noodles"
  | "Meat"
  | "Seafood"
  | "Vegetables"
  | "Fruits"
  | "DairyOrEgg"
  | "Sweets"
  | "Snacks"
  | "JapaneseCuisine"
  | "ChineseCuisine"
  | "WesternCuisine"
  | "FastFood"
  | "Beverage"
  | "AlcoholicDrink"
  | "SoftDrink"
  | "UnknownFood";

export interface PredictionLabel {
  index: number;
  label: string;
  probability: number;
  category: LabelCategory;
}

export interface FoodDetectionResult {
  is_food: boolean;
  score: number;
  food_prob: number;
  drink_prob: number;
  tableware_prob: number;
  cooking_tool_prob: number;
  food_context_prob: number;
  kind: FoodKind;
  top_labels: PredictionLabel[];
}

export interface FoodDetectorConfig {
  threshold?: number;
  weak_threshold?: number;
  tableware_weight?: number;
  drink_weight?: number;
  cooking_tool_weight?: number;
  food_context_weight?: number;
  top_k?: number;
}

// ─── Library loading ─────────────────────────────────────────────────────────

function findLibrary(): string {
  const thisDir = import.meta.dir;
  const platform = process.platform;
  const arch = process.arch;

  const libName =
    platform === "win32"
      ? "mogu_ffi.dll"
      : platform === "darwin"
        ? "libmogu_ffi.dylib"
        : "libmogu_ffi.so";

  const pkgName = `@kuma-00/mogu-ffi-${platform}-${arch}`;

  const candidates = [
    join(thisDir, "node_modules", pkgName, libName),
    join(thisDir, "../..", "node_modules", pkgName, libName),
    join(thisDir, "../../target/debug", libName),
    join(thisDir, "../../target/release", libName),
    join(thisDir, "../../crates/mogu-ffi/target/debug", libName),
    join(thisDir, "../../crates/mogu-ffi/target/release", libName),
    process.env["MOGU_FFI_LIB"] ?? "",
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return resolve(candidate);
    }
  }

  throw new Error(
    `libmogu_ffi shared library not found.\n` +
      `  Tried:\n${candidates.filter(Boolean).map((c) => `    - ${c}`).join("\n")}\n\n` +
      `  Solutions:\n` +
      `  1. Install via GitHub Packages: bun install @kuma-00/mogu-bun\n` +
      `  2. Build manually: cargo build --release --package mogu-ffi\n` +
      `  3. Set MOGU_FFI_LIB env var to the library path`
  );
}

const lib = dlopen(findLibrary(), {
  detector_new: {
    args: [FFIType.cstring],
    returns: FFIType.pointer,
  },
  detector_free: {
    args: [FFIType.pointer],
    returns: FFIType.void,
  },
  detector_free_string: {
    args: [FFIType.pointer],
    returns: FFIType.void,
  },
  detector_set_config: {
    args: [
      FFIType.pointer, // detector*
      FFIType.f32,     // threshold
      FFIType.f32,     // weak_threshold
      FFIType.f32,     // tableware_weight
      FFIType.f32,     // drink_weight
      FFIType.f32,     // cooking_tool_weight
      FFIType.f32,     // food_context_weight
      FFIType.u64,     // top_k (usize → u64 on 64-bit)
    ],
    returns: FFIType.void,
  },
  detector_detect_food: {
    args: [
      FFIType.pointer, // detector*
      FFIType.pointer, // img_bytes*
      FFIType.u64,     // img_bytes_len (usize → u64 on 64-bit)
    ],
    returns: FFIType.pointer,
  },
  detector_detect_food_by_path: {
    args: [
      FFIType.pointer, // detector*
      FFIType.cstring, // img_path
    ],
    returns: FFIType.pointer,
  },
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function readAndFreeJsonPointer(rawPtr: Pointer | null): unknown {
  if (rawPtr === null) {
    throw new Error("FFI returned null pointer");
  }
  const jsonStr = new CString(rawPtr).toString();
  lib.symbols.detector_free_string(rawPtr);
  const parsed = JSON.parse(jsonStr) as unknown;
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    "error" in parsed &&
    typeof (parsed as { error: unknown }).error === "string"
  ) {
    throw new Error((parsed as { error: string }).error);
  }
  return parsed;
}

// ─── FoodDetector ────────────────────────────────────────────────────────────

export class FoodDetector {
  readonly #ptr: Pointer;

  constructor(modelPath: string) {
    const resolved = resolve(modelPath);
    if (!existsSync(resolved)) {
      throw new Error(`Model file not found: ${resolved}`);
    }

    const pathBuf = Buffer.from(resolved + "\0");
    const detectorPtr = lib.symbols.detector_new(pathBuf);
    if (detectorPtr === null) {
      throw new Error(`Failed to load model from: ${resolved}`);
    }
    this.#ptr = detectorPtr;
  }

  /**
   * Apply custom configuration to the detector.
   * Only the fields you supply will be changed; others retain their defaults.
   */
  setConfig(config: FoodDetectorConfig): void {
    const {
      threshold = 0.40,
      weak_threshold = 0.28,
      tableware_weight = 0.35,
      drink_weight = 0.90,
      cooking_tool_weight = 0.15,
      food_context_weight = 0.20,
      top_k = 10,
    } = config;

    lib.symbols.detector_set_config(
      this.#ptr,
      threshold,
      weak_threshold,
      tableware_weight,
      drink_weight,
      cooking_tool_weight,
      food_context_weight,
      top_k
    );
  }

  /**
   * Detect whether an image contains food.
   * @param image - File path string, or raw image bytes (Uint8Array / Buffer / ArrayBuffer)
   */
  detectFood(image: string): FoodDetectionResult;
  detectFood(image: Uint8Array | Buffer | ArrayBuffer): FoodDetectionResult;
  detectFood(
    image: string | Uint8Array | Buffer | ArrayBuffer
  ): FoodDetectionResult {
    let rawPtr: Pointer | null;

    if (typeof image === "string") {
      const pathBuf = Buffer.from(resolve(image) + "\0");
      rawPtr = lib.symbols.detector_detect_food_by_path(
        this.#ptr,
        pathBuf
      ) as Pointer | null;
    } else {
      const bytes =
        image instanceof ArrayBuffer
          ? new Uint8Array(image)
          : image; // Uint8Array or Buffer (Buffer extends Uint8Array)

      rawPtr = lib.symbols.detector_detect_food(
        this.#ptr,
        ptr(bytes),
        bytes.byteLength
      ) as Pointer | null;
    }

    return readAndFreeJsonPointer(rawPtr) as FoodDetectionResult;
  }

  /** Release the native detector and all associated resources. */
  close(): void {
    lib.symbols.detector_free(this.#ptr);
  }

  [Symbol.dispose](): void {
    this.close();
  }
}