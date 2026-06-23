import { downloadFile } from "@huggingface/hub";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const modelDir = join(import.meta.dir, "../models");
const modelPath = join(modelDir, "MobileNetV4-Conv-Small.onnx");

async function main() {
  console.log(`Downloading model to ${modelPath}...`);

  const response = await downloadFile({
    repo: "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k",
    path: "onnx/model.onnx",
  });

  if (!response) {
    throw new Error("Failed to download model from Hugging Face Hub.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(modelDir, { recursive: true });
  writeFileSync(modelPath, buffer);

  console.log("Model downloaded successfully!");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
