import { existsSync, readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/extract-changelog-section.mjs <version>");
  process.exit(1);
}

const changelogPath = "packages/mogu-bun/CHANGELOG.md";
if (!existsSync(changelogPath)) {
  writeFileSync("release-notes.md", `Release v${version}`);
  console.log(`No CHANGELOG.md found, using default release notes`);
  process.exit(0);
}

const changelog = readFileSync(changelogPath, "utf8");
const escaped = version.replace(/\./g, "\\.");
const pattern = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`);
const match = changelog.match(pattern);

if (!match) {
  writeFileSync("release-notes.md", `Release v${version}`);
  console.log(`No section for ${version}, using default release notes`);
  process.exit(0);
}

writeFileSync("release-notes.md", match[1].trim());
console.log(`Extracted release notes for ${version}`);
