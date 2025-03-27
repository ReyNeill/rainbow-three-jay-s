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
      playerId: `player_${THREE.MathUtils.generateUUID()}`,
      playerHeight: 1.6, // Default height
      onLoad: null, // Add onLoad option
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

    // --- Animation ---
    this.mixer = null; // Animation mixer
    this.idleAction = null; // Reference to the idle animation action

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
    const modelPath = "/models/soldier.glb"; // Path to your GLTF model

    loader.load(
      modelPath,
      (gltf) => {
        this.loadedModelMesh = gltf.scene; // The loaded model group
        const animations = gltf.animations; // Get animations

        // --- Calculate Scale and Position ---
        const box = new THREE.Box3().setFromObject(this.loadedModelMesh);
        const modelHeight = box.max.y - box.min.y;
        const desiredHeight = this.playerHeight;
        const scale = desiredHeight / modelHeight;
        this.loadedModelMesh.scale.set(scale, scale, scale);

        // Recalculate box after scaling
        box.setFromObject(this.loadedModelMesh);
        const groundLevelY = this.initialPosition.y - this.playerHeight / 2;
        const modelBaseOffsetY = -box.min.y;

        // --- Attach loaded model to the main group ---
        this.modelGroup.add(this.loadedModelMesh);

        // Position the GROUP
        this.modelGroup.position.set(
          this.initialPosition.x,
          groundLevelY + modelBaseOffsetY * scale,
          this.initialPosition.z
        );
        // --- End Initial Position ---

        // --- Add userData.playerId to ALL child meshes ---
        this.loadedModelMesh.traverse((child) => {
          if (child.isMesh) {
            child.userData.playerId = this.options.playerId;
            console.log(
              `Assigned ID ${this.options.playerId} to mesh: ${
                child.name || "(no name)"
              } (UUID: ${child.uuid})`
            );
          }
        });
        // --- End Add userData ---

        // --- Setup Animation Mixer ---
        if (animations && animations.length) {
          this.mixer = new THREE.AnimationMixer(this.loadedModelMesh);

          // --- DEBUGGING: Log available animation names ---
          console.log(
            `Available animations for ${this.options.playerId}:`,
            animations.map((clip) => clip.name).slice(0, 10)
          );
          // --- End Debugging ---

          // Find the idle animation clip
          // Try the original name again, or replace with a known correct name if you find one later
          let idleClip = THREE.AnimationClip.findByName(animations, "Idle");

          if (idleClip) {
            this.idleAction = this.mixer.clipAction(idleClip);
            this.idleAction.play();
            console.log(
              `Playing animation ('${idleClip.name}') for ${this.options.playerId}`
            );
          } else {
            // Log all names if the specific one isn't found
            console.warn(
              `Could not find animation named 'Idle' for ${this.options.playerId}. Available:`,
              animations.map((a) => a.name)
            );
          }
        } else {
          console.warn(
            `No animations found in model for ${this.options.playerId}`
          );
        }
        // --- End Setup Animation Mixer ---

        this.isModelLoaded = true;
        console.log(`Model loaded successfully for ${this.options.playerId}`);

        // --- Call onLoad callback if provided ---
        if (this.options.onLoad) {
          this.options.onLoad();
        }
        // --- End Call onLoad ---
      },
      undefined,
      (error) => {
        console.error(
          `Error loading model for ${this.options.playerId}:`,
          error
        );
      }
    );
  }

  hit(damage) {
    if (!this.isModelLoaded) return true; // Don't process hits if model isn't ready

    this.health -= damage;
    this.health = Math.max(0, this.health); // Prevent negative health
    console.log(
      `Player ${this.options.playerId} hit. Health: ${this.health}/${this.maxHealth}`
    );

    return this.health > 0; // Return true if still alive
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
  }

  applyLean(leanAmount) {
    // Ensure modelGroup exists and model is loaded
    if (!this.isModelLoaded || !this.modelGroup) return;

    // --- Simple Lean: Rotate the whole model ---
    const leanAngle = -leanAmount * (Math.PI / 10);
    this.modelGroup.rotation.z = leanAngle;

    // --- Advanced Lean --- (Keep commented)
  }

  // Return all visible meshes within the loaded model for hit detection
  getMeshes() {
    const meshes = [];
    if (this.loadedModelMesh) {
      this.loadedModelMesh.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
          console.log(
            `[getMeshes for ${this.options.playerId}] Adding mesh: ${
              child.name || "(no name)"
            } (UUID: ${child.uuid}), UserData: ${JSON.stringify(
              child.userData
            )}`
          );
        }
      });
    }
    // console.log(`getMeshes for ${this.options.playerId}: Returning ${meshes.length} meshes`); // Optional summary log
    return meshes;
  }

  // Clean up resources
  dispose() {
    // Stop animations
    this.idleAction?.stop();
    this.mixer = null; // Clear mixer reference

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

  // --- Add Update Method for Mixer ---
  update(deltaTime) {
    // Update the animation mixer if it exists
    this.mixer?.update(deltaTime);
  }
  // --- End Update Method ---
}
