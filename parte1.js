// =============================================
// PARTE 1: SENSOR AMBIENTAL
// parte1.js - Client-side sensor simulation
// =============================================

(function Part1() {
  let updateInterval = null;
  let sensorFailed = false;

  // ── INIT ──────────────────────────────────
  function init() {
    consoleLog('console-p1', 'Sistema IoT iniciado...', 'info');
    consoleLog('console-p1', 'Conectando a red WiFi "ESP32_Net"...', 'info');

    setTimeout(() => {
      consoleLog('console-p1', 'WiFi conectado. IP: 192.168.1.42', 'ok');
      consoleLog('console-p1', 'Inicializando sensor DHT22 en GPIO4...', 'info');
      setTimeout(() => {
        consoleLog('console-p1', 'Sensor DHT22 listo.', 'ok');
        consoleLog('console-p1', `Modo: ${IoTState.mode.toUpperCase()}`, 'data');
        startUpdating();
      }, 700);
    }, 800);

    // Event listeners
    document.getElementById('btn-mode-real')?.addEventListener('click', () => setMode('real'));
    document.getElementById('btn-mode-sim')?.addEventListener('click', () => setMode('simulated'));
    document.getElementById('btn-p1-error')?.addEventListener('click', triggerSensorError);
    document.getElementById('btn-p1-disconnect')?.addEventListener('click', triggerDisconnect);
    document.getElementById('btn-p1-clear')?.addEventListener('click', () => {
      document.getElementById('console-p1').innerHTML = '';
      consoleLog('console-p1', 'Consola limpiada.', 'info');
    });

    // API key save (OpenWeatherMap)
    document.getElementById('btn-p1-save-api')?.addEventListener('click', saveApiKey);
    loadApiKeyUI();

    // React to LED changes from other parts
    document.addEventListener('ledChanged', (e) => {
      if (e.detail.source !== 'sensor') {
        updateLEDDisplay(e.detail.state);
      }
    });
  }

  // ── MODE ──────────────────────────────────
  function setMode(mode) {
    IoTState.mode = mode;
    IoTState.manualOverride = false;
    document.getElementById('btn-mode-real')?.classList.toggle('btn-primary', mode === 'real');
    document.getElementById('btn-mode-real')?.classList.toggle('btn-ghost', mode !== 'real');
    document.getElementById('btn-mode-sim')?.classList.toggle('btn-primary', mode === 'simulated');
    document.getElementById('btn-mode-sim')?.classList.toggle('btn-ghost', mode !== 'simulated');
    consoleLog('console-p1', `Modo cambiado a: ${mode.toUpperCase()}`, 'info');
    fetchAndUpdate();
  }

  // ── UPDATE LOOP ───────────────────────────
  function startUpdating() {
    fetchAndUpdate();
    updateInterval = setInterval(fetchAndUpdate, 15000);
  }

  async function fetchAndUpdate() {
    if (sensorFailed) return;

    const connEl = document.getElementById('p1-conn-status');
    if (connEl) {
      connEl.className = 'status-indicator status-connecting';
      connEl.innerHTML = '<div class="dot"></div> Actualizando...';
    }

    consoleLog('console-p1', 'Leyendo sensor DHT22...', 'info');

    let data;
    if (IoTState.mode === 'real') {
      await simulateLatency(300, 800);
      data = await fetchRealWeather();
      consoleLog('console-p1', `API OpenWeatherMap OK → T:${data.temp}°C H:${data.hum}%`, 'data');
    } else {
      await simulateLatency(100, 300);
      data = getSimulatedData();
      consoleLog('console-p1', `Simulación → T:${data.temp}°C H:${data.hum}%`, 'data');
    }

    IoTState.temperature = data.temp;
    IoTState.humidity = data.hum;
    IoTState.lastUpdate = new Date();
    addToHistory(data.temp, data.hum);

    updateDisplay(data.temp, data.hum);
    checkLEDByTemp(data.temp);

    const ledState = data.temp > 28;
    consoleLog('console-p1', `LED: ${ledState ? 'ENCENDIDO (temp > 28°C)' : 'APAGADO (temp ≤ 28°C)'}`, ledState ? 'warn' : 'ok');
    consoleLog('console-p1', 'Datos enviados al servidor.', 'ok');

    if (connEl) {
      connEl.className = 'status-indicator status-online';
      connEl.innerHTML = '<div class="dot"></div> WiFi Conectado';
    }
  }

  // ── DISPLAY UPDATE ─────────────────────────
  function updateDisplay(temp, hum) {
    const tempEl = document.getElementById('p1-temp');
    const humEl = document.getElementById('p1-hum');
    const tempBar = document.getElementById('p1-temp-bar');
    const humBar = document.getElementById('p1-hum-bar');
    const updateEl = document.getElementById('p1-last-update');

    if (tempEl) tempEl.textContent = temp.toFixed(1);
    if (humEl) humEl.textContent = hum.toFixed(0);
    if (tempBar) tempBar.style.width = `${Math.min((temp / 50) * 100, 100)}%`;
    if (humBar) humBar.style.width = `${Math.min(hum, 100)}%`;
    if (updateEl) updateEl.textContent = `Última actualización: ${formatTime()}`;

    // Color temp indicator
    if (tempEl) {
      tempEl.style.color = temp > 35 ? 'var(--accent-red)' :
                           temp > 28 ? 'var(--accent-orange)' :
                           'var(--accent-cyan)';
    }
  }

  function updateLEDDisplay(state) {
    const ledEl = document.getElementById('p1-led');
    if (ledEl) ledEl.classList.toggle('on', state);
  }

  // ── ERROR SIMULATION ──────────────────────
  function triggerSensorError() {
    sensorFailed = true;
    IoTState.sensorError = true;
    consoleLog('console-p1', 'ERROR: Fallo en lectura del sensor DHT22', 'error');
    consoleLog('console-p1', 'Timeout: no response from GPIO4', 'error');
    consoleLog('console-p1', 'Reintentando en 5s...', 'warn');

    const tempEl = document.getElementById('p1-temp');
    const humEl = document.getElementById('p1-hum');
    if (tempEl) tempEl.textContent = '--.-';
    if (humEl) humEl.textContent = '--';

    const connEl = document.getElementById('p1-conn-status');
    if (connEl) {
      connEl.className = 'status-indicator status-offline';
      connEl.innerHTML = '<div class="dot"></div> Error Sensor';
    }

    setTimeout(() => {
      sensorFailed = false;
      IoTState.sensorError = false;
      consoleLog('console-p1', 'Sensor recuperado. Reanudando lecturas...', 'ok');
      const c = document.getElementById('p1-conn-status');
      if (c) {
        c.className = 'status-indicator status-online';
        c.innerHTML = '<div class="dot"></div> WiFi Conectado';
      }
      fetchAndUpdate();
    }, 5000);
  }

  function triggerDisconnect() {
    if (updateInterval) clearInterval(updateInterval);
    IoTState.wifi = false;
    consoleLog('console-p1', 'WiFi desconectado. Señal perdida.', 'error');
    consoleLog('console-p1', 'Intentando reconectar...', 'warn');

    const connEl = document.getElementById('p1-conn-status');
    if (connEl) {
      connEl.className = 'status-indicator status-offline';
      connEl.innerHTML = '<div class="dot"></div> Desconectado';
    }

    setTimeout(() => {
      IoTState.wifi = true;
      consoleLog('console-p1', 'WiFi reconectado. IP: 192.168.1.42', 'ok');
      const c = document.getElementById('p1-conn-status');
      if (c) {
        c.className = 'status-indicator status-online';
        c.innerHTML = '<div class="dot"></div> WiFi Conectado';
      }
      startUpdating();
    }, 6000);
  }

  // ── API KEY UI ───────────────────────────
  function loadApiKeyUI() {
    const key = localStorage.getItem('OWM_API_KEY') || '';
    const input = document.getElementById('p1-api-key');
    const current = document.getElementById('p1-api-current');
    if (input) input.value = key;
    if (current) current.textContent = key ? '(personalizada)' : '(usar demo si está vacío)';
  }

  function saveApiKey() {
    const input = document.getElementById('p1-api-key');
    if (!input) return;
    const val = input.value.trim();
    if (val.length === 0) {
      localStorage.removeItem('OWM_API_KEY');
      consoleLog('console-p1', 'API key removida. Usando demo key.', 'warn');
    } else {
      localStorage.setItem('OWM_API_KEY', val);
      consoleLog('console-p1', 'API key guardada en localStorage.', 'ok');
    }
    loadApiKeyUI();
    // If running in real mode, force an immediate update using the new key
    if (IoTState.mode === 'real') fetchAndUpdate();
  }

  // ── BOOT ──────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
