const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');

const app = express();
const port = 3000;
const CAM_IP = "http://esp32cam.local";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'smart-home-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

let ultimaAccion = "";
let temperaturaActual = "--";
let humedadActual = "--";

function auth(req,res,next){
  if(req.session.user) return next();
  res.redirect('/login');
}

app.get('/login',(req,res)=>{
  res.sendFile(path.join(__dirname,'public/login.html'));
});

app.post('/login',(req,res)=>{
  const {username,password} = req.body;

  if(username === "admin" && password === "1234"){
    req.session.user = username;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout',(req,res)=>{
  req.session.destroy((err) => {
    if (err) {
      console.error("Error cerrando sesion:", err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html');
  });
});

app.get('/', auth, (req,res)=>{
  res.sendFile(path.join(__dirname,'public/dashboard.html'));
});

app.post('/accion',auth,(req,res)=>{
  const {cmd} = req.body;

  if(!cmd){
    return res.status(400).json({error:"Comando requerido"});
  }

  ultimaAccion = cmd;
  console.log("Comando recibido:", cmd);

  res.json({status:"OK"});
});

app.get('/getAccion',(req,res)=>{
  if(ultimaAccion !== ""){
    res.send(ultimaAccion);
    console.log("Comando enviado al ESP32:", ultimaAccion);
    ultimaAccion = "";
  } else {
    res.send("");
  }
});

app.get('/camara', auth, (req,res)=>{
  res.redirect(CAM_IP);
});

app.get('/setTemp',(req,res)=>{
  const { temp, hum } = req.query;

  if(temp && hum){
    temperaturaActual = temp;
    humedadActual = hum;

    console.log("Temperatura recibida:", temp, "Humedad:", hum);
  }

  res.send("OK");
});

app.get('/getTemp',(req,res)=>{
  res.json({
    temp: temperaturaActual,
    hum: humedadActual
  });
});

function obtenerIpsLocales() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const nombre of Object.keys(interfaces)) {
    for (const net of interfaces[nombre] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}

app.listen(port,'0.0.0.0',()=>{
  console.log("=================================");
  console.log("Bienvenido al Servidor de la Casa");
  console.log(`Local: http://localhost:${port}/`);

  const ips = obtenerIpsLocales();
  ips.forEach((ip) => {
    console.log(`Red:   http://${ip}:${port}/`);
  });

  console.log("=================================");
});
