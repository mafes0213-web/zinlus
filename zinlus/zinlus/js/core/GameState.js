/**
 * ZINLUS - GameState
 * Máquina de estados del juego y controlador de progreso de niveles.
 */

import { Level1 } from '../levels/Level1.js';
import { Level2 } from '../levels/Level2.js';
import { Level3 } from '../levels/Level3.js';

export const State = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    VICTORY: 'VICTORY'
};

export class GameState {
    constructor(engine, soundManager) {
        this.engine = engine;
        this.soundManager = soundManager;
        this.uiManager = null; // Asignado tras inicializar UI

        this.currentState = State.MENU;
        this.currentLevelIndex = 1;
        this.isVRActive = false;

        // Instancias de los 3 niveles
        this.levels = {
            1: new Level1(),
            2: new Level2(),
            3: new Level3()
        };

        this.playerPosition = new THREE.Vector3(0, 1.6, 0);
    }

    setUIManager(ui) {
        this.uiManager = ui;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }

    /**
     * Inicia la partida en el nivel actual
     */
    startGame() {
        this.soundManager.init();
        this.loadLevel(this.currentLevelIndex);
        this.currentState = State.PLAYING;

        if (this.uiManager) {
            this.uiManager.showHUD(this.getCurrentLevel());
        }

        // Si no estamos en VR, solicitar Pointer Lock
        if (!this.isVRActive && this.engine.desktopControls) {
            this.engine.desktopControls.lock();
        }
    }

    /**
     * Inicia el modo Realidad Virtual WebXR
     */
    async startVRMode() {
        this.soundManager.init();
        if (!navigator.xr) {
            const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
            if (!isSecure) {
                alert('WebXR requiere un dominio HTTPS seguro para funcionar. Asegúrate de abrir el enlace mediante https://');
            } else {
                alert('WebXR no está disponible en este navegador. Para jugar en Realidad Virtual, abre este enlace en el navegador Meta Horizon de tus Meta Quest.');
            }
            return;
        }

        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
            });

            await this.engine.renderer.xr.setSession(session);
            this.isVRActive = true;

            session.addEventListener('end', () => {
                this.isVRActive = false;
                if (this.currentState === State.PLAYING) {
                    this.pauseGame();
                }
            });

            this.startGame();
        } catch (e) {
            console.error('Error al iniciar WebXR session:', e);
            alert('No se pudo iniciar el modo VR: ' + (e.message || e));
        }
    }

    /**
     * Carga y construye un nivel
     */
    loadLevel(levelNumber) {
        const num = parseInt(levelNumber, 10);
        this.currentLevelIndex = isNaN(num) ? 1 : Math.max(1, Math.min(3, num));
        const lvl = this.getCurrentLevel();

        if (!lvl) {
            console.error(`Nivel ${this.currentLevelIndex} no encontrado.`);
            return;
        }

        // Reiniciar posición del jugador
        this.playerPosition.copy(lvl.playerStartPosition);
        this.engine.resetPlayerPosition(this.playerPosition);

        // Construir luces y portal en el motor gráfico
        lvl.build(this.engine.lightSystem);

        // Iniciar audio ambiental específico del nivel
        this.soundManager.playLevelAmbient(this.currentLevelIndex);

        if (this.uiManager) {
            this.uiManager.showHUD(lvl);
        }
    }

    selectLevel(lvlNumber) {
        const num = parseInt(lvlNumber, 10);
        this.currentLevelIndex = isNaN(num) ? 1 : Math.max(1, Math.min(3, num));
        this.startGame();
    }

    restartCurrentLevel() {
        this.loadLevel(this.currentLevelIndex);
        this.currentState = State.PLAYING;
        if (this.uiManager) {
            this.uiManager.showHUD(this.getCurrentLevel());
        }
        if (!this.isVRActive && this.engine.desktopControls) {
            this.engine.desktopControls.lock();
        }
    }

    pauseGame() {
        if (this.currentState !== State.PLAYING) return;
        this.currentState = State.PAUSED;
        if (this.uiManager) {
            this.uiManager.showPauseMenu();
        }
        if (!this.isVRActive && this.engine.desktopControls) {
            this.engine.desktopControls.unlock();
        }
    }

    resumeGame() {
        if (this.currentState !== State.PAUSED) return;
        this.currentState = State.PLAYING;
        if (this.uiManager) {
            this.uiManager.hidePauseMenu();
        }
        if (!this.isVRActive && this.engine.desktopControls) {
            this.engine.desktopControls.lock();
        }
    }

    togglePause() {
        if (this.currentState === State.PLAYING) {
            this.pauseGame();
        } else if (this.currentState === State.PAUSED) {
            this.resumeGame();
        }
    }

    exitToMainMenu() {
        this.currentState = State.MENU;
        this.soundManager.stopCurrentAmbient();
        if (this.uiManager) {
            this.uiManager.showMainMenu();
        }
        if (!this.isVRActive && this.engine.desktopControls) {
            this.engine.desktopControls.unlock();
        }
    }

    /**
     * Comprueba si el jugador alcanzó el portal de salida
     */
    checkWinCondition() {
        if (this.currentState !== State.PLAYING) return;

        const reached = this.engine.lightSystem.checkExitReached(this.playerPosition);
        if (reached) {
            this.onLevelCompleted();
        }
    }

    onLevelCompleted() {
        this.soundManager.playLevelCompleteSound();

        if (this.currentLevelIndex < 3) {
            this.currentState = State.LEVEL_COMPLETE;
            if (this.uiManager) {
                this.uiManager.showLevelComplete(this.currentLevelIndex);
            }
            if (!this.isVRActive && this.engine.desktopControls) {
                this.engine.desktopControls.unlock();
            }
        } else {
            // Completó el nivel 3: ¡Victoria Total!
            this.currentState = State.VICTORY;
            this.soundManager.playVictorySound();
            if (this.uiManager) {
                this.uiManager.showVictory();
            }
            if (!this.isVRActive && this.engine.desktopControls) {
                this.engine.desktopControls.unlock();
            }
        }
    }

    nextLevel() {
        if (this.currentLevelIndex < 3) {
            this.loadLevel(this.currentLevelIndex + 1);
            this.currentState = State.PLAYING;
            if (this.uiManager) {
                this.uiManager.showHUD(this.getCurrentLevel());
            }
            if (!this.isVRActive && this.engine.desktopControls) {
                this.engine.desktopControls.lock();
            }
        } else {
            this.exitToMainMenu();
        }
    }

    update(delta) {
        if (this.currentState === State.PLAYING) {
            // Comprobar límites del vacío
            const lvl = this.getCurrentLevel();
            if (lvl) {
                lvl.checkBounds(this.playerPosition);
            }

            // Comprobar condición de salida
            this.checkWinCondition();
        }
    }
}
