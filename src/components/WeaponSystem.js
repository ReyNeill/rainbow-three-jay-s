import * as THREE from "three";
import { TargetModel } from "../models/TargetModel";

export class WeaponSystem {
  constructor(
    scene,
    camera,
    collidableObjects = [],
    networkManager,
    inputManager,
    uiManager,
    dummyPlayers = [],
    fpGun = null,
    playerController = null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.collidableObjects = collidableObjects;
    this.networkManager = networkManager;
    this.inputManager = inputManager;
    this.uiManager = uiManager;
    this.dummyPlayers = dummyPlayers;
    this.fpGun = fpGun;
    this.playerController = playerController;
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
      "/sounds/gunshot.wav",
      (buffer) => {
        this.shootSound.setBuffer(buffer);
        this.shootSound.setVolume(0.5);
      },
      undefined,
      (error) => {
        console.warn("Error loading gunshot sound (.wav):", error);
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

    // Trigger recoil on PlayerController
    if (this.playerController) {
      this.playerController.applyRecoil();
    }

    // Create muzzle flash visual effect
    this.createMuzzleFlash();

    this.performRaycast();
  }

  performRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // --- Log Collidables Being Checked ---
    console.log(
      `[WeaponSystem Raycast] Checking ${this.collidableObjects.length} objects:`,
      this.collidableObjects.map((o) => ({
        name: o.name || "(no name)",
        uuid: o.uuid,
        isMesh: o.isMesh,
        isGroup: o.isGroup,
        userData: JSON.stringify(o.userData),
      }))
    );
    // --- End Log ---

    const intersects = this.raycaster.intersectObjects(
      this.collidableObjects,
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObject = hit.object;

      // --- DEBUG: Log what was hit (include UUID) ---
      console.log(
        "Raycast Hit:",
        hitObject.name || "(no name)", // Ensure name is shown
        `(UUID: ${hitObject.uuid})`, // Log hit object's UUID
        "UserData:",
        JSON.stringify(hitObject.userData) // Stringify userData for clearer logging
      );
      // --- End Debug ---

      let hitConfirmed = false;
      let targetHit = false;

      if (hitObject.userData.playerId) {
        this.createHitEffect(hit.point);
        console.log(
          `Checking if hit object ID '${hitObject.userData.playerId}' matches any dummy...`
        );
        for (const dummy of this.dummyPlayers) {
          const dummyModelId = dummy.getModel()?.options?.playerId;
          console.log(`  Comparing with dummy ID: '${dummyModelId}'`);
          if (dummyModelId && dummyModelId === hitObject.userData.playerId) {
            console.log(`>>> Match found! Hitting dummy: ${dummyModelId}`);
            dummy.hit(25);
            hitConfirmed = true;
            targetHit = true;
            break;
          }
        }
        if (!targetHit) {
          console.log("...No dummy match found for this playerId.");
        }
      } else {
        console.log("Hit object does not have userData.playerId.");
      }

      if (!targetHit && hitObject.userData.isTarget) {
        console.log("Hit target!");
        hitConfirmed = true;
        targetHit = true;
        const targetPosition = hitObject.getWorldPosition(new THREE.Vector3());

        this.collidableObjects = this.collidableObjects.filter(
          (obj) => obj !== hitObject
        );

        if (this.shootSound && this.shootSound.buffer) {
          const hitSound = this.shootSound.clone();
          hitSound.setVolume(0.3);
          hitSound.play();
        }

        const targetInstance = this.findTargetByMesh(hitObject);
        if (targetInstance) {
          targetInstance.hit(() => {
            setTimeout(() => {
              const newTarget = TargetModel.createWithRespawnEffect(
                this.scene,
                targetPosition
              );
              this.collidableObjects.push(newTarget.getMesh());
              if (!this.targets) this.targets = [];
              this.targets = this.targets.filter((t) => t !== targetInstance);
              this.targets.push(newTarget);
            }, 5000);
          });
        }
      } else if (
        !targetHit &&
        this.networkManager &&
        hitObject.userData &&
        hitObject.userData.playerId
      ) {
        console.log("Shot networked player:", hitObject.userData.playerId);
        this.networkManager.sendPlayerShot(hitObject.userData.playerId, 25);
      }

      if (hitConfirmed && this.uiManager) {
        this.uiManager.showHitMarker();
      }
    } else {
      console.log("Raycast intersected nothing.");
    }
  }

  findTargetByMesh(mesh) {
    if (!this.targets) return null;
    return this.targets.find((target) => target.getMesh() === mesh);
  }

  createMuzzleFlash() {
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });

    const flash = new THREE.Mesh(geometry, material);

    let flashPos;
    if (this.fpGun) {
      flashPos = this.fpGun.getBarrelTipPosition();
    } else {
      flashPos = new THREE.Vector3(0, 0, -0.5).applyMatrix4(
        this.camera.matrixWorld
      );
    }
    flash.position.copy(flashPos);

    this.scene.add(flash);

    setTimeout(() => {
      if (flash.parent) {
        this.scene.remove(flash);
      }
      geometry.dispose();
      material.dispose();
    }, 50);
  }

  createHitEffect(position) {
    // --- Blood Splatter Effect ---
    const splatterGroup = new THREE.Group();
    const particleCount = 25;
    const particleSize = 0.05;
    const geometry = new THREE.SphereGeometry(particleSize, 5, 5);
    const material = new THREE.MeshBasicMaterial({
      color: 0xcc0000,
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry.clone(), material.clone());
      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8,
        Math.random() - 0.5
      ).normalize();
      const distance = Math.random() * 0.5 + 0.1;
      particle.position.copy(position).addScaledVector(direction, distance);
      splatterGroup.add(particle);
    }

    this.scene.add(splatterGroup);

    // Fade out and remove
    const duration = 500;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const scale = 1 - progress * 0.5;

      if (splatterGroup.parent) {
        splatterGroup.scale.set(scale, scale, scale);
        splatterGroup.children.forEach((p) => {});

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          // Cleanup after fade
          this.scene.remove(splatterGroup);
          splatterGroup.children.forEach((p) => {
            p.geometry.dispose();
            p.material.dispose();
          });
        }
      } else {
        splatterGroup.children.forEach((p) => {
          p.geometry.dispose();
          p.material.dispose();
        });
      }
    };

    requestAnimationFrame(fade);
    // --- End Blood Splatter Effect ---
  }

  update() {
    if (this.inputManager.isActionPressed("shoot")) {
      this.triggerShoot();
    }
  }
}
