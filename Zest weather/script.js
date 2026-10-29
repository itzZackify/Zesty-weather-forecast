
"use strict";

// ========================================
// ZEST WEATHER — WEATHER FORECAST APP
// ========================================

const API = {
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  forecast: "https://api.open-meteo.com/v1/forecast"
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  searchForm: $("#search-form"),
  searchInput: $("#city-input"),
  locationButton: $("#location-button"),
  status: $("#status"),
  city: $("#city-name"),
  date: $("#current-date"),
  temperature: $("#temperature"),
  description: $("#weather-description"),
  icon: $("#weather-icon"),
  feelsLike: $("#feels-like"),
  humidity: $("#humidity"),
  wind: $("#wind-speed"),
  precipitation: $("#precipitation"),
  hourly: $("#hourly-forecast"),
  daily: $("#daily-forecast"),
  refresh: $("#refresh-button"),
  unitToggle: $("#unit-toggle")
};

let currentLocation = {
  name: "Lagos",
  country: "Nigeria",
  latitude: 6.5244,
  longitude: 3.3792
};

let useFahrenheit = false;
let latestWeather = null;

// Weather condition codes from Open-Meteo
function getWeatherInfo(code) {
  if (code === 0) return { text: "Clear sky", icon: "☀️" };
  if (code === 1) return { text: "Mainly clear", icon: "🌤️" };
  if (code === 2) return { text: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { text: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code)) {
    return { text: "Foggy", icon: "🌫️" };
  }
  if ([51, 53, 55].includes(code)) {
    return { text: "Drizzle", icon: "🌦️" };
  }
  if ([56, 57].includes(code)) {
    return { text: "Freezing drizzle", icon: "🌧️" };
  }
  if ([61, 63, 65].includes(code)) {
    return { text: "Rain", icon: "🌧️" };
  }
  if ([66, 67].includes(code)) {
    return { text: "Freezing rain", icon: "🌧️" };
  }
  if ([71, 73, 75, 77].includes(code)) {
    return { text: "Snow", icon: "❄️" };
  }
  if ([80, 81, 82].includes(code)) {
    return { text: "Rain showers", icon: "🌦️" };
  }
  if ([85, 86].includes(code)) {
    return { text: "Snow showers", icon: "🌨️" };
  }
  if ([95, 96, 99].includes(code)) {
    return { text: "Thunderstorm", icon: "⛈️" };
  }

  return { text: "Weather unavailable", icon: "🌡️" };
}

// Display status messages
function setStatus(message, isError = false) {
  if (!elements.status) return;

  elements.status.textContent = message;
  elements.status.style.color = isError ? "#dc2626" : "";
}

// Convert Celsius to the selected unit
function temperature(value) {
  if (!Number.isFinite(value)) return "--°";

  const result = useFahrenheit
    ? (value * 9) / 5 + 32
    : value;

  return `${Math.round(result)}°${useFahrenheit ? "F" : "C"}`;
}

// Format dates safely
function formatDate(dateString, options = {}) {
  const date = new Date(dateString);

  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, options);
}

// Search for a city and retrieve its coordinates
async function searchCity(cityName) {
  const query = cityName.trim();

  if (!query) {
    setStatus("Please enter a city name.", true);
    return;
  }

  setStatus("Searching for your city...");

  try {
    const url = new URL(API.geocoding);

    url.search = new URLSearchParams({
      name: query,
      count: "10",
      language: "en",
      format: "json"
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not search for the city.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(
        "City not found. Check the spelling and try again."
      );
    }

    // Choose the most populated matching result when available.
    const place = [...data.results].sort(
      (a, b) => (b.population || 0) - (a.population || 0)
    )[0];

    currentLocation = {
      name: place.name,
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude
    };

    await loadWeather();
  } catch (error) {
    setStatus(error.message || "Something went wrong.", true);
  }
}

// Fetch the current weather and forecast
async function loadWeather() {
  setStatus("Loading live weather...");

  try {
    const url = new URL(API.forecast);

    url.search = new URLSearchParams({
      latitude: String(currentLocation.latitude),
      longitude: String(currentLocation.longitude),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "wind_speed_10m"
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "weather_code",
        "relative_humidity_2m",
        "wind_speed_10m"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "sunrise",
        "sunset"
      ].join(","),
      forecast_days: "7",
      timezone: "auto",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh"
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather service is unavailable.");
    }

    const data = await response.json();

    if (!data.current || !data.hourly || !data.daily) {
      throw new Error("The weather data is incomplete.");
    }

    latestWeather = data;

    renderCurrentWeather(data);
    renderHourlyForecast(data);
    renderDailyForecast(data);

    setStatus(
      `Weather updated for ${currentLocation.name}.`
    );
  } catch (error) {
    setStatus(
      error.message || "Unable to load weather. Try again.",
      true
    );
  }
}

// Render the current weather
function renderCurrentWeather(data) {
  const current = data.current;
  const info = getWeatherInfo(current.weather_code);

  if (elements.city) {
    elements.city.textContent =
      `${currentLocation.name}, ${currentLocation.country}`;
  }

  if (elements.date) {
    elements.date.textContent = new Date().toLocaleString(
      undefined,
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: data.timezone
      }
    );
  }

  if (elements.temperature) {
    elements.temperature.textContent =
      temperature(current.temperature_2m);
  }

  if (elements.description) {
    elements.description.textContent = info.text;
  }

  if (elements.icon) {
    elements.icon.textContent = info.icon;
    elements.icon.setAttribute("aria-label", info.text);
  }

  if (elements.feelsLike) {
    elements.feelsLike.textContent =
      temperature(current.apparent_temperature);
  }

  if (elements.humidity) {
    elements.humidity.textContent =
      `${current.relative_humidity_2m}%`;
  }

  if (elements.wind) {
    elements.wind.textContent =
      `${Math.round(current.wind_speed_10m)} km/h`;
  }

  if (elements.precipitation) {
    elements.precipitation.textContent =
      `${current.precipitation} mm`;
  }
}

