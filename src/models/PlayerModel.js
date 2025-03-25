import * as THREE from "three";

export class PlayerModel {
  constructor(scene, position = { x: 0, y: 0.8, z: 0 }, options = {}) {
    this.scene = scene;
    this.position = position;

    // Default options
    this.options = {
      team: "blue", // "red" or "blue"
      health: 100,
      playerId: null,
      ...options,
    };

    // Create meshes and groups
    this.createModel();

    // Set initial health
    this.updateHealth(this.options.health);
  }

  // Generate material based on team color
  getTeamMaterial(isDarker = false) {
    let color;

    // Select base color based on team
    switch (this.options.team) {
      case "red":
        color = isDarker ? 0xcc0000 : 0xff0000;
        break;
      case "blue":
        color = isDarker ? 0x0000cc : 0x0000ff;
        break;
      case "yellow":
        color = isDarker ? 0xcccc00 : 0xffff00;
        break;
      default:
        color = isDarker ? 0x444444 : 0x888888;
    }

    return new THREE.MeshBasicMaterial({ color });
  }

  createModel() {
    // Create body - Adjust size to match collision height 1.6
    // Total capsule height = length + 2 * radius
    // 1.6 = length + 2 * 0.4 => length = 0.8
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8); // Adjusted length
    const bodyMaterial = this.getTeamMaterial();
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // Capsule is centered vertically by default

    // Add player ID to userData for hit detection
    this.bodyMesh.userData.playerId = this.options.playerId;
    this.bodyMesh.userData.isFullyCollidable = true; // Mark as fully collidable

    // Create head - Adjust size and position
    const headRadius = 0.25; // Keep head size
    const headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
    const headMaterial = this.getTeamMaterial(true); // Slightly darker
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    // Position head on top of capsule body
    // Capsule top is at y = (length / 2) + radius = (0.8 / 2) + 0.4 = 0.4 + 0.4 = 0.8
    this.headMesh.position.y = 0.8; // Place head center on top of capsule (Adjusted y)

    // Add player ID to userData for hit detection
    this.headMesh.userData.playerId = this.options.playerId;
    this.headMesh.userData.isFullyCollidable = true; // Mark as fully collidable

    // Create group to hold all parts
    this.modelGroup = new THREE.Group();
    this.modelGroup.add(this.bodyMesh);
    this.modelGroup.add(this.headMesh);

    // Add health bar - Adjust position relative to new head height
    this.healthBarGroup = this.createHealthBar();
    // Head top is at headMesh.position.y + headRadius = 0.8 + 0.25 = 1.05
    // Place health bar slightly above the head
    this.healthBarGroup.position.y = 1.2; // Adjusted position (was 1.3)

    // Add meshes to group
    this.modelGroup.add(this.healthBarGroup);

    // Set position (group origin corresponds to player center at y=0.8)
    this.modelGroup.position.copy(this.position);

    // Add to scene
    this.scene.add(this.modelGroup);
  }

  createHealthBar() {
    const group = new THREE.Group();

    // Health bar background
    const bgGeometry = new THREE.PlaneGeometry(1.2, 0.2);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(background);

    // Health bar foreground (green part)
    const fgGeometry = new THREE.PlaneGeometry(1, 0.15);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    this.healthBar = new THREE.Mesh(fgGeometry, fgMaterial);
    this.healthBar.position.z = 0.01; // Slightly in front of background

    // Set origin to left side for easy scaling
    fgGeometry.translate(0.5, 0, 0);
    this.healthBar.position.x = -0.6; // Position at left of background

    group.add(this.healthBar);

    // Make health bar always face the camera
    group.rotation.x = Math.PI / 2;

    return group;
  }

  updateHealth(health) {
    this.options.health = health;

    // Update health bar scale based on health percentage
    const healthPercent = Math.max(0, Math.min(100, health)) / 100;

    // Ensure healthBar exists before accessing properties
    if (this.healthBar) {
      this.healthBar.scale.x = healthPercent;

      // Change color based on health
      if (healthPercent > 0.6) {
        this.healthBar.material.color.setHex(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        this.healthBar.material.color.setHex(0xffff00); // Yellow
      } else {
        this.healthBar.material.color.setHex(0xff0000); // Red
      }
    }
  }

  showHitEffect() {
    // Store original material
    const originalMaterial = this.bodyMesh.material;

    // Set to hit material (white flash)
    this.bodyMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Reset after short delay
    setTimeout(() => {
      if (this.bodyMesh) {
        this.bodyMesh.material = originalMaterial;
      }
    }, 100);
  }

  // Update position and rotation
  updatePosition(position, rotation, leanAmount) {
    if (position) {
      this.modelGroup.position.copy(position);
    }

    if (rotation) {
      this.modelGroup.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    // Apply lean if specified
    if (leanAmount !== undefined) {
      this.applyLean(leanAmount);
    }
  }

  applyLean(leanAmount) {
    // Apply rotation for leaning
    this.bodyMesh.rotation.z = (-leanAmount * Math.PI) / 12;

    // Apply horizontal offset for leaning (visual effect only)
    this.bodyMesh.position.x = leanAmount * 0.5;
  }

  // Return all meshes for hit detection
  getMeshes() {
    return [this.bodyMesh, this.headMesh];
  }

  // Clean up resources
  dispose() {
    this.scene.remove(this.modelGroup);
  }
}
