import * as THREE from "three";
import { PlayerModel } from "./PlayerModel.js";

export class DummyModel extends PlayerModel {
  constructor(scene, position = { x: 0, y: 2, z: 0 }, options = {}) {
    // Process options - override team color to be yellow
    const combinedOptions = {
      team: "yellow", // Special team for dummies
      playerId: "dummy",
      health: 100,
      ...options,
    };

    // Call parent constructor with dummy-specific options
    super(scene, position, combinedOptions);

    // Setup gravity
    this.velocity = new THREE.Vector3();
    this.gravity = 9.8 * 10; // Match PlayerController gravity
    this.floorHeight = 0; // Distance from ground to model base
    this.isOnGround = false;

    // Add small text indicator above the health bar
    this.addDummyLabel();

    // Start gravity simulation
    this.applyGravity();
  }

  // Override the createModel method to use yellow coloring
  createModel() {
    // Call the parent method first to set up the base structure
    super.createModel();

    // Override the body color to yellow
    this.bodyMesh.material = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

    // Make the head a different yellow shade to still have contrast
    this.headMesh.material = new THREE.MeshBasicMaterial({ color: 0xddaa00 });
  }

  addDummyLabel() {
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
    this.textMesh.position.set(0, 3.3, 0); // Just above health bar
    this.modelGroup.add(this.textMesh);
  }

  // Override getMeshes to include dummy text label
  getMeshes() {
    const baseMeshes = super.getMeshes();
    return [...baseMeshes, this.textMesh];
  }

  // Handle being hit - returns true if player is still alive
  hit(damage) {
    this.options.health = Math.max(0, this.options.health - damage);
    this.updateHealth(this.options.health);

    // Show hit effect
    this.showHitEffect();

    // Reset health after 2 seconds if it reaches zero
    if (this.options.health <= 0) {
      setTimeout(() => {
        this.options.health = 100;
        this.updateHealth(this.options.health);
      }, 2000);
    }

    return this.options.health > 0;
  }

  applyGravity() {
    // Apply gravity effect to make dummy fall to ground
    const startTime = Date.now();
    let lastTime = startTime;

    const updateGravity = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Skip if already on ground
      if (this.isOnGround) return;

      // Apply gravity to velocity
      this.velocity.y -= this.gravity * deltaTime;

      // Update position
      this.modelGroup.position.y += this.velocity.y * deltaTime;

      // Check for ground collision
      if (this.modelGroup.position.y <= this.floorHeight) {
        this.modelGroup.position.y = this.floorHeight;
        this.velocity.y = 0;
        this.isOnGround = true;
      }

      // Continue if not on ground yet
      if (!this.isOnGround) {
        requestAnimationFrame(updateGravity);
      }
    };

    // Start the gravity simulation
    updateGravity();
  }
}
