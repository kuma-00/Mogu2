import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("packages/mogu-bun/package.json", "utf8"));
const version = pkg.version;
const pkgName = "@kuma-00/mogu-bun";
const npmRegistry = "https://npm.pkg.github.com";

console.log(`Publishing ${pkgName} version ${version}`);

// Check if package version exists in registry
function packageVersionExists(pkgName, version) {
  try {
    const out = execSync(
      `npm view ${pkgName}@${version} version --registry=${npmRegistry}`,
      {
        stdio: "pipe",
        encoding: "utf8",
        env: {
          ...process.env,
        },
      }
    ).trim();
    return out === version;
  } catch (e) {
    console.log(`Package version check failed (may not exist or auth issue): ${e.message}`);
    return false;
  }
}

// Check if package version exists and publish if not
console.log(`Checking if ${pkgName}@${version} exists in registry...`);
const pkgExists = packageVersionExists(pkgName, version);
if (pkgExists) {
  console.log(`⏭️  Package ${pkgName}@${version} already exists in registry, skipping publish`);
} else {
  console.log(`Publishing ${pkgName}@${version}...`);
  try {
    execSync(
      `cd packages/mogu-bun && npm publish --access restricted --registry=${npmRegistry}`,
      {
        stdio: "inherit",
        env: {
          ...process.env,
        },
      }
    );
    console.log(`✅ Published ${pkgName} ${version}`);
  } catch (error) {
    console.error(`❌ Failed to publish ${pkgName} ${version}`);
    process.exit(1);
  }
}

console.log(`\n✅ Publish complete!`);
