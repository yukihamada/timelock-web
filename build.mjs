import { build } from "esbuild";
import { writeFileSync } from "fs";

// Buffer をグローバルに供給する shim（tlock-js 内部対策）
const shim = `
import { Buffer as _B } from "buffer";
globalThis.Buffer = globalThis.Buffer || _B;
if (typeof globalThis.global === "undefined") globalThis.global = globalThis;
`;
writeFileSync("src/_shim.js", shim);

await build({
  entryPoints: ["src/entry.js"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  sourcemap: false,
  outfile: "public/bundle.js",
  define: { "process.env.NODE_ENV": '"production"' },
  inject: ["src/_shim.js"],
  logLevel: "info",
});
console.log("✓ public/bundle.js built");
