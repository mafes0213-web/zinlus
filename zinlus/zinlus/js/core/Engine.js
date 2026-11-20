/**
 * ZINLUS - Engine
 * Motor principal de renderizado 3D y WebXR con Three.js.
 * 
 * Gestiona:
 * - Ciclo de renderizado continuo (renderer.setAnimationLoop para WebXR)
 * - Escena abstracta completamente negra con sutil niebla exponencial
 * - Suelo reflectivo ultratenue y partículas sutiles de polvo en el vacío
 * - Sincronización entre modo Desktop y Meta Quest 2
 * - LightSystem, DesktopControls, VRControls
 */

import { LightSystem } from '../lighting/LightSystem.js';
import { DesktopControls } from '../controls/DesktopControls.js';
import { VRControls } from '../controls/VRControls.js';

export class Engine {
    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.clock = new THREE.Clock();

        // 1. Renderizador WebGL optimizado para VR
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.xr.enabled = true; // Activar WebXR
        this.container.appendChild(this.renderer.domElement);

        // 2. Escena abstracta y vacía
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Negro puro
        this.scene.fog = new THREE.FogExp2(0x000000, 0.012); // Niebla sutil para desvanecer luces lejanas

        // 3. Cámara y Camera Rig (Dolly) para VR y PC
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraRig = new THREE.Group();
        this.cameraRig.position.set(0, 0, 0);
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);

        // 4. Superficie sutil del vacío (Piso abstracto)
        this.initGround();

        // 5. Partículas sutiles de polvo espacial (permiten percibir velocidad en la oscuridad)
        this.initDustParticles();

        // 6. Sistema de iluminación
        this.lightSystem = new LightSystem(this.scene);
        this.lightSystem.attachFlashToCamera(this.camera);

        // Referencias a controladores (se inician en setup)
        this.desktopControls = null;
        this.vrControls = null;
        this.gameState = null;
        this.soundManager = null;

        // Gestión de redimensionamiento de ventana
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Crea un plano de suelo oscuro que solo refleja tenuemente las luces cercanas
     */
    initGround() {
        const groundGeo = new THREE.PlaneGeometry(500, 500, 1, 1);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x020203,
            roughness: 0.95,
            metalness: 0.05
        });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = 0;
        groundMesh.receiveShadow = false;
        this.scene.add(groundMesh);
    }

    /**
     * Partículas sutiles flotantes a ras de suelo para dar anclaje de movimiento
     */
    initDustParticles() {
        const count = 400;
        const positions = new Float32Array(count * 3);
        const range = 160;

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * range;
            positions[i * 3 + 1] = 0.05 + Math.random() * 2.5; // Cerca del suelo
            positions[i * 3 + 2] = (Math.random() - 0.5) * range;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x334455,
            size: 0.04,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        this.dustParticles = new THREE.Points(geo, mat);
        this.scene.add(this.dustParticles);
    }

    /**
     * Vincula los controladores y el gestor de estados
     */
    setupControls(gameState, soundManager) {
        this.gameState = gameState;
        this.soundManager = soundManager;

        // Controles de escritorio
        this.desktopControls = new DesktopControls(
            this.camera, 
            this.renderer.domElement,
            () => this.gameState.pauseGame(),
            () => this.gameState.restartCurrentLevel()
        );

        // Controles de Realidad Virtual
        this.vrControls = new VRControls(
            this.renderer,
            this.scene,
            this.cameraRig,
            this.camera,
            () => this.gameState.togglePause()
        );

        // Conectar interacción de selección en VR con el panel de UI
        this.vrControls.setSelectCallback(() => {
            if (this.gameState.uiManager) {
                this.gameState.uiManager.handleVRSelect();
            }
        });
    }

    resetPlayerPosition(newPos) {
        this.cameraRig.position.set(newPos.x, 0, newPos.z);
        this.camera.position.set(newPos.x, newPos.y, newPos.z);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Inicia el ciclo principal de renderizado compatible con WebXR
     */
    startRenderLoop() {
        this.renderer.setAnimationLoop((time, frame) => {
            this.render(time, frame);
        });
    }

    render(time, frame) {
        const delta = Math.min(this.clock.getDelta(), 0.1); // Proteger de saltos de delta

        if (this.gameState && this.gameState.currentState === 'PLAYING') {
            // Actualizar controles según modo activo
            if (this.renderer.xr.isPresenting) {
                this.vrControls.update(delta, this.gameState.playerPosition, this.soundManager);
            } else {
                this.desktopControls.update(delta, this.gameState.playerPosition, this.soundManager);
            }

            // Actualizar sistema de iluminación
            this.lightSystem.update(
                delta, 
                this.gameState.playerPosition, 
                this.gameState.currentLevelIndex, 
                this.soundManager
            );

            // Actualizar lógica de estado (condiciones de victoria, límites)
            this.gameState.update(delta);
        }

        // Renderizar la escena (WebXR se encarga automáticamente de estéreo si isPresenting)
        this.renderer.render(this.scene, this.camera);
    }
}