// Render the next 24 hours
function renderHourlyForecast(data) {
  if (!elements.hourly) return;

  const hourly = data.hourly;
  const currentTime = data.current.time;
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((time) => time >= currentTime)
  );

  const fragment = document.createDocumentFragment();

  for (
    let i = startIndex;
    i < Math.min(startIndex + 24, hourly.time.length);
    i++
  ) {
    const info = getWeatherInfo(hourly.weather_code[i]);

    const card = document.createElement("article");
    card.className = "hourly-card";

    const time = document.createElement("p");
    time.textContent = new Date(
      hourly.time[i]
    ).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: data.timezone
    });

    const icon = document.createElement("span");
    icon.textContent = info.icon;
    icon.setAttribute("aria-label", info.text);

    const temp = document.createElement("strong");
    temp.textContent = temperature(hourly.temperature_2m[i]);

    const rain = document.createElement("p");
    rain.textContent =
      `Rain: ${hourly.precipitation_probability[i] ?? 0}%`;

    card.append(time, icon, temp, rain);
    fragment.appendChild(card);
  }

  elements.hourly.replaceChildren(fragment);
}

// Render the 7-day forecast
function renderDailyForecast(data) {
  if (!elements.daily) return;

  const daily = data.daily;
  const fragment = document.createDocumentFragment();

  daily.time.forEach((date, i) => {
    const info = getWeatherInfo(daily.weather_code[i]);

    const card = document.createElement("article");
    card.className = "daily-card";

    const day = document.createElement("h3");
    day.textContent =
      i === 0
        ? "Today"
        : formatDate(date, { weekday: "long" });

    const icon = document.createElement("span");
    icon.textContent = info.icon;

    const description = document.createElement("p");
    description.textContent = info.text;

    const highLow = document.createElement("p");
    highLow.textContent =
      `${temperature(daily.temperature_2m_max[i])} / ` +
      `${temperature(daily.temperature_2m_min[i])}`;

    const rain = document.createElement("p");
    rain.textContent =
      `Rain chance: ${daily.precipitation_probability_max[i] ?? 0}%`;

    const sunrise = document.createElement("p");
    sunrise.textContent =
      `Sunrise: ${new Date(daily.sunrise[i]).toLocaleTimeString(
        [],
        { hour: "numeric", minute: "2-digit", timeZone: data.timezone }
      )}`;

    const sunset = document.createElement("p");
    sunset.textContent =
      `Sunset: ${new Date(daily.sunset[i]).toLocaleTimeString(
        [],
        { hour: "numeric", minute: "2-digit", timeZone: data.timezone }
      )}`;

    card.append(
      day,
      icon,
      description,
      highLow,
      rain,
      sunrise,
      sunset
    );

    fragment.appendChild(card);
  });

  elements.daily.replaceChildren(fragment);
}

// Get weather using the browser's location permission
function getCurrentLocationWeather() {
  if (!navigator.geolocation) {
    setStatus(
      "Location is not supported by this browser.",
      true
    );
    return;
  }

  setStatus("Requesting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      currentLocation = {
        name: "Your location",
        country: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await loadWeather();
    },
    (error) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Search for a city instead."
          : "Could not get your location. Please search for a city.";

      setStatus(message, true);
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

// Switch between Celsius and Fahrenheit
function toggleTemperatureUnit() {
  useFahrenheit = !useFahrenheit;

  if (elements.unitToggle) {
    elements.unitToggle.textContent =
      useFahrenheit ? "Switch to °C" : "Switch to °F";
  }

  if (latestWeather) {
    renderCurrentWeather(latestWeather);
    renderHourlyForecast(latestWeather);
    renderDailyForecast(latestWeather);
  }
}

// Connect the controls
if (elements.searchForm) {
  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchCity(elements.searchInput.value);
  });
}

if (elements.locationButton) {
  elements.locationButton.addEventListener(
    "click",
    getCurrentLocationWeather
  );
}

if (elements.refresh) {
  elements.refresh.addEventListener("click", loadWeather);
}

if (elements.unitToggle) {
  elements.unitToggle.addEventListener(
    "click",
    toggleTemperatureUnit
  );
}

// Start with Lagos weather
loadWeather();


function getTimeIcon(weatherCode, isNight) {
  const weather = getWeatherInfo(weatherCode);

  // Show a moon at night when the sky is clear
  if (isNight && weatherCode === 0) {
    return "🌙";
  }

  // Show clouds and rain normally
  if (isNight && weatherCode >= 1 && weatherCode <= 3) {
    return "☁️";
  }

  return weather.icon;
}


const currentHour = new Date().getHours();
const isNight = currentHour < 6 || currentHour >= 18;

document.getElementById("weather-icon").textContent =
  getTimeIcon(data.current.weather_code, isNight);
