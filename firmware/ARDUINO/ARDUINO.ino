#include <Servo.h>
#include "DHT.h"

// ===== LEDS =====
int leds[] = {22, 23, 24, 25, 26, 27, 28};
int total = 7;

// ===== DHT11 =====
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ===== SERVO =====
Servo servo;
const int SERVO_PIN = 9;
int abierto = 90;
int cerrado = 0;

// ===== ULTRASONIDO =====
const int TRIG = 7;
const int ECHO = 6;

// ===== PIR =====
const int PIR_PIN = 8;

// ===== SENSOR WEB =====
bool sensorActivo = false;

// ===== CONFIG ULTRASONIDO =====
unsigned long tiempoCierre = 5000;
float distanciaBase = 0;
int margenDeteccion = 25;

// ===== ESTADO PUERTA =====
bool puertaAbierta = false;
unsigned long sinPresenciaDesde = 0;

// ===== PIR CONTROL =====
unsigned long pirUltVisto = 0;
const unsigned long PIR_APAGADO = 5000;

// PRIORIDAD MANUAL
bool manualCocina = false;
bool manualSala = false;

float distanciaCM() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  unsigned long dur = pulseIn(ECHO, HIGH, 30000);
  if (dur == 0) return 999;
  return (dur * 0.0343f) / 2.0f;
}

float promedioDistancia(int n) {
  float suma = 0;
  int validas = 0;
  for (int i = 0; i < n; i++) {
    float d = distanciaCM();
    if (d > 2 && d < 300) { suma += d; validas++; }
    delay(20);
  }
  if (validas == 0) return 999;
  return suma / validas;
}

void abrirPuerta() {
  servo.write(abierto);
  puertaAbierta = true;
}

void cerrarPuerta() {
  servo.write(cerrado);
  puertaAbierta = false;
}

void setup() {
  Serial.begin(9600);    
  Serial1.begin(9600);   

  for (int i = 0; i < total; i++) {
    pinMode(leds[i], OUTPUT);
    digitalWrite(leds[i], LOW);
  }

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(PIR_PIN, INPUT);

  servo.attach(SERVO_PIN);
  cerrarPuerta();

  dht.begin();  // INICIAR DHT11
}

void loop() {

  // ===== COMANDOS DESDE ESP32 =====
  while (Serial1.available()) {
    char c = Serial1.read();

    if (c >= 'A' && c <= 'G') {
      digitalWrite(leds[c - 'A'], HIGH);
      if (c == 'C') manualCocina = true;
      if (c == 'D') manualSala = true;
    }

    else if (c >= 'a' && c <= 'g') {
      digitalWrite(leds[c - 'a'], LOW);
      if (c == 'c') manualCocina = false;
      if (c == 'd') manualSala = false;
    }

    else if (c == 'S') abrirPuerta();
    else if (c == 's') cerrarPuerta();

    else if (c == 'U') {
      sensorActivo = true;
      distanciaBase = promedioDistancia(10);
    }
    else if (c == 'u') {
      sensorActivo = false;
    }
  }

  // ===== ULTRASONIDO =====
  if (sensorActivo) {
    float dist = promedioDistancia(3);
    unsigned long ahora = millis();

    bool presencia = (dist <= (distanciaBase - margenDeteccion));

    if (presencia) {
      if (!puertaAbierta) abrirPuerta();
      sinPresenciaDesde = 0;
    }
    else if (puertaAbierta) {
      if (sinPresenciaDesde == 0) sinPresenciaDesde = ahora;
      if (ahora - sinPresenciaDesde >= tiempoCierre) {
        cerrarPuerta();
        sinPresenciaDesde = 0;
      }
    }
  }

  // ===== PIR + PRIORIDAD MANUAL =====
  unsigned long ahora = millis();
  bool pir = digitalRead(PIR_PIN);

  if (pir) {
    pirUltVisto = ahora;
    if (!manualCocina) digitalWrite(leds[2], HIGH);
    if (!manualSala) digitalWrite(leds[3], HIGH);
  }

  if (pirUltVisto != 0 && (ahora - pirUltVisto >= PIR_APAGADO)) {
    if (!manualCocina) digitalWrite(leds[2], LOW);
    if (!manualSala) digitalWrite(leds[3], LOW);
  }

  // ===== DHT11 =====
  static unsigned long ultimoDHT = 0;
  if (millis() - ultimoDHT >= 2000) {
    ultimoDHT = millis();

    float temperatura = dht.readTemperature();
    float humedad = dht.readHumidity();

    if (!isnan(temperatura) && !isnan(humedad)) {
      Serial1.print("T:");
      Serial1.print(temperatura);
      Serial1.print(",H:");
      Serial1.println(humedad);
    } else {
      Serial.println("Error leyendo DHT11");
    }
    
  }
}