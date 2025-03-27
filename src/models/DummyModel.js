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
      onLoad: options.onLoad, // Pass onLoad through
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
    this.isDead = false; // Add isDead flag

    // Add small text indicator above the health bar
    this.waitForLoadAndApplyGravity();
  }

  // --- REMOVE Dummy Label Method --- {{ delete }}
  // addDummyLabel() { ... }
  // --- End REMOVE --- {{ delete }}

  waitForLoadAndApplyGravity() {
    // Check if model is loaded, wait if not
    const checkLoad = () => {
      if (this.isModelLoaded) {
        // --- REMOVE Label Call --- {{ delete }}
        // this.addDummyLabel(); // Add label once model exists
        // --- End REMOVE --- {{ delete }}
      } else {
        setTimeout(checkLoad, 100); // Check again shortly
      }
    };
    checkLoad();
  }

  hit(damage) {
    // If already dead (during respawn timer), ignore hits
    if (this.isDead) return false;

    // Use the parent hit method for health logic
    const alive = super.hit(damage); // This decreases health

    // If health dropped to 0 or below
    if (!alive) {
      console.log(`Dummy ${this.options.playerId} died.`);
      this.isDead = true; // Set dead flag
      this.modelGroup.visible = false; // Hide the model

      // Respawn after 2 seconds
      setTimeout(() => {
        // Check if the model group still exists in the scene (safety check)
        if (this.modelGroup?.parent) {
          this.health = this.maxHealth; // Reset health
          this.modelGroup.visible = true; // Show the model again
          this.isDead = false; // Clear dead flag
          console.log(`Dummy ${this.options.playerId} respawned.`);
        } else {
          console.log(
            `Dummy ${this.options.playerId} could not respawn (removed from scene).`
          );
        }
      }, 2000); // 2 second respawn timer
    }

    return alive; // Return true if health > 0 AFTER taking damage
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
    // --- REMOVE Health Bar Disposal --- {{ delete }}
    // if (this.healthBarGroup) {
    //   this.healthBarGroup.traverse((child) => {
    //     if (child.isMesh) {
    //       child.geometry?.dispose();
    //       child.material?.dispose();
    //     }
    //   });
    //   this.modelGroup?.remove(this.healthBarGroup);
    // }
    // --- End REMOVE --- {{ delete }}
    super.dispose(); // Call parent dispose
  }
}
