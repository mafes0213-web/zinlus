/**
 * ZINLUS - Nivel 2: Confusión (Equilibrado)
 * Dificultad: Media-Alta.
 * 
 * - Secuencia de 11 nodos guía en ruta continua, garantizada y conexa.
 * - Bifurcaciones y rutas falsas que ponen a prueba la atención selectiva.
 * - Bucle engañoso que regresa a zona explorada (detectable por memoria de ruta).
 * - Callejones sin salida abiertos que permiten siempre dar la vuelta y corregir.
 * - Salida garantizada en (21, 0, -116), conectada al último nodo guía.
 * - Ambiente sonoro: Ciudad nocturna tranquila.
 */

import { LevelBase } from './LevelBase.js';

export class Level2 extends LevelBase {
    constructor() {
        super(
            2, 
            'CONFUSIÓN', 
            'Nivel 2', 
            'Distingue el pulso estable frente a las señales erráticas. Si encuentras un bucle, regresa a la última bifurcación.'
        );
        this.playerStartPosition.set(0, 1.6, 0);
        this.exitPosition.set(21, 0, -116);
        this.boundaryRadius = 150;

        // Secuencia guía conexa y matemáticamente garantizada (saltos < 14m)
        this.guideNodes = [
            { x: 0,   y: 1.2, z: -7 },   // 0. Inicio
            { x: -6,  y: 1.3, z: -16 },  // 1. Antes de Bifurcación 1
            { x: -14, y: 1.2, z: -26 },  // 2. Ruta verdadera oeste
            { x: -21, y: 1.4, z: -37 },  // 3. Antes de Bifurcación 2
            { x: -28, y: 1.3, z: -48 },  // 4. Ruta verdadera suroeste
            { x: -24, y: 1.2, z: -59 },  // 5. Antes de Bifurcación 3
            { x: -15, y: 1.4, z: -69 },  // 6. Cruza hacia el centro
            { x: -5,  y: 1.3, z: -78 },  // 7. Rumbo este
            { x: 5,   y: 1.2, z: -88 },  // 8. Zona noreste
            { x: 13,  y: 1.4, z: -98 },  // 9. Aproximación final
            { x: 17,  y: 1.3, z: -108 }  // 10. Último nodo previo a la salida
        ];
    }

    build(lightSystem) {
        lightSystem.clear();

        // 1. LUCES GUÍA VERDADERAS (Secuencia Continua y Conexa)
        this.guideNodes.forEach((pos, idx) => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'guide',
                color: 0xdaf5ff, // Cian pálido armónico
                sequenceIndex: idx,
                pulseSpeed: 1.8,
                revealDistance: 28,
                flicker: false
            });
        });

        // 2. BIFURCACIÓN 1 - RAMA FALSA NORTE (Callejón que permite retroceder)
        const deadEndNorth = [
            { x: 4,   y: 1.3, z: -26 },
            { x: 10,  y: 1.2, z: -36 },
            { x: 12,  y: 1.4, z: -48 }  // Fin de rama: espacio abierto para dar la vuelta
        ];

        deadEndNorth.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xf0f8ff,
                pulseSpeed: 3.9,
                revealDistance: 22,
                flicker: true
            });
        });

        // 3. BIFURCACIÓN 2 - BUCLE ENGAÑOSO (Conecta con zona explorada)
        // Regresa a la zona de la Bifurcación 1 activando la memoria de ruta
        const loopBackPath = [
            { x: -12, y: 1.3, z: -43 },
            { x: -2,  y: 1.4, z: -45 },
            { x: 6,   y: 1.2, z: -38 },
            { x: 4,   y: 1.3, z: -26 }  // Conecta con la rama norte para alertar de bucle
        ];

        loopBackPath.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xf5f8ff,
                pulseSpeed: 4.1,
                revealDistance: 22,
                flicker: true
            });
        });

        // 4. BIFURCACIÓN 3 - RAMA FALSA NOROESTE
        const northwestFalseBranch = [
            { x: -35, y: 1.3, z: -67 },
            { x: -44, y: 1.2, z: -77 },
            { x: -50, y: 1.4, z: -88 }
        ];

        northwestFalseBranch.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xffeed4,
                pulseSpeed: 4.5,
                revealDistance: 22,
                flicker: true
            });
        });

        // 5. RAMA FALSA SURESTE
        const southeastDeceptive = [
            { x: 18,  y: 1.3, z: -55 },
            { x: 28,  y: 1.2, z: -68 },
            { x: 36,  y: 1.4, z: -78 }
        ];

        southeastDeceptive.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xf2f7ff,
                pulseSpeed: 4.0,
                revealDistance: 22,
                flicker: true
            });
        });

        // 6. CONSTELACIÓN AMBIENTAL
        const ambientNodes = [
            { x: -55, y: 3.8, z: -20 },
            { x: 48,  y: 4.2, z: -30 },
            { x: -45, y: 5.0, z: -110 },
            { x: 45,  y: 3.5, z: -105 },
            { x: -60, y: 2.8, z: -60 },
            { x: 30,  y: 4.8, z: -125 },
            { x: -8,  y: 5.5, z: -135 },
            { x: 55,  y: 3.2, z: -75 }
        ];

        ambientNodes.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'ambient',
                color: 0x627d92,
                pulseSpeed: 1.1,
                revealDistance: 70
            });
        });

        // 7. SALIDA: Conectada a 8.9m del último nodo guía (17, -108)
        lightSystem.setupExitBeacon(
            this.exitPosition.x, 
            this.exitPosition.y, 
            this.exitPosition.z, 
            0xdaf5ff
        );
    }
}
