"use strict";

const API_BASE_URL = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
const STORAGE_KEYS = { apiKey: "vc_api_key", unit: "atmos_unit", lastLocation: "atmos_last_location" };
const HOURS_IN_SECONDS = 60 * 60;

const elements = {
  body: document.body,
  searchForm: document.querySelector("#search-form"),
  locationInput: document.querySelector("#location-input"),
  refreshButton: document.querySelector("#refresh-button"),
  unitButton: document.querySelector("#unit-button"),
  useLocationButton: document.querySelector("#use-location-button"),
  apiSettings: document.querySelector("#api-settings"),
  apiForm: document.querySelector("#api-form"),
  apiKeyInput: document.querySelector("#api-key-input"),
  status: document.querySelector("#status"),
  currentWeather: document.querySelector("#current-weather"),
  placeName: document.querySelector("#place-name"),
  localDate: document.querySelector("#local-date"),
  weatherIcon: document.querySelector("#weather-icon"),
  temperature: document.querySelector("#temperature"),
  conditions: document.querySelector("#conditions"),
  feelsLike: document.querySelector("#feels-like"),
  windSpeed: document.querySelector("#wind-speed"),
  rainChance: document.querySelector("#rain-chance"),
  updatedAt: document.querySelector("#updated-at"),
  hourlySection: document.querySelector("#hourly-section"),
  hourlyForecast: document.querySelector("#hourly-forecast"),
};

const state = {
  location: null,
  unit: readStorage(STORAGE_KEYS.unit) || "metric",
  requestId: 0,
};

const WEATHER_ICONS = {
  "clear-day": "☀️", "clear-night": "🌙", "partly-cloudy-day": "⛅",
  "partly-cloudy-night": "☁️", cloudy: "☁️", rain: "🌧️", showers: "🌦️",
  "showers-day": "🌦️", "showers-night": "🌧️", snow: "❄️",
  "snow-showers-day": "🌨️", "snow-showers-night": "🌨️", fog: "🌫️",
  wind: "💨", thunder: "⛈️", "thunder-rain": "⛈️",
  "thunder-showers-day": "⛈️", "thunder-showers-night": "⛈️", hail: "🌨️",
};

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ }
}

function getApiKey() {
  return readStorage(STORAGE_KEYS.apiKey)?.trim() || "";
}

function setStatus(message = "", isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.innerHTML = isLoading ? "Loading…" : '<span aria-hidden="true">↻</span> Refresh';
}

function formatTemperature(value) {
  const unit = state.unit === "metric" ? "C" : "F";
  return `${Math.round(value)}°${unit}`;
}

function formatWind(value) {
  const unit = state.unit === "metric" ? "km/h" : "mph";
  return `${Math.round(value)} ${unit}`;
}

function weatherIcon(iconName) {
  return WEATHER_ICONS[iconName] || "🌡️";
}

function getWeatherTheme(iconName = "", conditions = "") {
  const description = `${iconName} ${conditions}`.toLowerCase();
  if (/snow|sleet|ice/.test(description)) return "snowy";
  if (/thunder|storm/.test(description)) return "stormy";
  if (/rain|shower|drizzle/.test(description)) return "rainy";
  if (/clear-night|partly-cloudy-night/.test(description) || /night/.test(description)) return "night";
  if (/clear-day|sunny/.test(description)) return "sunny";
  return "cloudy";
}

function applyWeatherTheme(iconName, conditions) {
  const themes = ["sunny", "cloudy", "rainy", "stormy", "snowy", "night"];
  elements.body.classList.remove(...themes.map((theme) => `weather-${theme}`));
  elements.body.classList.add(`weather-${getWeatherTheme(iconName, conditions)}`);
}

