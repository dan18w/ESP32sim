// =============================================
// SISTEMA IoT INTELIGENTE CON ESP32
// Global State & Utilities - script.js
// =============================================

// ── GLOBAL STATE ──────────────────────────
const IoTState = {
  led: false,              // LED state shared across all parts
  temperature: 28.0,
  humidity: 65.0,
  mode: 'real',           // 'real' | 'simulated'
  wifi: true,
  btConnected: false,
  cloudConnected: true,
  sensorError: false,
  cloudError: false,
  lastUpdate: null,
  tempHistory: [],
  humHistory: [],
  timeLabels: [],
};

// ── WEATHER API ────────────────────────────
const WEATHER_API_KEY = ''; // demo key for Barranquilla
const WEATHER_CITY = 'Barranquilla';


// ── CONSOLE LOGGER ─────────────────────────
function consoleLog(consoleId, message, tag = 'info') {
  const console = document.getElementById(consoleId);
  if (!console) return;
  const line = document.createElement('div');
  line.className = 'console-line';
  const now = new Date();
  const time = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
  const tagLabels = { info: 'INFO', ok: 'OK', warn: 'WARN', error: 'ERR', data: 'DATA' };
  line.innerHTML = `
    <span class="console-time">${time}</span>
    <span class="console-tag tag-${tag}">${tagLabels[tag]}</span>
    <span class="console-msg">${message}</span>
  `;
  console.appendChild(line);
  console.scrollTop = console.scrollHeight;
}

// ── NAVIGATION ─────────────────────────────
function navigateTo(sectionId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  const navLink = document.querySelector(`[data-section="${sectionId}"]`);
  if (navLink) navLink.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── LED SYNC ────────────────────────────────
// Syncs LED state across all three parts
function syncLED(state, source = 'unknown') {
  IoTState.led = state;
  // Update all LED visuals
  document.querySelectorAll('.led-global').forEach(el => {
    el.classList.toggle('on', state);
  });
  // Update all LED status texts
  document.querySelectorAll('.led-status-text').forEach(el => {
    el.textContent = state ? 'ENCENDIDO' : 'APAGADO';
    el.className = 'led-status-text badge ' + (state ? 'badge-green' : 'badge-red');
  });
  // Dispatch custom event so each section can react
  document.dispatchEvent(new CustomEvent('ledChanged', { detail: { state, source } }));
}

// ── TEMPERATURE THRESHOLDS ─────────────────
function checkLEDByTemp(temp) {
  const shouldBeOn = temp > 28;
  if (IoTState.mode === 'real' || IoTState.mode === 'simulated') {
    // Only auto-control when not manually overridden from BT or cloud
    if (!IoTState.manualOverride) {
      syncLED(shouldBeOn, 'sensor');
    }
  }
}

// ── SIMULATED DATA ─────────────────────────
function getSimulatedData() {
  return {
    temp: parseFloat((20 + Math.random() * 20).toFixed(1)),
    hum: parseFloat((40 + Math.random() * 50).toFixed(1)),
  };
}

// ── FETCH REAL WEATHER ─────────────────────
async function fetchRealWeather() {
  try {
    // Prefer user-provided API key stored in localStorage
    const storedKey = localStorage.getItem('OWM_API_KEY');
    const key = storedKey && storedKey.trim().length > 0 ? storedKey.trim() : WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&units=metric&appid=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return {
      temp: parseFloat(data.main.temp.toFixed(1)),
      hum: parseFloat(data.main.humidity.toFixed(1)),
    };
  } catch (e) {
    // Fallback: Barranquilla avg values with slight random
    return {
      temp: parseFloat((29 + (Math.random() * 4 - 2)).toFixed(1)),
      hum: parseFloat((70 + (Math.random() * 10 - 5)).toFixed(1)),
    };
  }
}

// ── CHART HISTORY ──────────────────────────
function addToHistory(temp, hum) {
  const now = new Date();
  const label = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  IoTState.tempHistory.push(temp);
  IoTState.humHistory.push(hum);
  IoTState.timeLabels.push(label);
  if (IoTState.tempHistory.length > 20) {
    IoTState.tempHistory.shift();
    IoTState.humHistory.shift();
    IoTState.timeLabels.shift();
  }
}

// ── LATENCY SIMULATOR ──────────────────────
function simulateLatency(min = 200, max = 800) {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

// ── FORMAT TIME ────────────────────────────
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('es-CO', { hour12: false });
}

// ── CURRENT TIME STRING ─────────────────────
function nowStr() {
  return new Date().toLocaleTimeString('es-CO', { hour12: false });
}

// ── INIT NAV ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav click handlers
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.section);
    });
  });
  // Default: show home
  navigateTo('home');
});
