/**
 * ZINLUS - SoundManager
 * Audio procedural y espacial con Web Audio API.
 * 
 * Implementa de forma 100% nativa (sin dependencias externas ni problemas de CORS):
 * - Nivel 1: Bosque nocturno (viento suave, insectos/grillos, resonancias nocturnas).
 * - Nivel 2: Ciudad nocturna tranquila (tráfico distante, murmullos urbanos lejanos, drone de ciudad).
 * - Nivel 3: Ciudad caótica (tráfico denso, bocinas lejanas, sirenas, saturación ambiental).
 * - SFX interactivos: pasos, zumbido armónico de luces guía, disonancia de distractoras, portal de salida y destellos.
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.ambientGain = null;
        this.sfxGain = null;
        this.isMuted = false;
        this.currentLevel = 0;
        
        // Volumen configurable (0.0 a 1.0)
        this.volumes = {
            master: 0.8,
            ambient: 0.7,
            sfx: 0.8
        };

        // Estado del ambiente
        this.ambientNodes = [];
        this.cricketInterval = null;
        this.urbanInterval = null;
        this.hornInterval = null;
        this.sirenNode = null;
        
        // SFX de pasos
        this.lastStepTime = 0;
        this.stepInterval = 500; // ms

        // Audio espacial para el portal de salida
        this.exitPanner = null;
        this.exitOscillators = [];
        this.exitGain = null;

        // Sonido de proximidad a luces
        this.lightToneOsc = null;
        this.lightToneGain = null;
        this.lastLightType = null;
        this.targetLightVolume = 0;

        this.initialized = false;
    }

    /**
     * Inicializa el AudioContext con interacción del usuario
     */
    init() {
        if (this.initialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('Web Audio API no está disponible en este navegador.');
            return;
        }

        this.ctx = new AudioContextClass();

        // Cadena de ganancia principal
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(this.volumes.ambient, this.ctx.currentTime);
        this.ambientGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Configurar sonido de proximidad continuo para luces
        this.setupLightProximitySynth();

        // Configurar sintetizador espacial del portal
        this.setupExitPortalSynth();

        this.initialized = true;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMasterVolume(val) {
        this.volumes.master = Math.max(0, Math.min(1, val));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.setTargetAtTime(this.volumes.master, this.ctx.currentTime, 0.05);
        }
    }

    setAmbientVolume(val) {
        this.volumes.ambient = Math.max(0, Math.min(1, val));
        if (this.ambientGain) {
            this.ambientGain.gain.setTargetAtTime(this.volumes.ambient, this.ctx.currentTime, 0.05);
        }
    }

    setSfxVolume(val) {
        this.volumes.sfx = Math.max(0, Math.min(1, val));
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, this.ctx.currentTime, 0.05);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volumes.master, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    // ==========================================
    // AMBIENTES SONOROS POR NIVEL
    // ==========================================

    playLevelAmbient(levelNumber) {
        this.init();
        this.stopCurrentAmbient();
        this.currentLevel = levelNumber;

        switch (levelNumber) {
            case 1:
                this.startLevel1Forest();
                break;
            case 2:
                this.startLevel2QuietCity();
                break;
            case 3:
                this.startLevel3ChaosCity();
                break;
            default:
                break;
        }
    }

    stopCurrentAmbient() {
        if (this.cricketInterval) clearInterval(this.cricketInterval);
        if (this.urbanInterval) clearInterval(this.urbanInterval);
        if (this.hornInterval) clearInterval(this.hornInterval);
        this.cricketInterval = null;
        this.urbanInterval = null;
        this.hornInterval = null;

        // Desvanecer nodos actuales suavemente
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.ambientNodes.forEach(node => {
            try {
                if (node.gain) {
                    node.gain.setTargetAtTime(0.0001, now, 0.4);
                    setTimeout(() => {
                        try { node.stop(); node.disconnect(); } catch (e) {}
                    }, 500);
                } else {
                    node.stop();
                    node.disconnect();
                }
            } catch (e) {}
        });
        this.ambientNodes = [];
    }

    // ------------------------------------------
    // NIVEL 1: BOSQUE NOCTURNO
    // Viento suave, insectos, sonidos naturales, incertidumbre
    // ------------------------------------------
    startLevel1Forest() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Viento nocturno suave: Ruido rosa filtrado pasa-bajos modulado por LFO
        const windNoise = this.createNoiseBufferNode(true); // Pinkish noise
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.setValueAtTime(260, now);

        // LFO para modular la frecuencia del viento (ráfagas sutiles)
        const windLFO = this.ctx.createOscillator();
        const windLFOGain = this.ctx.createGain();
        windLFO.frequency.setValueAtTime(0.12, now); // Ciclo lento de viento
        windLFOGain.gain.setValueAtTime(140, now);
        windLFO.connect(windLFOGain);
        windLFOGain.connect(windFilter.frequency);

        const windGain = this.ctx.createGain();
        windGain.gain.setValueAtTime(0.001, now);
        windGain.gain.setTargetAtTime(0.35, now, 1.5); // Fade in suave

        windNoise.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.ambientGain);

        windNoise.start();
        windLFO.start();
        this.ambientNodes.push(windNoise, windLFO, windGain);

        // 2. Drone nocturno profundo (suspenso e incertidumbre sutil)
        const droneOsc = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        droneOsc.type = 'sine';
        droneOsc.frequency.setValueAtTime(65.4, now); // C2

        droneGain.gain.setValueAtTime(0.001, now);
        droneGain.gain.setTargetAtTime(0.12, now, 2.0);

        droneOsc.connect(droneGain);
        droneGain.connect(this.ambientGain);
        droneOsc.start();
        this.ambientNodes.push(droneOsc, droneGain);

        // 3. Grillos e insectos nocturnos generados proceduralmente a intervalos aleatorios
        this.cricketInterval = setInterval(() => {
            if (Math.random() > 0.3) {
                this.triggerCricketChirp();
            }
        }, 1800);
    }

    triggerCricketChirp() {
        if (!this.ctx || this.currentLevel !== 1) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        // Frecuencia típica de grillo (~4500Hz a 5000Hz modulada)
        const baseFreq = 4600 + Math.random() * 600;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        // Modulación rápida de amplitud para los pulsos del grillo (cri-cri-cri)
        const pulses = 3 + Math.floor(Math.random() * 4);
        gain.gain.setValueAtTime(0, now);
        for (let i = 0; i < pulses; i++) {
            const t = now + i * 0.06;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.03, t + 0.02);
            gain.gain.linearRampToValueAtTime(0, t + 0.045);
        }

        if (panner) {
            panner.pan.setValueAtTime((Math.random() * 2) - 1, now);
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.ambientGain);
        } else {
            osc.connect(gain);
            gain.connect(this.ambientGain);
        }

        osc.start(now);
        osc.stop(now + pulses * 0.06 + 0.1);
    }

    // ------------------------------------------
    // NIVEL 2: CIUDAD NOCTURNA TRANQUILA
    // Tráfico distante, murmullos urbanos lejanos, atmósfera moderada
    // ------------------------------------------
    startLevel2QuietCity() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Tráfico distante: ruido grave filtrado con paneo y vaivén
        const trafficNoise = this.createNoiseBufferNode();
        const trafficFilter = this.ctx.createBiquadFilter();
        trafficFilter.type = 'lowpass';
        trafficFilter.frequency.setValueAtTime(120, now);

        const trafficLFO = this.ctx.createOscillator();
        const trafficLFOGain = this.ctx.createGain();
        trafficLFO.frequency.setValueAtTime(0.08, now);
        trafficLFOGain.gain.setValueAtTime(50, now);
        trafficLFO.connect(trafficLFOGain);
        trafficLFOGain.connect(trafficFilter.frequency);

        const trafficGain = this.ctx.createGain();
        trafficGain.gain.setValueAtTime(0.001, now);
        trafficGain.gain.setTargetAtTime(0.4, now, 1.5);

        trafficNoise.connect(trafficFilter);
        trafficFilter.connect(trafficGain);
        trafficGain.connect(this.ambientGain);

        trafficNoise.start();
        trafficLFO.start();
        this.ambientNodes.push(trafficNoise, trafficLFO, trafficGain);

        // 2. Drone de baja frecuencia de la ciudad (electricidad, aire)
        const cityHum1 = this.ctx.createOscillator();
        const cityHum2 = this.ctx.createOscillator();
        const humGain = this.ctx.createGain();
        cityHum1.type = 'sawtooth';
        cityHum1.frequency.setValueAtTime(58.0, now); // Frecuencia de red eléctrica baja
        cityHum2.type = 'sine';
        cityHum2.frequency.setValueAtTime(116.5, now);

        const humFilter = this.ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.setValueAtTime(180, now);

        humGain.gain.setValueAtTime(0.001, now);
        humGain.gain.setTargetAtTime(0.12, now, 2.0);

        cityHum1.connect(humFilter);
        cityHum2.connect(humFilter);
        humFilter.connect(humGain);
        humGain.connect(this.ambientGain);

        cityHum1.start();
        cityHum2.start();
        this.ambientNodes.push(cityHum1, cityHum2, humGain);

        // 3. Conversaciones lejanas y eventos urbanos esporádicos (murmullos sintéticos filtrados)
        this.urbanInterval = setInterval(() => {
            if (Math.random() > 0.4) {
                this.triggerDistantCityMumble();
            }
        }, 3000);
    }

    triggerDistantCityMumble() {
        if (!this.ctx || this.currentLevel !== 2) return;
        const now = this.ctx.currentTime;
        const duration = 1.2 + Math.random() * 1.5;

        // Simulamos un murmullo distante con ruido modulado a través de formantes de voz (500Hz - 1200Hz)
        const noise = this.createNoiseBufferNode();
        const formant = this.ctx.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(650 + Math.random() * 400, now);
        formant.Q.setValueAtTime(4.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + duration * 0.4);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) {
            panner.pan.setValueAtTime((Math.random() * 1.6) - 0.8, now);
            noise.connect(formant);
            formant.connect(gain);
            gain.connect(panner);
            panner.connect(this.ambientGain);
        } else {
            noise.connect(formant);
            formant.connect(gain);
            gain.connect(this.ambientGain);
        }

        noise.start(now);
        noise.stop(now + duration + 0.1);
    }

    // ------------------------------------------
    // NIVEL 3: CIUDAD CAÓTICA
    // Tráfico denso, bocinas lejanas, sirenas, murmullos superpuestos, saturación
    // ------------------------------------------
    startLevel3ChaosCity() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Tráfico pesado y continuo con siseo y rugido
        const heavyNoise = this.createNoiseBufferNode();
        const heavyFilter = this.ctx.createBiquadFilter();
        heavyFilter.type = 'bandpass';
        heavyFilter.frequency.setValueAtTime(180, now);
        heavyFilter.Q.setValueAtTime(1.2, now);

        const heavyGain = this.ctx.createGain();
        heavyGain.gain.setValueAtTime(0.001, now);
        heavyGain.gain.setTargetAtTime(0.55, now, 1.5);

        heavyNoise.connect(heavyFilter);
        heavyFilter.connect(heavyGain);
        heavyGain.connect(this.ambientGain);
        heavyNoise.start();
        this.ambientNodes.push(heavyNoise, heavyGain);

        // 2. Drone disonante de tensión urbana (crea suspenso y saturación)
        const tensOsc1 = this.ctx.createOscillator();
        const tensOsc2 = this.ctx.createOscillator();
        const tensGain = this.ctx.createGain();
        tensOsc1.type = 'sawtooth';
        tensOsc1.frequency.setValueAtTime(82.4, now); // E2
        tensOsc2.type = 'sawtooth';
        tensOsc2.frequency.setValueAtTime(87.3, now); // F2 (segunda menor, altamente tensa)

        const tensFilter = this.ctx.createBiquadFilter();
        tensFilter.type = 'lowpass';
        tensFilter.frequency.setValueAtTime(220, now);

        tensGain.gain.setValueAtTime(0.001, now);
        tensGain.gain.setTargetAtTime(0.18, now, 2.0);

        tensOsc1.connect(tensFilter);
        tensOsc2.connect(tensFilter);
        tensFilter.connect(tensGain);
        tensGain.connect(this.ambientGain);

        tensOsc1.start();
        tensOsc2.start();
        this.ambientNodes.push(tensOsc1, tensOsc2, tensGain);

        // 3. Sirena lejana ondulante que aparece y desaparece
        this.startDistantSiren();

        // 4. Bocinas y estímulos caóticos frecuentes
        this.hornInterval = setInterval(() => {
            if (Math.random() > 0.25) {
                this.triggerDistantCarHorn();
            }
        }, 2200);

        // Murmullos superpuestos
        this.urbanInterval = setInterval(() => {
            this.triggerDistantCityMumble();
        }, 1500);
    }

    startDistantSiren() {
        if (!this.ctx || this.currentLevel !== 3) return;
        const now = this.ctx.currentTime;

        const sirenOsc = this.ctx.createOscillator();
        const sirenFilter = this.ctx.createBiquadFilter();
        const sirenGain = this.ctx.createGain();
        const sirenLFO = this.ctx.createOscillator();
        const sirenLFOGain = this.ctx.createGain();

        sirenOsc.type = 'sawtooth';
        sirenOsc.frequency.setValueAtTime(680, now);

        // Ondulación de tono típica de sirena europea/urbana
        sirenLFO.frequency.setValueAtTime(0.35, now);
        sirenLFOGain.gain.setValueAtTime(140, now);
        sirenLFO.connect(sirenLFOGain);
        sirenLFOGain.connect(sirenOsc.frequency);

        // Filtro pasa-bajos para que suene distante
        sirenFilter.type = 'lowpass';
        sirenFilter.frequency.setValueAtTime(750, now);

        // Volumen tenue y fluctuante
        sirenGain.gain.setValueAtTime(0.001, now);
        sirenGain.gain.setTargetAtTime(0.07, now, 3.0);

        sirenOsc.connect(sirenFilter);
        sirenFilter.connect(sirenGain);
        sirenGain.connect(this.ambientGain);

        sirenOsc.start();
        sirenLFO.start();
        this.ambientNodes.push(sirenOsc, sirenLFO, sirenGain);
    }

    triggerDistantCarHorn() {
        if (!this.ctx || this.currentLevel !== 3) return;
        const now = this.ctx.currentTime;
        const duration = 0.35 + Math.random() * 0.5;

        // Bocina de dos tonos típicos (ej. 380Hz y 470Hz)
        const tone1 = this.ctx.createOscillator();
        const tone2 = this.ctx.createOscillator();
        const hornGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const baseF = 350 + Math.random() * 90;
        tone1.type = 'sawtooth';
        tone1.frequency.setValueAtTime(baseF, now);
        tone2.type = 'sawtooth';
        tone2.frequency.setValueAtTime(baseF * 1.25, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(baseF * 1.1, now);
        filter.Q.setValueAtTime(2.0, now);

        hornGain.gain.setValueAtTime(0.001, now);
        hornGain.gain.linearRampToValueAtTime(0.09, now + 0.05);
        hornGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) {
            panner.pan.setValueAtTime((Math.random() * 1.8) - 0.9, now);
            tone1.connect(filter);
            tone2.connect(filter);
            filter.connect(hornGain);
            hornGain.connect(panner);
            panner.connect(this.ambientGain);
        } else {
            tone1.connect(filter);
            tone2.connect(filter);
            filter.connect(hornGain);
            hornGain.connect(this.ambientGain);
        }

        tone1.start(now);
        tone2.start(now);
        tone1.stop(now + duration + 0.05);
        tone2.stop(now + duration + 0.05);
    }

    // ==========================================
    // SONIDO INTERACTIVO DE LUCES Y PROXIMIDAD
    // ==========================================

    setupLightProximitySynth() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Oscilador continuo para el zumbido de proximidad a las luces
        this.lightToneOsc = this.ctx.createOscillator();
        this.lightToneOsc2 = this.ctx.createOscillator();
        this.lightToneGain = this.ctx.createGain();
        this.lightToneFilter = this.ctx.createBiquadFilter();

        this.lightToneOsc.type = 'sine';
        this.lightToneOsc.frequency.setValueAtTime(440, now);
        this.lightToneOsc2.type = 'sine';
        this.lightToneOsc2.frequency.setValueAtTime(554.37, now); // Armónico (tercera mayor)

        this.lightToneFilter.type = 'lowpass';
        this.lightToneFilter.frequency.setValueAtTime(800, now);

        this.lightToneGain.gain.setValueAtTime(0, now);

        this.lightToneOsc.connect(this.lightToneFilter);
        this.lightToneOsc2.connect(this.lightToneFilter);
        this.lightToneFilter.connect(this.lightToneGain);
        this.lightToneGain.connect(this.sfxGain);

        this.lightToneOsc.start();
        this.lightToneOsc2.start();
    }

    /**
     * Actualiza el tono de la luz según la más cercana
     * @param {string} lightType 'guide' | 'distractor' | 'ambient' | null
     * @param {number} proximity 0 (lejos) a 1 (justo al lado)
     */
    updateLightProximitySound(lightType, proximity) {
        if (!this.ctx || !this.lightToneGain) return;
        const now = this.ctx.currentTime;

        if (!lightType || proximity <= 0.01) {
            this.lightToneGain.gain.setTargetAtTime(0, now, 0.1);
            return;
        }

        // Volumen sutil proporcional a la cercanía
        const maxVol = lightType === 'guide' ? 0.08 : 0.05;
        const targetVol = proximity * maxVol;
        this.lightToneGain.gain.setTargetAtTime(targetVol, now, 0.08);

        if (this.lastLightType !== lightType) {
            this.lastLightType = lightType;
            if (lightType === 'guide') {
                // Tono armónico puro y sereno (A4 y C#5, 440Hz y 554Hz)
                this.lightToneOsc.type = 'sine';
                this.lightToneOsc.frequency.setTargetAtTime(528, now, 0.1); // 528Hz armónico
                this.lightToneOsc2.frequency.setTargetAtTime(660, now, 0.1);
                this.lightToneFilter.frequency.setTargetAtTime(1200, now, 0.1);
            } else if (lightType === 'distractor') {
                // Tono disonante e inquietante (tritono o segunda menor, 440Hz y 466Hz)
                this.lightToneOsc.type = 'triangle';
                this.lightToneOsc.frequency.setTargetAtTime(370, now, 0.1);
                this.lightToneOsc2.frequency.setTargetAtTime(392, now, 0.1); // Tensión
                this.lightToneFilter.frequency.setTargetAtTime(600, now, 0.1);
            } else {
                // Luz ambiental
                this.lightToneOsc.type = 'sine';
                this.lightToneOsc.frequency.setTargetAtTime(220, now, 0.1);
                this.lightToneOsc2.frequency.setTargetAtTime(330, now, 0.1);
                this.lightToneFilter.frequency.setTargetAtTime(500, now, 0.1);
            }
        }
    }

    // ==========================================
    // PORTAL DE SALIDA (SEÑAL LUMINOSA)
    // ==========================================

    setupExitPortalSynth() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        this.exitPanner = this.ctx.createPanner ? this.ctx.createPanner() : null;
        if (this.exitPanner) {
            this.exitPanner.panningModel = 'HRTF';
            this.exitPanner.distanceModel = 'inverse';
            this.exitPanner.refDistance = 1.5;
            this.exitPanner.maxDistance = 7;
            this.exitPanner.rolloffFactor = 2.0;
        }

        this.exitGain = this.ctx.createGain();
        this.exitGain.gain.setValueAtTime(0, now);

        // Resonancia etérea tipo campana tibetana / sintetizador celestial
        const freqs = [216, 432, 648]; // Armónicos afinados
        this.exitOscillators = freqs.map((f, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            const subGain = this.ctx.createGain();
            subGain.gain.setValueAtTime(0.3 / (idx + 1), now);
            osc.connect(subGain);
            subGain.connect(this.exitGain);
            osc.start();
            return osc;
        });

        if (this.exitPanner) {
            this.exitGain.connect(this.exitPanner);
            this.exitPanner.connect(this.sfxGain);
        } else {
            this.exitGain.connect(this.sfxGain);
        }
    }

    updateExitPortalPosition(x, y, z, playerDist) {
        if (!this.ctx || !this.exitGain) return;
        const now = this.ctx.currentTime;

        if (this.exitPanner && this.exitPanner.positionX) {
            this.exitPanner.positionX.setTargetAtTime(x, now, 0.1);
            this.exitPanner.positionY.setTargetAtTime(y, now, 0.1);
            this.exitPanner.positionZ.setTargetAtTime(z, now, 0.1);
        }

        // CRÍTICO: La salida NUNCA debe escucharse a distancia.
        // Solo comienza a resonar cuando el jugador está en su proximidad inmediata (< 5.5m).
        if (playerDist !== undefined) {
            const maxRange = 5.5;
            if (playerDist < maxRange) {
                const intensity = Math.pow(1 - (playerDist / maxRange), 1.5);
                this.exitGain.gain.setTargetAtTime(intensity * 0.35, now, 0.1);
            } else {
                this.exitGain.gain.setTargetAtTime(0, now, 0.2);
            }
        }
    }

    /**
     * Eco sutil al regresar a un nodo ya visitado (Memoria de ruta)
     */
    playRevisitEcho() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now); // C4 tenue
        osc.frequency.exponentialRampToValueAtTime(196.00, now + 0.35); // G3

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.55);
    }

    /**
     * Chime al descubrir la metamorfosis de la salida a muy corta distancia (< 5m)
     */
    playExitDiscoveredChime() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [528, 660, 792, 1056];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.001, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.08 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.9);
        });
    }

    /**
     * Pista sonora sutil: susurro armónico cuando el jugador necesita orientación
     */
    playHintChime() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const chord = [440, 659.25]; // Intervalo de quinta pura (A4 - E5)
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.16);

            gain.gain.setValueAtTime(0.001, now + idx * 0.16);
            gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.16 + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 1.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.16);
            osc.stop(now + idx * 0.16 + 1.3);
        });
    }

    // ==========================================
    // SFX ADICIONALES (PASOS, DESTELLOS, VICTORIA)
    // ==========================================

    playFootstep() {
        if (!this.ctx) return;
        const now = Date.now();
        if (now - this.lastStepTime < this.stepInterval) return;
        this.lastStepTime = now;

        const audioNow = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Golpe sutil de paso amortiguado
        const baseFreq = 50 + Math.random() * 20;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, audioNow);
        osc.frequency.exponentialRampToValueAtTime(25, audioNow + 0.08);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, audioNow);

        gain.gain.setValueAtTime(0.04, audioNow);
        gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(audioNow);
        osc.stop(audioNow + 0.1);
    }

    playFlashBlinderSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Golpe de baja frecuencia y ruido blanco expansivo
        const noise = this.createNoiseBufferNode();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 1.5);

        // 2. Tinnitus muy sutil de desorientación (frecuencia alta pura desvaneciéndose)
        const ring = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(3200, now);

        ringGain.gain.setValueAtTime(0.03, now);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        ring.connect(ringGain);
        ringGain.connect(this.sfxGain);
        ring.start(now);
        ring.stop(now + 2.0);
    }

    playLevelCompleteSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Acorde triunfante etéreo (C4, E4, G4, C5 ascendente)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            gain.gain.setValueAtTime(0.001, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 2.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 2.5);
        });
    }

    playVictorySound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Acorde majestuoso y final de liberación
        const chord = [220, 277.18, 329.63, 440, 554.37, 659.25];
        chord.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 5.0);
        });
    }

    playUIClick() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // ==========================================
    // UTILIDADES DE GENERACIÓN DE RUIDO
    // ==========================================

    createNoiseBufferNode(isPink = false) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 segundos de buffer en loop
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (isPink) {
                // Algoritmo de Paul Kellet para aproximar Pink Noise
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            } else {
                data[i] = white * 0.3;
            }
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        return noiseNode;
    }
}
