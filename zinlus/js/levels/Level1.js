/**
 * ZINLUS - Nivel 1: Desorientación (Equilibrado)
 * Dificultad: Moderada y justa.
 * 
 * - Secuencia de 11 nodos guía en zigzag continuo y garantizado.
 * - Distancias entre nodos de 10 a 13 metros (perfectamente conectadas y visibles).
 * - Distractoras sutiles que enseñan a discernir el ritmo armónico.
 * - Salida garantizada y funcional camuflada al final del recorrido en (14, 0, -109).
 * - Ambiente sonoro: Bosque nocturno.
 */

import { LevelBase } from './LevelBase.js';

export class Level1 extends LevelBase {
    constructor() {
        super(
            1, 
            'DESORIENTACIÓN', 
            'Nivel 1', 
            'Aprende a reconocer la respiración armónica de las luces guía. La salida aguarda al final del recorrido.'
        );
        this.playerStartPosition.set(0, 1.6, 0);
        this.exitPosition.set(14, 0, -109);
        this.boundaryRadius = 135;

        // Secuencia guía conexa y matemáticamente garantizada
        this.guideNodes = [
            { x: 0,   y: 1.2, z: -8 },   // 0. Inicio
            { x: -8,  y: 1.3, z: -17 },  // 1. Giro oeste
            { x: -15, y: 1.2, z: -27 },  // 2. Oeste medio
            { x: -8,  y: 1.4, z: -36 },  // 3. Vuelve al centro
            { x: 3,   y: 1.2, z: -44 },  // 4. Cruza al este
            { x: 13,  y: 1.3, z: -53 },  // 5. Este medio
            { x: 11,  y: 1.2, z: -64 },  // 6. Gira al norte
            { x: 1,   y: 1.4, z: -73 },  // 7. Centro-oeste
            { x: -8,  y: 1.3, z: -82 },  // 8. Extremo oeste
            { x: -3,  y: 1.2, z: -92 },  // 9. Se aproxima a la salida
            { x: 6,   y: 1.3, z: -101 }  // 10. Último nodo previo a la salida
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
                color: 0xdff5ff, // Cian cristalino puro
                sequenceIndex: idx,
                pulseSpeed: 1.8,
                revealDistance: 28,
                flicker: false
            });
        });

        // 2. LUCES DISTRACTORAS DE APRENDIZAJE (Pocas y diferenciadas por parpadeo)
        // Desvíos leves que permiten regresar con facilidad
        const distractors = [
            { x: 10,  y: 1.3, z: -14 },  // Desvío este leve
            { x: -22, y: 1.4, z: -30 },  // Desvío oeste
            { x: 22,  y: 1.3, z: -58 },  // Desvío este
            { x: -16, y: 1.2, z: -88 }   // Desvío noroeste
        ];

        distractors.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xffe8a0, // Ámbar cálido con parpadeo
                pulseSpeed: 3.8,
                revealDistance: 24,
                flicker: true
            });
        });

        // 3. LUCES AMBIENTALES DE PROFUNDIDAD
        const ambientNodes = [
            { x: -40, y: 3.5, z: -20 },
            { x: 38,  y: 4.0, z: -35 },
            { x: -45, y: 2.8, z: -75 },
            { x: 42,  y: 4.5, z: -95 },
            { x: -30, y: 3.2, z: -115 }
        ];

        ambientNodes.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'ambient',
                color: 0x5a758a,
                pulseSpeed: 0.9,
                revealDistance: 65
            });
        });

        // 4. SALIDA: Conectada a 11 metros del nodo 10, florece al llegar a < 5m
        lightSystem.setupExitBeacon(
            this.exitPosition.x, 
            this.exitPosition.y, 
            this.exitPosition.z, 
            0xdff5ff
        );
    }
}
