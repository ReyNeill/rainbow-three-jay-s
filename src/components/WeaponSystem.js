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

    const intersects = this.raycaster.intersectObjects(
      this.collidableObjects,
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObject = hit.object;

      let hitConfirmed = false;

      // 1. Check if Player/Dummy was hit
      if (hitObject.userData.playerId) {
        this.createHitEffect(hit.point);
        hitConfirmed = true;

        // Check if it's one of the dummy players
        let isDummy = false;
        for (const dummy of this.dummyPlayers) {
          const dummyModelId = dummy.getModel()?.options?.playerId;
          if (dummyModelId && dummyModelId === hitObject.userData.playerId) {
            dummy.hit(25);
            isDummy = true;
            break;
          }
        }

        // If it wasn't a dummy, assume it's a networked player
        if (!isDummy && this.networkManager) {
          this.networkManager.sendPlayerShot(hitObject.userData.playerId, 25);
        }

        // 2. Else, check if a Target was hit
      } else if (hitObject.userData.isTarget) {
        hitConfirmed = true;
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

        // 3. Else, it hit something generic (wall, floor etc.)
      } else {
        this.createDebrisEffect(hit.point);
      }

      // Show hit marker if any valid hit was confirmed
      if (hitConfirmed && this.uiManager) {
        this.uiManager.showHitMarker();
      }
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
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particleMesh = new THREE.Mesh(geometry.clone(), material.clone());
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2.5 + 0.5,
        (Math.random() - 0.5) * 2
      );
      const particleData = { mesh: particleMesh, velocity: velocity };
      particleMesh.position.copy(position);
      splatterGroup.add(particleMesh);
      particles.push(particleData);
    }

    this.scene.add(splatterGroup);

    const duration = 800;
    const startTime = performance.now();
    let lastTime = startTime;

    const fade = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (!splatterGroup.parent) {
        particles.forEach((p) => {
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
        return;
      }

      particles.forEach((p) => {
        p.velocity.addScaledVector(gravity, deltaTime);
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
      });

      const scale = 1 - progress * 0.5;
      splatterGroup.scale.set(scale, scale, scale);

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        this.scene.remove(splatterGroup);
        particles.forEach((p) => {
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
      }
    };

    requestAnimationFrame(fade);
    // --- End Blood Splatter Effect ---
  }

  createDebrisEffect(position) {
    const debrisGroup = new THREE.Group();
    const particleCount = 15;
    const particleSize = 0.04;
    const geometry = new THREE.BoxGeometry(
      particleSize,
      particleSize,
      particleSize
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.1,
    });
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particleMesh = new THREE.Mesh(geometry.clone(), material.clone());
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5 + 0.2,
        (Math.random() - 0.5) * 1.5
      );
      const particleData = { mesh: particleMesh, velocity: velocity };
      particleMesh.position.copy(position);
      particleMesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      debrisGroup.add(particleMesh);
      particles.push(particleData);
    }

    this.scene.add(debrisGroup);

    const duration = 600;
    const startTime = performance.now();
    let lastTime = startTime;

    const animateDebris = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (!debrisGroup.parent) {
        particles.forEach((p) => {
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
        return;
      }

      particles.forEach((p) => {
        p.velocity.addScaledVector(gravity, deltaTime);
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
      });

      if (progress < 1) {
        requestAnimationFrame(animateDebris);
      } else {
        this.scene.remove(debrisGroup);
        particles.forEach((p) => {
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
      }
    };
    requestAnimationFrame(animateDebris);
  }

  update() {
    if (this.inputManager.isActionPressed("shoot")) {
      this.triggerShoot();
    }
  }
}
