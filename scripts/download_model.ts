import { downloadFile } from "@huggingface/hub";
use_node_fs();

function use_node_fs() {
  const fs = require("fs");
  const path = require("path");

  // Get current directory path
  const currentDir = typeof import.meta !== "undefined" && import.meta.dir
    ? import.meta.dir
    : __dirname;

  const modelDir = path.join(currentDir, "../models");
  const modelPath = path.join(modelDir, "MobileNetV4-Conv-Small.onnx");

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

    fs.mkdirSync(modelDir, { recursive: true });
    fs.writeFileSync(modelPath, buffer);

    console.log("Model downloaded successfully!");
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
