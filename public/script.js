const dispositivos = [
  { nombre: "LAVANDERIA", id: "A", icon: "L" },
  { nombre: "BANO CUARTO", id: "B", icon: "B" },
  { nombre: "COCINA", id: "C", icon: "C" },
  { nombre: "SALA", id: "D", icon: "S" },
  { nombre: "COCHERA", id: "E", icon: "G" },
  { nombre: "CUARTO", id: "F", icon: "R" },
  { nombre: "BANO VISITA", id: "G", icon: "V" }
];

const acciones = {
  A: "Lavanderia ON",
  a: "Lavanderia OFF",
  B: "Bano cuarto ON",
  b: "Bano cuarto OFF",
  C: "Cocina ON",
  c: "Cocina OFF",
  D: "Sala ON",
  d: "Sala OFF",
  E: "Cochera luz ON",
  e: "Cochera luz OFF",
  F: "Cuarto ON",
  f: "Cuarto OFF",
  G: "Bano visita ON",
  g: "Bano visita OFF",
  S: "Cochera ABRIR",
  s: "Cochera CERRAR",
  U: "Sensor ACTIVAR",
  u: "Sensor DESACTIVAR"
};

const grid = document.getElementById("dispositivos");
const ultimaEl = document.getElementById("ultima");
const toastEl = document.getElementById("toast");
const horaActualEl = document.getElementById("horaActual");
const camaraEstadoEl = document.getElementById("camaraEstado");
const camaraEl = document.getElementById("camara");
const camaraDetalleEl = document.getElementById("camaraDetalle");
const estadoSistemaEl = document.getElementById("estadoSistema");
const pendingCommands = new Set();
const cameraControl = {
  enabled: false,
  retries: 0,
  maxRetries: 2,
  timeoutMs: 4500,
  timeoutId: null,
  retryId: null,
  listenersBound: false
};

if(grid){
  dispositivos.forEach(d=>{
    grid.innerHTML += `
    <div class="card">
      <h3 class="device-title">
        <span>${d.icon} ${d.nombre}</span>
        <span class="device-state is-offline" id="status-${d.id}">offline</span>
      </h3>
      <div class="buttons">
        <button class="on" onclick="enviar('${d.id}')">ON</button>
        <button class="off" onclick="enviar('${d.id.toLowerCase()}')">OFF</button>
      </div>
      <p class="device-feedback" id="feedback-${d.id}">Sin acciones recientes.</p>
    </div>
    `;
  });
}

asignarDataCmdABotones();

function asignarDataCmdABotones() {
  const botones = document.querySelectorAll("button[onclick]");
  botones.forEach((btn) => {
    const onclickRaw = btn.getAttribute("onclick") || "";
    const match = onclickRaw.match(/enviar\('(.+?)'\)/);
    if (match) {
      btn.dataset.cmd = match[1];
    }
  });
}

function marcarEstadoSistema(online) {
  if (!estadoSistemaEl) return;
  estadoSistemaEl.textContent = online ? "conectado" : "desconectado";
  estadoSistemaEl.classList.toggle("status-online", online);
  estadoSistemaEl.classList.toggle("status-offline", !online);
}

function obtenerClaveFeedback(cmd) {
  if (!cmd) return "";
  return cmd.charAt(0).toUpperCase();
}

function escribirFeedbackDispositivo(cmd, mensaje, tipo) {
  const clave = obtenerClaveFeedback(cmd);
  const feedbackEl = document.getElementById(`feedback-${clave}`);
  if (!feedbackEl) return;

  feedbackEl.textContent = mensaje;
  feedbackEl.classList.remove("feedback-pending", "feedback-success", "feedback-error");
  if (tipo) {
    feedbackEl.classList.add(`feedback-${tipo}`);
  }
}

function bloquearBotonesComando(cmd, bloqueado) {
  const botones = document.querySelectorAll(`button[data-cmd='${cmd}']`);
  botones.forEach((btn) => {
    if (!btn.dataset.originalLabel) {
      btn.dataset.originalLabel = btn.textContent;
    }
    btn.disabled = bloqueado;
    btn.textContent = bloqueado ? "EJECUTANDO..." : btn.dataset.originalLabel;
  });
}

function actualizarEstadoDispositivo(cmd, estado) {
  const clave = obtenerClaveFeedback(cmd);
  const statusEl = document.getElementById(`status-${clave}`);
  if (!statusEl) return;

  statusEl.classList.remove("is-online", "is-offline", "is-pending");
  if (estado === "online") {
    statusEl.classList.add("is-online");
    statusEl.textContent = "online";
    return;
  }

  if (estado === "pending") {
    statusEl.classList.add("is-pending");
    statusEl.textContent = "sync";
    return;
  }

  statusEl.classList.add("is-offline");
  statusEl.textContent = "offline";
}

