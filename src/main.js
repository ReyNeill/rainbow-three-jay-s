import * as THREE from "three";
import { io } from "socket.io-client";
import { PlayerController } from "./components/PlayerController.js";
import { GameMap } from "./components/GameMap.js";
import { OtherPlayers } from "./components/OtherPlayers.js";
import { Crosshair } from "./components/Crosshair.js";
import { WeaponSystem } from "./components/WeaponSystem.js";
import { DummyPlayer } from "./components/DummyPlayer.js";

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, -10); // Position player further forward and lower

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

// Initialize player controller with collidable objects
const playerController = new PlayerController(
  camera,
  renderer.domElement,
  gameMap.getCollidableObjects()
);

// Initialize other players manager
const otherPlayers = new OtherPlayers(scene);

// Initialize crosshair
const crosshair = new Crosshair();
crosshair.hide(); // Hidden until pointer is locked

// Create dummy player for target practice
// Position the dummy player directly in front of starting position
const dummyPlayer = new DummyPlayer(scene, { x: 0, y: 2, z: -15 });

// Add another dummy to the side for easier testing
const dummyPlayer2 = new DummyPlayer(scene, { x: 5, y: 2, z: -15 });

// Socket.io connection
const socket = io();

// Initialize weapon system with collidable objects and socket
const weaponSystem = new WeaponSystem(
  scene,
  camera,
  [...gameMap.getCollidableObjects(), ...otherPlayers.getPlayerObjects()],
  socket
);

// Pass the target instances to weapon system
weaponSystem.targets = gameMap.getTargets();

// Set the dummy players for the weapon system
weaponSystem.setDummyPlayer(dummyPlayer);
// Add the second dummy player's meshes to the weapon system
if (dummyPlayer2) {
  const dummyMeshes = dummyPlayer2.getMeshes();
  weaponSystem.collidableObjects = [
    ...weaponSystem.collidableObjects,
    ...dummyMeshes,
  ];
}

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Manage crosshair visibility based on pointer lock
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === renderer.domElement) {
    crosshair.show();
  } else {
    crosshair.hide();
  }
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

  // Update collidable objects for weapon system to include player meshes
  weaponSystem.setCollidableObjects([
    ...gameMap.getCollidableObjects(),
    ...otherPlayers.getPlayerObjects(),
  ]);
});

// Handle new player joining
socket.on("newPlayer", (playerData) => {
  // Make sure we never add ourselves
  if (playerData.id !== socket.id) {
    otherPlayers.addPlayer(playerData);

    // Update collidable objects for weapon system
    weaponSystem.setCollidableObjects([
      ...gameMap.getCollidableObjects(),
      ...otherPlayers.getPlayerObjects(),
    ]);
  }
});

// Handle player movement
socket.on("playerMoved", (playerData) => {
  otherPlayers.updatePlayer(playerData);
});

// Handle player disconnection
socket.on("playerDisconnected", (playerId) => {
  otherPlayers.removePlayer(playerId);

  // Update collidable objects for weapon system
  weaponSystem.setCollidableObjects([
    ...gameMap.getCollidableObjects(),
    ...otherPlayers.getPlayerObjects(),
  ]);
});

// Handle when player is hit by another player
socket.on("playerHit", (data) => {
  // Add visual/audio feedback for being hit
  console.log(`Hit by player ${data.shooterId} for ${data.damage} damage`);

  // Flash screen red when hit
  const hitOverlay = document.createElement("div");
  hitOverlay.style.position = "absolute";
  hitOverlay.style.top = "0";
  hitOverlay.style.left = "0";
  hitOverlay.style.width = "100%";
  hitOverlay.style.height = "100%";
  hitOverlay.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
  hitOverlay.style.pointerEvents = "none";
  document.body.appendChild(hitOverlay);

  // Remove after a short time
  setTimeout(() => {
    document.body.removeChild(hitOverlay);
  }, 200);
});

// Handle hit confirmation when player successfully hits another player
socket.on("hitConfirmed", (data) => {
  // Play hit marker sound or visual
  console.log(`Hit player ${data.targetId} for ${data.damage} damage`);

  // Show simple hit marker in center of screen
  const hitMarker = document.createElement("div");
  hitMarker.style.position = "absolute";
  hitMarker.style.top = "50%";
  hitMarker.style.left = "50%";
  hitMarker.style.transform = "translate(-50%, -50%)";
  hitMarker.style.width = "20px";
  hitMarker.style.height = "20px";
  hitMarker.style.backgroundImage =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M10 0 L10 20 M0 10 L20 10' stroke='white' stroke-width='2'/%3E%3C/svg%3E\")";
  hitMarker.style.backgroundSize = "contain";
  hitMarker.style.pointerEvents = "none";
  document.body.appendChild(hitMarker);

  // Remove after a short time
  setTimeout(() => {
    document.body.removeChild(hitMarker);
  }, 100);

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

// Add helper text for testing shooting mechanics
const testingInstructions = document.createElement("div");
testingInstructions.style.position = "absolute";
testingInstructions.style.top = "20px";
testingInstructions.style.left = "20px";
testingInstructions.style.color = "white";
testingInstructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
testingInstructions.style.padding = "10px";
testingInstructions.style.borderRadius = "5px";
testingInstructions.style.fontWeight = "bold";
testingInstructions.style.fontSize = "16px";
testingInstructions.style.zIndex = "1000";
testingInstructions.innerHTML = `
  <h3 style="color: #ff9900; margin: 0 0 10px 0;">Shooting Test Arena</h3>
  <p>- Look for the <span style="color: yellow;">YELLOW</span> dummy players</p>
  <p>- Try to hit the <span style="color: red;">RED</span> moving targets - they respawn after 5 seconds</p>
  <p>- Click to lock pointer and enable shooting</p>
  <p>- WASD to move, Space to vault over obstacles</p>
  <p>- Q/E to lean left/right</p>
  <p>- Left-click to shoot targets and dummies</p>
`;
document.body.appendChild(testingInstructions);

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

  // Update weapon system if needed
  weaponSystem.update();

  // Render the scene
  renderer.render(scene, camera);
}

animate(0);
