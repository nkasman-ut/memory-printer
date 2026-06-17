function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sentence(value) {
  const text = clean(value);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function answerAt(answers, index) {
  return clean(answers[index]?.answer);
}

export function buildDraftMemory(answers) {
  const place = answerAt(answers, 0) || "an unnamed place";
  const detail = answerAt(answers, 1) || "one small detail";
  const surroundings = answerAt(answers, 2) || "the surrounding light and objects";

  return {
    title: place.length > 56 ? "A place almost remembered" : place,
    caption: `Held detail: ${sentence(detail)}`,
    frames: [
      { caption: `The place: ${place}` },
      { caption: `The detail: ${detail}` },
      { caption: `Around it: ${surroundings}` }
    ],
    source: { place, detail, surroundings }
  };
}

export function buildGenerationPrompt(memory) {
  const { place, detail, surroundings } = memory.source;

  return `
A wide horizontal strip divided into EXACTLY 2 equal rectangular panels side by side, separated by a single thin black dividing line. Landscape orientation. The final image will be displayed on a 400x300 pixel e-ink screen — design to fill that frame completely with no overflow.

Style: Mexican woodcut print in the tradition of the Taller de Gráfica Popular. Almost entirely black background with white lines and shapes gouged and carved into it — not black lines on white, but white marks cut from darkness. Rough, irregular tool marks. Visible gouging. Dense, gestural, expressive. Edges are never clean or smooth — they are jagged, hand-cut, imperfect. High contrast. No grey tones. No color. No photorealism. The darkness is the material; the white is what was removed.

No people. No figures. No silhouettes of humans or animals. Place, texture, light, and atmosphere only.

Draw only what the person explicitly described. Do not invent, add, or assume any objects, architectural details, vegetation, furniture, or elements that are not directly mentioned in the memory content below. If something is not stated, leave it as darkness or texture — do not fill it in.

Memory content:
- Place: ${place}
- A vivid detail from the memory: ${detail}
- The surrounding environment: ${surroundings}

Panel layout:
- Panel 1 (left): the place itself — architecture, landscape, light, the room or space as it felt
- Panel 2 (right): a close detail or texture from the memory — an object, a surface, a quality of light

Both panels must be fully visible and completely contained within the frame. Each panel is 200x300 pixels. Together they fill the full 400x300 display — no white border, no margin, no overflow, nothing cropped. No text. Exactly 2 panels, both complete.
`.trim();
}
