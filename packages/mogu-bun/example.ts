/**
 * mogu-bun example
 *
 * Usage:
 *   bun run packages/mogu-bun/example.ts <image-path>
 *
 * The script accepts any image file supported by the `image` crate
 * (JPEG, PNG, WebP, BMP, etc.).
 */

import { FoodDetector } from "./index.ts";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Args ─────────────────────────────────────────────────────────────────────

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: bun run packages/mogu-bun/example.ts <image-path>");
  process.exit(1);
}

const MODEL_PATH = resolve(import.meta.dir, "../../models/MobileNetV4-Conv-Small.onnx");

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`🧠 Loading model: ${MODEL_PATH}`);
const detector = new FoodDetector(MODEL_PATH);

// ── Detection via file path ──────────────────────────────────────────────────
console.log(`\n📷  Detecting food (by path): ${resolve(imagePath)}`);
const t0 = performance.now();
const result = detector.detectFood(resolve(imagePath));
const elapsed = (performance.now() - t0).toFixed(1);

console.log(`\n✅  Result  (${elapsed} ms)`);
console.log(`   is_food : ${result.is_food}`);
console.log(`   score   : ${result.score.toFixed(4)}`);
console.log(`   kind    : ${result.kind}`);
console.log(`   food_prob     : ${result.food_prob.toFixed(4)}`);
console.log(`   drink_prob    : ${result.drink_prob.toFixed(4)}`);
console.log(`   tableware_prob: ${result.tableware_prob.toFixed(4)}`);

console.log(`\n📋  Top labels:`);
for (const label of result.top_labels.slice(0, 5)) {
  console.log(
    `   [${String(label.index).padStart(4)}] ${(label.probability * 100).toFixed(2).padStart(6)}%  ${label.category.padEnd(12)}  ${label.label}`
  );
}

// ── Detection via raw bytes ───────────────────────────────────────────────────
console.log(`\n📷  Detecting food (by bytes)…`);
const bytes = readFileSync(resolve(imagePath));
const t1 = performance.now();
const result2 = detector.detectFood(bytes);
const elapsed2 = (performance.now() - t1).toFixed(1);
console.log(`   is_food: ${result2.is_food}  (${elapsed2} ms)`);

// ── Cleanup ───────────────────────────────────────────────────────────────────
detector.close();
console.log("\n🎉 Done.");
