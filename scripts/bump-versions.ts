import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PACKAGES_DIR = path.join(__dirname, '../packages');

function runCmd(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

interface PackageInfo {
  dir: string;
  name: string;
  version: string;
  filePath: string;
  jsonData: any;
}

function getPackages(): PackageInfo[] {
  const dirs = fs.readdirSync(PACKAGES_DIR);
  const packages: PackageInfo[] = [];

  for (const dirName of dirs) {
    const dirPath = path.join(PACKAGES_DIR, dirName);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const pkgJsonPath = path.join(dirPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const raw = fs.readFileSync(pkgJsonPath, 'utf8');
    const jsonData = JSON.parse(raw);

    packages.push({
      dir: dirPath,
      name: jsonData.name,
      version: jsonData.version,
      filePath: pkgJsonPath,
      jsonData,
    });
  }

  return packages;
}

function isVersionPublished(name: string, version: string): boolean {
  // Checks if this specific version is already published on npm registry
  const output = runCmd(`npm view ${name}@${version} version`);
  return output === version;
}

function main() {
  const packages = getPackages();
  let bumpedAny = false;
  const bumpedMap: Record<string, string> = {};

  // Step 1: Detect and bump packages whose current package.json versions are already published
  for (const pkg of packages) {
    console.log(`Checking ${pkg.name}@${pkg.version}...`);
    if (isVersionPublished(pkg.name, pkg.version)) {
      console.log(`  Version ${pkg.version} is already published. Bumping patch version...`);
      
      // Run npm version patch in the package directory
      runCmd('npm version patch --no-git-tag-version', pkg.dir);
      
      // Re-read package.json to get the new bumped version
      const updatedRaw = fs.readFileSync(pkg.filePath, 'utf8');
      const updatedJson = JSON.parse(updatedRaw);
      
      console.log(`  Bumped to ${updatedJson.version}`);
      bumpedMap[pkg.name] = updatedJson.version;
      pkg.version = updatedJson.version;
      pkg.jsonData = updatedJson;
      bumpedAny = true;
    } else {
      console.log(`  Version ${pkg.version} is not published yet. Good to go!`);
    }
  }

  // Step 2: Update local monorepo dependencies/peerDependencies/devDependencies in other packages to match bumped versions
  if (bumpedAny) {
    console.log('\nUpdating dependencies across packages...');
    const allPackages = getPackages();
    
    for (const pkg of allPackages) {
      let modified = false;
      const data = pkg.jsonData;
      
      const depSections = ['dependencies', 'devDependencies', 'peerDependencies'];
      for (const section of depSections) {
        if (!data[section]) continue;
        
        for (const depName of Object.keys(data[section])) {
          if (bumpedMap[depName]) {
            const oldVal = data[section][depName];
            const newVal = `^${bumpedMap[depName]}`;
            
            // Only update if it doesn't already match the exact version prefix
            if (oldVal !== newVal && !oldVal.includes(bumpedMap[depName])) {
              console.log(`  Updating ${pkg.name} ${section} -> ${depName} to ${newVal}`);
              data[section][depName] = newVal;
              modified = true;
            }
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(pkg.filePath, JSON.stringify(data, null, 2) + '\n');
      }
    }
  }

  console.log('\nBump checking finished.');
}

main();
