/**
 * ZINLUS - Nivel 3: Caos (Equilibrado)
 * Dificultad: Alta.
 * 
 * - Secuencia de 12 nodos guía con lógica continua, garantizada y conexa.
 * - Estímulos efímeros que desaparecen y reaparecen (poniendo a prueba la atención).
 * - Destellos blancos que exigen retención de la memoria espacial.
 * - Sistema de pistas y asistencia activa si el jugador no avanza en >30s.
 * - Salida garantizada en (30, 0, -128), a 9.4m del último nodo guía.
 * - Ambiente sonoro: Ciudad caótica (tráfico denso, bocinas, sirenas).
 */

import { LevelBase } from './LevelBase.js';

export class Level3 extends LevelBase {
    constructor() {
        super(
            3, 
            'CAOS', 
            'Nivel 3', 
            'La sobreestimulación oculta el patrón. Recuerda la respiración pura y el stardust en el suelo.'
        );
        this.playerStartPosition.set(0, 1.6, 0);
        this.exitPosition.set(30, 0, -128);
        this.boundaryRadius = 165;

        // Secuencia guía conexa y matemáticamente garantizada (saltos < 14.5m)
        this.guideNodes = [
            { x: 0,   y: 1.2, z: -8 },   // 0. Inicio
            { x: 8,   y: 1.3, z: -17 },  // 1. Desvío este
            { x: 17,  y: 1.2, z: -27 },  // 2. Este medio
            { x: 16,  y: 1.4, z: -39 },  // 3. Gira al centro
            { x: 7,   y: 1.3, z: -49 },  // 4. Centro
            { x: -3,  y: 1.2, z: -59 },  // 5. Rumbo oeste
            { x: -12, y: 1.4, z: -69 },  // 6. Extremo oeste
            { x: -10, y: 1.3, z: -80 },  // 7. Gira al norte
            { x: 0,   y: 1.2, z: -90 },  // 8. Cruza al centro
            { x: 9,   y: 1.4, z: -100 }, // 9. Rumbo este
            { x: 18,  y: 1.3, z: -110 }, // 10. Este medio
            { x: 25,  y: 1.2, z: -120 }  // 11. Último nodo previo a la salida
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
                color: 0xebfaff, // Blanco hielo puro
                sequenceIndex: idx,
                pulseSpeed: 1.9,
                revealDistance: 28,
                flicker: false
            });
        });

        // 2. RAMA EFÍMERA VIOLETA (Desaparecen y reaparecen cada 6s)
        const violetEphemeral = [
            { x: -10, y: 1.3, z: -18 },
            { x: -20, y: 1.4, z: -28 },
            { x: -28, y: 1.2, z: -40 },
            { x: -36, y: 1.5, z: -54 },
            { x: -44, y: 1.2, z: -68 }
        ];

        violetEphemeral.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xd980fa, // Violeta eléctrico
                pulseSpeed: 5.0,
                revealDistance: 22,
                flicker: true,
                disappearInterval: 6.0
            });
        });

        // 3. RAMA TRANSVERSAL NARANJA (Desaparece cada 8.5s)
        const orangeTransversal = [
            { x: 28,  y: 1.3, z: -24 },
            { x: 34,  y: 1.2, z: -38 },
            { x: 36,  y: 1.4, z: -52 },
            { x: 30,  y: 1.3, z: -66 },
            { x: 20,  y: 1.2, z: -80 }
        ];

        orangeTransversal.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xffa834, // Naranja
                pulseSpeed: 4.6,
                revealDistance: 22,
                flicker: true,
                disappearInterval: 8.5
            });
        });

        // 4. BUCLE ENGAÑOSO ESMERALDA (Retorno hacia centro)
        const emeraldLoop = [
            { x: -22, y: 1.3, z: -74 },
            { x: -26, y: 1.2, z: -62 },
            { x: -20, y: 1.4, z: -50 },
            { x: -10, y: 1.3, z: -44 }  // Conecta de regreso
        ];

        emeraldLoop.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0x55efc4, // Menta engañoso
                pulseSpeed: 3.8,
                revealDistance: 22,
                flicker: true
            });
        });

        // 5. CALLEJÓN ENGAÑOSO NORTE (Calle sin salida abierta)
        const northDeadEnd = [
            { x: -6,  y: 1.3, z: -105 },
            { x: -12, y: 1.2, z: -116 },
            { x: -16, y: 1.4, z: -128 },
            { x: -10, y: 1.3, z: -138 }
        ];

        northDeadEnd.forEach(pos => {
            lightSystem.addLight({
                x: pos.x,
                y: pos.y,
                z: pos.z,
                type: 'distractor',
                color: 0xffe28a,
                pulseSpeed: 4.4,
                revealDistance: 22,
                flicker: true
            });
        });

        // 6. CONSTELACIÓN AMBIENTAL DE PROFUNDIDAD
        const ambientCoords = [
            [-45, 4.2, -15], [-60, 3.8, -40], [-65, 5.0, -80], [-55, 4.5, -120],
            [40, 5.5, -15],  [55, 4.0, -45],  [65, 3.5, -85],  [58, 4.8, -125],
            [-20, 6.5, -100], [0, 7.0, -120], [-15, 5.8, -145], [18, 6.2, -150],
            [-30, 4.8, -60], [25, 4.2, -70],  [-45, 3.0, -130], [12, 6.0, -35]
        ];

        ambientCoords.forEach((coord, idx) => {
            const colors = [0x6c7a89, 0x819090, 0x596275, 0x778ca3];
            lightSystem.addLight({
                x: coord[0],
                y: coord[1],
                z: coord[2],
                type: 'ambient',
                color: colors[idx % colors.length],
                pulseSpeed: 0.8 + (idx % 4) * 0.25,
                revealDistance: 65
            });
        });

        // 7. SALIDA: Conectada a 9.4m del nodo 11 (25, -120), florece al llegar a < 5m
        lightSystem.setupExitBeacon(
            this.exitPosition.x, 
            this.exitPosition.y, 
            this.exitPosition.z, 
            0xebfaff
        );
    }
}
