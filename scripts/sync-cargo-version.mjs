import { readFileSync, writeFileSync } from "node:fs";

const version = JSON.parse(
  readFileSync("packages/mogu-bun/package.json", "utf8")
).version;

const packageVersionPattern =
  /^(\[package\]\nname = "[^"]+"\nversion = ")[^"]+(")/m;

for (const crate of ["crates/mogu-core/Cargo.toml", "crates/mogu-ffi/Cargo.toml"]) {
  const contents = readFileSync(crate, "utf8");
  const updated = contents.replace(packageVersionPattern, `$1${version}$2`);
  if (updated === contents) {
    console.log(`${crate} already at ${version}`);
    continue;
  }
  writeFileSync(crate, updated);
  console.log(`Updated ${crate} → ${version}`);
}
