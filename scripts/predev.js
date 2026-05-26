#!/usr/bin/env node
// Kills any previous Next.js dev server and clears the stale lock file so
// `npm run dev` always starts cleanly on port 3000.
const fs = require("fs");
const { execSync } = require("child_process");

const LOCK = ".next/dev/lock";
const TARGET_PORT = 3000;

// 1. Kill the PID recorded in the lock file (previous npm run dev invocation)
try {
  const lock = JSON.parse(fs.readFileSync(LOCK, "utf8"));
  if (lock.pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${lock.pid} /F /T`, { stdio: "ignore" });
      } else {
        process.kill(lock.pid, "SIGTERM");
      }
    } catch (_) {}
  }
} catch (_) {}

// 2. Kill whatever process is currently holding port 3000 (covers stale servers
//    that were started outside this npm session, e.g. a previous terminal run).
if (process.platform === "win32") {
  try {
    const out = execSync(
      `netstat -ano | findstr /C:":${TARGET_PORT} " | findstr LISTENING`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    out
      .trim()
      .split("\n")
      .forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") {
          try {
            execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
          } catch (_) {}
        }
      });
  } catch (_) {}
} else {
  try {
    const pid = execSync(`lsof -ti:${TARGET_PORT} -sTCP:LISTEN`, {
      encoding: "utf8",
    }).trim();
    if (pid) process.kill(Number(pid), "SIGTERM");
  } catch (_) {}
}

// 3. Remove the stale lock file
try {
  fs.unlinkSync(LOCK);
} catch (_) {}
