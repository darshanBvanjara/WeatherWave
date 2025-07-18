// ----------------------------
//  CONFIGURATION
// ----------------------------
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const WORLD_CITIES = [
  'New York','London','Tokyo','Paris','Sydney',
  'Moscow','Rio de Janeiro','Cape Town','Mumbai',
  'Beijing','Mexico City','Dubai','Toronto','Singapore'
];

// ----------------------------
//  DOM REFERENCES
// ----------------------------
const D = {
  tempNow:    document.getElementById('temp-now'),
  location:   document.getElementById('location'),
  high:       document.getElementById('high-temp'),
  low:        document.getElementById('low-temp'),
  wind:       document.getElementById('wind'),
  humidity:   document.getElementById('humidity'),
  visibility: document.getElementById('visibility'),
  forecastCt: document.getElementById('forecast-container'),
  globalCt:   document.getElementById('global-container'),
  form:       document.querySelector('.search-bar'),
  input:      document.getElementById('search-input'),
};

// spinner HTML
const SPINNER = `<img src="assets/loading.svg" class="icon" alt="Loading…">`;

// ----------------------------
//  HELPERS
// ----------------------------
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Get coordinates for a city name
async function geocode(city) {
  const data = await fetchJSON(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`);
  if (!data.results || data.results.length === 0) {
    throw new Error('City not found');
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// ----------------------------
//  RENDER LOCAL WEATHER + FORECAST
// ----------------------------
async function showLocalWeather(cityName) {
  try {
    // show spinners
    [D.tempNow, D.high, D.low, D.wind, D.humidity, D.visibility].forEach(el => el.innerHTML = SPINNER);
    D.forecastCt.innerHTML = '';
    D.location.textContent = cityName;

    // 1) geocode
    const { latitude: lat, longitude: lon, name, country } = await geocode(cityName);
    D.location.textContent = `${name}, ${country}`;

    // 2) fetch forecast + current
    const fc = await fetchJSON(
      `${FORECAST_URL}` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto`
    );

    // populate current
    const cw = fc.current_weather;
    D.tempNow.textContent    = `${Math.round(cw.temperature)}°`;
    D.wind.textContent       = `${Math.round(cw.windspeed)} km/h`;
    // Open‑Meteo doesn’t give humidity or visibility in current; hide those:
    D.humidity.innerHTML     = 'n/a';
    D.visibility.innerHTML   = 'n/a';
    D.high.textContent       = `${Math.round(fc.daily.temperature_2m_max[0])}°`;
    D.low.textContent        = `${Math.round(fc.daily.temperature_2m_min[0])}°`;

    // 3) render 7‑day forecast
    const days = fc.daily;
    for (let i = 1; i <= 7; i++) {
      const date = new Date(days.time[i]);
      const wd = date.toLocaleDateString('en-US',{weekday:'short'});
      const card = document.createElement('div');
      card.className = 'day card';
      card.innerHTML = `
        <p>${wd}</p>
        <p><strong>${Math.round(days.temperature_2m_max[i])}°</strong>/${Math.round(days.temperature_2m_min[i])}°</p>
        <p>Rain: ${Math.round(days.precipitation_sum[i])} mm</p>
      `;
      D.forecastCt.appendChild(card);
    }

  } catch (err) {
    console.error(err);
    D.tempNow.textContent = '❌';
    D.forecastCt.innerHTML = `<p style="color:tomato">Error: ${err.message}</p>`;
  }
}

// ----------------------------
//  BUILD GLOBAL CITIES PANEL
// ----------------------------
async function buildGlobalCities() {
  D.globalCt.innerHTML = '';
  WORLD_CITIES.forEach(async city => {
    const card = document.createElement('div');
    card.className = 'city card';
    card.innerHTML = `<strong>${city}</strong><div class="icon small">${SPINNER}</div><div class="temps">--°</div>`;
    card.addEventListener('click', () => showLocalWeather(city));
    D.globalCt.appendChild(card);

    try {
      const { latitude: lat, longitude: lon } = await geocode(city);
      const fc = await fetchJSON(
        `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
        `&current_weather=true&timezone=auto`
      );
      card.querySelector('.icon').innerHTML = `<p>${Math.round(fc.current_weather.temperature)}°</p>`;
      card.querySelector('.temps').style.display = 'none';
    } catch {
      card.querySelector('.icon').textContent = '⚠️';
    }
  });
}

// ----------------------------
//  INIT
// ----------------------------
D.form.addEventListener('submit', e => {
  e.preventDefault();
  const city = D.input.value.trim();
  if (city) {
    showLocalWeather(city);
  }
  // **clear** and **remove focus** so the buffer ring goes away
  D.input.value = '';
  D.input.blur();
});


window.addEventListener('DOMContentLoaded', () => {
  showLocalWeather('New York');
  buildGlobalCities();
});
