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

export const STYLE_PRESETS = {
  dithered: `Black and white pixel dithering, Bayer matrix ordered dither pattern, high contrast, chunky square pixels, two-tone only, no gradients — halftone achieved purely through pixel density and arrangement, retro digital aesthetic.`,

  silhouette: `Bold silhouette style. Large solid black shapes on pure white background. No texture, no gradients, no midtones, no outlines — just flat black fills. Objects and spaces are reduced to their essential shadow shape. Negative space is generous. Feels like shadow puppets or cut paper. Stark, graphic, immediate.`,

  contour: `Sparse contour line art. Thin black outlines only on a pure white background. No fill, no shading, no hatching. Lines are minimal — just enough to describe the shape. Like a loose coloring book page or a quick ink sketch with a fine pen. Lots of white space. Clean and open.`,

  risograph: `Risograph / flat graphic poster style. Bold solid geometric shapes, pure black on white. Hard edges, no gradients, no texture. Flat areas of black with clear white space between them. Graphic and modern, like a two-color screen print. High contrast, zero midtones.`,

  linocut: `Linocut print style with large bold cuts. Big open white areas carved into solid black masses — or bold black marks on white. Chunky, imperfect edges. No fine crosshatching, no small detail — only large graphic marks. Think a child's potato stamp but intentional and dramatic. Very high contrast.`,

  bitmap: `1-bit dithered bitmap art. Grayscale tones are rendered entirely through dithering patterns — checkerboard grids, ordered dot matrices, and pixel-level noise that simulate shading without any true gray. Dark areas are dense black pixel clusters, light areas are sparse. Transitions between tones show visible dither patterns: checkerboard, Bayer matrix, or ordered halftone dots. Think Dither Boy, early Macintosh dithering, or CRT-era computer graphics. Black background preferred — subjects emerge in white/light dithered pixels from the dark ground. Moody, textured, atmospheric.`,
};

const SHARED_RULES = `No faces, no detailed figures, no text, no color. Black and white only. The image will be displayed on a 400x300 pixel e-ink screen.`;

const PANEL_LAYOUT = (place, detail, surroundings) => `
Memory content:
- Place: ${place}
- A vivid detail from the memory: ${detail}
- The surrounding environment: ${surroundings}

Panel layout:
- Panel 1 (left): the place itself — architecture, landscape, light, the room or space as it felt
- Panel 2 (right): a close detail or texture from the memory — an object, a surface, a quality of light

Both panels must be fully visible and completely contained within the frame. Each panel is 200x300 pixels. Together they fill the full 400x300 display — no white border, no margin, no overflow, nothing cropped. No text. Exactly 2 panels, both complete.
`.trim();

export function buildGenerationPrompt(memory, style = "dithered") {
  const { place, detail, surroundings } = memory.source;
  const styleDesc = STYLE_PRESETS[style] || STYLE_PRESETS.dithered;

  return `A wide horizontal rectangular panel divided into exactly 2 equal panels side by side. Landscape orientation.

Style: ${styleDesc}

${SHARED_RULES}

${PANEL_LAYOUT(place, detail, surroundings)}`.trim();
}

// Fixed sample memory used for style testing in the controller
export const TEST_MEMORY = {
  source: {
    place: "a small café in winter, steamed-up windows, wooden chairs",
    detail: "a ceramic coffee cup, half-empty, leaving a ring on the table",
    surroundings: "low afternoon light, the sound of rain outside, a coat on the back of a chair"
  }
};
