// Template for secrets.h. Copy this file to secrets.h (same folder) and fill it in.
// secrets.h is ignored by git, so real passwords never get committed.
#pragma once

const char* WIFI_SSID     = "your-network-name";
const char* WIFI_PASSWORD = "your-network-password";

// Your laptop's LAN IP, where the server runs (find it with: ifconfig | grep "inet ")
const char* SERVER_BASE = "http://192.168.1.42:5173";
