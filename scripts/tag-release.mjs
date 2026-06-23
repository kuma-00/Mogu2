import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(
  readFileSync("packages/mogu-bun/package.json", "utf8")
);
const tag = `v${pkg.version}`;

function tagExists(name) {
  try {
    execSync(`git rev-parse ${name}^{commit}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

if (tagExists(tag)) {
  console.log(`Tag ${tag} already exists, skipping.`);
  process.exit(0);
}

execSync(`git config user.name "github-actions[bot]"`, { stdio: "inherit" });
execSync(`git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`, {
  stdio: "inherit",
});
execSync(`git tag ${tag}`, { stdio: "inherit" });
execSync(`git push origin ${tag}`, { stdio: "inherit" });
console.log(`Pushed tag ${tag}`);
