import * as THREE from "three";

export class WeaponSystem {
  constructor(
    scene,
    camera,
    collidableObjects = [],
    socket,
    dummyPlayer = null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.collidableObjects = collidableObjects;
    this.socket = socket;
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
        this.shoot();
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

  shoot() {
    if (this.cooldown) return;

    // Set cooldown
    this.cooldown = true;
    setTimeout(() => {
      this.cooldown = false;
      if (this.shooting) {
        this.shoot(); // Continue shooting if button is held down
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

    // Perform raycasting from camera center
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with objects and players
    const intersects = this.raycaster.intersectObjects(this.collidableObjects);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Create hit effect at impact point
      this.createHitEffect(hit.point);

      // Check if we hit a player (by checking parent or userData)
      const hitObject = hit.object;

      // Handle dummy player hit
      if (this.dummyPlayer && hitObject.userData.playerId === "dummy") {
        this.dummyPlayer.hit(25); // Apply damage to dummy

        // Show hit confirmation
        this.showHitConfirmation();

        console.log("Hit dummy player!");
        return;
      }

      // Handle target hit
      if (hitObject.userData.isTarget) {
        // Show hit confirmation
        this.showHitConfirmation();

        // Simple target effect - change color briefly
        const originalColor = hitObject.material.color.clone();
        hitObject.material.color.set(0xffffff);

        setTimeout(() => {
          hitObject.material.color.copy(originalColor);
        }, 100);

        console.log("Hit target!");
        return;
      }

      // If multiplayer is enabled and we hit another player
      if (this.socket && hitObject.userData && hitObject.userData.playerId) {
        // Send hit event to server
        this.socket.emit("playerShot", {
          targetId: hitObject.userData.playerId,
          damage: 25, // Basic damage amount
        });
      }
    }
  }

  showHitConfirmation() {
    // Show simple hit marker in center of screen
    const hitMarker = document.createElement("div");
    hitMarker.style.position = "absolute";
    hitMarker.style.top = "50%";
    hitMarker.style.left = "50%";
    hitMarker.style.transform = "translate(-50%, -50%)";
    hitMarker.style.width = "20px";
    hitMarker.style.height = "20px";
    hitMarker.style.backgroundImage =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M10 0 L10 20 M0 10 L20 10' stroke='white' stroke-width='2'/%3E%3C/svg%3E\")";
    hitMarker.style.backgroundSize = "contain";
    hitMarker.style.pointerEvents = "none";
    document.body.appendChild(hitMarker);

    // Remove after short time
    setTimeout(() => {
      document.body.removeChild(hitMarker);
    }, 100);
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
    // Can be used for continuous updates if needed
  }
}
