import * as THREE from "three";
import { io } from "socket.io-client";
import { PlayerController } from "./components/PlayerController.js";
import { GameMap } from "./components/GameMap.js";
import { OtherPlayers } from "./components/OtherPlayers.js";
import { WeaponSystem } from "./components/WeaponSystem.js";
import { DummyPlayer } from "./components/DummyPlayer.js";
import { InputManager } from "./managers/InputManager.js";
import { UIManager } from "./managers/UIManager.js";

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
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

// Initialize player controller with managers AND scene
const playerController = new PlayerController(
  camera,
  renderer.domElement,
  gameMap.getCollidableObjects(),
  inputManager,
  uiManager,
  scene // Pass scene reference
);

// Initialize other players manager
const otherPlayers = new OtherPlayers(scene);

// Create dummy player for target practice
// Position the dummy player directly in front of starting position
const dummyPlayer = new DummyPlayer(scene, { x: 0, y: 0.8, z: -15 });

// Add another dummy to the side for easier testing
const dummyPlayer2 = new DummyPlayer(scene, { x: 5, y: 0.8, z: -15 });

// Add dummy players to player controller's collidable objects
const dummyMeshes1 = dummyPlayer.getMeshes();
const dummyMeshes2 = dummyPlayer2.getMeshes();
// Update the player controller's collidable objects to include dummy players
playerController.setCollidableObjects([
  ...gameMap.getCollidableObjects(),
  ...dummyMeshes1,
  ...dummyMeshes2,
]);

// Socket.io connection
const socket = io();

// Initialize weapon system with managers
const weaponSystem = new WeaponSystem(
  scene,
  camera,
  [],
  socket,
  inputManager,
  uiManager,
  dummyPlayer
);

// Pass the target instances to weapon system
weaponSystem.targets = gameMap.getTargets();

// Sync function to ensure weapon system and player controller have the same collidable objects
function syncCollidableObjects() {
  // Get all collidable objects from all sources
  const allCollidables = [
    ...gameMap.getCollidableObjects(),
    ...otherPlayers.getPlayerObjects(),
    ...dummyPlayer.getMeshes(),
    ...(dummyPlayer2 ? dummyPlayer2.getMeshes() : []),
  ];

  // Update both systems
  playerController.setCollidableObjects(allCollidables);
  weaponSystem.setCollidableObjects(allCollidables);
}

// Initial sync
syncCollidableObjects();

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Manage UI visibility based on pointer lock using UIManager
document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === renderer.domElement;
  uiManager.handlePointerLockChange(isLocked);
});

// Socket.io event handlers
socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);

  // Send player position to server periodically
  setInterval(() => {
    const position = playerController.getPosition();
    const rotation = playerController.getRotation();
    const leanAmount = playerController.getLeanAmount();

    socket.emit("playerUpdate", {
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
      },
      leanAmount: leanAmount,
    });
  }, 100); // Send update every 100ms
});

socket.on("message", (message) => {
  console.log("Message from server:", message);
});

// Handle current players data
socket.on("currentPlayers", (players) => {
  // Filter out own player before setting players
  const otherPlayersData = {};
  Object.keys(players).forEach((playerId) => {
    if (playerId !== socket.id) {
      otherPlayersData[playerId] = players[playerId];
    }
  });

  // Only add other players, not ourselves
  otherPlayers.setPlayers(otherPlayersData);

  // Update collidable objects
  syncCollidableObjects();
});

// Handle new player joining
socket.on("newPlayer", (playerData) => {
  // Make sure we never add ourselves
  if (playerData.id !== socket.id) {
    otherPlayers.addPlayer(playerData);

    // Update collidable objects
    syncCollidableObjects();
  }
});

// Handle player movement
socket.on("playerMoved", (playerData) => {
  otherPlayers.updatePlayer(playerData);
});

// Handle player disconnection
socket.on("playerDisconnected", (playerId) => {
  otherPlayers.removePlayer(playerId);

  // Update collidable objects
  syncCollidableObjects();
});

// Handle when player is hit by another player
socket.on("playerHit", (data) => {
  // Add visual/audio feedback for being hit
  console.log(`Hit by player ${data.shooterId} for ${data.damage} damage`);

  // Flash screen red when hit
  uiManager.showHitOverlay();
});

// Handle hit confirmation when player successfully hits another player
socket.on("hitConfirmed", (data) => {
  // Play hit marker sound or visual
  console.log(`Hit player ${data.targetId} for ${data.damage} damage`);

  // Show simple hit marker in center of screen
  uiManager.showHitMarker();

  // Update the target's health in the OtherPlayers component for visual feedback
  if (otherPlayers.players[data.targetId]) {
    otherPlayers.players[data.targetId].health =
      data.remainingHealth ||
      Math.max(
        0,
        (otherPlayers.players[data.targetId].health || 100) - data.damage
      );
    otherPlayers.updateHealth(
      data.targetId,
      otherPlayers.players[data.targetId].health
    );
    otherPlayers.showHitEffect(data.targetId);
  }
});

// Game loop variables
let lastTime = 0;

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);

  // Calculate delta time in seconds
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  // Update player controller
  playerController.update(deltaTime);

  // Update moving targets
  gameMap.updateTargets(deltaTime);

  // Update weapon system
  weaponSystem.update();

  // Render the scene
  renderer.render(scene, camera);

  // Update Input Manager (call at the end of the frame)
  inputManager.update();
}

animate(0);