async function requestWeather(location) {
  const apiKey = getApiKey();
  if (!apiKey) {
    elements.apiSettings.open = true;
    throw new Error("Add your Visual Crossing API key in API key settings first.");
  }

  const query = new URLSearchParams({
    unitGroup: state.unit,
    include: "hours,current",
    key: apiKey,
    contentType: "json",
  });
  const url = `${API_BASE_URL}/${encodeURIComponent(location)}/yesterday/tomorrow?${query}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 400) throw new Error("Location not found. Try a different city or address.");
    if (response.status === 401 || response.status === 403) throw new Error("The API key is invalid or does not have access.");
    if (response.status === 429) throw new Error("The API request limit has been reached. Try again later.");
    throw new Error(`Weather request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

function getRollingHours(weatherData) {
  const now = weatherData.currentConditions?.datetimeEpoch ?? Math.floor(Date.now() / 1000);
  const start = now - 24 * HOURS_IN_SECONDS;
  const end = now + 24 * HOURS_IN_SECONDS;

  return (weatherData.days || [])
    .flatMap((day) => day.hours || [])
    .filter((hour) => hour.datetimeEpoch >= start && hour.datetimeEpoch <= end)
    .sort((a, b) => a.datetimeEpoch - b.datetimeEpoch)
    .map((hour) => ({
      ...hour,
      period: Math.abs(hour.datetimeEpoch - now) < 30 * 60 ? "now" : hour.datetimeEpoch < now ? "past" : "future",
    }));
}

function makeHourlyCard(hour, index) {
  const date = new Date(hour.datetimeEpoch * 1000);
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const card = document.createElement("article");
  card.className = `hour ${hour.period}`;
  card.style.animationDelay = `${Math.min(index * 15, 400)}ms`;
  card.setAttribute("aria-label", `${dayLabel} ${timeLabel}, ${formatTemperature(hour.temp)}, ${hour.conditions}`);

  const time = document.createElement("div");
  time.className = "h-time";
  time.textContent = hour.period === "now" ? "NOW" : `${dayLabel} ${timeLabel}`;

  const icon = document.createElement("div");
  icon.className = "h-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = weatherIcon(hour.icon);

  const temperature = document.createElement("div");
  temperature.className = "h-temp";
  temperature.textContent = formatTemperature(hour.temp);

  const rain = document.createElement("div");
  rain.className = "h-rain";
  rain.textContent = `Rain ${Math.round(hour.precipprob ?? 0)}%`;

  const wind = document.createElement("div");
  wind.className = "h-wind";
  wind.textContent = formatWind(hour.windspeed);

  card.append(time, icon, temperature, rain, wind);
  return card;
}

function renderHourlyForecast(weatherData) {
  const hours = getRollingHours(weatherData);
  const fragment = document.createDocumentFragment();
  hours.forEach((hour, index) => fragment.append(makeHourlyCard(hour, index)));
  elements.hourlyForecast.replaceChildren(fragment);
  elements.hourlySection.classList.toggle("hidden", hours.length === 0);

  const currentCard = elements.hourlyForecast.querySelector(".now");
  if (currentCard) currentCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function renderWeather(weatherData) {
  const current = weatherData.currentConditions || {};
  elements.placeName.textContent = weatherData.resolvedAddress || state.location;
  elements.localDate.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  elements.weatherIcon.textContent = weatherIcon(current.icon);
  elements.temperature.textContent = formatTemperature(current.temp);
  elements.conditions.textContent = current.conditions || "Conditions unavailable";
  elements.feelsLike.textContent = formatTemperature(current.feelslike ?? current.temp);
  elements.windSpeed.textContent = formatWind(current.windspeed ?? 0);
  elements.rainChance.textContent = `${Math.round(current.precipprob ?? 0)}%`;
  elements.updatedAt.textContent = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  applyWeatherTheme(current.icon, current.conditions);
  elements.currentWeather.classList.remove("hidden");
  renderHourlyForecast(weatherData);
}

async function loadWeather(location = state.location) {
  const cleanLocation = location?.trim();
  if (!cleanLocation) {
    setStatus("Enter a city or location to see the forecast.", true);
    return;
  }

  state.location = cleanLocation;
  state.requestId += 1;
  const requestId = state.requestId;
  elements.locationInput.value = cleanLocation;
  setLoading(true);
  setStatus(`Loading weather for ${cleanLocation}…`);

  try {
    const weatherData = await requestWeather(cleanLocation);
    if (requestId !== state.requestId) return;
    renderWeather(weatherData);
    writeStorage(STORAGE_KEYS.lastLocation, cleanLocation);
    setStatus("");
  } catch (error) {
    if (requestId === state.requestId) setStatus(error.message || "Unable to load weather. Please try again.", true);
  } finally {
    if (requestId === state.requestId) setLoading(false);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("Location access is not supported by this browser. Search for a city instead.", true);
    return;
  }
  if (!getApiKey()) {
    elements.apiSettings.open = true;
    setStatus("Add your Visual Crossing API key before using location.", true);
    return;
  }

  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather(`${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`),
    () => setStatus("Could not access your location. You can search for a city instead.", true),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
}

function updateUnitButton() {
  elements.unitButton.textContent = state.unit === "metric" ? "°C" : "°F";
  elements.unitButton.setAttribute("aria-label", state.unit === "metric" ? "Switch to Fahrenheit" : "Switch to Celsius");
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadWeather(elements.locationInput.value);
  });

  elements.refreshButton.addEventListener("click", () => {
    if (state.location) loadWeather(state.location);
    else setStatus("Search for a location first.", true);
  });

  elements.unitButton.addEventListener("click", () => {
    state.unit = state.unit === "metric" ? "us" : "metric";
    writeStorage(STORAGE_KEYS.unit, state.unit);
    updateUnitButton();
    if (state.location) loadWeather(state.location);
  });

  elements.apiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const apiKey = elements.apiKeyInput.value.trim();
    if (!apiKey) {
      setStatus("Paste your Visual Crossing API key first.", true);
      return;
    }
    writeStorage(STORAGE_KEYS.apiKey, apiKey);
    elements.apiKeyInput.value = "";
    elements.apiSettings.open = false;
    setStatus("API key saved in this browser.");
    const previousLocation = state.location || readStorage(STORAGE_KEYS.lastLocation);
    if (previousLocation) loadWeather(previousLocation);
  });

  elements.useLocationButton.addEventListener("click", useCurrentLocation);
}

function initialise() {
  bindEvents();
  updateUnitButton();
  const savedLocation = readStorage(STORAGE_KEYS.lastLocation);

  if (!getApiKey()) {
    elements.apiSettings.open = true;
    setStatus("Add your Visual Crossing API key, then search for a location.");
    return;
  }

  if (navigator.geolocation) {
    useCurrentLocation();
  } else if (savedLocation) {
    loadWeather(savedLocation);
  } else {
    setStatus("Search for a city to get started.");
  }
}

initialise();
