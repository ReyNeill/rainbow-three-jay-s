import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CollisionDetection } from "../utils/CollisionDetection.js";
import { VaultingSystem } from "./VaultingSystem.js";
import { GunModel } from "../models/GunModel.js";

export class PlayerController {
  constructor(
    camera,
    domElement,
    collidableObjects = [],
    inputManager,
    uiManager,
    scene
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.inputManager = inputManager;
    this.uiManager = uiManager;
    this.scene = scene;

    // --- Weapon Bobbing State ---
    this.bobTimer = 0;
    this.bobIntensity = 0.015;
    this.bobSpeedFactorWalk = 1.0; // Bob speed factor when walking
    this.bobSpeedFactorNormal = 1.5; // Bob speed factor when normal speed
    this.bobSpeedFactorSprint = 2.0; // Bob speed factor when sprinting
    this.isMovingHorizontally = false;
    this.fpGunDefaultPos = new THREE.Vector3(0.2, -0.2, -0.5);
    // --- End Weapon Bobbing State ---

    // Create a group to manage camera pitch/yaw (controlled by PointerLock)
    this.cameraGroup = new THREE.Group();
    this.cameraGroup.add(this.camera); // Add the actual camera to the group
    this.scene.add(this.cameraGroup); // Add the group to the scene

    // Lean state
    this.leanState = "center"; // 'left', 'center', 'right'
    this.leanAmount = 0; // Current lean amount (-1 for left, 0 for center, 1 for right)
    this.maxLeanAngle = Math.PI / 12; // ~15 degrees
    this.maxLeanOffset = 0.75; // How far to move the camera sideways when leaning
    this.leanSpeed = 5.0; // Speed of lean transition

    // Movement speed and physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    // Define the different speeds
    this.walkSpeed = 3.0;
    this.normalSpeed = 5.0; // Default speed
    this.sprintSpeed = 8.0;
    this.currentMoveSpeed = this.normalSpeed; // Start at normal speed

    // Gravity and ground state
    this.gravity = 30.0;
    this.isOnGround = true;

    this.playerHeight = 1.6;
    this.headHeightOffset = this.playerHeight * 0.4; // Approx eye level relative to center

    // Track the true player position (unaffected by lean) - Center of collision volume
    this.truePosition = new THREE.Vector3(0, this.playerHeight / 2, 15);

    // Initialize pointer lock controls
    this.controls = new PointerLockControls(this.cameraGroup, this.domElement);

    // Collision detection
    this.collisionDetection = new CollisionDetection(collidableObjects);

    // Vaulting System
    this.vaultingSystem = new VaultingSystem(collidableObjects, this.uiManager);

    // --- Add First-Person Gun Model ---
    this.fpGun = new GunModel();
    this.fpGunMesh = this.fpGun.getMesh();
    // Use the stored default position
    this.fpGunMesh.position.copy(this.fpGunDefaultPos);
    this.fpGunMesh.rotation.y = -Math.PI / 20; // Slight angle
    this.fpGunMesh.scale.set(0.8, 0.8, 0.8); // Adjust scale for first-person view
    this.camera.add(this.fpGunMesh); // Add gun as child of camera
    // --- End First-Person Gun Model ---

    // --- Add Lean Mode Setting ---
    this.leanMode = "toggle"; // 'toggle' or 'hold'
    // --- End Lean Mode Setting ---

    // Setup event listeners
    this.setupEventListeners();

    // Set initial camera group position
    this.cameraGroup.position
      .copy(this.truePosition)
      .add(new THREE.Vector3(0, this.headHeightOffset, 0));
  }

  setupEventListeners() {
    // Click event to start pointer lock
    this.domElement.addEventListener("click", () => {
      this.controls.lock();
    });

    // Pointer lock change events
    document.addEventListener("pointerlockchange", () => {
      if (!this.inputManager.getIsPointerLocked()) {
        // Reset lean state if pointer lock is lost
        this.leanState = "center";
        // Reset camera roll and offset when lock is lost
        this.camera.rotation.z = 0;
        this.camera.position.set(0, 0, 0); // Reset local position within group
      }
    });
  }

  setCollidableObjects(objects) {
    this.collisionDetection = new CollisionDetection(objects);
    this.vaultingSystem.setCollidableObjects(objects);
  }

