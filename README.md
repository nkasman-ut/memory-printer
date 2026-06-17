# Memory Peepbox

Memory Peepbox is a small participatory installation: a visitor answers five questions about a cherished memory, receives a stark black-and-white memory strip, then later sees it through a peephole box on an e-ink display and can print it as a thermal keepsake.

## Run The Prototype

```bash
node server/index.js
```

Then open:

```text
http://127.0.0.1:5173
```

Without an API key, the app creates a draft text strip so the interview flow can be tested. To enable image generation, copy `.env.example` to `.env`, add `OPENAI_API_KEY`, then run the server with that environment loaded.

## Current Shape

- `app/` contains the browser interview and preview.
- `server/` contains the local server, prompt construction, and API boundary.
- `hardware/` is reserved for ESP32 and e-ink code.
- `print/` is reserved for thermal printer layout and output.
- `docs/` holds project notes and planning.

## Next Build Step

The next best step is image generation hardening: produce a reliable black-and-white four-panel strip, save it locally, and add an export step sized for the specific e-ink display and printer.
