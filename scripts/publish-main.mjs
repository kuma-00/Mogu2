import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("packages/mogu-bun/package.json", "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const pkgName = "@kuma-00/mogu-bun";
const npmRegistry = "https://npm.pkg.github.com";

console.log(`Publishing ${pkgName} version ${version}`);

// Check if remote tag exists
function remoteTagExists(tagName) {
  try {
    execSync(`git ls-remote --exit-code --tags origin refs/tags/${tagName}`, {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

// Check if GitHub Release exists
function releaseExists(tagName) {
  try {
    execSync(`gh release view ${tagName}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

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

// Step 1: Publish npm package
console.log(`\n[1/3] Checking if ${pkgName}@${version} exists in registry...`);
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

// Step 2: Create and push git tag
console.log(`\n[2/3] Checking if remote tag ${tag} exists...`);
const remoteTag = remoteTagExists(tag);
if (remoteTag) {
  console.log(`⏭️  Remote tag ${tag} already exists, skipping tag creation`);
} else {
  console.log(`Creating and pushing tag ${tag}...`);
  execSync(`git config user.name "github-actions[bot]"`, { stdio: "inherit" });
  execSync(
    `git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`,
    { stdio: "inherit" }
  );
  execSync(`git tag ${tag}`, { stdio: "inherit" });
  execSync(`git push origin ${tag}`, { stdio: "inherit" });
  console.log(`✅ Created and pushed tag ${tag}`);
}

// Step 3: Create GitHub Release
console.log(`\n[3/3] Checking if GitHub Release ${tag} exists...`);
const ghRelease = releaseExists(tag);
if (ghRelease) {
  console.log(`⏭️  GitHub Release ${tag} already exists, skipping release creation`);
} else {
  console.log(`Creating GitHub Release ${tag}...`);

  // Extract release notes
  const changelogPath = "packages/mogu-bun/CHANGELOG.md";
  let releaseNotes = `Release v${version}`;
  try {
    const changelog = readFileSync(changelogPath, "utf8");
    const escaped = version.replace(/\./g, "\\.");
    const pattern = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = changelog.match(pattern);
    if (match) {
      releaseNotes = match[1].trim();
    }
  } catch (e) {
    console.log("No CHANGELOG.md found, using default release notes");
  }

  // Write release notes to file
  writeFileSync("release-notes.md", releaseNotes);

  // Create release using GitHub CLI with notes-file
  try {
    execSync(`gh release create ${tag} --title ${tag} --notes-file release-notes.md`, {
      stdio: "inherit",
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      },
    });
    console.log(`✅ Created GitHub Release ${tag}`);
  } catch (error) {
    console.error(`❌ Failed to create GitHub Release ${tag}`);
    process.exit(1);
  }
}

console.log(`\n✅ Release ${version} complete!`);
