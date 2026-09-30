import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compositionId = process.argv[2] || "businessOwner";
const outFile = process.argv[3] || `/mnt/documents/notiproof-${compositionId}.mp4`;

console.log(`[render] bundling…`);
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});
console.log(`[render] bundle ready`);

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: compositionId,
  puppeteerInstance: browser,
});
console.log(`[render] composition: ${compositionId} · ${composition.durationInFrames}f · ${composition.width}x${composition.height}`);

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: outFile,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onProgress: ({ renderedFrames, encodedFrames }) => {
    if (renderedFrames % 30 === 0) {
      console.log(`[render] ${renderedFrames}/${composition.durationInFrames} rendered, ${encodedFrames} encoded`);
    }
  },
});

await browser.close({ silent: false });
console.log(`[render] done → ${outFile}`);
