import { dlopen, FFIType, CString, ptr, type Pointer } from "bun:ffi";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ensureModel,
  type ModelDownloadOptions,
} from "./model.ts";
import { findLibrary } from "./library.ts";

export {
  DEFAULT_MODEL_FILENAME,
  DEFAULT_MODEL_REPOSITORY,
  DEFAULT_MODEL_REPOSITORY_PATH,
  downloadModel,
  ensureModel,
  getDefaultModelPath,
  type ModelDownloadOptions,
} from "./model.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LabelCategory =
  | "Food"
  | "Drink"
  | "Tableware"
  | "CookingTool"
  | "FoodContext"
  | "Other";

export type FoodKind =
  | "Meal"
  | "Dessert"
  | "Drink"
  | "Fruit"
  | "Vegetable"
  | "Seafood"
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
  detector_get_default_config: {
    args: [],
    returns: FFIType.pointer,
  },
  detector_set_config_json: {
    args: [
      FFIType.pointer, // detector*
      FFIType.cstring, // config_json
    ],
    returns: FFIType.pointer,
  },
});

// ─── Helper ──────────────────────────────────────────────────────────────────

export function getDefaultConfig(): FoodDetectorConfig {
  const rawPtr = lib.symbols.detector_get_default_config() as Pointer | null;
  return readAndFreeJsonPointer(rawPtr) as FoodDetectorConfig;
}

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
  #ptr: Pointer | null;

  /**
   * Create a detector, downloading the model into ./models on first use.
   */
  static async create(
    options: ModelDownloadOptions = {},
  ): Promise<FoodDetector> {
    return new FoodDetector(await ensureModel(options));
  }

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
    if (this.#ptr === null) {
      throw new Error("FoodDetector is already closed");
    }
    const configJson = JSON.stringify(config);
    const configBuf = Buffer.from(configJson + "\0");
    const rawPtr = lib.symbols.detector_set_config_json(
      this.#ptr,
      configBuf
    ) as Pointer | null;
    readAndFreeJsonPointer(rawPtr);
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
    if (this.#ptr === null) {
      throw new Error("FoodDetector is already closed");
    }
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
    if (this.#ptr === null) {
      return;
    }
    lib.symbols.detector_free(this.#ptr);
    this.#ptr = null;
  }

  [Symbol.dispose](): void {
    this.close();
  }
}
