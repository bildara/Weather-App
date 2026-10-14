# Atmos Weather

A small, responsive weather app built with plain HTML, CSS and JavaScript. Weather data comes from the [Visual Crossing Weather API](https://www.visualcrossing.com/weather-api).

## Requirements covered
- Search for a city, address or other location.
- Current temperature, wind speed, precipitation probability and weather conditions.
- Hourly forecast covering the previous 24 hours and the next 24 hours.
- Manual refresh.
- Optional default view based on browser geolocation.
- Subtle loading and reveal animations.

## Project structure

```text
index.html       Page structure and accessible labels
style.css        Layout, responsive styles, weather themes and animations
script.js        API requests, state, rendering and event handlers
CaviarDreams.ttf Small labels and metadata font
CaviarDreams_Bold.ttf Bold label font
README.md        Setup instructions
```

## Run locally

1. Download a key from [Visual Crossing](https://www.visualcrossing.com/weather-api).
2. In this folder run `python3 -m http.server 8000`.
3. Open `http://localhost:8000`.
4. Open **API key settings**, save the key, then search for a location. You can also use **Use my location** after allowing browser location access.

The API key is stored in this browser's `localStorage`; it is not hardcoded into the source files. Because this is a client-side demo, the key is visible to the browser. For a public production app, route API requests through a backend.
