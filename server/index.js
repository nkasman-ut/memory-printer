import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDraftMemory, buildGenerationPrompt } from "./memoryPrompt.js";
import { exportForEink } from "./imageExport.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = normalize(join(__dirname, ".."));
const appDir = join(root, "app");
const outputDir = join(root, "outputs", "generated");
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".bin": "application/octet-stream"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(appDir, requestedPath));

  if (!filePath.startsWith(appDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function createGeneratedMemory(payload) {
  const draft = buildDraftMemory(payload.answers || []);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[memory] No API key found — returning draft");
    return { ...draft, mode: "draft" };
  }

  console.log("[memory] Building prompt...");
  const prompt = buildGenerationPrompt(draft);
  console.log("[memory] Calling OpenAI image generation...");
  const startTime = Date.now();

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024"
    })
  });

  console.log(`[memory] OpenAI responded in ${((Date.now() - startTime) / 1000).toFixed(1)}s — status ${response.status}`);

  if (!response.ok) {
    const error = await response.text();
    console.error("[memory] OpenAI error:", error);
    throw new Error(error);
  }

  const data = await response.json();
  console.log("[memory] Response output keys:", Object.keys(data));

  const b64 = data.data?.[0]?.b64_json;

  if (!b64) {
    console.log("[memory] No image data in response — returning draft. Full response:", JSON.stringify(data, null, 2));
    return { ...draft, mode: "draft" };
  }

  console.log("[memory] Image received, saving to disk...");
  await mkdir(outputDir, { recursive: true });
  const timestamp = Date.now();
  const fileName = `memory-${timestamp}.png`;
  const filePath = join(outputDir, fileName);
  const pngBuffer = Buffer.from(b64, "base64");
  await writeFile(filePath, pngBuffer);
  console.log(`[memory] Saved to ${filePath}`);

  try {
    await exportForEink(pngBuffer, outputDir);
    await writeFile(join(outputDir, "latest.json"), JSON.stringify({ id: Math.floor(timestamp / 1000) }));
    console.log("[memory] E-ink binary exported");
  } catch (err) {
    console.warn("[memory] E-ink export failed (non-fatal):", err.message);
  }

  return {
    ...draft,
    mode: "generated",
    stripImageUrl: `/generated/${fileName}`,
    alt: "Generated four-panel memory strip"
  };
}

async function serveGenerated(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname.replace("/generated/", "");
  const filePath = normalize(join(outputDir, requestedPath));

  if (!filePath.startsWith(outputDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/generated/")) {
      await serveGenerated(request, response);
      return;
    }

    if (request.method === "POST" && request.url === "/api/memories") {
      const payload = await readJson(request);
      const memory = await createGeneratedMemory(payload);
      sendJson(response, 200, memory);
      return;
    }

    if (request.method === "POST" && request.url === "/api/next-question") {
      const { answers, nextQuestion } = await readJson(request);
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        sendJson(response, 200, { question: nextQuestion });
        return;
      }
      const context = answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join("\n\n");
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 80,
          messages: [
            {
              role: "system",
              content: `You are guiding a quiet, intimate interview for a memory exhibition. The goal is to gather just enough to generate a vertical four-panel woodcut or linocut illustration — high contrast, not overly detailed. Each panel needs something to work with: a place, a presence, a detail, a feeling.

From the answers so far, deduce what you still need to know to make a compelling image. Only ask what is genuinely missing. If the next question is already answered, return null.

When you do ask, be brief, warm, and curious — the way a poet might ask. Reference what the person has already shared. Under 20 words.

Reply with only the adapted question text, or the word null. Nothing else.`
            },
            {
              role: "user",
              content: `Answers so far:\n${context}\n\nDefault next question: "${nextQuestion}"\n\nAdapted question (or null if already answered):`
            }
          ]
        })
      });
      const data = await completion.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      sendJson(response, 200, { question: text === "null" ? null : (text || nextQuestion) });
      return;
    }

    if (request.method === "GET" && request.url === "/api/status") {
      try {
        const raw = await readFile(join(outputDir, "latest.json"), "utf8");
        sendJson(response, 200, JSON.parse(raw));
      } catch {
        sendJson(response, 200, { id: null });
      }
      return;
    }

    if (request.method === "POST" && request.url === "/api/print-strip") {
      sendJson(response, 202, { ok: true, status: "Print pipeline placeholder" });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, {
      error: "Something went wrong while making the memory.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, host, () => {
  console.log(`Memory Peepbox is running at http://${host}:${port}`);
});
