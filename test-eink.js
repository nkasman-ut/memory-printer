import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exportForEink } from "./server/imageExport.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "outputs/generated");

const files = (await readdir(outputDir)).filter(f => f.endsWith(".png")).sort();
const latest = process.argv[2] ? join(outputDir, process.argv[2]) : join(outputDir, files.at(-1));

const pngBuffer = await readFile(latest);
await exportForEink(pngBuffer, outputDir);
await writeFile(join(outputDir, "latest.json"), JSON.stringify({ id: Math.floor(Date.now() / 1000) }));
console.log("Exported from", latest);
