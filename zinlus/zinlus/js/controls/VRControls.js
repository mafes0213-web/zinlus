/**
 * ZINLUS - VRControls
 * Sistema integral de Realidad Virtual para Meta Quest 2 y WebXR.
 * 
 * - Reconocimiento de mandos Meta Quest 2 (Touch Controllers).
 * - Joystick izquierdo: Desplazamiento suave (locomoción relativa a orientación de cabeza).
 * - Joystick derecho: Giro suave o Snap-turn (30°/45° para confort).
 * - Detección de botones (A/X/Trigger/Menu) para pausa e interacción.
 * - Viñeta de confort dinámica para prevenir mareos en VR.
 * - Controlador de la plataforma/dolly para sincronización con Desktop.
 */

export class VRControls {
    constructor(renderer, scene, cameraRig, camera, onPauseToggleCallback) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameraRig = cameraRig;
        this.camera = camera;
        this.onPauseToggleCallback = onPauseToggleCallback;

        this.isVRActive = false;
        this.walkSpeed = 4.0;
        this.snapTurnAngle = Math.PI / 6; // 30 grados
        this.snapTurnCooldown = false;
        this.snapTurnCooldownTime = 0.3; // Segundos entre giros
        this.snapTimer = 0;

        // Modos de giro: 'snap' (recomendado para Quest) o 'smooth'
        this.turnMode = 'snap';
        this.smoothTurnSpeed = 2.0;

        // Deadzones de joysticks
        this.deadzone = 0.15;

        // Controladores WebXR de Three.js
        this.controller0 = null;
        this.controller1 = null;
        this.controllerGrip0 = null;
        this.controllerGrip1 = null;

        // Estado de botones para debounce
        this.lastButtonStates = {
            menu: false,
            aButton: false,
            triggerL: false,
            triggerR: false
        };

        // Viñeta de confort en VR
        this.comfortVignetteMesh = null;
        this.comfortEnabled = true;

