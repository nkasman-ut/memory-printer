# Memory Peepbox

Memory Peepbox is a small participatory installation. A visitor answers a few questions about a cherished memory they do not have a picture of. The system turns the answers into a stark black-and-white memory strip, shows it through a peephole box on an e-ink display, and can offer a thermal print.

## First Milestone

Build the core local experience before hardware:

1. A ceremonial five-question interview in the browser.
2. A local server that keeps API keys out of the browser.
3. A draft memory strip when no API key is present.
4. Generated black-and-white image output when `OPENAI_API_KEY` is configured.
5. A placeholder route for print-strip preparation.

## Near-Term Decisions

- Use a local laptop as the hub during prototyping.
- Keep raw answers ephemeral by default.
- Optimize all generated imagery for e-ink and thermal print from the start.
- Treat the browser as intake, not the climax. The peephole reveal is the center of the piece.

## Hardware Track

- ESP32 with e-ink display pulls or receives the latest generated image.
- Image conversion should produce a display-ready monochrome or grayscale bitmap.
- Cycling can begin as a simple loop over four panels, then become a slow reveal.

## Print Track

- Thermal output should be a compact four-panel strip.
- The print can include a small generated title and date, but should avoid exposing the visitor's full written answers.
