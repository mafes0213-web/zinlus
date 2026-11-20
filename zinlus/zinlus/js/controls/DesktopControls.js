/**
 * ZINLUS - DesktopControls
 * Controles de primera persona para PC con PointerLock API.
 * 
 * - WASD / Flechas: Desplazamiento
 * - Mouse: Orientación de cámara (pitch y yaw)
 * - Shift: Marcha rápida / Sprint
 * - ESC: Pausa
 * - F: Pantalla completa
 */

export class DesktopControls {
    constructor(camera, domElement, onPauseCallback, onRestartCallback) {
        this.camera = camera;
        this.domElement = domElement || document.body;
        this.onPauseCallback = onPauseCallback;
        this.onRestartCallback = onRestartCallback;

        this.enabled = false;
        this.isLocked = false;

        // Velocidades de movimiento (m/s)
        this.walkSpeed = 4.5;
        this.runSpeed = 7.0;
        this.currentSpeed = this.walkSpeed;

        // Vector de velocidad y dirección
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        // Estado de teclas
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isShiftDown = false;

        // Rotación Euler para control de cámara
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.minPolarAngle = 0.05; // ~3 grados
        this.maxPolarAngle = Math.PI - 0.05; // ~177 grados
        this.mouseSensitivity = 0.0022;

        this.initEvents();
    }

    initEvents() {
        // Pointer Lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => {
            console.warn('PointerLock no disponible o denegado.');
        });

        // Mouse move
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    lock() {
        try {
            this.domElement.requestPointerLock();
        } catch (e) {
            console.error('Error al solicitar PointerLock:', e);
        }
    }

    unlock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    onPointerLockChange() {
        if (document.pointerLockElement === this.domElement) {
            this.isLocked = true;
            this.enabled = true;
        } else {
            this.isLocked = false;
            this.enabled = false;
            if (this.onPauseCallback) {
                this.onPauseCallback();
            }
        }
    }

    onMouseMove(event) {
        if (!this.isLocked || !this.enabled) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.euler.setFromQuaternion(this.camera.quaternion);

        this.euler.y -= movementX * this.mouseSensitivity;
        this.euler.x -= movementY * this.mouseSensitivity;

        // Limitar inclinación vertical (pitch)
        this.euler.x = Math.max((Math.PI / 2) - this.maxPolarAngle, Math.min((Math.PI / 2) - this.minPolarAngle, this.euler.x));

        this.camera.quaternion.setFromEuler(this.euler);
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isShiftDown = true;
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
            case 'KeyR':
                if (this.onRestartCallback) {
                    this.onRestartCallback();
                }
                break;
            case 'Escape':
                if (this.isLocked) {
                    this.unlock();
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isShiftDown = false;
                break;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    /**
     * Actualiza el movimiento del jugador
     * @param {number} delta 
     * @param {THREE.Vector3} playerPosition 
     * @param {SoundManager} soundManager 
     * @returns {boolean} true si el jugador se está desplazando
     */
    update(delta, playerPosition, soundManager) {
        if (!this.enabled) return false;

        this.currentSpeed = this.isShiftDown ? this.runSpeed : this.walkSpeed;

        // Amortiguación y fricción
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * this.currentSpeed * 10.0 * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x += this.direction.x * this.currentSpeed * 10.0 * delta;
        }

        // Obtener orientación horizontal de la cámara
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Aplicar movimiento
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(forward, -this.velocity.z * delta);
        moveVector.addScaledVector(right, this.velocity.x * delta);

        playerPosition.add(moveVector);

        // La cámara sigue al jugador a altura de ojos (1.6m)
        this.camera.position.x = playerPosition.x;
        this.camera.position.z = playerPosition.z;
        this.camera.position.y = 1.6;

        // Detección de pasos
        const isMoving = (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight);
        if (isMoving && soundManager) {
            soundManager.playFootstep();
        }

        return isMoving;
    }
}
