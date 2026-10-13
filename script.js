const BASE_URL =
  "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("location-input"),
  refresh: document.getElementById("refresh-btn"),
  unitBtn: document.getElementById("unit-btn"),
  keyBox: document.getElementById("key-box"),
  keyInput: document.getElementById("api-key-input"),
  saveKey: document.getElementById("save-key-btn"),
  status: document.getElementById("status"),
  current: document.getElementById("current"),
  place: document.getElementById("place"),
  icon: document.getElementById("icon"),
  temp: document.getElementById("temp"),
  conditions: document.getElementById("conditions"),
  wind: document.getElementById("wind"),
  rain: document.getElementById("rain"),
  updated: document.getElementById("updated"),
  hourlySection: document.getElementById("hourly-section"),
  hourly: document.getElementById("hourly"),
};

const state = {
  location: null,
  unit: safeGet("unit") || "metric", // "metric" | "us"
};

const ICONS = {
  "clear-day": "☀️",
  "clear-night": "🌙",
  "partly-cloudy-day": "⛅",
  "partly-cloudy-night": "☁️",
  cloudy: "☁️",
  rain: "🌧️",
  showers: "🌦️",
  "showers-day": "🌦️",
  "showers-night": "🌧️",
  snow: "❄️",
  "snow-showers-day": "🌨️",
  "snow-showers-night": "🌨️",
  fog: "🌫️",
  wind: "💨",
  thunder: "⛈️",
  "thunder-rain": "⛈️",
  "thunder-showers-day": "⛈️",
  "thunder-showers-night": "⛈️",
  hail: "🌨️",
};

const icon = (name) => ICONS[name] || "🌡️";

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function updateUnitButton() {
  els.unitBtn.textContent = state.unit === "metric" ? "°C" : "°F";
}

async function fetchWeather(location) {
  const apiKey = safeGet("vc_api_key");
  if (!apiKey) {
    els.keyBox.open = true;
    throw new Error("Please add your Visual Crossing API key first.");
  }

  const url =
    `${BASE_URL}/${encodeURIComponent(location)}/yesterday/tomorrow` +
    `?unitGroup=${state.unit}&include=hours,current&key=${apiKey}&contentType=json`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400) throw new Error("Location not found. Try another name.");
    if (res.status === 401) throw new Error("Invalid API key.");
    if (res.status === 429) throw new Error("API limit reached. Try again later.");
    throw new Error(`Request failed (${res.status}).`);
  }
  return res.json();
}

// Collect hours from yesterday/today/tomorrow within [now - 24h, now + 24h]
function getHourWindow(data) {
  const nowSec = data.currentConditions?.datetimeEpoch ?? Math.floor(Date.now() / 1000);
  const from = nowSec - 24 * 3600;
  const to = nowSec + 24 * 3600;

  return data.days
    .flatMap((d) => d.hours || [])
    .filter((h) => h.datetimeEpoch >= from && h.datetimeEpoch <= to)
    .map((h) => ({
      ...h,
      status:
        Math.abs(h.datetimeEpoch - nowSec) < 1800
          ? "now"
          : h.datetimeEpoch < nowSec
          ? "past"
          : "future",
    }));
}

function formatTemp(t) {
  return `${Math.round(t)}°${state.unit === "metric" ? "C" : "F"}`;
}
function formatWind(w) {
  return `${Math.round(w)} ${state.unit === "metric" ? "km/h" : "mph"}`;
}

function restartAnimation(el) {
  el.classList.remove("fade-in");
  void el.offsetWidth; // reflow to retrigger
  el.classList.add("fade-in");
}

function render(data) {
  const cur = data.currentConditions;

  els.place.textContent = data.resolvedAddress;
  els.icon.textContent = icon(cur.icon);
  els.temp.textContent = formatTemp(cur.temp);
  els.conditions.textContent = cur.conditions;
  els.wind.textContent = formatWind(cur.windspeed);
  els.rain.textContent = `${Math.round(cur.precipprob ?? 0)}%`;
  els.updated.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  els.current.classList.remove("hidden");
  restartAnimation(els.current);

  const hours = getHourWindow(data);
  els.hourly.innerHTML = "";
  hours.forEach((h, i) => {
    const date = new Date(h.datetimeEpoch * 1000);
    const day = date.toLocaleDateString([], { weekday: "short" });
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const card = document.createElement("div");
    card.className = `hour ${h.status}`;
    card.style.animationDelay = `${Math.min(i * 20, 600)}ms`;
    card.innerHTML = `
      <div class="h-time">${day} ${time}</div>
      <div class="h-icon">${icon(h.icon)}</div>
      <div class="h-temp">${formatTemp(h.temp)}</div>
      <div class="h-rain">💧 ${Math.round(h.precipprob ?? 0)}%</div>
      <div>${formatWind(h.windspeed)}</div>
    `;
    els.hourly.appendChild(card);
  });

  els.hourlySection.classList.remove("hidden");

  const nowCard = els.hourly.querySelector(".now");
  if (nowCard) nowCard.scrollIntoView({ inline: "center", block: "nearest" });
}

async function loadWeather(location) {
  if (!location) return;
  state.location = location;
  document.body.classList.add("loading");
  setStatus("Loading weather…");
  try {
    const data = await fetchWeather(location);
    render(data);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  } finally {
    document.body.classList.remove("loading");
  }
}

// Events
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  loadWeather(els.input.value.trim());
});

els.refresh.addEventListener("click", () => {
  if (state.location) loadWeather(state.location);
  else setStatus("Search for a location first.", true);
});

els.unitBtn.addEventListener("click", () => {
  state.unit = state.unit === "metric" ? "us" : "metric";
  safeSet("unit", state.unit);
  updateUnitButton();
  if (state.location) loadWeather(state.location);
});

els.saveKey.addEventListener("click", () => {
  const key = els.keyInput.value.trim();
  if (!key) return;
  safeSet("vc_api_key", key);
  els.keyInput.value = "";
  els.keyBox.open = false;
  setStatus("API key saved.");
  if (state.location) loadWeather(state.location);
  else useCurrentLocation();
});

// Stretch goal: default to the user's current location
function useCurrentLocation() {
  if (!safeGet("vc_api_key") || !navigator.geolocation) return;
  setStatus("Detecting your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeather(`${latitude.toFixed(4)},${longitude.toFixed(4)}`);
    },
    () => setStatus("Enter a location to get started.")
  );
}

// Init
updateUnitButton();
if (!safeGet("vc_api_key")) {
  els.keyBox.open = true;
  setStatus("Add your API key to get started.");
} else {
  useCurrentLocation();
}
