import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // Import GLTFLoader

export class PlayerModel {
  constructor(scene, position = { x: 0, y: 0.8, z: 0 }, options = {}) {
    this.scene = scene;
    // Store initial position separately, apply it after loading
    this.initialPosition = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    );

    // Default options
    this.options = {
      team: "blue", // "red" or "blue"
      health: 100,
      playerId: null,
      playerHeight: 1.6, // Default height
      ...options,
    };

    // --- Create main group immediately ---
    this.modelGroup = new THREE.Group();
    // Add the main group to the scene early, position it later
    this.scene.add(this.modelGroup);

    // Store height and health
    this.playerHeight = this.options.playerHeight;
    this.health = this.options.health;
    this.maxHealth = this.options.health;

    // Health bar setup - references only, create mesh later
    this.healthBarGroup = null;
    this.healthBarFg = null;
    this.healthBarHeightOffset = this.playerHeight * 0.5 + 0.3; // Approx offset above model center

    // --- Model Loading ---
    this.isModelLoaded = false; // Flag to track loading state
    this.loadedModelMesh = null; // To store reference to the loaded mesh

    // Start model loading
    this.createModel();
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
    const loader = new GLTFLoader();
    const modelPath = "/models/soldier.glb"; // Adjust path if needed

    loader.load(
      modelPath,
      (gltf) => {
        this.loadedModelMesh = gltf.scene; // The loaded model group

        // --- Adjust Scale and Position ---
        const box = new THREE.Box3().setFromObject(this.loadedModelMesh);
        const modelHeight = box.max.y - box.min.y;
        // Use the height stored in this.playerHeight
        const desiredHeight = this.playerHeight;
        const scale = desiredHeight / modelHeight;
        this.loadedModelMesh.scale.set(scale, scale, scale);

        // Position the loaded mesh so its bottom is at the modelGroup's origin (y=0)
        this.loadedModelMesh.position.y = -box.min.y * scale;

        // Add the loaded mesh to the already existing modelGroup
        this.modelGroup.add(this.loadedModelMesh);

        // Assign userData for hit detection
        this.loadedModelMesh.traverse((child) => {
          if (child.isMesh) {
            child.userData.playerId = this.options.playerId;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // --- Create and Add Health Bar NOW ---
        this.createHealthBar(); // Create the health bar geometry/materials
        if (this.healthBarGroup) {
          // Position health bar above the scaled model's feet origin
          this.healthBarGroup.position.y = this.playerHeight + 0.3; // Position above the player height
          this.modelGroup.add(this.healthBarGroup); // Add to the main group
          this.updateHealthBar(); // Set initial scale/color
        }
        // --- End Health Bar Creation ---

        // --- Set Initial Position of the *entire* group ---
        // The initialPosition.y likely represents the player's center or eye level.
        // We need the *bottom* of the model (modelGroup origin) to be at the correct ground level.
        const groundLevelY = this.initialPosition.y - this.playerHeight / 2;
        this.modelGroup.position.set(
          this.initialPosition.x,
          groundLevelY, // Set Y so the feet are at the correct ground level
          this.initialPosition.z
        );
        // --- End Initial Position ---

        this.isModelLoaded = true; // Set flag
        console.log(`Model loaded successfully for ${this.options.playerId}`);
      },
      undefined, // Progress callback (optional)
      (error) => {
        console.error(
          `Error loading model for ${this.options.playerId}:`,
          error
        );
        // Fallback? No.
      }
    );
  }

  createHealthBar() {
    // If already created, return it (or maybe recreate?)
    if (this.healthBarGroup) return;

    const group = new THREE.Group();

    const healthBarWidth = 0.8;
    const healthBarHeight = 0.1;

    // Health bar background
    const bgGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555, // Dark grey background
      side: THREE.DoubleSide,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(background);

    // Health bar foreground (green part)
    // Initial width is full, scale later
    const fgGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Start green
      side: THREE.DoubleSide,
    });
    this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
    this.healthBarFg.position.z = 0.01; // Slightly in front

    // --- Adjust origin for scaling from left ---
    fgGeometry.translate(healthBarWidth / 2, 0, 0); // Shift pivot to left edge
    this.healthBarFg.position.x = -healthBarWidth / 2; // Position left edge at center of background
    // --- End Adjust origin ---

    group.add(this.healthBarFg);

    this.healthBarGroup = group; // Store reference to the group
  }

