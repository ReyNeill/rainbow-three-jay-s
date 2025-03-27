import * as THREE from "three";
import { PlayerController } from "./components/PlayerController.js";
import { GameMap } from "./components/GameMap.js";
import { OtherPlayers } from "./components/OtherPlayers.js";
import { WeaponSystem } from "./components/WeaponSystem.js";
import { DummyPlayer } from "./components/DummyPlayer.js";
import { InputManager } from "./managers/InputManager.js";
import { UIManager } from "./managers/UIManager.js";
import { NetworkManager } from "./managers/NetworkManager.js";

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background
scene.userData.camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// camera.position.set(0, 2, -10); // This initial position is overridden by PlayerController anyway

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById("app").appendChild(renderer.domElement);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0x808080, 1.5); // Brighter ambient light
scene.add(ambientLight);

// Add a spotlight pointing at the dummy players
const spotLight = new THREE.SpotLight(0xffffff, 2);
spotLight.position.set(0, 10, -5);
spotLight.target.position.set(0, 0, -15); // Point at dummy players
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.2;
scene.add(spotLight);
scene.add(spotLight.target);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional light
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Create game map
const gameMap = new GameMap(scene);

// Initialize managers
const inputManager = new InputManager(renderer.domElement);
const uiManager = new UIManager();
const networkManager = new NetworkManager();

// Initialize player controller
const playerController = new PlayerController(
  scene.userData.camera,
  renderer.domElement,
  gameMap.getCollidableObjects(),
  inputManager,
  uiManager,
  scene
);

// Initialize other players manager
const otherPlayers = new OtherPlayers(scene);

// Create dummy players
const dummyPlayer = new DummyPlayer(scene, { x: 0, y: 0.8, z: -15 });
const dummyPlayer2 = new DummyPlayer(scene, { x: 5, y: 0.8, z: -15 });

// Initialize weapon system
const weaponSystem = new WeaponSystem(
  scene,
  scene.userData.camera,
  gameMap.getCollidableObjects(),
  networkManager,
  inputManager,
  uiManager,
  dummyPlayer,
  playerController.getFPGun(),
  playerController
);
weaponSystem.targets = gameMap.getTargets();

// Sync function
function syncCollidableObjects() {
  const allCollidables = [
    ...gameMap.getCollidableObjects(),
    ...otherPlayers.getPlayerObjects(),
    ...dummyPlayer.getMeshes(),
    ...(dummyPlayer2 ? dummyPlayer2.getMeshes() : []),
  ];

  playerController.setCollidableObjects(allCollidables);
  weaponSystem.setCollidableObjects(allCollidables);
}
syncCollidableObjects(); // Initial sync

// --- Networking Setup ---
networkManager.setReferences(
  playerController,
  otherPlayers,
  uiManager,
  syncCollidableObjects
);

// --- Set Connect Callback in UIManager ---
// Provide the function to call when the connect button is clicked
uiManager.setConnectCallback(networkManager.connect.bind(networkManager));

// --- End Networking Setup ---

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  scene.userData.camera.aspect = width / height;
  scene.userData.camera.updateProjectionMatrix();
});

// Manage UI visibility based on pointer lock using UIManager
document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === renderer.domElement;
  uiManager.handlePointerLockChange(isLocked);
});

// Game loop variables
let lastTime = 0;
let lastLeanMode = playerController.leanMode; // Track lean mode for UI update

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);

  const deltaTime = (time - lastTime) / 1000 || 0;
  lastTime = time;

  // Update player controller
  playerController.update(deltaTime);

  // --- Update Player Models (Animations & Health Bars) ---
  const allPlayerModels = [
    ...otherPlayers.getAllModels(),
    dummyPlayer.getModel(),
    dummyPlayer2.getModel(),
  ].filter((model) => model); // Filter out null/undefined models

  allPlayerModels.forEach((model) => {
    model.update(deltaTime); // Update mixer and health bar billboard
  });
  // --- End Update Player Models ---

  // Update Lean Mode Display (Optional)
  if (playerController.leanMode !== lastLeanMode) {
    lastLeanMode = playerController.leanMode;
    const leanModeDisplay = document.getElementById("lean-mode-display");
    if (leanModeDisplay) {
      leanModeDisplay.textContent = lastLeanMode.toUpperCase();
    }
    // UIManager.showNotification is already called in PlayerController
  }

  // Update moving targets
  gameMap.updateTargets(deltaTime);

  // Update weapon system
  weaponSystem.update();

  // Render the scene
  renderer.render(scene, scene.userData.camera);

  // Update Input Manager
  inputManager.update();
}

animate(0); // Start the loop
