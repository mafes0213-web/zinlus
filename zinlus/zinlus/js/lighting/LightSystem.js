/**
 * ZINLUS - LightSystem
 * Sistema dinámico y optimizado de iluminación para el vacío negro.
 * 
 * Reglas de diseño y equilibrio de dificultad:
 * 1. SALIDA GARANTIZADA Y CONECTADA: Cada nivel tiene una secuencia contigua y alcanzable.
 * 2. SALIDA CAMUFLADA A DISTANCIA: Se integra visualmente como una luz normal hasta estar a < 5m.
 * 3. METAMORFOSIS POR PROXIMIDAD (< 5.0m): Florece en portal etéreo al llegar a su radio.
 * 4. SISTEMA DE ASISTENCIA Y PISTAS PROGRESIVAS: Si el jugador tarda en avanzar (>30s o desvíos),
 *    el siguiente nodo guía emite un susurro armónico y amplía su pulso para orientar sin revelar el mapa.
 * 5. MEMORIA DE RUTAS: Nodos visitados dejan un sutil anillo en el suelo para reconocer bucles.
 * 6. LIBERTAD DE RETORNO: Sin trampas que encierren; el jugador siempre puede retroceder y corregir.
 */

export class LightSystem {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
        this.exitBeacon = null;
        this.exitPosition = new THREE.Vector3(0, 0, 0);
        this.glowTexture = this.generateGlowTexture();

        // Luces puntuales activas en Three.js (pool optimizado para VR)
        this.pointLightPool = [];
        this.maxDynamicPointLights = 4;
        this.initPointLightPool();

        // Control de destellos blancos (Nivel 3)
        this.flashActive = false;
        this.flashTimer = 0;
        this.flashDuration = 2.5;
        this.flashProgress = 0;
        this.flashMesh = null;
        this.nextFlashInterval = 32;
        this.timeSinceLastFlash = 0;

        // Sistema de Pistas Progresivas y Asistencia (Garantiza que nadie quede atrapado)
        this.timeSinceLastProgress = 0;
        this.lastVisitedSequenceIndex = -1;
        this.hintLevel = 0; // 0: Normal, 1: Pista sutil (>30s), 2: Pista clara (>60s)
        this.hintSoundPlayed = false;
        this.nextTargetNode = null;

        // Luz ambiental base pura
        this.ambientLight = new THREE.AmbientLight(0x020202);
        this.scene.add(this.ambientLight);