  updateLean(deltaTime) {
    // 1. Determine target lean and interpolate leanAmount (Correct)
    let targetLean = 0;
    if (this.leanState === "left") targetLean = 1; // Q -> target = 1
    if (this.leanState === "right") targetLean = -1; // E -> target = -1
    this.leanAmount +=
      (targetLean - this.leanAmount) * this.leanSpeed * deltaTime;
    this.leanAmount = THREE.MathUtils.clamp(this.leanAmount, -1, 1);
    // Q -> leanAmount approaches 1
    // E -> leanAmount approaches -1

    // 2. Calculate the desired LOCAL sideways offset along the X-axis
    // The camera's local X-axis corresponds to its right direction within the cameraGroup.
    // If leanAmount = 1 (Q, Left Lean): We want to move camera Left (Negative Local X) -> OffsetX = -maxOffset
    // If leanAmount = -1 (E, Right Lean): We want to move camera Right (Positive Local X) -> OffsetX = maxOffset
    // Therefore, the local offset along X is (-leanAmount * maxLeanOffset)
    const localOffsetX = -this.leanAmount * this.maxLeanOffset;

    // 3. Apply LOCAL offset ONLY along the X-axis of the camera
    // The camera's local Y and Z position should remain 0 relative to the cameraGroup
    this.camera.position.x = localOffsetX;
    this.camera.position.y = 0; // Ensure Y offset is zero
    this.camera.position.z = 0; // Ensure Z offset is zero

    // 4. Apply roll rotation to the camera's LOCAL rotation (Correct)
    // If leanAmount = 1 (Q, Left Lean): Roll = 1 * maxAngle -> Rolls RIGHT (Positive Z)
    // If leanAmount = -1 (E, Right Lean): Roll = -1 * maxAngle -> Rolls LEFT (Negative Z)
    this.camera.rotation.z = this.leanAmount * this.maxLeanAngle;
  }

