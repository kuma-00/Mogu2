import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { findLibrary } from "./library";

function createFixture(relativeFiles: string[]): {
  root: string;
  path: (relativePath: string) => string;
} {
  const root = mkdtempSync(join(tmpdir(), "mogu-library-test-"));
  const path = (relativePath: string) => join(root, relativePath);

  for (const relativeFile of relativeFiles) {
    const filePath = path(relativeFile);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, "library fixture");
  }

  return { root, path };
}

describe("findLibrary", () => {
  test("finds a Linux x64 package in Bun's isolated linker layout", () => {
    const fixture = createFixture([
      "node_modules/.bun/@kuma-00+mogu-ffi-linux-x64@1.1.0/node_modules/" +
        "@kuma-00/mogu-ffi-linux-x64/libmogu_ffi.so",
    ]);
    const moduleDir = fixture.path(
      "node_modules/.bun/@kuma-00+mogu-bun@1.1.0/node_modules/@kuma-00/mogu-bun/src",
    );

    try {
      expect(
        findLibrary({
          baseDir: moduleDir,
          platform: "linux",
          arch: "x64",
          envValue: "",
          resolvePackage: () => undefined,
        }),
      ).toBe(
        fixture.path(
          "node_modules/.bun/@kuma-00+mogu-ffi-linux-x64@1.1.0/node_modules/" +
            "@kuma-00/mogu-ffi-linux-x64/libmogu_ffi.so",
        ),
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("keeps an explicit MOGU_FFI_LIB path as the highest-priority candidate", () => {
    const fixture = createFixture(["libmogu_ffi.so"]);

    try {
      const explicitPath = fixture.path("libmogu_ffi.so");
      expect(
        findLibrary({
          baseDir: fixture.root,
          platform: "linux",
          arch: "x64",
          envValue: explicitPath,
          resolvePackage: () => undefined,
        }),
      ).toBe(explicitPath);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("keeps macOS arm64 and Windows x64 package candidates working", () => {
    const fixture = createFixture([
      "packages/node_modules/@kuma-00/mogu-ffi-darwin-arm64/libmogu_ffi.dylib",
      "packages/node_modules/@kuma-00/mogu-ffi-win32-x64/mogu_ffi.dll",
    ]);
    const moduleDir = fixture.path("packages/mogu-bun/src");

    try {
      expect(
        findLibrary({
          baseDir: moduleDir,
          platform: "darwin",
          arch: "arm64",
          envValue: "",
          resolvePackage: () => undefined,
        }),
      ).toBe(
        fixture.path(
          "packages/node_modules/@kuma-00/mogu-ffi-darwin-arm64/libmogu_ffi.dylib",
        ),
      );

      expect(
        findLibrary({
          baseDir: moduleDir,
          platform: "win32",
          arch: "x64",
          envValue: "",
          resolvePackage: () => undefined,
        }),
      ).toBe(
        fixture.path(
          "packages/node_modules/@kuma-00/mogu-ffi-win32-x64/mogu_ffi.dll",
        ),
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("keeps manual debug build candidates working", () => {
    const fixture = createFixture([
      "source/target/debug/libmogu_ffi.so",
    ]);
    try {
      expect(
        findLibrary({
          baseDir: fixture.path("source/packages/mogu-bun/src"),
          platform: "linux",
          arch: "x64",
          envValue: "",
          resolvePackage: () => undefined,
        }),
      ).toBe(fixture.path("source/target/debug/libmogu_ffi.so"));
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