function mostrarToast(mensaje, esError = false) {
  if (!toastEl) return;
  toastEl.hidden = false;
  toastEl.textContent = mensaje;
  toastEl.classList.toggle("error", esError);

  clearTimeout(mostrarToast.timer);
  mostrarToast.timer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

async function enviar(cmd){
  if (pendingCommands.has(cmd)) return;

  pendingCommands.add(cmd);
  bloquearBotonesComando(cmd, true);
  escribirFeedbackDispositivo(cmd, "Ejecutando comando...", "pending");
  actualizarEstadoDispositivo(cmd, "pending");

  try {
    const res = await fetch('/accion',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({cmd})
    });

    if(!res.ok) throw new Error('No se pudo enviar el comando');

    const accion = acciones[cmd] || cmd;
    if (ultimaEl) {
      ultimaEl.innerText = accion;
    }

    marcarEstadoSistema(true);
    const hora = new Date().toLocaleTimeString();
    escribirFeedbackDispositivo(cmd, `OK ${hora}: ${accion}`, "success");
    actualizarEstadoDispositivo(cmd, "online");
    mostrarToast(`Comando ejecutado: ${accion}`);
  } catch (err) {
    marcarEstadoSistema(false);
    const hora = new Date().toLocaleTimeString();
    escribirFeedbackDispositivo(cmd, `ERROR ${hora}: no se pudo ejecutar`, "error");
    actualizarEstadoDispositivo(cmd, "offline");
    mostrarToast('Error enviando comando al servidor', true);
  } finally {
    setTimeout(() => {
      pendingCommands.delete(cmd);
      bloquearBotonesComando(cmd, false);
    }, 1200);
  }
}

const CAMARA_IP = "http://esp32cam.local:81/stream";

function setEstadoCamara(estado, detalle) {
  if (camaraEstadoEl) {
    camaraEstadoEl.textContent = estado;
    camaraEstadoEl.classList.remove("is-on", "is-warning");
    if (estado === "encendida") {
      camaraEstadoEl.classList.add("is-on");
    }
    if (estado === "reintentando" || estado === "conectando") {
      camaraEstadoEl.classList.add("is-warning");
    }
  }

  if (camaraDetalleEl) {
    camaraDetalleEl.textContent = detalle;
  }
}

function limpiarTimersCamara() {
  clearTimeout(cameraControl.timeoutId);
  clearTimeout(cameraControl.retryId);
}

function programarTimeoutCamara() {
  clearTimeout(cameraControl.timeoutId);
  cameraControl.timeoutId = setTimeout(() => {
    manejarFalloCamara("timeout de stream");
  }, cameraControl.timeoutMs);
}

function cargarStreamCamara() {
  if (!camaraEl || !cameraControl.enabled) return;
  camaraEl.src = `${CAMARA_IP}?t=${Date.now()}`;
  programarTimeoutCamara();
}

function manejarFalloCamara(motivo) {
  if (!camaraEl || !cameraControl.enabled) return;

  if (cameraControl.retries < cameraControl.maxRetries) {
    cameraControl.retries += 1;
    setEstadoCamara(
      "reintentando",
      `Intento ${cameraControl.retries}/${cameraControl.maxRetries} por ${motivo}.`
    );
    cameraControl.retryId = setTimeout(() => {
      camaraEl.src = "";
      cargarStreamCamara();
    }, 700);
    return;
  }

  camaraEl.src = "";
  setEstadoCamara("sin senal", "No se pudo conectar a la camara.");
  marcarEstadoSistema(false);
}

function asegurarEventosCamara() {
  if (!camaraEl || cameraControl.listenersBound) return;

  camaraEl.addEventListener("load", () => {
    if (!cameraControl.enabled) return;
    clearTimeout(cameraControl.timeoutId);
    cameraControl.retries = 0;
    setEstadoCamara("encendida", "Stream activo y estable.");
    marcarEstadoSistema(true);
  });

  camaraEl.addEventListener("error", () => {
    clearTimeout(cameraControl.timeoutId);
    manejarFalloCamara("error de red");
  });

  cameraControl.listenersBound = true;
}

function encenderCam(){
  if (!camaraEl) return;
  asegurarEventosCamara();
  limpiarTimersCamara();
  cameraControl.enabled = true;
  cameraControl.retries = 0;
  setEstadoCamara("conectando", "Estableciendo conexion con ESP32-CAM...");
  cargarStreamCamara();
}

function apagarCam(){
  if (!camaraEl) return;
  cameraControl.enabled = false;
  cameraControl.retries = 0;
  limpiarTimersCamara();
  camaraEl.src = "";
  setEstadoCamara("apagada", "Stream inactivo.");
}

async function actualizarTemp(){
  try {
    const res = await fetch('/getTemp');
    if (!res.ok) throw new Error("No se pudo leer temperatura");
    const data = await res.json();

    const tempEl = document.getElementById("temp");
    const humEl = document.getElementById("hum");
    if (tempEl) tempEl.innerText = data.temp;
    if (humEl) humEl.innerText = data.hum;
    marcarEstadoSistema(true);
  } catch (err) {
    const tempEl = document.getElementById("temp");
    const humEl = document.getElementById("hum");
    if (tempEl) tempEl.innerText = "--";
    if (humEl) humEl.innerText = "--";
    marcarEstadoSistema(false);
  }
}

function actualizarHora(){
  if(!horaActualEl) return;
  const ahora = new Date();
  horaActualEl.textContent = ahora.toLocaleTimeString();
}

setInterval(actualizarTemp,2000);
setInterval(actualizarHora,1000);

actualizarTemp();
actualizarHora();