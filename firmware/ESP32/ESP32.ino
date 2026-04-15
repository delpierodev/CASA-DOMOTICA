#include <WiFi.h>
#include <HTTPClient.h>

// ===== WIFI =====
const char* ssid = "Pixel 7 pro";
const char* password = "123456789";

// ===== SERVIDOR NODE =====
const char* serverURL = "http://10.109.54.112:3000/getAccion";
const char* tempURL   = "http://10.109.54.112:3000/setTemp"; // NUEVO endpoint

// ===== SERIAL HACIA MEGA =====
HardwareSerial Mega(2);

String temperatura = "";
String humedad = "";

void setup() {
  Serial.begin(115200);

  // Comunicación con Mega
  Mega.begin(9600, SERIAL_8N1, 33, 32);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {

  // ===== RECIBIR TEMPERATURA DESDE ARDUINO =====
  if (Mega.available()) {

    String data = Mega.readStringUntil('\n');
    data.trim();

    int tIndex = data.indexOf("T:");
    int hIndex = data.indexOf(",H:");

    if (tIndex >= 0 && hIndex >= 0) {
      temperatura = data.substring(tIndex + 2, hIndex);
      humedad = data.substring(hIndex + 3);

      Serial.print("Temperatura recibida: ");
      Serial.println(temperatura);

      Serial.print("Humedad recibida: ");
      Serial.println(humedad);

      // Enviar al servidor
      if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = String(tempURL) + "?temp=" + temperatura + "&hum=" + humedad;
        http.begin(url);
        http.GET();
        http.end();
      }
    }
  }

  // ===== CONSULTAR COMANDOS =====
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;
    http.begin(serverURL);

    int httpCode = http.GET();

    if (httpCode > 0) {

      String respuesta = http.getString();
      respuesta.trim();

      if (respuesta.length() == 1) {
        char comando = respuesta.charAt(0);

        Serial.print("Comando recibido: ");
        Serial.println(comando);

        Mega.write(comando);
      }
    }

    http.end();
  }

  delay(500);
}