        this.initControllers();
        this.initComfortVignette();
    }

    initControllers() {
        // Controlador 0 (habitualmente derecho o izquierdo según orden de conexión)
        this.controller0 = this.renderer.xr.getController(0);
        this.controller0.addEventListener('selectstart', () => this.onSelectStart(0));
        this.controller0.addEventListener('selectend', () => this.onSelectEnd(0));
        this.cameraRig.add(this.controller0);

        // Controlador 1
        this.controller1 = this.renderer.xr.getController(1);
        this.controller1.addEventListener('selectstart', () => this.onSelectStart(1));
        this.controller1.addEventListener('selectend', () => this.onSelectEnd(1));
        this.cameraRig.add(this.controller1);

        // Visualización sutil de mandos (rayos o puntos de orientación minimalistas)
        this.buildControllerRays();
    }

    buildControllerRays() {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1.5)
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.35
        });

        const ray0 = new THREE.Line(lineGeo, lineMat);
        const ray1 = new THREE.Line(lineGeo, lineMat.clone());
        this.controller0.add(ray0);
        this.controller1.add(ray1);
    }

    initComfortVignette() {
        // Anillo de viñeta para reducir campo visual durante giros/movimiento rápido
        const vigGeo = new THREE.RingGeometry(0.35, 1.5, 32);
        const vigMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        this.comfortVignetteMesh = new THREE.Mesh(vigGeo, vigMat);
        this.comfortVignetteMesh.position.set(0, 0, -0.6);
        this.comfortVignetteMesh.visible = false;
        this.camera.add(this.comfortVignetteMesh);
    }

    onSelectStart(controllerIdx) {
        // Interacción / click en VR
        if (this.onSelectCallback) {
            this.onSelectCallback(controllerIdx);
        }
    }

    onSelectEnd(controllerIdx) {}

    setSelectCallback(cb) {
        this.onSelectCallback = cb;
    }

    /**
     * Procesa los Gamepads de WebXR en cada frame
     * @param {number} delta 
     * @param {THREE.Vector3} playerPosition 
     * @param {SoundManager} soundManager 
     * @returns {boolean} true si el jugador se está desplazando
     */
    update(delta, playerPosition, soundManager) {
        if (!this.renderer.xr.isPresenting) {
            this.isVRActive = false;
            return false;
        }
        this.isVRActive = true;

        const session = this.renderer.xr.getSession();
        if (!session || !session.inputSources) return false;

        let isMoving = false;
        let leftStickX = 0;
        let leftStickY = 0;
        let rightStickX = 0;

        // Cooldown de snap turn
        if (this.snapTurnCooldown) {
            this.snapTimer -= delta;
            if (this.snapTimer <= 0) {
                this.snapTurnCooldown = false;
            }
        }

        // Iterar sobre las fuentes de entrada del visor Meta Quest 2
        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            const gp = source.gamepad;
            const handedness = source.handedness; // 'left' | 'right'

            // EJES DE JOYSTICKS:
            // axes[2]: horizontal X, axes[3]: vertical Y (en Meta Quest)
            // Algunos navegadores usan axes[0] y axes[1]
            const axisX = (Math.abs(gp.axes[2]) > this.deadzone) ? gp.axes[2] : (Math.abs(gp.axes[0]) > this.deadzone ? gp.axes[0] : 0);
            const axisY = (Math.abs(gp.axes[3]) > this.deadzone) ? gp.axes[3] : (Math.abs(gp.axes[1]) > this.deadzone ? gp.axes[1] : 0);

            if (handedness === 'left') {
                // Joystick izquierdo: Desplazamiento
                leftStickX = axisX;
                leftStickY = axisY;

                // Botón de menú (índice habitual 4 o 5 o thumbstick click)
                if (gp.buttons[4] && gp.buttons[4].pressed && !this.lastButtonStates.menu) {
                    if (this.onPauseToggleCallback) this.onPauseToggleCallback();
                }
                this.lastButtonStates.menu = !!(gp.buttons[4] && gp.buttons[4].pressed);

            } else if (handedness === 'right') {
                // Joystick derecho: Giro
                rightStickX = axisX;

                // Botón A (índice 4 o 0) / Gatillo para selección en VR
                if (gp.buttons[4] && gp.buttons[4].pressed && !this.lastButtonStates.aButton) {
                    if (this.onSelectCallback) {
                        this.onSelectCallback(1);
                    } else if (this.onPauseToggleCallback) {
                        this.onPauseToggleCallback();
                    }
                }
                this.lastButtonStates.aButton = !!(gp.buttons[4] && gp.buttons[4].pressed);
            }
        }

        // ==========================================
        // 1. APLICAR DESPLAZAMIENTO (STICK IZQUIERDO)
        // ==========================================
        if (Math.abs(leftStickX) > 0.01 || Math.abs(leftStickY) > 0.01) {
            isMoving = true;

            // Obtener orientación horizontal de la cabeza (VR Camera)
            const headDirection = new THREE.Vector3();
            this.camera.getWorldDirection(headDirection);
            headDirection.y = 0;
            headDirection.normalize();

            const headRight = new THREE.Vector3();
            headRight.crossVectors(headDirection, new THREE.Vector3(0, 1, 0)).normalize();

            // Vector de movimiento compuesto
            const moveDir = new THREE.Vector3();
            moveDir.addScaledVector(headDirection, -leftStickY);
            moveDir.addScaledVector(headRight, leftStickX);
            moveDir.normalize();

            const speed = this.walkSpeed * Math.min(1.0, Math.hypot(leftStickX, leftStickY));
            const deltaMove = moveDir.multiplyScalar(speed * delta);

            playerPosition.add(deltaMove);
            this.cameraRig.position.x = playerPosition.x;
            this.cameraRig.position.z = playerPosition.z;

            // SFX de paso en VR
            if (soundManager) {
                soundManager.playFootstep();
            }
        }

        // ==========================================
        // 2. APLICAR GIRO (STICK DERECHO)
        // ==========================================
        if (Math.abs(rightStickX) > 0.5) {
            if (this.turnMode === 'snap') {
                if (!this.snapTurnCooldown) {
                    const snapDir = rightStickX > 0 ? -1 : 1;
                    this.cameraRig.rotation.y += snapDir * this.snapTurnAngle;
                    this.snapTurnCooldown = true;
                    this.snapTimer = this.snapTurnCooldownTime;
                }
            } else {
                // Giro suave
                this.cameraRig.rotation.y -= rightStickX * this.smoothTurnSpeed * delta;
            }
        }

        // ==========================================
        // 3. VIÑETA DE CONFORT
        // ==========================================
        if (this.comfortEnabled && this.comfortVignetteMesh) {
            const isTurningFast = Math.abs(rightStickX) > 0.5;
            const isMovingFast = isMoving;

            if (isTurningFast || isMovingFast) {
                this.comfortVignetteMesh.visible = true;
                this.comfortVignetteMesh.material.opacity = Math.min(0.65, this.comfortVignetteMesh.material.opacity + delta * 3.5);
            } else {
                if (this.comfortVignetteMesh.material.opacity > 0.01) {
                    this.comfortVignetteMesh.material.opacity -= delta * 2.5;
                } else {
                    this.comfortVignetteMesh.visible = false;
                }
            }
        }

        return isMoving;
    }
}
