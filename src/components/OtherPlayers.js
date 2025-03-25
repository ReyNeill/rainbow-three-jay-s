import * as THREE from "three";
import { PlayerModel } from "../models/PlayerModel.js"; // Import PlayerModel

export class OtherPlayers {
  constructor(scene) {
    this.scene = scene;
    this.players = {}; // Stores player data from server { id: { position, rotation, leanAmount, team, health } }
    this.playerModels = {}; // Stores PlayerModel instances { id: PlayerModel }

    // Materials are now handled by PlayerModel based on team option
    // Lean parameters are now handled by PlayerModel
  }

  addPlayer(playerData) {
    // Store player data
    this.players[playerData.id] = playerData;

    // Create player model using PlayerModel
    const model = new PlayerModel(this.scene, playerData.position, {
      team: playerData.team,
      playerId: playerData.id,
      health: playerData.health !== undefined ? playerData.health : 100,
    });

    // Store the model instance
    this.playerModels[playerData.id] = model;

    // Apply initial rotation and lean if provided
    model.updatePosition(
      playerData.position,
      playerData.rotation,
      playerData.leanAmount
    );

    // Initial health update (already handled by constructor, but good practice)
    if (playerData.health !== undefined) {
      model.updateHealth(playerData.health);
    }
  }

  // Remove old createHealthBar method - PlayerModel handles this

  updateHealth(playerId, health) {
    if (this.playerModels[playerId]) {
      this.playerModels[playerId].updateHealth(health);
    }
    // Update stored data as well
    if (this.players[playerId]) {
      this.players[playerId].health = health;
    }
  }

  showHitEffect(playerId) {
    if (this.playerModels[playerId]) {
      this.playerModels[playerId].showHitEffect();
    }
  }

  updatePlayer(playerData) {
    // Update stored player data
    if (this.players[playerData.id]) {
      this.players[playerData.id] = {
        ...this.players[playerData.id], // Keep existing data like team
        ...playerData, // Overwrite with new data (position, rotation, lean, health)
      };

      // Update the corresponding PlayerModel instance
      if (this.playerModels[playerData.id]) {
        const model = this.playerModels[playerData.id];
        model.updatePosition(
          playerData.position,
          playerData.rotation,
          playerData.leanAmount
        );

        // Update health if provided
        if (playerData.health !== undefined) {
          model.updateHealth(playerData.health);
        }
      }
    } else {
      // If player doesn't exist locally yet, add them
      this.addPlayer(playerData);
    }
  }

  // Remove old applyLean method - PlayerModel handles this

  removePlayer(playerId) {
    // Remove player model from scene and dispose
    if (this.playerModels[playerId]) {
      this.playerModels[playerId].dispose(); // Use the model's dispose method
      delete this.playerModels[playerId];
    }

    // Remove player data
    if (this.players[playerId]) {
      delete this.players[playerId];
    }
  }

  setPlayers(players) {
    // Clear existing players
    this.clear();

    // Add all players
    Object.values(players).forEach((playerData) => {
      this.addPlayer(playerData);
    });
  }

  clear() {
    // Remove all player models from scene and dispose
    Object.values(this.playerModels).forEach((model) => {
      model.dispose();
    });

    // Reset players and models
    this.players = {};
    this.playerModels = {};
  }

  // Return all player meshes for hit detection
  getPlayerObjects() {
    const playerObjects = [];

    Object.values(this.playerModels).forEach((model) => {
      // Get meshes from the PlayerModel instance
      playerObjects.push(...model.getMeshes());
    });

    return playerObjects;
  }
}
