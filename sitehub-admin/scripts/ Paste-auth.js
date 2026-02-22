// Run with: node scripts/debug:

```js
// Run with: node scripts/debug-auth.js
// This script scans your-auth.js
// This script scans your project for anything that sets cookies or calls setUser project for anything that sets cookies or calls setUserCookies.

const fsCookies.

const fs = require("fs");
 = require("fs");
const path = requireconst path = require("path");

const("path");

const projectRoot = path projectRoot = path.resolve(__dirname.resolve(__dirname, "..");

const targets = [
  "setUserCookies, "..");

const targets = [
  "setUserCookies(",
  "cookies().(",
  "cookies().set(",
  "cookieStore.set(",
  "set(",
  "cookieStore.set(",
  "res.cookies.set("res.cookies.set(",
  "response.cookies,
  "response.cookies.set(",
  "user_email.set(",
  "user_email",
  "role=",
];

",
  "role=",
];

function scanDirfunction scanDir(dir) {
  const entries(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

 = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry  for (const entry of entries) {
    of entries) {
    const fullPath = const fullPath = path.join(dir, entry path.join(dir, entry.name);

    if (.name);

    if (entry.isDirectoryentry.isDirectory()) {
      scan()) {
      scanDir(fullPath);
   Dir(fullPath);
    } else if (entry } else if (entry.isFile()) {
     .isFile()) {
      const content = fs.readFileSync const content = fs.readFileSync(fullPath, "utf8(fullPath, "utf8");

      for (const t of targets) {
        if (content.includes");

      for (const t of targets) {
        if (content.includes(t)) {
          console.log(`\n(t)) {
          console.log(`\n🔍 FOUND "${t}" in🔍 FOUND "${t}" in: ${fullPath}`);
        }
      }
: ${fullPath}`);
        }
      }
    }
  }
}

console    }
  }
}

console.log("🔎 Scanning.log("🔎 Scanning project for cookie project for cookie setters and setUserCookies calls setters and setUserCookies calls...\n");
scanDir...\n");
scanDir(projectRoot);
console(projectRoot);
console.log("\n✅ Scan complete.log("\n✅ Scan complete.\n");
