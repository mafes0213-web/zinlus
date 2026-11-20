/**
 * ZINLUS - Main Entry Point
 * Inicializador principal de la experiencia.
 */

import { Engine } from './core/Engine.js';
import { GameState } from './core/GameState.js';
import { SoundManager } from './audio/SoundManager.js';
import { UIManager } from './ui/UIManager.js';

window.addEventListener('DOMContentLoaded', () => {
    // 1. Instanciar módulos
    const soundManager = new SoundManager();
    const engine = new Engine();
    const gameState = new GameState(engine, soundManager);
    const uiManager = new UIManager(gameState, soundManager);

    // 2. Conectar referencias mutuas
    gameState.setUIManager(uiManager);
    engine.setupControls(gameState, soundManager);

    // 3. Inicializar panel VR en la cámara
    uiManager.initVRPanel(engine.scene, engine.camera);

    // 4. Iniciar ciclo de renderizado continuo (WebXR loop)
    engine.startRenderLoop();

    // 5. Presentar pantalla principal
    uiManager.showMainMenu();

    console.log('%c ZINLUS 1.0 - Inicializado correctamente ', 'background: #050b14; color: #64d2ff; font-weight: bold; padding: 4px;');
});
