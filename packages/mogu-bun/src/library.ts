import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export interface FindLibraryOptions {
  /** Directory containing the source module. Defaults to this module's directory. */
  baseDir?: string;
  /** Platform override for tests. Defaults to the current process platform. */
  platform?: NodeJS.Platform;
  /** Architecture override for tests. Defaults to the current process architecture. */
  arch?: string;
  /** Environment value override for tests. Defaults to MOGU_FFI_LIB. */
  envValue?: string;
  /** Package resolver override for tests and non-Bun runtimes. */
  resolvePackage?: (specifier: string) => string | undefined;
}

function getLibraryName(platform: NodeJS.Platform): string {
  return platform === "win32"
    ? "mogu_ffi.dll"
    : platform === "darwin"
      ? "libmogu_ffi.dylib"
      : "libmogu_ffi.so";
}

function toPath(value: string): string {
  return value.startsWith("file:") ? fileURLToPath(value) : value;
}

function resolvePackageFromImportMeta(specifier: string): string | undefined {
  const resolveImport = (
    import.meta as ImportMeta & {
      resolve?: (specifier: string) => string;
    }
  ).resolve;

  if (!resolveImport) {
    return undefined;
  }

  try {
    return toPath(resolveImport(specifier));
  } catch {
    // Optional platform packages are intentionally absent on other platforms.
    return undefined;
  }
}

function ancestorDirectories(start: string): string[] {
  const directories: string[] = [];
  let current = resolve(start);

  while (true) {
    directories.push(current);
    const parent = dirname(current);
    if (parent === current) {
      return directories;
    }
    current = parent;
  }
}

function isolatedLinkerCandidates(
  baseDir: string,
  packageName: string,
  libraryName: string,
): string[] {
  const candidates: string[] = [];
  const encodedPackageName = packageName.replace("/", "+");

  for (const directory of ancestorDirectories(baseDir)) {
    const bunDirectory = join(directory, "node_modules", ".bun");
    let entries;
    try {
      entries = readdirSync(bunDirectory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        (entry.name !== encodedPackageName &&
          !entry.name.startsWith(`${encodedPackageName}@`))
      ) {
        continue;
      }

      candidates.push(
        join(bunDirectory, entry.name, "node_modules", packageName, libraryName),
      );
    }
  }

  return candidates;
}

export function findLibrary(options: FindLibraryOptions = {}): string {
  const baseDir = options.baseDir ?? import.meta.dir;
  const packageRoot = resolve(baseDir, "..");
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const libraryName = getLibraryName(platform);
  const packageName = `@kuma-00/mogu-ffi-${platform}-${arch}`;
  const packageResolver =
    options.resolvePackage ?? resolvePackageFromImportMeta;
  const candidates: string[] = [];
  const addCandidate = (candidate: string | undefined): void => {
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  // An explicit path is the most specific configuration and must win.
  addCandidate(options.envValue ?? process.env["MOGU_FFI_LIB"]);

  // Resolving the file as a package subpath works with Bun's isolated linker,
  // including its .bun/<package>@<version>/node_modules layout.
  addCandidate(packageResolver(`${packageName}/${libraryName}`));

  // Keep conventional installs working, including nested workspaces.
  for (const directory of ancestorDirectories(baseDir)) {
    addCandidate(join(directory, "node_modules", packageName, libraryName));
  }

  // Bun's isolated linker stores sibling packages in separate .bun entries,
  // so they cannot be found by walking node_modules from mogu-bun itself.
  for (const candidate of isolatedLinkerCandidates(
    baseDir,
    packageName,
    libraryName,
  )) {
    addCandidate(candidate);
  }

  // Preserve the existing source-tree/manual-build locations.
  addCandidate(join(packageRoot, "../../target/debug", libraryName));
  addCandidate(join(packageRoot, "../../target/release", libraryName));
  addCandidate(join(packageRoot, "../../crates/mogu-ffi/target/debug", libraryName));
  addCandidate(join(packageRoot, "../../crates/mogu-ffi/target/release", libraryName));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return resolve(candidate);
    }
  }

  throw new Error(
    `libmogu_ffi shared library not found.\n` +
      `  Tried:\n${candidates.map((candidate) => `    - ${candidate}`).join("\n")}\n\n` +
      `  Solutions:\n` +
      `  1. Install from npm: bun add @kuma-00/mogu-bun\n` +
      `  2. Build manually: cargo build --release --package mogu-ffi\n` +
      `  3. Set MOGU_FFI_LIB env var to the library path`,
  );
}
