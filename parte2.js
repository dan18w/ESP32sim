// =============================================
// PARTE 2: CONTROL POR BLUETOOTH
// parte2.js - BLE simulation
// =============================================

(function Part2() {
  const DEVICES = [
    { name: 'ESP32_Device', rssi: -42, mac: 'AA:BB:CC:DD:EE:FF' },
    { name: 'ESP32_BLE_2', rssi: -68, mac: '11:22:33:44:55:66' },
    { name: 'BT_Sensor_01', rssi: -75, mac: 'DE:AD:BE:EF:01:02' },
  ];

  let scanning = false;
  let connected = false;
  let connectedDevice = null;

  // ── INIT ──────────────────────────────────
  function init() {
    consoleLog('console-p2', 'Módulo Bluetooth BLE iniciado.', 'info');
    consoleLog('console-p2', 'Esperando acción del usuario...', 'info');

    document.getElementById('btn-bt-scan')?.addEventListener('click', startScan);
    document.getElementById('btn-bt-on')?.addEventListener('click', () => sendCommand('ON'));
    document.getElementById('btn-bt-off')?.addEventListener('click', () => sendCommand('OFF'));
    document.getElementById('btn-bt-disconnect')?.addEventListener('click', disconnectBT);
    document.getElementById('btn-p2-error')?.addEventListener('click', triggerBTError);
    document.getElementById('btn-p2-clear')?.addEventListener('click', () => {
      document.getElementById('console-p2').innerHTML = '';
      consoleLog('console-p2', 'Consola limpiada.', 'info');
    });

    updateControls();

    // Sync from other parts
    document.addEventListener('ledChanged', (e) => {
      if (e.detail.source !== 'bluetooth') {
        updateLEDDisplay(e.detail.state);
      }
    });
  }

  // ── SCAN ──────────────────────────────────
  async function startScan() {
    if (scanning || connected) return;
    scanning = true;

    const btn = document.getElementById('btn-bt-scan');
    if (btn) { btn.disabled = true; btn.textContent = 'Escaneando...'; }

    const rings = document.getElementById('bt-rings');
    if (rings) rings.classList.add('scanning');

    const listEl = document.getElementById('bt-device-list');
    if (listEl) listEl.innerHTML = '';

    consoleLog('console-p2', 'Iniciando escaneo BLE...', 'info');
    consoleLog('console-p2', 'Buscando dispositivos en 2.4 GHz...', 'info');

    // Show devices one by one
    for (let i = 0; i < DEVICES.length; i++) {
      await simulateLatency(600, 1200);
      const dev = DEVICES[i];
      consoleLog('console-p2', `Dispositivo encontrado: ${dev.name} [RSSI: ${dev.rssi} dBm]`, 'data');
      renderDevice(dev, i);
    }

    await simulateLatency(300, 500);
    consoleLog('console-p2', `Escaneo completo. ${DEVICES.length} dispositivos encontrados.`, 'ok');

    if (rings) rings.classList.remove('scanning');
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Escanear'; }
    scanning = false;
  }

  function renderDevice(dev, idx) {
    const listEl = document.getElementById('bt-device-list');
    if (!listEl) return;

    const item = document.createElement('div');
    item.className = 'device-item';
    item.id = `device-${idx}`;

    const bars = rssiToBars(dev.rssi);

    item.innerHTML = `
      <div>
        <div class="device-name">📡 ${dev.name}</div>
        <div class="device-rssi">${dev.mac} · ${dev.rssi} dBm · ${'▊'.repeat(bars)}${'▁'.repeat(4 - bars)}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="connectToDevice(${idx})">Conectar</button>
    `;
    listEl.appendChild(item);
  }

  function rssiToBars(rssi) {
    if (rssi > -50) return 4;
    if (rssi > -65) return 3;
    if (rssi > -75) return 2;
    return 1;
  }

  // ── CONNECT ───────────────────────────────
  window.connectToDevice = async function(idx) {
    if (connected) {
      consoleLog('console-p2', 'Ya existe una conexión activa.', 'warn');
      return;
    }
    const dev = DEVICES[idx];
    consoleLog('console-p2', `Iniciando conexión con ${dev.name}...`, 'info');

    const connStatus = document.getElementById('bt-conn-status');
    if (connStatus) {
      connStatus.className = 'status-indicator status-connecting';
      connStatus.innerHTML = '<div class="dot"></div> Conectando...';
    }

    // Highlight selected device
    document.querySelectorAll('.device-item').forEach(el => el.classList.remove('selected'));
    const devEl = document.getElementById(`device-${idx}`);
    if (devEl) devEl.style.opacity = '0.6';

    await simulateLatency(800, 1500);

    connected = true;
    connectedDevice = dev;
    IoTState.btConnected = true;

    consoleLog('console-p2', `Conectado a ${dev.name}`, 'ok');
    consoleLog('console-p2', 'Servicio UUID: 0000-ffe0-0000-1000', 'data');
    consoleLog('console-p2', 'Característica: 0000-ffe1-0000-1000', 'data');
    consoleLog('console-p2', 'Canal BLE listo para comandos.', 'ok');

    if (connStatus) {
      connStatus.className = 'status-indicator status-online';
      connStatus.innerHTML = `<div class="dot"></div> ${dev.name}`;
    }

    if (devEl) {
      devEl.classList.add('connected');
      devEl.style.opacity = '1';
      devEl.querySelector('button').textContent = '✓ Conectado';
      devEl.querySelector('button').disabled = true;
    }

    updateControls();
  };

  // ── SEND COMMAND ──────────────────────────
  async function sendCommand(cmd) {
    if (!connected) {
      consoleLog('console-p2', 'Sin conexión BLE. Conecta primero.', 'warn');
      return;
    }

    consoleLog('console-p2', `Enviando comando BLE: "${cmd}"`, 'info');
    await simulateLatency(100, 300);
    consoleLog('console-p2', `Comando recibido por ${connectedDevice.name}`, 'ok');

    const state = cmd === 'ON';
    IoTState.manualOverride = true;
    syncLED(state, 'bluetooth');
    updateLEDDisplay(state);

    consoleLog('console-p2', `LED ${state ? 'ENCENDIDO' : 'APAGADO'}. Estado actualizado.`, state ? 'warn' : 'ok');

    // Button visual feedback
    const btnOn = document.getElementById('btn-bt-on');
    const btnOff = document.getElementById('btn-bt-off');
    if (btnOn && btnOff) {
      btnOn.classList.toggle('btn-success', state);
      btnOn.classList.toggle('btn-ghost', !state);
      btnOff.classList.toggle('btn-danger', !state);
      btnOff.classList.toggle('btn-ghost', state);
    }
  }

  // ── DISCONNECT ────────────────────────────
  async function disconnectBT() {
    if (!connected) return;
    consoleLog('console-p2', `Desconectando de ${connectedDevice?.name}...`, 'warn');
    await simulateLatency(200, 500);

    connected = false;
    connectedDevice = null;
    IoTState.btConnected = false;

    consoleLog('console-p2', 'Bluetooth desconectado.', 'info');

    const connStatus = document.getElementById('bt-conn-status');
    if (connStatus) {
      connStatus.className = 'status-indicator status-offline';
      connStatus.innerHTML = '<div class="dot"></div> Desconectado';
    }

    document.querySelectorAll('.device-item').forEach(el => {
      el.classList.remove('connected');
      const btn = el.querySelector('button');
      if (btn) { btn.textContent = 'Conectar'; btn.disabled = false; }
    });

    updateControls();
  }

  // ── LED DISPLAY ───────────────────────────
  function updateLEDDisplay(state) {
    const ledEl = document.getElementById('p2-led');
    if (ledEl) ledEl.classList.toggle('on', state);
    const statusEl = document.getElementById('p2-led-status');
    if (statusEl) {
      statusEl.textContent = state ? 'ENCENDIDO' : 'APAGADO';
      statusEl.className = 'badge ' + (state ? 'badge-green' : 'badge-red');
    }
  }

  // ── CONTROLS STATE ─────────────────────────
  function updateControls() {
    const btnOn = document.getElementById('btn-bt-on');
    const btnOff = document.getElementById('btn-bt-off');
    const btnDisc = document.getElementById('btn-bt-disconnect');
    if (btnOn) btnOn.disabled = !connected;
    if (btnOff) btnOff.disabled = !connected;
    if (btnDisc) btnDisc.disabled = !connected;
  }

  // ── ERROR SIM ─────────────────────────────
  async function triggerBTError() {
    if (!connected) {
      consoleLog('console-p2', 'Simula primero una conexión BLE.', 'warn');
      return;
    }
    consoleLog('console-p2', 'ERROR: Conexión BLE interrumpida.', 'error');
    consoleLog('console-p2', 'GATT error: 133 (connection timeout)', 'error');
    await disconnectBT();
    setTimeout(() => consoleLog('console-p2', 'Módulo BLE reiniciado.', 'ok'), 2000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
