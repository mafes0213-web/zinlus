# ZINLUS - Videojuego de Suspenso Psicológico, Exploración y Percepción Visual

**ZINLUS** es un videojuego 3D interactivo y de Realidad Virtual (WebXR) desarrollado en una arquitectura unificada para:
1. **Computador personal (PC)** mediante Google Chrome (Pointer Lock API, WASD, Shift, tecla R de reinicio rápido y mouse look).
2. **Visor de Realidad Virtual Meta Quest 2** mediante Meta Horizon Browser y WebXR Device API (6DOF head tracking, thumbstick locomotion, snap turn con viñeta y panel flotante inmersivo 3D).

---

## 1. Salidas Garantizadas y Conectividad Continua

Cada nivel cuenta con una solución real, alcanzable y verificada matemáticamente:
- **Secuencia Ininterrumpida:** La distancia entre cualquier par de nodos guía consecutivos es siempre $\le 14$ metros (ampliamente dentro del rango de revelación de 28 metros).
- **Salida Conectada al Recorrido:** La salida se encuentra conectada a 8–11 metros del último nodo guía de la secuencia. Llegar al final de la ruta guía conduce forzosamente a la salida.
- **Camuflaje Total a Distancia:** La salida tiene el mismo tamaño (0.12), misma intensidad y mismo color que una luz estándar. No emite un brillo mayor ni es visible desde el otro extremo.
- **Sin Fugas Acústicas:** El portal no emite ningún sonido a larga distancia; su resonancia espacial solo se activa al estar en su cercanía inmediata (< 5.5 m).
- **Metamorfosis por Proximidad (< 5.0 m):** Únicamente cuando el jugador llega a menos de 5 metros de la coordenada exacta, el nodo florece suavemente: los anillos concéntricos se despliegan y giran, la columna de luz etérea se eleva, el suelo se ilumina y un chime armónico confirma el hallazgo.
- **Entrada al Portal (< 2.0 m):** Cruzar el umbral completa el nivel y avanza sin perder progreso.

---

## 2. Sistema de Asistencia y Pistas Progresivas

Para evitar que el jugador se quede atrapado si se desorienta o tarda en encontrar el siguiente paso:
- **Pista Nivel 1 (tras 30 segundos sin avanzar):**
  El siguiente nodo guía en la secuencia activa un **susurro armónico celestial** (`playHintChime`), su halo amplía su respiración serena y su distancia de percepción se incrementa a 40 metros para llamar suavemente la atención del jugador sin romper la oscuridad.
- **Pista Nivel 2 (tras 60 segundos sin avanzar):**
  Los nodos ya visitados refuerzan su anillo de *stardust* en el suelo para trazar una guía de retorno nítida hacia la ruta principal, y las luces distractoras atenúan su brillo un 30% para facilitar el discernimiento.
- **Reinicio Inmediato del Nivel:**
  Si el jugador desea volver a intentar la exploración desde el origen, puede presionar la tecla **[R]** o pulsar **REINICIAR NIVEL** en el menú de pausa sin perder el progreso general del juego.
- **Memoria de Rutas y Retorno Libre:**
  Todos los desvíos son abiertos: el jugador siempre puede dar la vuelta. Si una ruta entra en un bucle, los anillos del suelo y un eco sonoro advierten del terreno ya explorado.

---

## 3. Estructura y Progresión de los Tres Niveles

### Nivel 1: Desorientación (Dificultad: Moderada y Justa)
- **Mecánica:** Secuencia de 11 nodos guía en zigzag continuo (distancias de 10 a 13 metros).
- **Enseñanza:** Incluye 4 luces distractoras sutiles que enseñan a contrastar el pulso armónico continuo frente al parpadeo acelerado.
- **Salida:** En `(14, 0, -109)`, conectada a 11 metros del nodo 10.
- **Ambiente Sonoro:** Bosque nocturno sintetizado proceduralmente (viento pasa-bajos, grillos/insectos sintéticos y drone de baja frecuencia).

### Nivel 2: Confusión (Dificultad: Media-Alta)
- **Mecánica:** Secuencia de 11 nodos guía con 4 bifurcaciones principales.
- **Bucle Engañoso:** La bifurcación 2 curva en círculo y conecta con la bifurcación 1, activando los anillos de memoria de ruta.
- **Callejones Abiertos:** Permiten siempre girar y reincorporarse a la ruta principal guiado por el stardust del suelo.
- **Salida:** En `(21, 0, -116)`, conectada a 8.9 metros del nodo 10.
- **Ambiente Sonoro:** Ciudad nocturna tranquila (tráfico distante modulado, murmullos vocales filtrados y zumbido urbano).

### Nivel 3: Caos (Dificultad: Alta)
- **Mecánica:** Secuencia de 12 nodos guía continuos rodeados de estímulos superpuestos.
- **Luces Efímeras:** Distractoras violetas y naranjas que desaparecen y reaparecen cada 6 a 8.5 segundos.
- **Destellos Blancos:** Transiciones suaves cada 28–48 segundos que saturan la visión momentáneamente y exigen retención espacial.
- **Salida:** En `(30, 0, -128)`, conectada a 9.4 metros del nodo 11.
- **Ambiente Sonoro:** Ciudad caótica (tráfico denso, múltiples bocinas superpuestas, sirenas y saturación).

---

## 4. Controles

### Computador (Google Chrome / Edge)
- **W / A / S / D** o **Flechas:** Desplazamiento.
- **Ratón:** Orientación de cámara (Pointer Lock).
- **Shift:** Marcha rápida (sprint).
- **R:** Reiniciar nivel actual inmediatamente sin perder progreso.
- **ESC:** Pausar y liberar el cursor.
- **F:** Activar/desactivar pantalla completa.

