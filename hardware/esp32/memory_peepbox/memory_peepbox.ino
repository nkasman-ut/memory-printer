// Memory Peepbox — ESP32 display driver
// CrowPanel ESP32 Display-4.2(E) inch, SKU: DIE07300S
// Uses CrowPanel's EPD library (software SPI, GPIO 7 = screen power).

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "EPD.h"

// ── CONFIG ────────────────────────────────────────────────────────────────────

const char* WIFI_SSID     = "sandbox370";
const char* WIFI_PASSWORD = "+s0a+s03!2gether?";

const char* SERVER_BASE = "http://10.23.11.35:5173";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

static const int  BIN_SIZE         = EPD_W * EPD_H / 8;  // 15000 bytes
static const long POLL_INTERVAL_MS = 5000;

// ── STATE ─────────────────────────────────────────────────────────────────────

static long    lastSeenId = -1;
static uint8_t pixelBuf[BIN_SIZE];

// ── HELPERS ───────────────────────────────────────────────────────────────────

bool fetchStatus(long& outId) {
  HTTPClient http;
  http.begin(String(SERVER_BASE) + "/api/status");
  http.setTimeout(4000);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[status] HTTP %d\n", code);
    http.end();
    return false;
  }

  StaticJsonDocument<64> doc;
  DeserializationError err = deserializeJson(doc, http.getString());
  http.end();
  if (err || doc["id"].isNull()) return false;

  outId = doc["id"].as<long>();
  return true;
}

bool fetchImage() {
  HTTPClient http;
  http.begin(String(SERVER_BASE) + "/generated/latest-eink.bin");
  http.setTimeout(10000);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[image] HTTP %d\n", code);
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  int received = 0;
  unsigned long deadline = millis() + 8000;
  while (received < BIN_SIZE && millis() < deadline) {
    if (stream->available()) {
      pixelBuf[received++] = stream->read();
    }
  }
  http.end();

  if (received != BIN_SIZE) {
    Serial.printf("[image] Expected %d bytes, got %d\n", BIN_SIZE, received);
    return false;
  }
  return true;
}

void showImage() {
  EPD_Init_Fast(Fast_Seconds_1_5s);
  EPD_Display_Fast(pixelBuf);
  EPD_Sleep();
}

// ── SETUP / LOOP ──────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  // Power on the e-ink panel
  pinMode(7, OUTPUT);
  digitalWrite(7, HIGH);

  EPD_GPIOInit();
  EPD_Clear();
  EPD_Sleep();

  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nConnected — %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[wifi] Reconnecting...");
    WiFi.reconnect();
    delay(POLL_INTERVAL_MS);
    return;
  }

  long currentId = -1;
  if (fetchStatus(currentId) && currentId != lastSeenId) {
    Serial.printf("[poll] New memory (id=%ld), fetching...\n", currentId);
    if (fetchImage()) {
      showImage();
      lastSeenId = currentId;
      Serial.println("[display] Updated.");
    }
  }

  delay(POLL_INTERVAL_MS);
}
