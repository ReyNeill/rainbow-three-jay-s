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

    // Lean parameters
    this.maxLeanAngle = Math.PI / 12; // ~15 degrees
    this.maxLeanOffset = 0.75; // How far to move the mesh sideways when leaning
  }

  addPlayer(playerData) {
    // Store player data
    this.players[playerData.id] = playerData;

    // Create player mesh (the actual visible character)
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material =
      this.teamMaterials[playerData.team] || this.teamMaterials.red;
    const playerMesh = new THREE.Mesh(geometry, material);

    // Head mesh (to make it clearer which way the player is facing)
    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, 1.3, 0.3); // Position at the top front of the body
    playerMesh.add(headMesh);

    // Create a group to hold the player mesh (allows for applying lean without moving position)
    const playerGroup = new THREE.Group();
    playerGroup.add(playerMesh);

    // Set initial position from player data
    playerGroup.position.set(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );

    // Set initial rotation
    if (playerData.rotation) {
      playerGroup.rotation.set(
        playerData.rotation.x,
        playerData.rotation.y,
        playerData.rotation.z
      );
    }

    // Apply lean if present (visual effect only)
    if (playerData.leanAmount !== undefined) {
      this.applyLean(playerMesh, playerData.leanAmount);
    }

    this.scene.add(playerGroup);
    this.playerMeshes[playerData.id] = { group: playerGroup, mesh: playerMesh };
  }

  updatePlayer(playerData) {
    // Update stored player data
    if (this.players[playerData.id]) {
      this.players[playerData.id].position = playerData.position;
      this.players[playerData.id].rotation = playerData.rotation;

      if (playerData.leanAmount !== undefined) {
        this.players[playerData.id].leanAmount = playerData.leanAmount;
      }

      // Update player mesh position and rotation
      if (this.playerMeshes[playerData.id]) {
        const { group, mesh } = this.playerMeshes[playerData.id];

        // Update position - set directly to what server sent
        group.position.set(
          playerData.position.x,
          playerData.position.y,
          playerData.position.z
        );

        // Apply rotation
        if (playerData.rotation) {
          group.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
          );
        }

        // Apply lean as a visual effect only
        if (playerData.leanAmount !== undefined) {
          this.applyLean(mesh, playerData.leanAmount);
        }
      }
    }
  }

  applyLean(mesh, leanAmount) {
    // Reset mesh position and rotation relative to its parent group
    mesh.position.set(0, 0, 0);
    mesh.rotation.z = 0;

    // Apply rotation for leaning
    mesh.rotation.z = -leanAmount * this.maxLeanAngle;

    // Apply horizontal offset for leaning (visual effect only)
    mesh.position.x = leanAmount * this.maxLeanOffset;
  }

  removePlayer(playerId) {
    // Remove player mesh from scene
    if (this.playerMeshes[playerId]) {
      this.scene.remove(this.playerMeshes[playerId].group);
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
      this.scene.remove(this.playerMeshes[playerId].group);
    });

    // Reset players and meshes
    this.players = {};
    this.playerMeshes = {};
  }
}