### Realidad Virtual (Meta Quest 2 con WebXR)
- **Joystick Izquierdo:** Desplazamiento continuo en la dirección de la mirada.
- **Joystick Derecho:** Snap-turn de 30° con viñeta anti-mareo.
- **Gatillo / Botón A:** Interactuar y avanzar de nivel en el panel 3D flotante.
- **Botón Menú:** Pausar o reiniciar el nivel directamente en VR.
- **Libertad 6DOF:** Mirada y movimiento libre en 360°.

---

## 5. Instrucciones de Ejecución Local

### Opción A (Windows con 1 clic):
Haz doble clic en `iniciar_zinlus.bat` en la carpeta `zinlus`.
Se abrirá automáticamente Google Chrome en: `http://localhost:8080`.

### Opción B (Consola con Node):
```bash
cd zinlus
node server.js
```
Abre en tu navegador: `http://localhost:8080`

### Probar en Meta Quest 2 localmente:
1. Conecta el visor a la misma red Wi-Fi de tu PC.
2. Identifica tu IP local (ej. `192.168.1.15`).
3. En **Meta Horizon Browser**, navega a `http://192.168.1.15:8080`.
4. Pulsa **MODO REALIDAD VIRTUAL (META QUEST 2)**.

---

## 6. Despliegue en Vercel con HTTPS (Recomendado para Meta Quest)

Vercel proporciona certificados SSL HTTPS de forma nativa e inmediata, lo cual es requisito indispensable para que la **WebXR Device API** funcione en el navegador de Meta Quest.

### Configuración en Vercel:
- **Framework Preset:** `Other`
- **Root Directory:** `./` (o `zinlus` si se selecciona la subcarpeta)
- **Build Command:** `node test_simulation.js` (o `npm run build`, valida automáticamente los 32 tests de simulación)
- **Output Directory:** `.` (directorio raíz con los archivos estáticos)
- **Install Command:** *(Dejar vacío o por defecto)*

### Pasos para desplegar:
#### Método 1: Mediante Vercel CLI (Línea de Comandos)
1. Abre tu terminal en la carpeta del proyecto:
   ```bash
   cd c:\Users\bolivar.LIBERTADORES\Downloads\zinlus
   ```
2. Ejecuta el comando de despliegue:
   ```bash
   npx vercel
   ```
3. Para publicar en producción:
   ```bash
   npx vercel --prod
   ```

#### Método 2: Mediante GitHub / GitLab / Bitbucket
1. Sube tu proyecto a un repositorio Git.
2. Ingresa a [Vercel Dashboard](https://vercel.com/dashboard) y haz clic en **"Add New..." -> "Project"**.
3. Importa el repositorio de ZINLUS.
4. Vercel detectará automáticamente `vercel.json` y `package.json`.
5. Haz clic en **"Deploy"**.

### Cabeceras de Seguridad y WebXR en Vercel (`vercel.json`):
El proyecto incluye un archivo `vercel.json` optimizado con las políticas de permisos requeridas por Meta Quest:
```json
{
  "version": 2,
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Permissions-Policy",
          "value": "xr-spatial-tracking=*, camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 7. Instrucciones para Meta Quest Browser

1. Ponte tus gafas Meta Quest (Meta Quest 2, Meta Quest 3 o Meta Quest Pro).
2. Abre la aplicación **Navegador** (Meta Quest / Horizon Browser).
3. Introduce la URL HTTPS de tu despliegue en Vercel (por ejemplo: `https://tu-proyecto.vercel.app`).
4. En el menú principal de ZINLUS, verás el badge **"Visor VR compatible detectado (Meta Quest listo)"**.
5. Haz clic en el botón destacado **«START HERE • MODO REALIDAD VIRTUAL»** utilizando el gatillo de tu mando.
6. Acepta el mensaje emergente del navegador para permitir la sesión inmersiva WebXR.
7. ¡Disfruta de la experiencia inmersiva 6DOF en el vacío absoluto!

---

## 8. Despliegue Alternativo en Netlify con HTTPS

1. Ingresa a [Netlify](https://app.netlify.com).
2. Selecciona **"Add new site" -> "Deploy manually"**.
3. Arrastra la carpeta del proyecto.
4. El archivo `netlify.toml` aplica automáticamente las cabeceras de `Permissions-Policy`.
5. Abre la URL HTTPS generada en Meta Quest Browser.

---

## 9. Registro de Pruebas de Playthrough Completo (32/32 Pasadas)

- [x] **Validación de conectividad Nivel 1:** Todos los saltos son $\le 13.6$ metros (conectividad continua verificada).
- [x] **Validación de conectividad Nivel 2:** Todos los saltos son $\le 14.1$ metros (conectividad continua verificada).
- [x] **Validación de conectividad Nivel 3:** Todos los saltos son $\le 14.1$ metros (conectividad continua verificada).
- [x] **Simulación completa Nivel 1:** Agente recorre del spawn a cada nodo guía y completa la salida en `(14, 0, -109)`.
- [x] **Simulación completa Nivel 2:** Agente recorre del spawn, sortea bifurcaciones y completa la salida en `(21, 0, -116)`.
- [x] **Simulación completa Nivel 3:** Agente recorre del spawn entre estímulos efímeros y completa la salida en `(30, 0, -128)`.
- [x] **Asistencia Nivel 1 (>30s):** Activación de susurro armónico y ampliación de rango del nodo objetivo a 40m.
- [x] **Asistencia Nivel 2 (>60s):** Atenuación del 30% en distractoras y refuerzo de stardust en nodos visitados.
- [x] **Reinicio de Nivel (tecla R):** Restablece el nivel actual sin reiniciar el progreso global.
- [x] **Transición a Victoria:** Completar los 3 niveles activa el estado de escape final `VICTORY`.
