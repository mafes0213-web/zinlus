/**
 * ZINLUS - LevelBase
 * Clase base para la definición de niveles abstractos y oscuros.
 * 
 * Incluye validación matemática de conectividad para garantizar que
 * la salida siempre sea alcanzable sin interrupciones.
 */

export class LevelBase {
    constructor(number, name, subtitle, description) {
        this.number = number;
        this.name = name;
        this.subtitle = subtitle;
        this.description = description;
        this.playerStartPosition = new THREE.Vector3(0, 1.6, 0);
        this.exitPosition = new THREE.Vector3(0, 0, -60);
        this.boundaryRadius = 130;
        this.guideNodes = []; // Almacena las coordenadas de los nodos guía del nivel
    }

    /**
     * Construye las luces y el portal de salida en el LightSystem
     * @param {LightSystem} lightSystem 
     */
    build(lightSystem) {
        throw new Error('El método build() debe ser implementado por la subclase de nivel.');
    }

    /**
     * Valida automáticamente que exista una ruta continua, conexa y alcanzable
     * desde el punto de inicio hasta el portal de salida
     * @returns {boolean} true si el nivel es 100% transitable y continuo
     */
    validateConnectivity(maxStepDistance = 15.0) {
        if (!this.guideNodes || this.guideNodes.length === 0) {
            console.error(`Nivel ${this.number}: No tiene nodos guía definidos.`);
            return false;
        }

        // 1. Validar conexión inicial desde el spawn al nodo 0
        const distToStart = Math.hypot(
            this.guideNodes[0].x - this.playerStartPosition.x,
            this.guideNodes[0].z - this.playerStartPosition.z
        );
        if (distToStart > maxStepDistance) {
            console.error(`Nivel ${this.number}: Distancia inicial demasiado lejana (${distToStart.toFixed(1)}m > ${maxStepDistance}m)`);
            return false;
        }

        // 2. Validar cada paso intermedio
        for (let i = 0; i < this.guideNodes.length - 1; i++) {
            const current = this.guideNodes[i];
            const next = this.guideNodes[i + 1];
            const stepDist = Math.hypot(next.x - current.x, next.z - current.z);
            if (stepDist > maxStepDistance) {
                console.error(`Nivel ${this.number}: Salto interrumpido entre nodo ${i} y ${i+1} (${stepDist.toFixed(1)}m > ${maxStepDistance}m)`);
                return false;
            }
        }

        // 3. Validar conexión terminal del último nodo con la salida
        const lastNode = this.guideNodes[this.guideNodes.length - 1];
        const distToExit = Math.hypot(
            this.exitPosition.x - lastNode.x,
            this.exitPosition.z - lastNode.z
        );
        if (distToExit > maxStepDistance) {
            console.error(`Nivel ${this.number}: Salida desconectada del último nodo (${distToExit.toFixed(1)}m > ${maxStepDistance}m)`);
            return false;
        }

        return true;
    }

    /**
     * Comprueba límites del espacio y redirige suavemente al jugador
     */
    checkBounds(playerPos) {
        const distFromCenter = Math.hypot(playerPos.x, playerPos.z);
        if (distFromCenter > this.boundaryRadius) {
            const angle = Math.atan2(playerPos.z, playerPos.x);
            playerPos.x = Math.cos(angle) * (this.boundaryRadius - 0.5);
            playerPos.z = Math.sin(angle) * (this.boundaryRadius - 0.5);
            return true;
        }
        return false;
    }
}
