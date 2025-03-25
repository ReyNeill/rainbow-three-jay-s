import * as THREE from "three";
import { io } from "socket.io-client";
import { PlayerController } from "./components/PlayerController.js";
import { GameMap } from "./components/GameMap.js";
import { OtherPlayers } from "./components/OtherPlayers.js";

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
camera.position.set(0, 2, 15); // Set initial player position

// Initialize the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById("app").appendChild(renderer.domElement);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
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

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Socket.io connection
const socket = io();

// Socket.io event handlers
socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);

  // Send player position to server periodically
  setInterval(() => {
    const position = playerController.getPosition();
    const rotation = playerController.getRotation();

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
});

// Handle new player joining
socket.on("newPlayer", (playerData) => {
  // Make sure we never add ourselves
  if (playerData.id !== socket.id) {
    otherPlayers.addPlayer(playerData);
  }
});

// Handle player movement
socket.on("playerMoved", (playerData) => {
  otherPlayers.updatePlayer(playerData);
});

// Handle player disconnection
socket.on("playerDisconnected", (playerId) => {
  otherPlayers.removePlayer(playerId);
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

  // Render the scene
  renderer.render(scene, camera);
}

animate(0);
