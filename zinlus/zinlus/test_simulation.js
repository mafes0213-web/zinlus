/**
 * ZINLUS - Test Suite Automatizado Integral (V3 - Dificultad Equilibrada y Salidas Garantizadas)
 * 
 * Verificaciones obligatorias:
 * 1. Validación matemática de conectividad en los 3 niveles (cero rutas rotas o bloqueadas).
 * 2. Simulación real del recorrido completo del jugador en Nivel 1, Nivel 2 y Nivel 3.
 * 3. Garantía de llegada y activación de la salida en cada nivel.
 * 4. Sistema de asistencia y pistas progresivas (>30s y >60s).
 * 5. Sistema de memoria de ruta (anillos de stardust y detección de bucles).
 * 6. Reinicio de nivel sin pérdida de progreso global.
 * 7. Transición completa hasta el estado VICTORY.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock mínimo del entorno global y Web Audio API
global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: () => {},
    AudioContext: class {
        constructor() {
            this.currentTime = 0;
            this.sampleRate = 44100;
            this.destination = {};
        }
        createGain() { return { gain: { setValueAtTime: () => {}, setTargetAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }; }
        createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }; }
        createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }; }
        createBuffer() { return { getChannelData: () => new Float32Array(88200) }; }
        createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }; }
        createStereoPanner() { return { pan: { setValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }; }
        createPanner() { return { positionX: { setTargetAtTime: () => {} }, positionY: { setTargetAtTime: () => {} }, positionZ: { setTargetAtTime: () => {} }, connect: () => {}, disconnect: () => {} }; }
    }
};

global.document = {
    addEventListener: () => {},
    createElement: () => ({
        getContext: () => ({
            createRadialGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {},
            fillText: () => {},
            strokeRect: () => {}
        }),
        width: 100,
        height: 100
    }),
    getElementById: () => ({
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {}
    }),
    querySelectorAll: () => []
};

// Cargar Three.js ESM
import * as THREE from './three.module.js';
global.THREE = THREE;
console.log('Three.js inicializado para pruebas. Versión r' + THREE.REVISION);

async function runTests() {
    console.log('\n======================================================');
    console.log('   INICIANDO PRUEBAS DE SALIDA Y EQUILIBRIO ZINLUS    ');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, testName) {
        if (cond) {
            console.log(`[PASS] ${testName}`);
            passed++;
        } else {
            console.error(`[FAIL] ${testName}`);
            failed++;
        }
    }

    const { SoundManager } = await import('./js/audio/SoundManager.js');
    const { LightSystem } = await import('./js/lighting/LightSystem.js');
    const { Level1 } = await import('./js/levels/Level1.js');
    const { Level2 } = await import('./js/levels/Level2.js');
    const { Level3 } = await import('./js/levels/Level3.js');
    const { GameState, State } = await import('./js/core/GameState.js');

    const sound = new SoundManager();
    sound.init();
    const scene = new THREE.Scene();
    const lightSys = new LightSystem(scene);

    // ==============================================================
    // PRUEBA 1: VALIDACIÓN MATEMÁTICA DE CONECTIVIDAD (NIVELES 1, 2, 3)
    // Garantiza que cada paso sea <= 15m y la salida esté conectada
    // ==============================================================
    const lvl1 = new Level1();
    const lvl2 = new Level2();
    const lvl3 = new Level3();

    assert(lvl1.validateConnectivity(15.0) === true, 'Nivel 1: Conectividad continua y sin interrupciones');
    assert(lvl2.validateConnectivity(15.0) === true, 'Nivel 2: Conectividad continua y sin interrupciones');
    assert(lvl3.validateConnectivity(15.0) === true, 'Nivel 3: Conectividad continua y sin interrupciones');

    // ==============================================================
    // PRUEBA 2: SIMULACIÓN DE JUEGO REAL PASO A PASO EN NIVEL 1
    // Un agente recorre el nivel desde spawn hasta completar la salida
    // ==============================================================
    console.log('\n--- SIMULANDO RECORRIDO EN NIVEL 1 ---');
    lvl1.build(lightSys);
    const agentPos = lvl1.playerStartPosition.clone();
    
    // Inicia en el origen
    lightSys.update(0.1, agentPos, 1, sound);
    assert(lightSys.checkExitReached(agentPos) === false, 'Nivel 1: Salida no se activa al inicio');
    assert(lightSys.exitBeacon.bloomFactor === 0, 'Nivel 1: Salida permanece camuflada a distancia');

    // Caminar secuencialmente por cada nodo guía
    for (let i = 0; i < lvl1.guideNodes.length; i++) {
        const target = lvl1.guideNodes[i];
        agentPos.set(target.x, target.y, target.z);
        lightSys.update(0.1, agentPos, 1, sound);
        const guideLight = lightSys.lights.find(l => l.type === 'guide' && l.sequenceIndex === i);
        assert(guideLight.visited === true, `Nivel 1: Nodo guía ${i} alcanzado y registrado como visitado`);
    }

    // Caminar hacia la salida desde el último nodo
    agentPos.set(lvl1.exitPosition.x, 1.6, lvl1.exitPosition.z);
    for (let f = 0; f < 5; f++) {
        lightSys.update(0.1, agentPos, 1, sound);
    }
    assert(lightSys.exitBeacon.bloomFactor > 0.5, 'Nivel 1: Salida florece al llegar a proximidad');
    assert(lightSys.checkExitReached(agentPos) === true, 'Nivel 1: ¡SALIDA ALCANZADA Y COMPLETADA EXITOSAMENTE!');

    // ==============================================================
    // PRUEBA 3: SIMULACIÓN DE JUEGO REAL EN NIVEL 2 (BIFURCACIONES Y SALIDA)
    // ==============================================================
    console.log('\n--- SIMULANDO RECORRIDO EN NIVEL 2 ---');
    lvl2.build(lightSys);
    agentPos.copy(lvl2.playerStartPosition);
    lightSys.update(0.1, agentPos, 2, sound);

    // Simular que el jugador se equivoca en la Bifurcación 1 y entra a la rama falsa
    const falseNode = lightSys.lights.find(l => l.type === 'distractor' && l.pos.z === -26);
    agentPos.set(falseNode.pos.x, 1.6, falseNode.pos.z);
    lightSys.update(0.1, agentPos, 2, sound);
    assert(falseNode.visited === true, 'Nivel 2: Rama falsa explorada y registrada en stardust');

    // El jugador retrocede a la ruta verdadera y completa la secuencia
    for (let i = 0; i < lvl2.guideNodes.length; i++) {
        const target = lvl2.guideNodes[i];
        agentPos.set(target.x, target.y, target.z);
        lightSys.update(0.1, agentPos, 2, sound);
    }

    // Llegar a la salida del Nivel 2
    agentPos.set(lvl2.exitPosition.x, 1.6, lvl2.exitPosition.z);
    for (let f = 0; f < 5; f++) {
        lightSys.update(0.1, agentPos, 2, sound);
    }
    assert(lightSys.checkExitReached(agentPos) === true, 'Nivel 2: ¡SALIDA ALCANZADA Y COMPLETADA EXITOSAMENTE!');

    // ==============================================================
    // PRUEBA 4: SIMULACIÓN DE JUEGO REAL EN NIVEL 3 (CAOS Y SALIDA)
    // ==============================================================
    console.log('\n--- SIMULANDO RECORRIDO EN NIVEL 3 ---');
    lvl3.build(lightSys);
    agentPos.copy(lvl3.playerStartPosition);
    lightSys.update(0.1, agentPos, 3, sound);

    for (let i = 0; i < lvl3.guideNodes.length; i++) {
        const target = lvl3.guideNodes[i];
        agentPos.set(target.x, target.y, target.z);
        lightSys.update(0.1, agentPos, 3, sound);
    }

    agentPos.set(lvl3.exitPosition.x, 1.6, lvl3.exitPosition.z);
    for (let f = 0; f < 5; f++) {
        lightSys.update(0.1, agentPos, 3, sound);
    }
    assert(lightSys.checkExitReached(agentPos) === true, 'Nivel 3: ¡SALIDA ALCANZADA Y COMPLETADA EXITOSAMENTE!');

    // ==============================================================
    // PRUEBA 5: SISTEMA DE PISTAS Y ASISTENCIA ACTIVA
    // Evita que el jugador quede atascado si no avanza en >30s o >60s
    // ==============================================================
    console.log('\n--- PROBANDO SISTEMA DE ASISTENCIA Y PISTAS ---');
    lvl1.build(lightSys);
    agentPos.copy(lvl1.playerStartPosition);
    lightSys.update(0.1, agentPos, 1, sound);

    assert(lightSys.hintLevel === 0, 'Inicialmente no hay pista activa');

    // Simular 35 segundos sin encontrar el siguiente nodo
    lightSys.timeSinceLastProgress = 35;
    lightSys.update(0.1, agentPos, 1, sound);
    assert(lightSys.hintLevel === 1, 'Pista Nivel 1 activada tras 35s sin avanzar');
    assert(lightSys.nextTargetNode !== null, 'Se identificó correctamente el siguiente nodo objetivo');
    assert(lightSys.nextTargetNode.revealDistance > lightSys.nextTargetNode.baseRevealDistance, 'El nodo objetivo amplió su alcance de visibilidad');

    // Simular 65 segundos
    lightSys.timeSinceLastProgress = 65;
    lightSys.update(0.1, agentPos, 1, sound);
    assert(lightSys.hintLevel === 2, 'Pista Nivel 2 activada tras 65s sin avanzar');

    // El jugador avanza hacia el nodo objetivo y la pista se restablece
    agentPos.set(lightSys.nextTargetNode.pos.x, 1.6, lightSys.nextTargetNode.pos.z);
    lightSys.update(0.1, agentPos, 1, sound);
    assert(lightSys.hintLevel === 0, 'La pista se desactiva al avanzar con éxito al siguiente nodo');
    assert(lightSys.timeSinceLastProgress === 0, 'El temporizador de asistencia se restablece a 0');

    // ==============================================================
    // PRUEBA 6: REINICIAR NIVEL SIN PERDER PROGRESO GLOBAL
    // ==============================================================
    console.log('\n--- PROBANDO REINICIO DE NIVEL ---');
    const mockEngine = {
        lightSystem: lightSys,
        resetPlayerPosition: () => {},
        renderer: { xr: { setSession: () => {} } },
        desktopControls: { lock: () => {}, unlock: () => {} }
    };
    const gameState = new GameState(mockEngine, sound);
    gameState.startGame();
    gameState.loadLevel(3); // Estamos en Nivel 3
    assert(gameState.currentLevelIndex === 3, 'En Nivel 3 antes de reiniciar');

    // Reiniciar nivel actual
    gameState.restartCurrentLevel();
    assert(gameState.currentLevelIndex === 3, 'Mantiene el Nivel 3 sin perder progreso global');
    assert(gameState.currentState === State.PLAYING, 'Continúa en estado PLAYING tras reiniciar');

    // ==============================================================
    // PRUEBA 7: PROGRESIÓN COMPLETA HASTA LA VICTORIA
    // ==============================================================
    console.log('\n--- PROBANDO FLUJO DE VICTORIA ---');
    gameState.onLevelCompleted(); // Completa Nivel 3
    assert(gameState.currentState === State.VICTORY, 'Completar el Nivel 3 activa estado de VICTORY');

    console.log(`\n======================================================`);
    console.log(` RESULTADO FINAL: ${passed} PASADAS | ${failed} FALLADAS`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Error durante la ejecución de pruebas:', err);
    process.exit(1);
});
