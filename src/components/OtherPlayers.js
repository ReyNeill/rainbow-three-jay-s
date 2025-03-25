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

    // Add player ID to userData for hit detection
    playerMesh.userData.playerId = playerData.id;
    playerMesh.userData.isPlayer = true;

    // Head mesh (to make it clearer which way the player is facing)
    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, 1.3, 0.3); // Position at the top front of the body
    headMesh.userData.playerId = playerData.id; // Also add player ID to head for hit detection
    headMesh.userData.isPlayer = true;
    playerMesh.add(headMesh);

    // Create a group to hold the player mesh (allows for applying lean without moving position)
    const playerGroup = new THREE.Group();
    playerGroup.add(playerMesh);
    playerGroup.userData.playerId = playerData.id;
    playerGroup.userData.isPlayer = true;

    // Add health bar above player
    const healthBarGroup = this.createHealthBar();
    playerGroup.add(healthBarGroup);
    healthBarGroup.position.y = 2.5; // Position above player's head

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
    this.playerMeshes[playerData.id] = {
      group: playerGroup,
      mesh: playerMesh,
      healthBar: healthBarGroup.children[0],
    };
  }

  createHealthBar() {
    const group = new THREE.Group();

    // Create health bar background
    const bgGeometry = new THREE.PlaneGeometry(1.2, 0.2);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(background);

    // Create health bar foreground (green part)
    const fgGeometry = new THREE.PlaneGeometry(1, 0.15);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    const foreground = new THREE.Mesh(fgGeometry, fgMaterial);
    foreground.position.z = 0.01; // Slightly in front of background

    // Set origin to left side for easy scaling
    fgGeometry.translate(0.5, 0, 0);
    foreground.position.x = -0.6; // Position at left of background

    group.add(foreground);

    // Make health bar always face the camera
    group.rotation.x = Math.PI / 2;

    return group;
  }

  updateHealth(playerId, health) {
    if (this.playerMeshes[playerId] && this.playerMeshes[playerId].healthBar) {
      // Update health bar scale based on health percentage (0-100)
      const healthPercent = Math.max(0, Math.min(100, health)) / 100;
      this.playerMeshes[playerId].healthBar.scale.x = healthPercent;

      // Change color based on health
      if (healthPercent > 0.6) {
        this.playerMeshes[playerId].healthBar.material.color.setHex(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        this.playerMeshes[playerId].healthBar.material.color.setHex(0xffff00); // Yellow
      } else {
        this.playerMeshes[playerId].healthBar.material.color.setHex(0xff0000); // Red
      }
    }
  }

  showHitEffect(playerId) {
    if (this.playerMeshes[playerId] && this.playerMeshes[playerId].mesh) {
      const playerMesh = this.playerMeshes[playerId].mesh;

      // Store original material
      const originalMaterial = playerMesh.material;

      // Set to hit material (white flash)
      playerMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Reset after short delay
      setTimeout(() => {
        if (playerMesh) {
          playerMesh.material = originalMaterial;
        }
      }, 100);
    }
  }

  updatePlayer(playerData) {
    // Update stored player data
    if (this.players[playerData.id]) {
      this.players[playerData.id].position = playerData.position;
      this.players[playerData.id].rotation = playerData.rotation;

      if (playerData.leanAmount !== undefined) {
        this.players[playerData.id].leanAmount = playerData.leanAmount;
      }

      // Update health if provided
      if (playerData.health !== undefined) {
        this.players[playerData.id].health = playerData.health;
        this.updateHealth(playerData.id, playerData.health);
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

      // Set initial health if provided
      if (playerData.health !== undefined) {
        this.updateHealth(playerData.id, playerData.health);
      }
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

  // Return all player objects for hit detection
  getPlayerObjects() {
    const playerObjects = [];

    Object.values(this.playerMeshes).forEach(({ group, mesh }) => {
      // Add the main mesh and all its children (body and head)
      playerObjects.push(mesh);
      mesh.children.forEach((child) => {
        playerObjects.push(child);
      });
    });

    return playerObjects;
  }
}