        this.initFlashMesh();
    }

    generateGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    initPointLightPool() {
        for (let i = 0; i < this.maxDynamicPointLights; i++) {
            const pl = new THREE.PointLight(0xffffff, 0, 14, 2);
            pl.visible = false;
            this.scene.add(pl);
            this.pointLightPool.push(pl);
        }
    }

    initFlashMesh() {
        const geometry = new THREE.PlaneGeometry(10, 10);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        });
        this.flashMesh = new THREE.Mesh(geometry, material);
        this.flashMesh.position.set(0, 0, -0.5);
        this.flashMesh.visible = false;
    }

    attachFlashToCamera(camera) {
        if (this.flashMesh) {
            camera.add(this.flashMesh);
        }
    }

    clear() {
        this.lights.forEach(light => {
            if (light.coreMesh) this.scene.remove(light.coreMesh);
            if (light.haloSprite) this.scene.remove(light.haloSprite);
            if (light.visitedRing) this.scene.remove(light.visitedRing);
        });
        this.lights = [];

        if (this.exitBeacon) {
            this.scene.remove(this.exitBeacon.group);
            this.exitBeacon = null;
        }

        this.pointLightPool.forEach(pl => {
            pl.intensity = 0;
            pl.visible = false;
        });

        this.flashActive = false;
        if (this.flashMesh) {
            this.flashMesh.material.opacity = 0;
            this.flashMesh.visible = false;
        }

        // Reiniciar estado de pistas
        this.timeSinceLastProgress = 0;
        this.lastVisitedSequenceIndex = -1;
        this.hintLevel = 0;
        this.hintSoundPlayed = false;
        this.nextTargetNode = null;
    }

    /**
     * Añade una luz interactiva con soporte de memoria de recorrido
     */
    addLight(config) {
        const type = config.type || 'guide';
        const color = config.color !== undefined ? config.color : 
                      (type === 'guide' ? 0xdff5ff : (type === 'distractor' ? 0xffdf70 : 0x8899aa));
        
        // Núcleo de la luz
        const coreGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.set(config.x, config.y || 1.2, config.z);

        // Halo suave
        const haloMat = new THREE.SpriteMaterial({
            map: this.glowTexture,
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0,
            depthWrite: false
        });
        const haloSprite = new THREE.Sprite(haloMat);
        const baseScale = type === 'guide' ? 1.6 : (type === 'distractor' ? 1.7 : 1.2);
        haloSprite.scale.set(baseScale, baseScale, 1);
        haloSprite.position.copy(coreMesh.position);

        // Anillo sutil en el suelo para memoria de recorrido
        const ringGeo = new THREE.RingGeometry(0.35, 0.45, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const visitedRing = new THREE.Mesh(ringGeo, ringMat);
        visitedRing.rotation.x = -Math.PI / 2;
        visitedRing.position.set(config.x, 0.02, config.z);

        this.scene.add(coreMesh);
        this.scene.add(haloSprite);
        this.scene.add(visitedRing);

        const lightObj = {
            id: this.lights.length,
            type: type,
            color: color,
            baseColor: color,
            pos: coreMesh.position,
            coreMesh: coreMesh,
            haloSprite: haloSprite,
            visitedRing: visitedRing,
            baseScale: baseScale,
            sequenceIndex: config.sequenceIndex !== undefined ? config.sequenceIndex : 0,
            pulseSpeed: config.pulseSpeed || (type === 'guide' ? 1.8 : (type === 'distractor' ? 4.2 : 1.0)),
            flicker: !!config.flicker,
            flickerSeed: Math.random() * 100,
            disappearInterval: config.disappearInterval || 0,
            baseRevealDistance: config.revealDistance || (type === 'guide' ? 28 : 24),
            revealDistance: config.revealDistance || (type === 'guide' ? 28 : 24),
            currentAlpha: 0,
            targetAlpha: 0,
            isRevealed: type === 'ambient',
            visited: false,
            away: true
        };

        this.lights.push(lightObj);
        return lightObj;
    }

    /**
     * Configura la salida integrada: a distancia parece una luz normal y florece a < 5m
     */
    setupExitBeacon(x, y, z, color = 0xdff5ff) {
        this.exitPosition.set(x, y, z);

        const beaconGroup = new THREE.Group();
        beaconGroup.position.set(x, y, z);

        // 1. Núcleo base (idéntico a una luz estándar)
        const coreGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 1.2;
        beaconGroup.add(coreMesh);

        // 2. Halo inicial (idéntico a una luz estándar a distancia)
        const haloMat = new THREE.SpriteMaterial({
            map: this.glowTexture,
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0,
            depthWrite: false
        });
        const haloSprite = new THREE.Sprite(haloMat);
        haloSprite.scale.set(1.6, 1.6, 1);
        haloSprite.position.y = 1.2;
        beaconGroup.add(haloSprite);

        // 3. Columna etérea que florece solo por proximidad
        const pillarGeo = new THREE.CylinderGeometry(0.12, 0.2, 3.5, 16, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: 0x90f0ff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.y = 1.75;
        pillar.scale.set(0.001, 0.001, 0.001);
        beaconGroup.add(pillar);

        // 4. Anillos concéntricos que se despliegan únicamente al acercarse
        const rings = [];
        const ringRadii = [0.55, 1.0, 1.45];
        ringRadii.forEach((r, idx) => {
            const ringGeo = new THREE.RingGeometry(r - 0.03, r + 0.03, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xaaffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.y = 0.4 + idx * 0.6;
            ringMesh.scale.set(0.001, 0.001, 0.001);
            beaconGroup.add(ringMesh);
            rings.push({
                mesh: ringMesh,
                rotSpeed: 0.5 * (idx % 2 === 0 ? 1 : -1),
                baseY: ringMesh.position.y
            });
        });

        // 5. Luz puntual suave en el suelo
        const exitLight = new THREE.PointLight(0x70eeff, 0, 8, 2);
        exitLight.position.set(0, 1.2, 0);
        exitLight.visible = false;
        beaconGroup.add(exitLight);

        this.scene.add(beaconGroup);

        this.exitBeacon = {
            group: beaconGroup,
            coreMesh: coreMesh,
            haloSprite: haloSprite,
            pillar: pillar,
            rings: rings,
            light: exitLight,
            pulseTimer: 0,
            bloomFactor: 0,
            currentAlpha: 0,
            targetAlpha: 0,
            baseRevealDistance: 28,
            revealDistance: 28,
            discoveredAnnounced: false
        };
    }

    update(delta, playerPos, levelNumber, soundManager) {
        const time = performance.now() * 0.001;

        let closestDist = Infinity;
        let closestLightType = null;
        const lightsNearPlayer = [];

        // ==========================================
        // 1. SISTEMA DE ASISTENCIA Y PISTAS PROGRESIVAS
        // ==========================================
        this.timeSinceLastProgress += delta;

        // Pista Nivel 1: tras 30 segundos sin descubrir nuevo nodo
        if (this.timeSinceLastProgress > 30 && this.hintLevel === 0) {
            this.hintLevel = 1;
            this.hintSoundPlayed = false;
        } 
        // Pista Nivel 2: tras 60 segundos
        else if (this.timeSinceLastProgress > 60 && this.hintLevel === 1) {
            this.hintLevel = 2;
        }

        // Determinar el siguiente nodo guía objetivo
        const nextSequence = this.lastVisitedSequenceIndex + 1;
        this.nextTargetNode = this.lights.find(l => l.type === 'guide' && l.sequenceIndex === nextSequence) || null;

        // Sonido sutil de orientación hacia la pista
        if (this.hintLevel >= 1 && !this.hintSoundPlayed) {
            this.hintSoundPlayed = true;
            if (soundManager) soundManager.playHintChime();
        }

        // ==========================================
        // 2. ACTUALIZACIÓN DE LUCES Y MEMORIA DE RUTA
        // ==========================================
        for (let i = 0; i < this.lights.length; i++) {
            const l = this.lights[i];
            const dist = playerPos.distanceTo(l.pos);

            if (dist < closestDist) {
                closestDist = dist;
                closestLightType = l.type;
            }

            // Si es el nodo objetivo y hay pista activa, ampliar su alcance
            if (l === this.nextTargetNode && this.hintLevel >= 1) {
                l.revealDistance = l.baseRevealDistance + 12; // Se hace perceptible a mayor distancia
            } else {
                l.revealDistance = l.baseRevealDistance;
            }

            // Revelación progresiva
            if (dist < l.revealDistance) {
                l.isRevealed = true;
            }

            // SISTEMA DE MEMORIA DE RECORRIDO Y AVANCE DE SECUENCIA:
            if (dist < 3.8) {
                if (!l.visited) {
                    l.visited = true;
                    // El anillo de suelo se enciende con stardust
                    l.visitedRing.material.opacity = (this.hintLevel >= 2) ? 0.65 : 0.42;

                    // Si es una luz guía que avanza en el camino verdadero:
                    if (l.type === 'guide' && l.sequenceIndex > this.lastVisitedSequenceIndex) {
                        this.lastVisitedSequenceIndex = l.sequenceIndex;
                        this.timeSinceLastProgress = 0;
                        this.hintLevel = 0;
                        this.hintSoundPlayed = false;
                    }
                } else if (l.away) {
                    // El jugador volvió a un nodo que ya había explorado
                    l.away = false;
                    if (soundManager) {
                        soundManager.playRevisitEcho();
                    }
                }
            } else if (dist > 5.5) {
                l.away = true;
            }

            // Cálculo del pulso rítmico
            let pulse = 1.0;
            if (l.type === 'guide') {
                if (l === this.nextTargetNode && this.hintLevel >= 1) {
                    // Si es el siguiente nodo y hay pista activa, su respiración es más amplia y reconfortante
                    pulse = 0.8 + 0.4 * Math.sin(time * 2.2);
                } else {
                    pulse = 0.7 + 0.3 * Math.sin(time * l.pulseSpeed + l.sequenceIndex * 0.4);
                }
            } else if (l.type === 'distractor') {
                if (l.flicker) {
                    // Micro-parpadeo errático
                    const fVal = Math.sin(time * l.pulseSpeed + l.flickerSeed) + 
                                 0.5 * Math.sin(time * (l.pulseSpeed * 2.3));
                    pulse = fVal > 0.25 ? 0.88 : (fVal < -0.3 ? 0.18 : 0.55);
                } else {
                    pulse = 0.5 + 0.5 * Math.sin(time * l.pulseSpeed);
                }

                // En pista nivel 2, las distractoras atenúan su brillo para facilitar el descarte
                if (this.hintLevel >= 2) {
                    pulse *= 0.7;
                }
            } else {
                pulse = 0.3 + 0.15 * Math.sin(time * l.pulseSpeed + l.flickerSeed);
            }

            // Desaparición periódica en Nivel 3
            if (l.disappearInterval > 0) {
                const cycle = (time + l.flickerSeed) % l.disappearInterval;
                if (cycle > l.disappearInterval * 0.6) {
                    pulse *= Math.max(0, 1 - (cycle - l.disappearInterval * 0.6) * 2.5);
                }
            }

            // Suavizado del brillo
            if (l.isRevealed) {
                const proximityFactor = Math.min(1.0, 1.25 - (dist / l.revealDistance));
                l.targetAlpha = Math.max(0.08, proximityFactor) * pulse;
            } else {
                l.targetAlpha = 0;
            }

            l.currentAlpha += (l.targetAlpha - l.currentAlpha) * Math.min(1.0, delta * 3.5);

            l.coreMesh.material.opacity = Math.min(1.0, l.currentAlpha * 1.2);
            l.haloSprite.material.opacity = l.currentAlpha;

            const scale = l.baseScale * (0.85 + 0.25 * pulse);
            l.haloSprite.scale.set(scale, scale, 1);

            if (l.currentAlpha > 0.2 && dist < 14) {
                lightsNearPlayer.push({ light: l, dist: dist });
            }
        }

        // 3. Audio de proximidad
        if (soundManager) {
            const proximityNormalized = Math.max(0, 1 - (closestDist / 7.5));
            soundManager.updateLightProximitySound(closestLightType, proximityNormalized);
        }

        // 4. Pool dinámico de PointLights en suelo
        lightsNearPlayer.sort((a, b) => a.dist - b.dist);
        for (let i = 0; i < this.maxDynamicPointLights; i++) {
            const pl = this.pointLightPool[i];
            if (i < lightsNearPlayer.length) {
                const item = lightsNearPlayer[i].light;
                pl.position.copy(item.pos);
                pl.color.setHex(item.color);
                pl.intensity = item.currentAlpha * 0.75;
                pl.visible = true;
            } else {
                pl.intensity = 0;
                pl.visible = false;
            }
        }

        // ==========================================
        // 5. SALIDA: METAMORFOSIS POR PROXIMIDAD
        // ==========================================
        if (this.exitBeacon) {
            const distToExit = playerPos.distanceTo(this.exitPosition);
            this.exitBeacon.pulseTimer += delta;
            const t = this.exitBeacon.pulseTimer;

            // Si todos los nodos guía fueron visitados y hay pista activa, ampliar alcance
            if (!this.nextTargetNode && this.hintLevel >= 1) {
                this.exitBeacon.revealDistance = this.exitBeacon.baseRevealDistance + 12;
            } else {
                this.exitBeacon.revealDistance = this.exitBeacon.baseRevealDistance;
            }

            // Revelación a distancia como luz normal
            if (distToExit < this.exitBeacon.revealDistance) {
                const proximityFactor = Math.min(1.0, 1.2 - (distToExit / this.exitBeacon.revealDistance));
                const normalPulse = 0.7 + 0.3 * Math.sin(t * 1.8);
                this.exitBeacon.targetAlpha = Math.max(0.08, proximityFactor) * normalPulse;
            } else {
                this.exitBeacon.targetAlpha = 0;
            }
            this.exitBeacon.currentAlpha += (this.exitBeacon.targetAlpha - this.exitBeacon.currentAlpha) * Math.min(1.0, delta * 3.5);

            // Factor de floración (Bloom): Únicamente cuando distToExit <= 5.0m
            let targetBloom = 0;
            if (distToExit <= 5.0) {
                targetBloom = Math.max(0, Math.min(1.0, (5.0 - distToExit) / 2.5));
                if (!this.exitBeacon.discoveredAnnounced && targetBloom > 0.05) {
                    this.exitBeacon.discoveredAnnounced = true;
                    if (soundManager) soundManager.playExitDiscoveredChime();
                }
            } else {
                targetBloom = 0;
                this.exitBeacon.discoveredAnnounced = false;
            }

            this.exitBeacon.bloomFactor += (targetBloom - this.exitBeacon.bloomFactor) * Math.min(1.0, delta * 4.0);
            const bf = this.exitBeacon.bloomFactor;

            // Núcleo y halo básico
            this.exitBeacon.coreMesh.material.opacity = this.exitBeacon.currentAlpha;
            const exitScale = 1.6 + bf * 1.8;
            this.exitBeacon.haloSprite.scale.set(exitScale, exitScale, 1);
            this.exitBeacon.haloSprite.material.opacity = this.exitBeacon.currentAlpha * (0.8 + bf * 0.2);

            // Columna y anillos
            if (bf > 0.01) {
                this.exitBeacon.pillar.scale.set(bf, bf, bf);
                this.exitBeacon.pillar.material.opacity = bf * (0.35 + 0.25 * Math.sin(t * 2.5));

                this.exitBeacon.rings.forEach((r, idx) => {
                    r.mesh.scale.set(bf, bf, bf);
                    r.mesh.rotation.z += r.rotSpeed * delta;
                    r.mesh.position.y = r.baseY + Math.sin(t * 1.5 + idx) * 0.08 * bf;
                    r.mesh.material.opacity = bf * 0.65;
                });

                this.exitBeacon.light.visible = true;
                this.exitBeacon.light.intensity = bf * 1.0;
            } else {
                this.exitBeacon.pillar.scale.set(0.001, 0.001, 0.001);
                this.exitBeacon.pillar.material.opacity = 0;
                this.exitBeacon.rings.forEach(r => {
                    r.mesh.scale.set(0.001, 0.001, 0.001);
                    r.mesh.material.opacity = 0;
                });
                this.exitBeacon.light.visible = false;
                this.exitBeacon.light.intensity = 0;
            }

            // Sincronizar audio espacial de salida (solo activo a < 5.5m)
            if (soundManager) {
                soundManager.updateExitPortalPosition(
                    this.exitPosition.x,
                    this.exitPosition.y,
                    this.exitPosition.z,
                    distToExit
                );
            }
        }

        // 6. Destellos Blancos en Nivel 3
        if (levelNumber === 3) {
            this.updateFlashEffect(delta, soundManager);
        }
    }

    updateFlashEffect(delta, soundManager) {
        this.timeSinceLastFlash += delta;

        if (!this.flashActive && this.timeSinceLastFlash >= this.nextFlashInterval) {
            this.flashActive = true;
            this.flashProgress = 0;
            this.timeSinceLastFlash = 0;
            this.nextFlashInterval = 28 + Math.random() * 20;

            if (this.flashMesh) {
                this.flashMesh.visible = true;
            }
            if (soundManager) {
                soundManager.playFlashBlinderSound();
            }
        }

        if (this.flashActive) {
            this.flashProgress += delta;
            const t = this.flashProgress;

            let opacity = 0;
            if (t < 0.5) {
                opacity = (t / 0.5) * 0.95;
            } else if (t < 0.8) {
                opacity = 0.95;
            } else if (t < 2.4) {
                const decay = (t - 0.8) / 1.6;
                opacity = 0.95 * Math.pow(1 - decay, 2);
            } else {
                opacity = 0;
                this.flashActive = false;
                if (this.flashMesh) {
                    this.flashMesh.visible = false;
                }
            }

            if (this.flashMesh) {
                this.flashMesh.material.opacity = opacity;
            }
        }
    }

    checkExitReached(playerPos, radius = 2.0) {
        if (!this.exitBeacon) return false;
        const d = playerPos.distanceTo(this.exitPosition);
        return d <= radius;
    }
}
