import * as THREE from "three";

export class OtherPlayers {
  constructor(scene) {
    this.scene = scene;
    this.players = {};
    this.playerMeshes = {};

    // Material for each team
    this.teamMaterials = {
      red: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      blue: new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    };
  }

  addPlayer(playerData) {
    // Store player data
    this.players[playerData.id] = playerData;

    // Create player mesh
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material =
      this.teamMaterials[playerData.team] || this.teamMaterials.red;

    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.set(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );

    this.scene.add(playerMesh);
    this.playerMeshes[playerData.id] = playerMesh;
  }

  updatePlayer(playerData) {
    // Update stored player data
    if (this.players[playerData.id]) {
      this.players[playerData.id].position = playerData.position;
      this.players[playerData.id].rotation = playerData.rotation;

      // Update player mesh position and rotation
      if (this.playerMeshes[playerData.id]) {
        this.playerMeshes[playerData.id].position.set(
          playerData.position.x,
          playerData.position.y,
          playerData.position.z
        );

        // Apply rotation (convert from Euler angles if needed)
        if (playerData.rotation) {
          this.playerMeshes[playerData.id].rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
          );
        }
      }
    }
  }

  removePlayer(playerId) {
    // Remove player mesh from scene
    if (this.playerMeshes[playerId]) {
      this.scene.remove(this.playerMeshes[playerId]);
      delete this.playerMeshes[playerId];
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
    // Remove all player meshes from scene
    Object.keys(this.playerMeshes).forEach((playerId) => {
      this.scene.remove(this.playerMeshes[playerId]);
    });

    // Reset players and meshes
    this.players = {};
    this.playerMeshes = {};
  }
}