  update(deltaTime) {
    // Update cameraGroup position to follow player's eye level first
    // This needs to happen AFTER truePosition might be updated by vaulting
    // Moved this down slightly

    if (this.inputManager.getIsPointerLocked()) {
      // --- Handle Input ---
      const moveF = this.inputManager.isActionActive("moveForward");
      const moveB = this.inputManager.isActionActive("moveBackward");
      const moveL = this.inputManager.isActionActive("moveLeft");
      const moveR = this.inputManager.isActionActive("moveRight");
      const vaultPressed = this.inputManager.isActionPressed("vault");
      const toggleLeanModePressed =
        this.inputManager.isActionPressed("toggleLeanMode");
      const isSprinting = this.inputManager.isActionActive("sprint"); // Check sprint
      const isWalking = this.inputManager.isActionActive("walk"); // Check walk
      const isTryingToMove = moveF || moveB || moveL || moveR; // Check if any movement key is pressed

      // --- Determine Current Move Speed ---
      if (isTryingToMove && isSprinting) {
        this.currentMoveSpeed = this.sprintSpeed;
      } else if (isTryingToMove && isWalking) {
        this.currentMoveSpeed = this.walkSpeed;
      } else {
        this.currentMoveSpeed = this.normalSpeed; // Default to normal speed
      }
      // --- End Determine Current Move Speed ---

      // --- Toggle Lean Mode Setting ---
      if (toggleLeanModePressed) {
        this.leanMode = this.leanMode === "toggle" ? "hold" : "toggle";
        // Optionally, provide feedback via UIManager
        this.uiManager.showNotification(
          `Lean Mode: ${this.leanMode.toUpperCase()}`
        );
        // Reset lean state when switching modes to avoid getting stuck
        this.leanState = "center";
      }
      // --- End Toggle Lean Mode Setting ---

      // --- Handle Lean Input based on Mode ---
      if (this.leanMode === "toggle") {
        const leanLPressed = this.inputManager.isActionPressed("leanLeft");
        const leanRPressed = this.inputManager.isActionPressed("leanRight");
        if (leanLPressed) {
          this.leanState = this.leanState === "left" ? "center" : "left";
        }
        if (leanRPressed) {
          this.leanState = this.leanState === "right" ? "center" : "right";
        }
      } else {
        // Hold mode
        const leanLActive = this.inputManager.isActionActive("leanLeft");
        const leanRActive = this.inputManager.isActionActive("leanRight");
        if (leanLActive) {
          this.leanState = "left";
        } else if (leanRActive) {
          this.leanState = "right";
        } else {
          this.leanState = "center";
        }
      }
      // --- End Handle Lean Input ---

      // --- Update Vaulting System ---
      const vaultPosition = this.vaultingSystem.updateVault(deltaTime);
      if (vaultPosition) {
        // Vault is in progress or just completed this frame

        // FIX: Apply the calculated world vault position to truePosition
        this.truePosition.copy(vaultPosition);

        // Reset velocity during vault to prevent interference
        this.velocity.set(0, 0, 0);
        this.isOnGround = false; // Assume not grounded during vault motion

        // Update lean smoothly back to center during vault
        this.leanAmount = THREE.MathUtils.lerp(
          this.leanAmount,
          0,
          deltaTime * this.leanSpeed * 2 // Faster return to center
        );
        this.updateLean(deltaTime); // Apply visual lean offset/roll to camera

        // Update cameraGroup position based on the NEW truePosition from vaulting
        const eyePosition = this.truePosition
          .clone()
          .add(new THREE.Vector3(0, this.headHeightOffset, 0));
        this.cameraGroup.position.copy(eyePosition);

        // If the vault is still ongoing after the update, skip the rest of physics
        if (this.vaultingSystem.isVaulting) {
          // Reset bobbing when vaulting
          this.bobTimer = 0;
          this.fpGunMesh.position.lerp(this.fpGunDefaultPos, deltaTime * 10); // Smoothly return gun
          this.currentMoveSpeed = this.normalSpeed; // Reset speed during vault? Or let it update next frame.
          return;
        }
        // If vault just finished, allow rest of update to run for grounding
      }
      // --- End Vaulting Update ---

      // --- Check for vault opportunities (Only if not currently vaulting) ---
      if (!this.vaultingSystem.isVaulting) {
        this.vaultingSystem.checkForVaultableObjects(
          this.truePosition,
          this.cameraGroup.quaternion,
          this.isOnGround
        );
      }

      // --- Attempt to start a vault (Only if not currently vaulting) ---
      if (
        vaultPressed &&
        this.vaultingSystem.canVault &&
        !this.vaultingSystem.isVaulting
      ) {
        const vaultStarted = this.vaultingSystem.attemptVault(
          this.truePosition
        );
        if (vaultStarted) {
          this.velocity.set(0, 0, 0); // Stop current momentum
          this.isOnGround = false; // Immediately leave ground state
          this.bobTimer = 0; // Reset bobbing on vault start
          this.currentMoveSpeed = this.normalSpeed; // Reset speed on vault start
          return; // Skip the rest of this frame's physics
        }
      }
      // --- End Vaulting Start ---

      // --- Calculate Movement Intent (Only if not vaulting) ---
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

      this.direction.z = Number(moveF) - Number(moveB);
      this.direction.x = Number(moveR) - Number(moveL);
      this.direction.normalize();

      // Determine if moving horizontally based on input direction, not velocity
      this.isMovingHorizontally = this.direction.lengthSq() > 0.01;

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.cameraGroup.quaternion
      );
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.cameraGroup.quaternion
      );
      forward.y = 0;
      right.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      if (right.lengthSq() > 0) right.normalize();

      // Use currentMoveSpeed here
      const targetVelocityX =
        (right.x * this.direction.x + forward.x * this.direction.z) *
        this.currentMoveSpeed;
      const targetVelocityZ =
        (right.z * this.direction.x + forward.z * this.direction.z) *
        this.currentMoveSpeed;

      // Apply target velocity directly for more responsive control
      this.velocity.x = targetVelocityX;
      this.velocity.z = targetVelocityZ;

      // --- Apply Gravity (Only if not vaulting) ---
      this.velocity.y -= this.gravity * deltaTime;

      // --- Collision Detection and Response (Only if not vaulting) ---
      const collisionResult = this.collisionDetection.checkCollision(
        this.truePosition,
        this.velocity,
        deltaTime
      );
      this.velocity.copy(collisionResult.velocity);
      this.isOnGround = collisionResult.onGround;
      if (this.isOnGround && this.velocity.y < 0) {
        this.velocity.y = 0;
      }

