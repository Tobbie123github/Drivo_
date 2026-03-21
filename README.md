# Drivo v2

## Setup

```bash
npm install
cp .env.example .env
# Add your Google Maps API key to .env
npm run dev
```

## Google Maps API Key
Get a key at https://console.cloud.google.com
Enable: Maps JavaScript API + Places API

## Env Variables
- `VITE_API_URL` — Backend URL (default: http://localhost:5000)
- `VITE_WS_URL` — WebSocket URL (default: ws://localhost:5000)
- `VITE_GOOGLE_MAPS_KEY` — Google Maps API key

## Capacitor
```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```
