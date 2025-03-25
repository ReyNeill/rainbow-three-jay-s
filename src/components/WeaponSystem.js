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

        // Get the target position for respawning later
        const targetPosition = hitObject.position.clone();

        // Create an explosion effect before removing the target
        this.createTargetHitEffect(targetPosition);

        // Remove target from scene and collidable objects
        this.scene.remove(hitObject);
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

        // Respawn target after 5 seconds
        setTimeout(() => {
          // Create new target
          const targetGeometry = new THREE.SphereGeometry(0.7, 16, 16);
          const targetMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
          });
          const newTarget = new THREE.Mesh(targetGeometry, targetMaterial);

          // Set position to the original target position
          newTarget.position.copy(targetPosition);

          // Add userData for hit detection
          newTarget.userData.isTarget = true;

          // Add to scene and collidable objects
          this.scene.add(newTarget);
          this.collidableObjects.push(newTarget);

          // Create a ring around the new target for better visibility
          const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2; // Make it face the player
          ring.position.copy(targetPosition);
          this.scene.add(ring);

          // Create a visual effect for respawning
          this.createRespawnEffect(targetPosition);
        }, 5000); // 5 seconds

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

  createTargetHitEffect(position) {
    // Create a particle explosion effect for target hit
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true }), // Red
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true }), // Orange
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true }), // Yellow
    ];

    // Create multiple particles
    for (let i = 0; i < 15; i++) {
      // Randomly select a material
      const material =
        materials[Math.floor(Math.random() * materials.length)].clone();
      const particle = new THREE.Mesh(geometry, material);

      // Set initial position at the target center
      particle.position.copy(position);

      // Random velocity direction
      const velocity = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      )
        .normalize()
        .multiplyScalar(0.1 + Math.random() * 0.2);

      this.scene.add(particle);

      // Animate the particle
      const startTime = Date.now();
      const duration = 300 + Math.random() * 200; // 300-500ms duration

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          // Remove particle when animation is complete
          this.scene.remove(particle);
          return;
        }

        // Move outward
        particle.position.add(velocity);

        // Fade out
        particle.material.opacity = 1 - progress;

        // Continue animation
        requestAnimationFrame(animate);
      };

      // Start animation
      animate();
    }

    // Add a flash at the hit point
    const flashGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    this.scene.add(flash);

    // Animate the flash
    const flashStartTime = Date.now();
    const flashDuration = 200;

    const animateFlash = () => {
      const elapsed = Date.now() - flashStartTime;
      const progress = elapsed / flashDuration;

      if (progress >= 1) {
        // Remove flash when animation is complete
        this.scene.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
        return;
      }

      // Expand and fade out
      const scale = 1 + progress;
      flash.scale.set(scale, scale, scale);
      flash.material.opacity = 0.8 * (1 - progress);

      // Continue animation
      requestAnimationFrame(animateFlash);
    };

    // Start flash animation
    animateFlash();
  }

  createRespawnEffect(position) {
    // Create a particle effect for target respawn
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    });

    // Create multiple particles
    for (let i = 0; i < 10; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());

      // Random position around the target
      const offset = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );

      particle.position.copy(position).add(offset.multiplyScalar(0.5));
      this.scene.add(particle);

      // Animate the particle
      const startTime = Date.now();
      const duration = 500 + Math.random() * 500; // 500-1000ms duration

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          // Remove particle when animation is complete
          this.scene.remove(particle);
          geometry.dispose();
          material.dispose();
          return;
        }

        // Scale up and fade out
        const scale = 1 + progress * 3;
        particle.scale.set(scale, scale, scale);
        particle.material.opacity = 0.8 * (1 - progress);

        // Continue animation
        requestAnimationFrame(animate);
      };

      // Start animation
      animate();
    }
  }

  update() {
    // Can be used for continuous updates if needed
  }
}
