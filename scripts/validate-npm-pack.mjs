import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const [packageDir, requiredFile] = process.argv.slice(2);

if (!packageDir || !requiredFile) {
  console.error("Usage: node scripts/validate-npm-pack.mjs <package-dir> <required-file>");
  process.exit(2);
}

const absolutePackageDir = resolve(packageDir);
const pkg = JSON.parse(
  readFileSync(resolve(absolutePackageDir, "package.json"), "utf8"),
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmCache = mkdtempSync(join(tmpdir(), "mogu-npm-pack-"));
let output;
try {
  output = execFileSync(
    npmCommand,
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: absolutePackageDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      env: {
        ...process.env,
        npm_config_cache: npmCache,
      },
    },
  );
} finally {
  rmSync(npmCache, { recursive: true, force: true });
}
const [pack] = JSON.parse(output);

if (pack.id !== `${pkg.name}@${pkg.version}`) {
  throw new Error(
    `Packed identity mismatch: expected ${pkg.name}@${pkg.version}, got ${pack.id}`,
  );
}

const packedPaths = new Set(pack.files.map(({ path }) => path));
if (!packedPaths.has(requiredFile)) {
  throw new Error(
    `${requiredFile} is missing from ${pkg.name}; packed files: ${[...packedPaths].join(", ")}`,
  );
}

const sensitiveNames = new Set([".env", ".npmrc"]);
const sensitiveFile = pack.files.find(({ path }) =>
  sensitiveNames.has(basename(path))
);
if (sensitiveFile) {
  throw new Error(`Sensitive file included in package: ${sensitiveFile.path}`);
}

console.log(
  `Validated ${pack.id}: ${pack.entryCount} files, ${pack.size} packed bytes`,
);