  updateHealth(health) {
    this.health = health; // Update internal health value

    // Update health bar scale based on health percentage
    const healthPercent =
      Math.max(0, Math.min(this.maxHealth, health)) / this.maxHealth;

    // Ensure healthBarFg exists before accessing properties
    if (this.healthBarFg) {
      this.healthBarFg.scale.x = healthPercent; // Scale the foreground mesh

      // Change color based on health
      if (healthPercent > 0.6) {
        this.healthBarFg.material.color.setHex(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        this.healthBarFg.material.color.setHex(0xffff00); // Yellow
      } else {
        this.healthBarFg.material.color.setHex(0xff0000); // Red
      }
    }
  }

  // Add hit method (was missing, needed by DummyModel)
  hit(damage) {
    if (!this.isModelLoaded) return true; // Don't process hits if model isn't ready

    this.health -= damage;
    this.health = Math.max(0, this.health); // Prevent negative health
    this.updateHealthBar(); // Update visual
    console.log(
      `Player ${this.options.playerId} hit. Health: ${this.health}/${this.maxHealth}`
    );

    this.showHitEffect(); // Call hit effect

    return this.health > 0; // Return true if still alive
  }

  showHitEffect() {
    if (!this.isModelLoaded || !this.loadedModelMesh) return;

    // Store original materials
    const originalMaterials = new Map();
    this.loadedModelMesh.traverse((child) => {
      if (child.isMesh) {
        originalMaterials.set(child, child.material);
        child.material = new THREE.MeshBasicMaterial({
          // Simple white flash
          color: 0xffffff,
          // Ensure it works even if original was transparent
          transparent: child.material.transparent,
          opacity: child.material.opacity,
        });
      }
    });

    // Reset after short delay
    setTimeout(() => {
      if (this.loadedModelMesh && this.modelGroup?.parent) {
        // Check if still exists
        this.loadedModelMesh.traverse((child) => {
          if (child.isMesh && originalMaterials.has(child)) {
            child.material = originalMaterials.get(child); // Restore original
          }
        });
      }
      // Dispose the temporary white material? Not strictly necessary but good practice
    }, 100);
  }

  // Update position and rotation
  updatePosition(position, rotation, leanAmount) {
    // Ensure modelGroup exists and model is loaded
    if (!this.isModelLoaded || !this.modelGroup) return;

    if (position) {
      // Position represents the player's *center*. We need the model's *bottom* (origin)
      // to be at the correct ground level.
      const groundLevelY = position.y - this.playerHeight / 2;
      this.modelGroup.position.set(position.x, groundLevelY, position.z);
    }

    if (rotation) {
      // Apply Y rotation for looking left/right.
      this.modelGroup.rotation.y = rotation.y;
    }

    // Apply lean if specified
    if (leanAmount !== undefined) {
      this.applyLean(leanAmount);
    }

    // Update health bar to face camera
    this.updateHealthBar();
  }

  applyLean(leanAmount) {
    // Ensure modelGroup exists and model is loaded
    if (!this.isModelLoaded || !this.modelGroup) return;

    // --- Simple Lean: Rotate the whole model ---
    const leanAngle = -leanAmount * (Math.PI / 10);
    this.modelGroup.rotation.z = leanAngle;

    // --- Advanced Lean --- (Keep commented)
  }

  updateHealthBar() {
    // Ensure healthBarGroup exists before accessing properties
    if (!this.healthBarGroup || !this.isModelLoaded) return;

    // Ensure health bar always faces the camera (Billboard effect)
    if (this.scene.userData.camera) {
      // Make the group face the camera, but constrain rotation (optional)
      this.healthBarGroup.quaternion.copy(
        this.scene.userData.camera.quaternion
      );
      // Optionally, reset X and Z rotation if you only want Y-axis billboarding
      // this.healthBarGroup.rotation.x = 0;
      // this.healthBarGroup.rotation.z = 0;
    }
  }

  // Return all meshes for hit detection
  getMeshes() {
    if (!this.isModelLoaded || !this.loadedModelMesh) return [];
    const meshes = [];
    this.loadedModelMesh.traverse((child) => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  // Clean up resources
  dispose() {
    // Dispose health bar geometry/material
    if (this.healthBarGroup) {
      this.healthBarGroup.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          child.material?.dispose();
        }
      });
      this.modelGroup?.remove(this.healthBarGroup);
    }

    // Dispose loaded model geometry/materials
    if (this.loadedModelMesh) {
      this.loadedModelMesh.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.map?.dispose(); // Dispose textures
                mat.dispose();
              });
            } else {
              child.material.map?.dispose(); // Dispose textures
              child.material.dispose();
            }
          }
        }
      });
      this.modelGroup?.remove(this.loadedModelMesh);
    }

    // Remove the main group from the scene
    this.scene.remove(this.modelGroup);
    console.log(`Disposed model for ${this.options.playerId}`);
  }
}
