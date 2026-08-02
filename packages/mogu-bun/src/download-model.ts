#!/usr/bin/env bun

import { downloadModel, getDefaultModelPath } from "./model.ts";
import { parseArgs } from "node:util";

let values: {
  force?: boolean;
  help?: boolean;
  "model-path"?: string;
};
let positionals: string[];

try {
  ({ values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      force: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      "model-path": { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

if (values.help) {
  console.log(`Usage: bunx @kuma-00/mogu-bun [download-model] [options]

Options:
  --model-path <path>  Save to a custom path
  --force              Download even when the model already exists
  -h, --help           Show this help`);
  process.exit(0);
}

if (
  positionals.length > 1 ||
  (positionals.length === 1 && positionals[0] !== "download-model")
) {
  console.error(`Unexpected argument: ${positionals.join(" ")}`);
  process.exit(2);
}

const modelPath = values["model-path"] ?? getDefaultModelPath();

console.log(`Downloading model to ${modelPath}...`);
downloadModel({ modelPath, force: values.force })
  .then((savedPath) => {
    console.log(`Model ready: ${savedPath}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
