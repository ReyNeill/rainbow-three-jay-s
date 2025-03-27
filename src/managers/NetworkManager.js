import { io } from "socket.io-client";

export class NetworkManager {
  constructor() {
    this.socket = null;
    this.playerController = null;
    this.otherPlayers = null;
    this.uiManager = null;
    this.syncCallback = null; // Callback to sync collidables after updates
    this.updateInterval = null;
    this.isConnected = false; // Track connection state
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log("Already connected.");
      return;
    }
    if (this.socket && this.socket.connecting) {
      console.log("Connection attempt already in progress.");
      return;
    }

    console.log("Attempting to connect to server...");
    const serverURL = `http://${window.location.hostname}:3000`;

    this.socket = io(serverURL, {});

    this.setupEventListeners();
  }

  // Set references to other components needed for handling events
  setReferences(playerController, otherPlayers, uiManager, syncCallback) {
    this.playerController = playerController;
    this.otherPlayers = otherPlayers;
    this.uiManager = uiManager;
    this.syncCallback = syncCallback; // Store the sync function
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to server with ID:", this.socket.id);
      this.isConnected = true;
      if (this.uiManager) {
        this.uiManager.updateConnectButtonState(true);
      }
      // Start sending player updates periodically
      this.startPlayerUpdateInterval();
    });

    this.socket.on("message", (message) => {
      console.log("Message from server:", message);
      // Optionally display messages via UIManager
      // if (this.uiManager) this.uiManager.showNotification(message, 1500);
    });

    // Handle current players data
    this.socket.on("currentPlayers", (players) => {
      if (!this.otherPlayers) return;
      // Filter out own player before setting players
      const otherPlayersData = {};
      Object.keys(players).forEach((playerId) => {
        if (playerId !== this.socket.id) {
          otherPlayersData[playerId] = players[playerId];
        }
      });
      this.otherPlayers.setPlayers(otherPlayersData);
      if (this.syncCallback) this.syncCallback(); // Sync collidables
    });

    // Handle new player joining
    this.socket.on("newPlayer", (playerData) => {
      if (!this.otherPlayers || playerData.id === this.socket.id) return;
      this.otherPlayers.addPlayer(playerData);
      if (this.syncCallback) this.syncCallback(); // Sync collidables
    });

    // Handle player movement
    this.socket.on("playerMoved", (playerData) => {
      if (!this.otherPlayers) return;
      this.otherPlayers.updatePlayer(playerData);
    });

    // Handle player disconnection
    this.socket.on("playerDisconnected", (playerId) => {
      if (!this.otherPlayers) return;
      this.otherPlayers.removePlayer(playerId);
      if (this.syncCallback) this.syncCallback(); // Sync collidables
    });

    // Handle when player is hit by another player
    this.socket.on("playerHit", (data) => {
      console.log(`Hit by player ${data.shooterId} for ${data.damage} damage`);
      if (this.uiManager) {
        this.uiManager.showHitOverlay();
      }
      // Potentially update local player health if managed client-side too
    });

    // Handle hit confirmation when player successfully hits another player
    this.socket.on("hitConfirmed", (data) => {
      console.log(`Hit player ${data.targetId} for ${data.damage} damage`);
      if (this.uiManager) {
        this.uiManager.showHitMarker();
      }
      // Update the target's health/visuals in OtherPlayers
      if (this.otherPlayers && this.otherPlayers.players[data.targetId]) {
        // Ensure health exists before trying to update
        const targetPlayerData = this.otherPlayers.players[data.targetId];
        targetPlayerData.health =
          data.remainingHealth !== undefined
            ? data.remainingHealth
            : Math.max(0, (targetPlayerData.health || 100) - data.damage);

        this.otherPlayers.updateHealth(data.targetId, targetPlayerData.health);
        this.otherPlayers.showHitEffect(data.targetId);
      }
    });

    // Handle player respawn event (if implemented server-side)
    this.socket.on("playerRespawned", () => {
      console.log("You have respawned.");
      // Potentially reset player state or show a message
      if (this.uiManager) this.uiManager.showNotification("Respawned!", 2000);
      // If health is managed client-side, reset it here
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server.");
      this.isConnected = false;
      if (this.uiManager) {
        this.uiManager.showNotification("Disconnected", 3000);
        this.uiManager.updateConnectButtonState(false);
      }
      if (this.otherPlayers) this.otherPlayers.clear(); // Clear other players on disconnect
      this.stopPlayerUpdateInterval();
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection Error:", error);
      this.isConnected = false;
      if (this.uiManager) {
        this.uiManager.showNotification(
          `Connection Failed: ${error.message}`,
          5000
        );
        this.uiManager.updateConnectButtonState(false);
      }
      this.stopPlayerUpdateInterval();
    });
  }

  startPlayerUpdateInterval(interval = 100) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = setInterval(() => {
      if (this.socket && this.playerController) {
        const position = this.playerController.getPosition();
        const rotation = this.playerController.getRotation();
        const leanAmount = this.playerController.getLeanAmount();

        this.socket.emit("playerUpdate", {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          leanAmount: leanAmount,
        });
      }
    }, interval);
  }

  // Method for other systems to send shot events
  sendPlayerShot(targetId, damage) {
    if (this.socket) {
      this.socket.emit("playerShot", {
        targetId: targetId,
        damage: damage,
      });
      console.log(`Sent shot event for target: ${targetId}`);
    }
  }

  disconnect() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  stopPlayerUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
