import { downloadFile } from "@huggingface/hub";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const DEFAULT_MODEL_FILENAME = "MobileNetV4-Conv-Small.onnx";
export const DEFAULT_MODEL_REPOSITORY =
  "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k";
export const DEFAULT_MODEL_REPOSITORY_PATH = "onnx/model.onnx";

export interface ModelDownloadOptions {
  /** Destination path. Defaults to ./models/MobileNetV4-Conv-Small.onnx. */
  modelPath?: string;
  /** Download again even when the destination already exists. */
  force?: boolean;
}

export function getDefaultModelPath(projectRoot = process.cwd()): string {
  return resolve(projectRoot, "models", DEFAULT_MODEL_FILENAME);
}

export async function downloadModel(
  options: ModelDownloadOptions = {},
): Promise<string> {
  const modelPath = resolve(options.modelPath ?? getDefaultModelPath());
  if (!options.force && existsSync(modelPath)) {
    return modelPath;
  }

  mkdirSync(dirname(modelPath), { recursive: true });
  const temporaryPath = `${modelPath}.${process.pid}.${Date.now()}.download`;

  try {
    const response = await downloadFile({
      repo: DEFAULT_MODEL_REPOSITORY,
      path: DEFAULT_MODEL_REPOSITORY_PATH,
    });
    if (!response) {
      throw new Error("Failed to download model from Hugging Face Hub");
    }

    writeFileSync(temporaryPath, Buffer.from(await response.arrayBuffer()));

    try {
      renameSync(temporaryPath, modelPath);
    } catch (error) {
      // Another process may have completed the same download first.
      if (!options.force && existsSync(modelPath)) {
        rmSync(temporaryPath, { force: true });
      } else {
        throw error;
      }
    }
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }

  return modelPath;
}

export async function ensureModel(
  options: ModelDownloadOptions = {},
): Promise<string> {
  const modelPath = resolve(options.modelPath ?? getDefaultModelPath());
  return existsSync(modelPath) && !options.force
    ? modelPath
    : downloadModel({ ...options, modelPath });
}
