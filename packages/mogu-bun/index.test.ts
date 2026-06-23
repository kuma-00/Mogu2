import { describe, test, expect } from "bun:test";
import { FoodDetector } from "./index";
import { resolve } from "node:path";

describe("FoodDetector", () => {
  // Skip tests if model is not available
  const modelPath = resolve("../../models/MobileNetV4-Conv-Small.onnx");

  test("close() can be called multiple times without crashing", () => {
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();
    detector.close(); // Should not crash
    detector.close(); // Should not crash
  });

  test("detectFood() throws error after close()", () => {
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();

    expect(() => detector.detectFood(modelPath)).toThrow("FoodDetector is already closed");
  });

  test("setConfig() throws error after close()", () => {
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector.close();

    expect(() => detector.setConfig({ threshold: 0.5 })).toThrow("FoodDetector is already closed");
  });

  test("constructor throws error for non-existent model path", () => {
    const nonExistentPath = resolve("/non/existent/model.onnx");
    expect(() => new FoodDetector(nonExistentPath)).toThrow("Model file not found");
  });

  test("detectFood() handles corrupted image data", () => {
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    const corruptedData = new Uint8Array([0x00, 0x01, 0x02, 0x03]); // Invalid image data

    expect(() => detector.detectFood(corruptedData)).toThrow();
    detector.close();
  });

  test("setConfig() applies partial configuration", () => {
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
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
    if (!require("node:fs").existsSync(modelPath)) {
      console.log("Skipping test: model not found");
      return;
    }

    const detector = new FoodDetector(modelPath);
    detector[Symbol.dispose]();
    
    expect(() => detector.detectFood(modelPath)).toThrow("FoodDetector is already closed");
  });
});
