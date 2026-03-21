/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scan the project for cookie setters and setUserCookies calls.
 * Run with: node scripts/paste-auth.js
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const targets = [
  "setUserCookies(",
  "cookies().",
  "cookies().set(",
  "cookieStore.set(",
  "res.cookies.set(",
  "response.cookies",
  "user_email",
  "role=",
];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const token of targets) {
        if (content.includes(token)) {
          console.log(`Found "${token}" in: ${fullPath}`);
          break;
        }
      }
    }
  }
}

console.log("Scanning project for cookie setters and setUserCookies calls...\n");
scanDir(projectRoot);
console.log("\nScan complete.\n");
