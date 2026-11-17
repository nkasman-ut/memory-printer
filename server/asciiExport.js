import sharp from "sharp";

const EINK_W = 400;
const EINK_H = 300;
const COLS = 80;
const ROWS = 50;

function buildCharPool(answers) {
  const text = answers.map(a => a.answer || "").join(" ");
  const chars = text.split("").filter(c => c.trim().length > 0);
  return chars.length > 10 ? chars : "abcdefghijklmnopqrstuvwxyz".split("");
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderToSvg(rows) {
  const lineH = EINK_H / ROWS;
  const lines = rows.map((row, i) =>
    `<text x="0" y="${((i + 1) * lineH).toFixed(1)}" textLength="${EINK_W}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${escapeXml(row)}</text>`
  ).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EINK_W}" height="${EINK_H}">
  <rect width="${EINK_W}" height="${EINK_H}" fill="white"/>
  <g font-family="monospace" font-size="${lineH.toFixed(1)}" fill="black">
    ${lines}
  </g>
</svg>`;
}

export async function asciiFromImage(pngBuffer, answers) {
  const charPool = buildCharPool(answers);

  const gray = await sharp(pngBuffer)
    .resize(COLS, ROWS, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  // Adaptive: only the darkest 30% of pixels become characters
  const sorted = Array.from(gray).sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.30)];

  let charIndex = 0;
  const rowStrings = [];
  for (let y = 0; y < ROWS; y++) {
    let row = "";
    for (let x = 0; x < COLS; x++) {
      const brightness = gray[y * COLS + x];
      if (brightness <= threshold) {
        row += charPool[charIndex % charPool.length];
        charIndex++;
      } else {
        row += " ";
      }
    }
    rowStrings.push(row);
  }

  const svg = renderToSvg(rowStrings);
  return sharp(Buffer.from(svg)).resize(EINK_W, EINK_H).png().toBuffer();
}

export async function asciiFromText(answers, apiKey) {
  const charPool = buildCharPool(answers).join("");
  const scene = answers.map((a, i) => `${i + 1}. ${a.answer}`).join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are an ASCII artist. Create ASCII art representing the described memory scene.
Output EXACTLY ${ROWS} lines, each EXACTLY ${COLS} characters wide (pad with spaces).
Use ONLY characters from this pool (cycle through them): "${charPool.slice(0, 300)}"
Use spaces for bright/empty areas, pool characters for dark/filled areas.
No explanation, no markdown fences — just the raw ASCII art.`
        },
        {
          role: "user",
          content: `Memory:\n${scene}\n\nASCII art:`
        }
      ]
    })
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const lines = text.split("\n").slice(0, ROWS);

  const rowStrings = Array.from({ length: ROWS }, (_, i) => {
    const line = lines[i] || "";
    return line.length >= COLS ? line.slice(0, COLS) : line.padEnd(COLS, " ");
  });

  const svg = renderToSvg(rowStrings);
  return sharp(Buffer.from(svg)).resize(EINK_W, EINK_H).png().toBuffer();
}
