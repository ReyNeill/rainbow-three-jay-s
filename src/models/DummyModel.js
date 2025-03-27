import * as THREE from "three";
import { PlayerModel } from "./PlayerModel.js";
import { Config } from "../Config.js"; // Import Config

export class DummyModel extends PlayerModel {
  constructor(scene, position = { x: 0, y: 0.8, z: 0 }, options = {}) {
    // Ensure a unique ID is passed for hit detection userData
    const dummyOptions = {
      playerId: options.playerId || `dummy_${THREE.MathUtils.generateUUID()}`, // Unique ID for dummy
      playerHeight: 1.6, // Ensure height is consistent
      team: "yellow", // Explicitly set team for dummy
      ...options, // Allow overriding defaults
    };
    // Call the parent constructor (which now handles model loading)
    super(scene, position, dummyOptions);

    // Setup gravity using Config
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.gravity = Config.player.gravity; // Use Config
    this.playerHeight = Config.player.height; // Use Config
    // Calculate initial floor level based on spawn and player height from Config
    this.floorLevelY = position.y - (dummyOptions.playerHeight || 1.6) / 2;
    this.isOnGround = false;

    // Add small text indicator above the health bar
    this.waitForLoadAndApplyGravity();
  }

  addDummyLabel() {
    // Ensure modelGroup exists before adding to it
    if (!this.modelGroup) {
      console.warn(
        "Attempted to add dummy label before modelGroup was created."
      );
      return;
    }
    // Add a small "DUMMY" text above the health bar
    const textGeometry = new THREE.PlaneGeometry(1.2, 0.3);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DUMMY", 64, 16);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    // Position relative to the modelGroup origin (which is at the model's feet)
    // Place it above the health bar's expected position
    const healthBarY = (this.options.playerHeight || 1.6) + 0.3; // Approx Y of healthbar top
    this.textMesh.position.set(0, healthBarY + 0.2, 0); // Place slightly above healthbar

    // Billboard the text
    this.textMesh.lookAt(this.scene.userData.camera.position); // Initial lookAt
    // We might need to update this in an update loop if camera moves significantly relative to dummy

    this.modelGroup.add(this.textMesh);
  }

  // Override getMeshes to include dummy text label if it exists
  getMeshes() {
    const baseMeshes = super.getMeshes();
    return this.textMesh ? [...baseMeshes, this.textMesh] : baseMeshes;
  }

  // Handle being hit - returns true if player is still alive
  hit(damage) {
    // Use the parent hit method for health logic and basic feedback
    const alive = super.hit(damage);

    // Reset health after 2 seconds if it reaches zero (Dummy specific)
    if (!alive) {
      setTimeout(() => {
        if (this.modelGroup?.parent) {
          this.health = this.maxHealth;
          this.updateHealthBar();
          console.log(`Dummy ${this.options.playerId} respawned.`);
        }
      }, 2000);
    }

    return alive;
  }

  // --- New method to wait for load ---
  waitForLoadAndApplyGravity() {
    const checkLoad = () => {
      if (this.isModelLoaded) {
        // Model is ready, potentially adjust floor level based on loaded model bounds
        if (this.loadedModelMesh) {
          this.modelGroup.position.y = this.floorLevelY;
        }
        this.addDummyLabel();
        this.applyGravity();
      } else {
        // Wait and check again
        setTimeout(checkLoad, 100);
      }
    };
    checkLoad();
  }

  applyGravity() {
    // Apply gravity effect to make dummy fall to ground
    let lastTime = performance.now();

    const updateGravity = () => {
      if (!this.modelGroup?.parent || !this.isModelLoaded) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      const groundTargetY = this.floorLevelY;

      // Skip if already on ground (or very close)
      if (
        this.isOnGround ||
        Math.abs(this.modelGroup.position.y - groundTargetY) < 0.01
      ) {
        if (!this.isOnGround) {
          // Snap precisely if close but not flagged
          this.modelGroup.position.y = groundTargetY;
          this.velocity.y = 0;
          this.isOnGround = true;
        }
        requestAnimationFrame(updateGravity); // Keep checking even if grounded
        return;
      }

      // Apply gravity to velocity
      this.velocity.y -= this.gravity * deltaTime;

      // Update position
      this.modelGroup.position.y += this.velocity.y * deltaTime;

      // Check for ground collision
      if (this.modelGroup.position.y <= groundTargetY) {
        this.modelGroup.position.y = groundTargetY; // Snap to ground
        this.velocity.y = 0;
        this.isOnGround = true;
      } else {
        this.isOnGround = false; // Ensure flag is false if airborne
      }

      // Continue simulation
      requestAnimationFrame(updateGravity);
    };

    // Start the gravity simulation
    requestAnimationFrame(updateGravity);
  }

  // Override dispose to remove text mesh
  dispose() {
    if (this.textMesh) {
      this.textMesh.geometry?.dispose();
      this.textMesh.material?.map?.dispose(); // Dispose canvas texture
      this.textMesh.material?.dispose();
      this.modelGroup?.remove(this.textMesh);
    }
    super.dispose(); // Call parent dispose
  }
}
