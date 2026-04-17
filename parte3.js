// =============================================
// PARTE 3: CONTROL DESDE LA NUBE
// parte3.js - ThingSpeak/Blynk simulation
// =============================================

(function Part3() {
  let tempChart = null;
  let humChart = null;
  let sendInterval = null;
  let cloudConnected = true;
  let cloudPlatform = 'thingspeak'; // 'thingspeak' | 'blynk'

  // ── INIT ──────────────────────────────────
  function init() {
    initCharts();

    consoleLog('console-p3', 'Iniciando conexión con servidor en la nube...', 'info');
    setTimeout(() => {
      consoleLog('console-p3', 'WiFi conectado. SSID: ESP32_Net', 'ok');
      consoleLog('console-p3', `Conectando a ${getPlatformName()}...`, 'info');
      setTimeout(() => {
        consoleLog('console-p3', `${getPlatformName()} conectado. API Key activa.`, 'ok');
        consoleLog('console-p3', 'Canal de datos: field1=temp, field2=hum', 'data');
        startCloudLoop();
      }, 900);
    }, 700);

    // Controls
    document.getElementById('btn-cloud-toggle')?.addEventListener('click', toggleCloudLED);
    document.getElementById('btn-cloud-error')?.addEventListener('click', triggerCloudError);
    document.getElementById('btn-cloud-reconnect')?.addEventListener('click', reconnectCloud);
    document.getElementById('btn-p3-clear')?.addEventListener('click', () => {
      document.getElementById('console-p3').innerHTML = '';
      consoleLog('console-p3', 'Consola limpiada.', 'info');
    });
    document.getElementById('btn-platform-ts')?.addEventListener('click', () => setPlatform('thingspeak'));
    document.getElementById('btn-platform-bl')?.addEventListener('click', () => setPlatform('blynk'));

    // Sync LED from other parts
    document.addEventListener('ledChanged', (e) => {
      if (e.detail.source !== 'cloud') {
        updateLEDDisplay(e.detail.state);
        updateToggleBtn(e.detail.state);
      }
    });
  }

  // ── CHARTS ────────────────────────────────
  function initCharts() {
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1f35',
          borderColor: '#1a3a5c',
          borderWidth: 1,
          titleColor: '#7aa8cc',
          bodyColor: '#e8f4fd',
          titleFont: { family: 'Share Tech Mono', size: 10 },
          bodyFont: { family: 'Share Tech Mono', size: 12 },
        }
      },
      scales: {
        x: {
          ticks: { color: '#3d6b8a', font: { family: 'Share Tech Mono', size: 9 }, maxTicksLimit: 6 },
          grid: { color: 'rgba(26, 58, 92, 0.3)' },
          border: { color: 'rgba(26, 58, 92, 0.5)' }
        },
        y: {
          ticks: { color: '#3d6b8a', font: { family: 'Share Tech Mono', size: 9 } },
          grid: { color: 'rgba(26, 58, 92, 0.3)' },
          border: { color: 'rgba(26, 58, 92, 0.5)' }
        }
      }
    };

    const tempCtx = document.getElementById('chart-temp');
    if (tempCtx) {
      tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
          labels: IoTState.timeLabels.slice(),
          datasets: [{
            data: IoTState.tempHistory.slice(),
            borderColor: '#ff9500',
            backgroundColor: 'rgba(255, 149, 0, 0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#ff9500',
            borderWidth: 2,
          }]
        },
        options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 15, max: 45 } } }
      });
    }

    const humCtx = document.getElementById('chart-hum');
    if (humCtx) {
      humChart = new Chart(humCtx, {
        type: 'line',
        data: {
          labels: IoTState.timeLabels.slice(),
          datasets: [{
            data: IoTState.humHistory.slice(),
            borderColor: '#0a84ff',
            backgroundColor: 'rgba(10, 132, 255, 0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#0a84ff',
            borderWidth: 2,
          }]
        },
        options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 20, max: 100 } } }
      });
    }
  }

  // ── CLOUD LOOP ────────────────────────────
  function startCloudLoop() {
    sendData();
    sendInterval = setInterval(sendData, 15000);
  }

  async function sendData() {
    if (!cloudConnected) return;

    const temp = IoTState.temperature;
    const hum = IoTState.humidity;

    // Show sending state
    const statusEl = document.getElementById('cloud-status-text');
    if (statusEl) {
      statusEl.textContent = 'Enviando datos...';
      statusEl.className = 'status-indicator status-connecting';
      statusEl.innerHTML = '<div class="dot"></div> Enviando datos...';
    }

    consoleLog('console-p3', `Enviando → T:${temp}°C H:${hum}% LED:${IoTState.led ? 'ON' : 'OFF'}`, 'info');
    await simulateLatency(400, 900);

    // Update charts
    updateCharts(temp, hum);

    // Update dashboard values
    const p3Temp = document.getElementById('p3-temp');
    const p3Hum = document.getElementById('p3-hum');
    if (p3Temp) p3Temp.textContent = temp.toFixed(1);
    if (p3Hum) p3Hum.textContent = hum.toFixed(0);

    const p3Update = document.getElementById('p3-last-update');
    if (p3Update) p3Update.textContent = `Última sync: ${formatTime()}`;

    consoleLog('console-p3', `Respuesta ${getPlatformName()}: 200 OK`, 'ok');
    consoleLog('console-p3', `field1=${temp} field2=${hum} field3=${IoTState.led ? 1 : 0}`, 'data');

    // Show sent animation
    const beamEl = document.getElementById('cloud-beam');
    if (beamEl) {
      beamEl.style.animation = 'none';
      setTimeout(() => beamEl.style.animation = '', 10);
    }

    if (statusEl) {
      statusEl.className = 'status-indicator status-online';
      statusEl.innerHTML = '<div class="dot"></div> Conectado a la nube';
    }

    // Show sent badge
    const sentEl = document.getElementById('send-badge');
    if (sentEl) {
      sentEl.textContent = '✓ Datos enviados';
      sentEl.style.opacity = '1';
      setTimeout(() => sentEl.style.opacity = '0', 2000);
    }
  }

  function updateCharts(temp, hum) {
    if (tempChart && IoTState.timeLabels.length > 0) {
      tempChart.data.labels = IoTState.timeLabels.slice();
      tempChart.data.datasets[0].data = IoTState.tempHistory.slice();
      tempChart.update();
    }
    if (humChart && IoTState.timeLabels.length > 0) {
      humChart.data.labels = IoTState.timeLabels.slice();
      humChart.data.datasets[0].data = IoTState.humHistory.slice();
      humChart.update();
    }
  }

  // ── LED TOGGLE ────────────────────────────
  async function toggleCloudLED() {
    const newState = !IoTState.led;
    consoleLog('console-p3', `Enviando comando LED: ${newState ? 'ON' : 'OFF'}`, 'info');
    await simulateLatency(200, 600);
    consoleLog('console-p3', `ESP32 recibió comando. LED → ${newState ? 'ON' : 'OFF'}`, 'ok');
    IoTState.manualOverride = true;
    syncLED(newState, 'cloud');
    updateLEDDisplay(newState);
    updateToggleBtn(newState);
  }

  function updateLEDDisplay(state) {
    const ledEl = document.getElementById('p3-led');
    if (ledEl) ledEl.classList.toggle('on', state);
    const statusEl = document.getElementById('p3-led-status');
    if (statusEl) {
      statusEl.textContent = state ? 'ENCENDIDO' : 'APAGADO';
      statusEl.className = 'badge ' + (state ? 'badge-green' : 'badge-red');
    }
  }

  function updateToggleBtn(state) {
    const btn = document.getElementById('btn-cloud-toggle');
    if (btn) {
      btn.textContent = state ? '💡 Apagar LED' : '💡 Encender LED';
      btn.className = 'btn btn-lg ' + (state ? 'btn-danger' : 'btn-success');
    }
  }

  // ── PLATFORM SWITCH ───────────────────────
  function setPlatform(platform) {
    cloudPlatform = platform;
    document.getElementById('btn-platform-ts')?.classList.toggle('btn-primary', platform === 'thingspeak');
    document.getElementById('btn-platform-ts')?.classList.toggle('btn-ghost', platform !== 'thingspeak');
    document.getElementById('btn-platform-bl')?.classList.toggle('btn-primary', platform === 'blynk');
    document.getElementById('btn-platform-bl')?.classList.toggle('btn-ghost', platform !== 'blynk');

    const nameEl = document.getElementById('cloud-platform-name');
    if (nameEl) nameEl.textContent = getPlatformName();

    consoleLog('console-p3', `Plataforma cambiada a: ${getPlatformName()}`, 'info');
    consoleLog('console-p3', `Reconectando a ${getPlatformName()}...`, 'info');
    setTimeout(() => consoleLog('console-p3', `${getPlatformName()} conectado.`, 'ok'), 1200);
  }

  function getPlatformName() {
    return cloudPlatform === 'thingspeak' ? 'ThingSpeak' : 'Blynk IoT';
  }

  // ── CLOUD ERROR ───────────────────────────
  async function triggerCloudError() {
    if (sendInterval) clearInterval(sendInterval);
    cloudConnected = false;

    consoleLog('console-p3', 'ERROR: Timeout al conectar con servidor.', 'error');
    consoleLog('console-p3', 'Connection refused: 403 Forbidden', 'error');
    consoleLog('console-p3', 'Reintentando en 8s...', 'warn');

    const statusEl = document.getElementById('cloud-status-text');
    if (statusEl) {
      statusEl.className = 'status-indicator status-offline';
      statusEl.innerHTML = '<div class="dot"></div> Sin conexión';
    }

    setTimeout(() => {
      cloudConnected = true;
      consoleLog('console-p3', 'Conexión restablecida.', 'ok');
      if (statusEl) {
        statusEl.className = 'status-indicator status-online';
        statusEl.innerHTML = '<div class="dot"></div> Conectado a la nube';
      }
      startCloudLoop();
    }, 8000);
  }

  async function reconnectCloud() {
    consoleLog('console-p3', 'Reconexión manual iniciada...', 'info');
    cloudConnected = false;
    if (sendInterval) clearInterval(sendInterval);
    await simulateLatency(1000, 2000);
    cloudConnected = true;
    consoleLog('console-p3', 'Reconexión exitosa.', 'ok');
    startCloudLoop();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