      // --- Update Position (Only if not vaulting) ---
      this.truePosition.add(this.velocity.clone().multiplyScalar(deltaTime));

      // --- Prevent falling through floor (Only if not vaulting) ---
      // Use a safe minimum Y based on player height
      const minY = 0; // Ground level is 0, player center is 0.8 when grounded
      if (this.truePosition.y < this.playerHeight / 2) {
        this.truePosition.y = this.playerHeight / 2;
        this.velocity.y = 0;
        this.isOnGround = true; // Force ground state if below minimum
      }

      // --- Update Camera Group Position (If not vaulting) ---
      // This needs to run *after* truePosition is updated by regular movement
      const eyePosition = this.truePosition
        .clone()
        .add(new THREE.Vector3(0, this.headHeightOffset, 0));
      this.cameraGroup.position.copy(eyePosition);

      // --- Update Camera Lean (Local Offset/Roll) ---
      // This runs regardless of vaulting, using the current leanAmount
      this.updateLean(deltaTime);

      // --- Update Weapon Bobbing ---
      this.updateWeaponBob(deltaTime);
      // --- End Weapon Bobbing ---
    } else {
      // Not pointer locked
      this.velocity.set(0, 0, 0);
      if (
        this.leanAmount !== 0 ||
        this.camera.rotation.z !== 0 ||
        this.camera.position.lengthSq() > 0
      ) {
        this.leanState = "center"; // Ensure state resets too
        this.leanAmount = 0;
        this.camera.rotation.z = 0;
        this.camera.position.set(0, 0, 0);
      }
      // Reset bobbing when pointer lock is lost
      this.bobTimer = 0;
      this.isMovingHorizontally = false;
      this.fpGunMesh.position.copy(this.fpGunDefaultPos); // Instantly reset gun position
      this.currentMoveSpeed = this.normalSpeed; // Reset speed when lock lost
    }
  }

  getPosition() {
    return this.truePosition.clone();
  }

  getRotation() {
    // Return the rotation of the group, which represents the player's look direction
    return this.cameraGroup.rotation.clone();
  }

  getLeanAmount() {
    return this.leanAmount;
  }

  // Add a method to get the first-person gun model instance
  getFPGun() {
    return this.fpGun;
  }

  // --- Update Weapon Bobbing Method ---
  updateWeaponBob(deltaTime) {
    let currentBobSpeedFactor = this.bobSpeedFactorNormal; // Default
    if (this.currentMoveSpeed === this.sprintSpeed) {
      currentBobSpeedFactor = this.bobSpeedFactorSprint;
    } else if (this.currentMoveSpeed === this.walkSpeed) {
      currentBobSpeedFactor = this.bobSpeedFactorWalk;
    }

    if (this.isMovingHorizontally && this.isOnGround) {
      // Player is moving on the ground, update bob timer
      // Use currentMoveSpeed and the selected bob factor
      this.bobTimer +=
        deltaTime * this.currentMoveSpeed * currentBobSpeedFactor;

      // Calculate bobbing offsets using sine waves
      const verticalBob = Math.sin(this.bobTimer) * this.bobIntensity;
      const horizontalBob =
        Math.cos(this.bobTimer * 0.5) * this.bobIntensity * 0.5;

      // Apply bobbing relative to the default position + lean offset
      const targetPos = this.fpGunDefaultPos.clone();
      targetPos.y += verticalBob;
      targetPos.x += horizontalBob;

      // Apply lean effect to the target position before lerping
      const leanOffset = this.leanAmount * 0.5;
      targetPos.x -= leanOffset * 0.5;

      // Smoothly interpolate towards the target bob position
      this.fpGunMesh.position.lerp(targetPos, deltaTime * 10);
    } else {
      // Player is not moving horizontally or is airborne
      this.bobTimer = 0; // Reset timer if stopped or in air

      // Smoothly return to default position (considering lean)
      const targetPos = this.fpGunDefaultPos.clone();
      const leanOffset = this.leanAmount * 0.5;
      targetPos.x -= leanOffset * 0.5; // Apply lean offset to default

      this.fpGunMesh.position.lerp(targetPos, deltaTime * 10);
    }
  }
  // --- End Weapon Bobbing Method ---
}
