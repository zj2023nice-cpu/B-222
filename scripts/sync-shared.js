const fs = require("fs");
const path = require("path");

const CLOUDFUNCTIONS_DIR = path.join(__dirname, "..", "cloudfunctions");
const SHARED_DIR = path.join(CLOUDFUNCTIONS_DIR, "_shared");

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getCloudFunctionDirs() {
  const entries = fs.readdirSync(CLOUDFUNCTIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name !== "_shared")
    .map((e) => path.join(CLOUDFUNCTIONS_DIR, e.name));
}

function main() {
  if (!fs.existsSync(SHARED_DIR)) {
    console.error("共享目录不存在:", SHARED_DIR);
    process.exit(1);
  }

  const cfDirs = getCloudFunctionDirs();
  console.log(`找到 ${cfDirs.length} 个云函数目录`);

  for (const dir of cfDirs) {
    const destShared = path.join(dir, "_shared");
    copyDir(SHARED_DIR, destShared);
    console.log(`  ✓ 已同步到 ${path.basename(dir)}`);
  }

  console.log("\n同步完成！");
}

main();
