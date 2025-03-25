import * as THREE from "three";

export class PlayerModel {
  constructor(scene, position = { x: 0, y: 2, z: 0 }, options = {}) {
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

  createModel() {
    // Create model group
    this.modelGroup = new THREE.Group();

    // Body: simple box
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: this.options.team === "red" ? 0xff0000 : 0x0000ff,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 1; // Stand on the ground

    // Add user data for hit detection
    this.bodyMesh.userData.playerId = this.options.playerId;
    this.bodyMesh.userData.isPlayer = true;

    // Head: smaller box on top
    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.set(0, 2.3, 0.2); // On top of body

    // Add user data for hit detection
    this.headMesh.userData.playerId = this.options.playerId;
    this.headMesh.userData.isPlayer = true;

    // Add health bar
    this.healthBarGroup = this.createHealthBar();
    this.healthBarGroup.position.y = 3; // Place above head

    // Add meshes to group
    this.modelGroup.add(this.bodyMesh);
    this.modelGroup.add(this.headMesh);
    this.modelGroup.add(this.healthBarGroup);

    // Set position
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
