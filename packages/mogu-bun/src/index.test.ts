import { beforeAll, describe, test, expect } from "bun:test";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { findLibrary } from "./library";

let FoodDetector: typeof import("./index").FoodDetector;
const nativeLibraryAvailable = (() => {
  try {
    findLibrary();
    return true;
  } catch {
    return false;
  }
})();

beforeAll(async () => {
  if (nativeLibraryAvailable) {
    ({ FoodDetector } = await import("./index"));
  }
});

describe("FoodDetector", () => {
  // Skip tests if model is not available
  const modelPath = resolve(
    import.meta.dir,
    "../../../models/MobileNetV4-Conv-Small.onnx",
  );
  const detectorTestsAvailable =
    nativeLibraryAvailable && existsSync(modelPath);

  test("package import smoke test", () => {
    if (!nativeLibraryAvailable) {
      console.log("Skipping smoke test: native library not found");
      return;
    }

    expect(FoodDetector).toBeDefined();
  });

  test("close() can be called multiple times without crashing", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();
    detector.close(); // Should not crash
    detector.close(); // Should not crash
  });

  test("detectFood() throws error after close()", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();

    expect(() => detector.detectFood(modelPath)).toThrow("FoodDetector is already closed");
  });

  test("setConfig() throws error after close()", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();

    expect(() => detector.setConfig({ threshold: 0.5 })).toThrow("FoodDetector is already closed");
  });

  test("constructor throws error for non-existent model path", () => {
    if (!nativeLibraryAvailable) {
      console.log("Skipping test: native library not found");
      return;
    }

    const nonExistentPath = resolve("/non/existent/model.onnx");
    expect(() => new FoodDetector(nonExistentPath)).toThrow("Model file not found");
  });

  test("detectFood() handles corrupted image data", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    const corruptedData = new Uint8Array([0x00, 0x01, 0x02, 0x03]); // Invalid image data

    expect(() => detector.detectFood(corruptedData)).toThrow();
    detector.close();
  });

  test("setConfig() applies partial configuration", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    
    // Set only threshold
    detector.setConfig({ threshold: 0.5 });
    
    // Set only top_k
    detector.setConfig({ top_k: 5 });
    
    detector.close();
  });

  test("Symbol.dispose works correctly", () => {
    if (!detectorTestsAvailable) {
      console.log("Skipping test: native library or model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector[Symbol.dispose]();
    
    expect(() => detector.detectFood(modelPath)).toThrow("FoodDetector is already closed");
  });
});
