/**
 * ZINLUS - UIManager
 * Gestión integral de interfaz de usuario para Escritorio y Realidad Virtual (WebXR).
 * 
 * - Pantalla de inicio con estética minimalista y oscura
 * - Selección de modo (PC / VR)
 * - Selección de nivel (1, 2, 3)
 * - HUD discreto en juego (Nivel actual, objetivo sutil, retícula)
 * - Menú de pausa
 * - Pantalla de nivel completado y transición
 * - Pantalla de victoria final al escapar de ZINLUS
 * - Panel 3D interactivo para Meta Quest 2 dentro del visor VR
 */

export class UIManager {
    constructor(gameState, soundManager) {
        this.gameState = gameState;
        this.soundManager = soundManager;

        // Elementos DOM
        this.dom = {
            mainMenu: document.getElementById('main-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            levelCompleteMenu: document.getElementById('level-complete-menu'),
            victoryMenu: document.getElementById('victory-menu'),
            hud: document.getElementById('hud'),
            hudLevelName: document.getElementById('hud-level-name'),
            hudObjective: document.getElementById('hud-objective'),
            crosshair: document.getElementById('crosshair'),
            vrBtn: document.getElementById('btn-vr-mode') || document.getElementById('btn-start-here'),
            startHereBtn: document.getElementById('btn-start-here'),
            vrStatus: document.getElementById('vr-status-badge'),
            levelSelectContainer: document.getElementById('level-select-container') || document.querySelector('.level-cards'),
            masterVolumeSlider: document.getElementById('slider-master-volume'),
            ambientVolumeSlider: document.getElementById('slider-ambient-volume'),
            sfxVolumeSlider: document.getElementById('slider-sfx-volume'),
            muteBtn: document.getElementById('btn-mute-toggle')
        };

        // Panel 3D para VR
        this.vrPanelMesh = null;
        this.vrPanelCanvas = null;
        this.vrPanelCtx = null;
        this.vrPanelTexture = null;
        this.vrPanelVisible = false;
        this.vrButtons = []; // Zonas interactivas en el canvas VR

        this.initDomEvents();
        this.checkWebXRSupport();
    }

    /**
     * Vincula todos los botones y sliders de la interfaz HTML
     */
    initDomEvents() {
        // Asegurar que cualquier interacción inicial despierte el contexto de audio
        const resumeAudioOnGesture = () => {
            if (this.soundManager) {
                this.soundManager.init();
            }
        };

        // Botón Jugar (Inicia en Nivel 1 o el actual)
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.startGame();
            });
        }

        // Botón VR / Start Here
        const triggerVR = () => {
            resumeAudioOnGesture();
            this.soundManager.playUIClick();
            this.gameState.startVRMode();
        };

        if (this.dom.vrBtn) {
            this.dom.vrBtn.addEventListener('click', triggerVR);
        }
        if (this.dom.startHereBtn && this.dom.startHereBtn !== this.dom.vrBtn) {
            this.dom.startHereBtn.addEventListener('click', triggerVR);
        }

        // Botones con data-action="start-vr" o similares
        const vrActionBtns = document.querySelectorAll('[data-action="start-vr"], [data-action="start-here"]');
        vrActionBtns.forEach(btn => {
            if (btn !== this.dom.vrBtn && btn !== this.dom.startHereBtn) {
                btn.addEventListener('click', triggerVR);
            }
        });

        // Selector de Niveles en menú principal (con detección robusta de botón contenedor)
        const levelBtns = document.querySelectorAll('.btn-select-level');
        levelBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                const targetBtn = e.currentTarget || e.target.closest('.btn-select-level');
                const lvlAttr = targetBtn ? targetBtn.getAttribute('data-level') : '1';
                const lvl = parseInt(lvlAttr, 10);
                this.gameState.selectLevel(isNaN(lvl) ? 1 : lvl);
            });
        });

        // Botones de Pausa
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.resumeGame();
            });
        }

        const restartLevelBtn = document.getElementById('btn-restart-level');
        if (restartLevelBtn) {
            restartLevelBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.restartCurrentLevel();
            });
        }

        const pauseMenuBtn = document.getElementById('btn-pause-main-menu');
        if (pauseMenuBtn) {
            pauseMenuBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.exitToMainMenu();
            });
        }

        // Botón Continuar al Siguiente Nivel
        const nextLevelBtn = document.getElementById('btn-next-level');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.nextLevel();
            });
        }

        // Botón Repetir Juego desde Victoria
        const replayBtn = document.getElementById('btn-replay-game');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                this.soundManager.playUIClick();
                this.gameState.selectLevel(1);
            });
        }

        // Sliders de Volumen
        if (this.dom.masterVolumeSlider) {
            this.dom.masterVolumeSlider.addEventListener('input', (e) => {
                this.soundManager.setMasterVolume(parseFloat(e.target.value));
            });
        }
        if (this.dom.ambientVolumeSlider) {
            this.dom.ambientVolumeSlider.addEventListener('input', (e) => {
                this.soundManager.setAmbientVolume(parseFloat(e.target.value));
            });
        }
        if (this.dom.sfxVolumeSlider) {
            this.dom.sfxVolumeSlider.addEventListener('input', (e) => {
                this.soundManager.setSfxVolume(parseFloat(e.target.value));
            });
        }
        if (this.dom.muteBtn) {
            this.dom.muteBtn.addEventListener('click', () => {
                resumeAudioOnGesture();
                const muted = this.soundManager.toggleMute();
                this.dom.muteBtn.innerText = muted ? 'SONIDO: DESACTIVADO' : 'SONIDO: ACTIVADO';
                this.dom.muteBtn.classList.toggle('muted', muted);
            });
        }
    }

    /**
     * Comprueba si el navegador tiene soporte WebXR
     */
    async checkWebXRSupport() {
        // Escuchar cambios de dispositivos VR conectados
        if (navigator.xr && navigator.xr.addEventListener && !this._deviceChangeListenerBound) {
            this._deviceChangeListenerBound = true;
            try {
                navigator.xr.addEventListener('devicechange', () => this.checkWebXRSupport());
            } catch (_) {}
        }

        const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!navigator.xr) {
            if (this.dom.vrStatus) {
                if (!isSecure) {
                    this.dom.vrStatus.innerText = 'WebXR requiere protocolo seguro HTTPS (en Vercel activo automáticamente)';
                } else {
                    this.dom.vrStatus.innerText = 'WebXR no detectado (Utilice Meta Quest / Navegador compatible)';
                }
                this.dom.vrStatus.classList.add('disabled');
            }
            return;
        }

        try {
            const supported = await navigator.xr.isSessionSupported('immersive-vr');
            if (supported) {
                if (this.dom.vrStatus) {
                    this.dom.vrStatus.innerText = 'Visor VR compatible detectado (Meta Quest listo)';
                    this.dom.vrStatus.classList.remove('disabled');
                    this.dom.vrStatus.classList.add('ready');
                }
                if (this.dom.vrBtn) {
                    this.dom.vrBtn.disabled = false;
                    this.dom.vrBtn.classList.remove('disabled');
                }
            } else {
                if (this.dom.vrStatus) {
                    this.dom.vrStatus.innerText = 'WebXR disponible (Conecte o abra desde Meta Quest para VR)';
                    this.dom.vrStatus.classList.remove('ready');
                }
            }
        } catch (e) {
            console.warn('Error comprobando soporte WebXR:', e);
            if (this.dom.vrStatus) {
                this.dom.vrStatus.innerText = 'WebXR activo. Pulse "MODO VR" para iniciar.';
            }
        }
    }

    // ==========================================
    // CAMBIOS DE PANTALLA Y ESTADO
    // ==========================================

    showMainMenu() {
        this.hideAllScreens();
        if (this.dom.mainMenu) this.dom.mainMenu.classList.remove('hidden');
        if (this.dom.hud) this.dom.hud.classList.add('hidden');
        if (this.dom.crosshair) this.dom.crosshair.classList.add('hidden');
        this.hideVRPanel();
    }

    showHUD(level) {
        this.hideAllScreens();
        if (this.dom.hud) this.dom.hud.classList.remove('hidden');
        if (this.dom.crosshair) this.dom.crosshair.classList.remove('hidden');
        if (this.dom.hudLevelName) {
            this.dom.hudLevelName.innerText = `NIVEL ${level.number}: ${level.name}`;
        }
        if (this.dom.hudObjective) {
            this.dom.hudObjective.innerText = level.description;
        }
        this.hideVRPanel();
    }

    showPauseMenu() {
        if (this.dom.pauseMenu) this.dom.pauseMenu.classList.remove('hidden');
        if (this.dom.crosshair) this.dom.crosshair.classList.add('hidden');

        // Si estamos en VR, mostrar panel flotante 3D
        if (this.gameState.isVRActive) {
            this.showVRPanel('PAUSA', 'ZINLUS EN PAUSA', [
                { id: 'resume', label: 'REANUDAR' },
                { id: 'restart', label: 'REINICIAR NIVEL' },
                { id: 'menu', label: 'SALIR AL MENÚ' }
            ]);
        }
    }

    hidePauseMenu() {
        if (this.dom.pauseMenu) this.dom.pauseMenu.classList.add('hidden');
        if (this.dom.crosshair && !this.gameState.isVRActive) {
            this.dom.crosshair.classList.remove('hidden');
        }
        this.hideVRPanel();
    }

    showLevelComplete(levelNumber) {
        this.hideAllScreens();
        if (this.dom.levelCompleteMenu) {
            this.dom.levelCompleteMenu.classList.remove('hidden');
            const title = document.getElementById('complete-title');
            const desc = document.getElementById('complete-desc');
            if (title) title.innerText = `NIVEL ${levelNumber} COMPLETADO`;
            if (desc) desc.innerText = `Has descifrado la señal en la oscuridad. El siguiente umbral te espera.`;
        }

        // Si estamos en VR, mostrar en panel 3D
        if (this.gameState.isVRActive) {
            this.showVRPanel(`NIVEL ${levelNumber} SUPERADO`, 'Has descubierto la salida.', [
                { id: 'next', label: 'CONTINUAR AL SIGUIENTE NIVEL' }
            ]);
        }
    }

    showVictory() {
        this.hideAllScreens();
        if (this.dom.victoryMenu) {
            this.dom.victoryMenu.classList.remove('hidden');
        }

        if (this.gameState.isVRActive) {
            this.showVRPanel('HAS ESCAPADO DE ZINLUS', 'Tu mente ha vencido a la oscuridad y al caos.', [
                { id: 'replay', label: 'VOLVER A JUGAR' },
                { id: 'menu', label: 'MENÚ PRINCIPAL' }
            ]);
        }
    }

    hideAllScreens() {
        if (this.dom.mainMenu) this.dom.mainMenu.classList.add('hidden');
        if (this.dom.pauseMenu) this.dom.pauseMenu.classList.add('hidden');
        if (this.dom.levelCompleteMenu) this.dom.levelCompleteMenu.classList.add('hidden');
        if (this.dom.victoryMenu) this.dom.victoryMenu.classList.add('hidden');
    }

    // ==========================================
    // PANEL FLOTANTE 3D PARA META QUEST 2 (VR)
    // Permite interactuar con la interfaz en VR
    // ==========================================

    initVRPanel(scene, camera) {
        this.vrPanelCanvas = document.createElement('canvas');
        this.vrPanelCanvas.width = 1024;
        this.vrPanelCanvas.height = 640;
        this.vrPanelCtx = this.vrPanelCanvas.getContext('2d');

        this.vrPanelTexture = new THREE.CanvasTexture(this.vrPanelCanvas);

        const geo = new THREE.PlaneGeometry(1.6, 1.0);
        const mat = new THREE.MeshBasicMaterial({
            map: this.vrPanelTexture,
            transparent: true,
            opacity: 0.96,
            depthTest: false,
            side: THREE.DoubleSide
        });

        this.vrPanelMesh = new THREE.Mesh(geo, mat);
        this.vrPanelMesh.position.set(0, 0, -1.8); // 1.8 metros frente a los ojos
        this.vrPanelMesh.visible = false;
        camera.add(this.vrPanelMesh);
    }

    showVRPanel(title, subtitle, buttons) {
        if (!this.vrPanelMesh || !this.vrPanelCtx) return;

        const ctx = this.vrPanelCtx;
        const w = this.vrPanelCanvas.width;
        const h = this.vrPanelCanvas.height;

        // Limpiar fondo negro minimalista con borde brillante
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, w - 20, h - 20);

        // Título
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, w / 2, 130);

        // Subtítulo
        ctx.fillStyle = '#a0c0e0';
        ctx.font = '28px system-ui, sans-serif';
        ctx.fillText(subtitle, w / 2, 200);

        // Botones
        this.vrButtons = [];
        const btnHeight = 75;
        const btnWidth = 520;
        const startY = 270;
        const spacing = 100;

        buttons.forEach((btn, idx) => {
            const bx = (w - btnWidth) / 2;
            const by = startY + idx * spacing;

            ctx.fillStyle = '#0f2038';
            ctx.fillRect(bx, by, btnWidth, btnHeight);

            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, btnWidth, btnHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px system-ui, sans-serif';
            ctx.fillText(btn.label, w / 2, by + 48);

            this.vrButtons.push({
                id: btn.id,
                x: bx,
                y: by,
                w: btnWidth,
                h: btnHeight
            });
        });

        this.vrPanelTexture.needsUpdate = true;
        this.vrPanelMesh.visible = true;
        this.vrPanelVisible = true;
    }

    hideVRPanel() {
        if (this.vrPanelMesh) {
            this.vrPanelMesh.visible = false;
        }
        this.vrPanelVisible = false;
        this.vrButtons = [];
    }

    /**
     * Interacción con el panel VR cuando se pulsa el gatillo de Meta Quest
     */
    handleVRSelect() {
        if (!this.vrPanelVisible || this.vrButtons.length === 0) return;

        // Por defecto en VR al pulsar el gatillo seleccionamos la acción principal
        const firstBtn = this.vrButtons[0];
        if (firstBtn) {
            this.soundManager.playUIClick();
            if (firstBtn.id === 'resume') {
                this.gameState.resumeGame();
            } else if (firstBtn.id === 'next') {
                this.gameState.nextLevel();
            } else if (firstBtn.id === 'restart') {
                this.gameState.restartCurrentLevel();
            } else if (firstBtn.id === 'replay') {
                this.gameState.selectLevel(1);
            } else if (firstBtn.id === 'menu') {
                this.gameState.exitToMainMenu();
            }
        }
    }
}
