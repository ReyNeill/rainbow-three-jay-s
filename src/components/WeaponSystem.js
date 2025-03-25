import * as THREE from "three";
import { TargetModel } from "../models/TargetModel";

export class WeaponSystem {
  constructor(
    scene,
    camera,
    collidableObjects = [],
    socket,
    inputManager,
    uiManager,
    dummyPlayer = null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.collidableObjects = collidableObjects;
    this.socket = socket;
    this.inputManager = inputManager;
    this.uiManager = uiManager;
    this.dummyPlayer = dummyPlayer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(0, 0); // Center of screen
    this.shooting = false;
    this.cooldown = false;
    this.cooldownTime = 100; // Milliseconds between shots (adjust for fire rate)

    // Setup shooting sound
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);
    this.shootSound = new THREE.Audio(this.audioListener);

    // Load sound
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(
      "/sounds/gunshot.mp3",
      (buffer) => {
        this.shootSound.setBuffer(buffer);
        this.shootSound.setVolume(0.5);
      },
      undefined,
      (error) => {
        console.warn("Error loading gunshot sound:", error);
      }
    );

    // Add event listener for shooting
    document.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        // Left mouse button
        this.shooting = true;
        this.triggerShoot();
      }
    });

    document.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        // Left mouse button
        this.shooting = false;
      }
    });
  }

  setCollidableObjects(objects) {
    this.collidableObjects = objects;
  }

  setDummyPlayer(dummyPlayer) {
    this.dummyPlayer = dummyPlayer;

    // Add dummy player meshes to collidable objects
    if (dummyPlayer) {
      const dummyMeshes = dummyPlayer.getMeshes();
      this.collidableObjects = [...this.collidableObjects, ...dummyMeshes];
    }
  }

  triggerShoot() {
    if (this.cooldown || !this.inputManager.getIsPointerLocked()) return;

    this.cooldown = true;
    setTimeout(() => {
      this.cooldown = false;
      if (this.inputManager.isActionActive("shoot")) {
        this.triggerShoot();
      }
    }, this.cooldownTime);

    // Play sound if loaded
    if (this.shootSound.buffer) {
      if (this.shootSound.isPlaying) {
        this.shootSound.stop();
      }
      this.shootSound.play();
    }

    // Create muzzle flash visual effect (simple implementation)
    this.createMuzzleFlash();

    this.performRaycast();
  }

  performRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.collidableObjects,
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Create hit effect at impact point
      this.createHitEffect(hit.point);

      // Check if we hit a player (by checking parent or userData)
      const hitObject = hit.object;

      let hitConfirmed = false;

      // Handle dummy player hit
      if (this.dummyPlayer && hitObject.userData.playerId === "dummy") {
        this.dummyPlayer.hit(25); // Apply damage to dummy
        hitConfirmed = true;
        console.log("Hit dummy player!");
        return;
      }

      // Handle target hit
      if (hitObject.userData.isTarget) {
        hitConfirmed = true;
        // Get the target position for respawning later
        const targetPosition = hitObject.position.clone();

        // Remove target from collidable objects
        this.collidableObjects = this.collidableObjects.filter(
          (obj) => obj !== hitObject
        );

        // Play target hit sound
        if (this.shootSound && this.shootSound.buffer) {
          // Clone the audio for multiple overlapping sounds
          const hitSound = this.shootSound.clone();
          hitSound.setVolume(0.3);
          hitSound.play();
        }

        console.log("Hit target!");

        // Find the target instance for this mesh
        const targetInstance = this.findTargetByMesh(hitObject);
        if (targetInstance) {
          targetInstance.hit(() => {
            // Respawn target after 5 seconds
            setTimeout(() => {
              // Create new target using the TargetModel
              const newTarget = TargetModel.createWithRespawnEffect(
                this.scene,
                targetPosition
              );

              // Add to collidable objects
              this.collidableObjects.push(newTarget.getMesh());

              // Store the target instance
              if (!this.targets) this.targets = [];
              this.targets.push(newTarget);
            }, 5000); // 5 seconds
          });
        }

        return;
      }

      // If multiplayer is enabled and we hit another player
      if (this.socket && hitObject.userData && hitObject.userData.playerId) {
        // Send hit event to server
        this.socket.emit("playerShot", {
          targetId: hitObject.userData.playerId,
          damage: 25, // Basic damage amount
        });
        console.log("Shot player:", hitObject.userData.playerId);
      }

      // Show UI hit marker if it wasn't another player
      if (hitConfirmed && this.uiManager) {
        this.uiManager.showHitMarker();
      }
    }
  }

  // Find a target instance by its mesh
  findTargetByMesh(mesh) {
    if (!this.targets) return null;
    return this.targets.find((target) => target.getMesh() === mesh);
  }

  createMuzzleFlash() {
    // Create a simple particle effect for muzzle flash
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });

    const flash = new THREE.Mesh(geometry, material);

    // Position slightly in front of camera
    const flashPos = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.quaternion
    );
    flash.position.copy(this.camera.position).add(flashPos);

    this.scene.add(flash);

    // Remove after short time
    setTimeout(() => {
      this.scene.remove(flash);
      geometry.dispose();
      material.dispose();
    }, 50);
  }

  createHitEffect(position) {
    // Create a simple particle effect for hit impact
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    });

    const hitMarker = new THREE.Mesh(geometry, material);
    hitMarker.position.copy(position);

    this.scene.add(hitMarker);

    // Remove after short time
    setTimeout(() => {
      this.scene.remove(hitMarker);
      geometry.dispose();
      material.dispose();
    }, 200);
  }

  update() {
    // Check for shoot action press/hold
    if (this.inputManager.isActionPressed("shoot")) {
      this.triggerShoot();
    }
    // If continuous fire is desired while holding:
    // (Already handled by the setTimeout logic in triggerShoot)
    // else if (this.inputManager.isActionActive("shoot")) {
    //   // Potentially trigger continuous fire logic if needed
    // }
  }
}
