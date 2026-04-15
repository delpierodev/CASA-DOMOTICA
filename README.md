# 🏠 Casa Domótica — Smart Home Dashboard

Panel de control web para automatización del hogar con Arduino, ESP32 y ESP32-CAM. Permite controlar luces, cochera, sensor de movimiento y visualizar la cámara en tiempo real desde cualquier dispositivo de la red local.

---

## 📸 Demo

> Abre `http://<tu-ip>:3000` desde cualquier dispositivo conectado a la misma red Wi-Fi.

---

## 🧱 Estructura del proyecto

```
casa-domotica/
├── server.js                  # Servidor Node.js + Express
├── package.json
├── README.md
│
├── public/                    # Frontend (servido estáticamente)
│   ├── dashboard.html         # Panel principal
│   ├── login.html             # Pantalla de acceso
│   ├── script.js              # Lógica del cliente
│   └── css/
│       ├── base.css           # Variables, reset, tipografía, botones
│       ├── login.css          # Estilos de la pantalla de login
│       ├── dashboard.css      # Sidebar, cards, cámara, ambientes, toast
│       └── responsive.css     # Media queries (tablet y móvil)
│
└── firmware/                  # Código para los microcontroladores
    ├── ARDUINO/
    │   └── ARDUINO.ino        # Controlador serial de relés y sensores
    ├── ESP32/
    │   └── ESP32.ino          # WiFi + comunicación con servidor
    └── ESP32CAM/
        └── ESP32CAM.ino       # Stream de video por HTTP
```

---

## ⚙️ Tecnologías

| Capa        | Tecnología                        |
|-------------|-----------------------------------|
| Backend     | Node.js, Express, express-session |
| Frontend    | HTML5, CSS3 (Cyber Blue theme), JS vanilla |
| Tipografía  | Orbitron + Rajdhani (Google Fonts) |
| Hardware    | Arduino Uno, ESP32, ESP32-CAM     |
| Protocolo   | HTTP REST (Serial ↔ ESP32 ↔ Servidor) |

---

## 🚀 Instalación

### 1. Requisitos
- [Node.js](https://nodejs.org) v18 o superior
- Arduino IDE para cargar el firmware

### 2. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/casa-domotica.git
cd casa-domotica
npm install
```

### 3. Iniciar el servidor

```bash
node server.js
```

Al arrancar verás en consola la URL local y de red:

```
=================================
Bienvenido al Servidor de la Casa
Local: http://localhost:3000/
Red:   http://192.168.x.x:3000/
=================================
```

### 4. Acceder al panel

Abre la URL de red en cualquier navegador. Credenciales por defecto:

| Usuario | Contraseña |
|---------|------------|
| admin   | 1234       |

> ⚠️ Cambia las credenciales antes de usar en producción.

---

## 📡 API del servidor

| Método | Ruta          | Descripción                          |
|--------|---------------|--------------------------------------|
| GET    | `/`           | Dashboard (requiere sesión)          |
| GET    | `/login`      | Pantalla de login                    |
| POST   | `/login`      | Autenticación                        |
| GET    | `/logout`     | Cerrar sesión                        |
| POST   | `/accion`     | Enviar comando a Arduino             |
| GET    | `/getAccion`  | ESP32 consume el próximo comando     |
| GET    | `/setTemp`    | ESP32 envía temperatura y humedad    |
| GET    | `/getTemp`    | Frontend obtiene temperatura         |

---

## 💡 Comandos disponibles

| Cmd | Acción              | Cmd | Acción              |
|-----|---------------------|-----|---------------------|
| `A` | Lavandería ON       | `a` | Lavandería OFF      |
| `B` | Baño cuarto ON      | `b` | Baño cuarto OFF     |
| `C` | Cocina ON           | `c` | Cocina OFF          |
| `D` | Sala ON             | `d` | Sala OFF            |
| `E` | Cochera luz ON      | `e` | Cochera luz OFF     |
| `F` | Cuarto ON           | `f` | Cuarto OFF          |
| `G` | Baño visita ON      | `g` | Baño visita OFF     |
| `S` | Cochera ABRIR       | `s` | Cochera CERRAR      |
| `U` | Sensor ACTIVAR      | `u` | Sensor DESACTIVAR   |

---

## 🔧 Firmware

Cada carpeta dentro de `firmware/` contiene el sketch de Arduino IDE correspondiente:

- **ARDUINO/** — Recibe comandos por serial y acciona relés/sensor
- **ESP32/** — Conecta a WiFi, consulta `/getAccion` y reenvía al Arduino, sube temperatura
- **ESP32CAM/** — Levanta servidor HTTP con stream de video MJPEG en puerto 81

### Configurar la IP del servidor en el firmware
En `ESP32/ESP32.ino` cambia la variable con la IP de tu PC:
```cpp
const char* serverUrl = "http://192.168.1.43:3000";
```

---

## 🔒 Seguridad

- Sesiones con `express-session` (cookie `connect.sid`)
- Todas las rutas del dashboard requieren autenticación
- Cambiar `secret` de sesión y credenciales antes de exponer a internet

---

## 📄 Licencia

MIT — libre para uso personal y proyectos educativos.
