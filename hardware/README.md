# Hardware

ESP32 + Elecrow 4.2" e-ink display (400×300).

The ESP32 polls the local server every 5 seconds. When a new memory is generated from the interview, the display updates automatically.

## Wiring

| E-ink pin | ESP32 GPIO |
|-----------|-----------|
| CS        | 5         |
| DC        | 17        |
| RST       | 16        |
| BUSY      | 4         |
| CLK (SCK) | 18        |
| MOSI      | 23        |
| GND       | GND       |
| 3.3V      | 3.3V      |

## Required Libraries (Arduino Library Manager)

- **GxEPD2** by ZinggJM
- **Adafruit GFX Library**
- **ArduinoJson** by Benoit Blanchon

## Setup

1. Open `esp32/memory_peepbox.ino` in the Arduino IDE.
2. Set your board to **ESP32 Dev Module** (Tools → Board → esp32).
3. Edit the config section at the top of the sketch:
   - `WIFI_SSID` / `WIFI_PASSWORD`
   - `SERVER_BASE` — your laptop's LAN IP (find it with `ifconfig | grep "inet "` on macOS), e.g. `http://192.168.1.42:5173`
4. Flash the sketch.

## Driver note

The sketch uses `GxEPD2_420_GDEY042T81`. If your Elecrow display doesn't initialise, check the product page for the driver chip and swap in the matching class from the GxEPD2 `examples/` folder.

## Server setup

Install dependencies and start the server on your laptop:

```bash
npm install
npm start
```

The server must be reachable on the LAN at the IP you configured above. Make sure your laptop and ESP32 are on the same WiFi network.

## How it works

1. A visitor completes the memory interview in the browser.
2. The server generates a B&W image via OpenAI, saves it, and exports a 400×300 1-bit binary to `outputs/generated/latest-eink.bin`.
3. The ESP32 polls `/api/status` every 5 seconds — when the `id` changes, it fetches `latest-eink.bin` and refreshes the display.
