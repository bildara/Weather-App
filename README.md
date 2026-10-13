# Weather App

A simple weather web app built with HTML, CSS and vanilla JavaScript. It uses the [Visual Crossing Weather API](https://www.visualcrossing.com/weather-api) to show the current weather for any location, plus the previous and next 24 hours.

**Project page:** https://YOUR-USERNAME.github.io/weather-app/

## Features

- Search any location (city, address, ZIP code...)
- Current temperature, wind speed, chance of rain and general conditions (Sunny, Rain, Cloudy...)
- Hourly view of the previous 24 hours and the next 24 hours
- Refresh button to update the outlook
- Switch between °C and °F
- Default view uses your current location (browser geolocation)
- Fade-in animations when weather loads

## Run the project

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/weather-app.git
   cd weather-app
   ```
2. Get a free API key from [Visual Crossing](https://www.visualcrossing.com/weather-api).
3. Start a local server (needed for geolocation to work):
   ```bash
   python3 -m http.server 8000
   ```
   then open http://localhost:8000
4. Paste your API key in the **API key** box and press Save. The key is stored only in your browser's localStorage and is never committed to the repository.

## Project structure

```
index.html   # page structure
style.css    # styles and animations
script.js    # API calls and rendering
```

## Notes

Since this is a front-end only app, the API key lives in the browser. Do not hardcode your key in the source code.

## Credits

Weather data by [Visual Crossing](https://www.visualcrossing.com/).
