import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CollisionDetection } from "../utils/CollisionDetection.js";
import { VaultingSystem } from "./VaultingSystem.js";
import { GunModel } from "../models/GunModel.js";
import { Config } from "../Config.js"; // Import Config

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

    // --- Camera FOV State ---
    this.defaultFOV = Config.camera.defaultFOV;
    this.adsFOV = Config.aiming.adsFOV;
    this.targetFOV = this.defaultFOV;
    this.camera.fov = this.defaultFOV; // Ensure initial FOV is set
    this.camera.updateProjectionMatrix(); // Apply initial FOV

    // --- Aiming State ---
    this.isAiming = false;
    this.adsGunPosition = new THREE.Vector3().fromArray(
      Config.aiming.adsGunPosition
    ); // Use Config
    this.hipGunPosition = new THREE.Vector3(0.2, -0.2, -0.5); // Store original hip position
    this.targetGunPosition = this.hipGunPosition.clone(); // Initialize target

    // --- Weapon Bobbing State ---
    this.bobTimer = 0;
    this.bobIntensity = Config.weaponBob.intensity;
    this.bobSpeedFactorWalk = Config.weaponBob.speedFactorWalk;
    this.bobSpeedFactorNormal = Config.weaponBob.speedFactorNormal;
    this.bobSpeedFactorSprint = Config.weaponBob.speedFactorSprint;
    this.isMovingHorizontally = false;

    // Create a group to manage camera pitch/yaw (controlled by PointerLock)
    this.cameraGroup = new THREE.Group();
    this.cameraGroup.add(this.camera); // Add the actual camera to the group
    this.scene.add(this.cameraGroup); // Add the group to the scene

    // Lean state
    this.leanAmount = 0; // -1 (left), 0 (center), 1 (right)
    this.targetLeanAmount = 0;
    this.leanMode = "toggle"; // "toggle" or "hold"

    // Movement speed and physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    // Define the different speeds from Config
    this.walkSpeed = Config.movement.walkSpeed;
    this.normalSpeed = Config.movement.normalSpeed;
    this.sprintSpeed = Config.movement.sprintSpeed;
    this.currentMoveSpeed = this.normalSpeed;

    // Gravity and ground state
    this.isOnGround = false;
    this.gravity = Config.player.gravity; // Use Config
    this.jumpHeight = Config.player.jumpHeight; // Use Config
    this.playerHeight = Config.player.height; // Use Config
    // Calculate head offset based on height and ratio
    this.headHeightOffset =
      this.playerHeight * Config.player.headHeightOffsetRatio; // Use Config

    // Track the true player position (unaffected by lean) - Center of collision volume
    this.truePosition = new THREE.Vector3(0, this.playerHeight / 2, 15);

    // Initialize pointer lock controls
    this.controls = new PointerLockControls(this.cameraGroup, this.domElement);

    // Collision detection
    this.collisionDetection = new CollisionDetection(
      collidableObjects,
      this.playerHeight, // Pass height
      Config.player.radius, // Pass radius from Config
      Config.collision.stepHeight, // Pass stepHeight from Config
      Config.collision.groundCheckOffset, // Pass groundCheckOffset from Config
      Config.collision.margin // Pass margin from Config
    );

    // Vaulting System
    this.vaultingSystem = new VaultingSystem(
      collidableObjects,
      uiManager,
      this.playerHeight, // Pass height
      Config.player.radius, // Pass radius from Config
      Config.vaulting.distance, // Pass distance from Config
      Config.vaulting.maxHeightDiff, // Pass maxHeightDiff from Config
      Config.vaulting.minHeightDiff, // Pass minHeightDiff from Config
      Config.vaulting.duration // Pass duration from Config
    );

    // --- Add First-Person Gun Model ---
    this.fpGun = new GunModel();
    this.fpGunMesh = this.fpGun.getMesh();
    // Use the hip position as the initial default
    this.fpGunMesh.position.copy(this.hipGunPosition);
    this.fpGunMesh.rotation.y = 0; // Point straight forward
    this.fpGunMesh.scale.set(0.8, 0.8, 0.8); // Adjust scale for first-person view
    this.camera.add(this.fpGunMesh); // Add gun as child of camera
    // --- End First-Person Gun Model ---

    // Setup event listeners
    this.setupEventListeners();

    // Set initial camera group position based on truePosition and headHeightOffset
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
        this.leanAmount = 0;
        // Reset camera roll and offset when lock is lost
        this.camera.rotation.z = 0;
        this.camera.position.set(0, 0, 0); // Reset local position within group
      }
    });
  }

  setCollidableObjects(objects) {
    this.collisionDetection.setObjects(objects);
    this.vaultingSystem.setCollidableObjects(objects);
  }

  updateLean(deltaTime) {
    // Smoothly interpolate lean amount
    this.leanAmount = THREE.MathUtils.lerp(
      this.leanAmount,
      this.targetLeanAmount,
      deltaTime * 15 // Adjust speed as needed
    );

    // Apply lean offset and roll to the camera within the cameraGroup
    const leanOffset = this.leanAmount * Config.leaning.amountMultiplier; // Use Config
    const leanRoll = -this.leanAmount * Config.leaning.rollMultiplier; // Use Config

    this.camera.position.x = leanOffset;
    this.camera.rotation.z = leanRoll;

    // Apply lean offset to the first-person gun (relative to camera)
    if (this.fpGunMesh) {
      // Calculate target X based on the CURRENT targetGunPosition (hip or ADS) + lean offset
      const baseGunX = this.targetGunPosition.x; // Use the target (hip or ADS) as base
      const targetGunX =
        baseGunX - leanOffset * Config.leaning.gunOffsetMultiplier;

      // Only lerp if not actively bobbing horizontally OR if aiming (ADS overrides bob horizontal offset slightly)
      // Bobbing logic will handle lerping if moving from hip fire state
      if (!this.isMovingHorizontally || !this.isOnGround || this.isAiming) {
        // Lerp the X position separately if needed, bobbing handles Y/Z lerp
        // Let updateWeaponBob handle the lerping entirely based on targetGunPosition
        // this.fpGunMesh.position.x = THREE.MathUtils.lerp(
        //   this.fpGunMesh.position.x,
        //   targetGunX,
        //   deltaTime * 10
        // );
      }
      // Bobbing logic will handle lerping based on targetGunPosition
    }
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
      const aimActive = this.inputManager.isActionActive("aim"); // Check aim input

      // --- Determine Current Move Speed ---
      if (isTryingToMove && isSprinting) {
        this.currentMoveSpeed = this.sprintSpeed;
      } else if (isTryingToMove && isWalking) {
        this.currentMoveSpeed = this.walkSpeed;
      } else {
        this.currentMoveSpeed = this.normalSpeed; // Default to normal speed
      }
      // Apply ADS speed multiplier
      if (this.isAiming) {
        this.currentMoveSpeed *= Config.aiming.adsMoveSpeedMultiplier;
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
        this.leanAmount = 0;
      }
      // --- End Toggle Lean Mode Setting ---

      // --- Handle Lean Input based on Mode ---
      if (this.leanMode === "toggle") {
        const leanLPressed = this.inputManager.isActionPressed("leanLeft");
        const leanRPressed = this.inputManager.isActionPressed("leanRight");
        if (leanLPressed) {
          // If currently leaning left, target center. Otherwise, target left.
          this.targetLeanAmount = this.targetLeanAmount === -1 ? 0 : -1;
          // If targeting right, switch to left instead of center
          if (this.targetLeanAmount === 1) this.targetLeanAmount = -1;
        }
        if (leanRPressed) {
          // If currently leaning right, target center. Otherwise, target right.
          this.targetLeanAmount = this.targetLeanAmount === 1 ? 0 : 1;
          // If targeting left, switch to right instead of center
          if (this.targetLeanAmount === -1) this.targetLeanAmount = 1;
        }
      } else {
        // Hold mode
        const leanLActive = this.inputManager.isActionActive("leanLeft");
        const leanRActive = this.inputManager.isActionActive("leanRight");
        if (leanLActive) {
          this.targetLeanAmount = -1; // Set target to left
        } else if (leanRActive) {
          this.targetLeanAmount = 1; // Set target to right
        } else {
          this.targetLeanAmount = 0; // Set target to center
        }
      }
      // --- End Handle Lean Input ---

      // --- Update Aiming State ---
      this.isAiming = aimActive;
      this.targetFOV = this.isAiming ? this.adsFOV : this.defaultFOV;
      this.targetGunPosition = this.isAiming
        ? this.adsGunPosition
        : this.hipGunPosition;
      // Update UI crosshair visibility
      this.uiManager.setCrosshairVisible(!this.isAiming);
      // --- End Aiming State ---

      // --- Interpolate FOV ---
      const fovChanged = Math.abs(this.camera.fov - this.targetFOV) > 0.01;
      if (fovChanged) {
        this.camera.fov = THREE.MathUtils.lerp(
          this.camera.fov,
          this.targetFOV,
          deltaTime * Config.aiming.adsTransitionSpeed
        );
        this.camera.updateProjectionMatrix(); // IMPORTANT: Update projection matrix after FOV change
      }
      // --- End Interpolate FOV ---

      // --- Update Vaulting System ---
      const vaultPosition = this.vaultingSystem.updateVault(deltaTime);
      if (vaultPosition) {
        // Vault is in progress or just completed this frame

        // FIX: Apply the calculated world vault position to truePosition
        this.truePosition.copy(vaultPosition);

        // Reset velocity during vault to prevent interference
        this.velocity.set(0, 0, 0);
        this.isOnGround = false; // Assume not grounded during vault motion

        // Set target lean to center during vault
        this.targetLeanAmount = 0;
        // this.leanAmount = THREE.MathUtils.lerp( ... ) // This lerp is handled by updateLean now
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
          this.fpGunMesh.position.lerp(this.hipGunPosition, deltaTime * 10); // Smoothly return gun
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
          this.targetLeanAmount = 0; // Reset target lean on vault start
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
      // This runs regardless of vaulting, using the current leanAmount interpolated towards targetLeanAmount
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
        this.leanAmount = 0;
        this.camera.rotation.z = 0;
        this.camera.position.set(0, 0, 0);
      }
      // Reset bobbing when pointer lock is lost
      this.bobTimer = 0;
      this.isMovingHorizontally = false;
      this.fpGunMesh.position.copy(this.hipGunPosition); // Instantly reset gun position to hip
      this.currentMoveSpeed = this.normalSpeed; // Reset speed when lock lost
      this.targetLeanAmount = 0; // Reset target lean when lock is lost
      // Reset aiming state
      this.isAiming = false;
      this.targetFOV = this.defaultFOV;
      this.targetGunPosition.copy(this.hipGunPosition);
      if (this.camera.fov !== this.defaultFOV) {
        this.camera.fov = this.defaultFOV;
        this.camera.updateProjectionMatrix();
      }
      this.uiManager.setCrosshairVisible(false); // Hide crosshair when not locked
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
    let currentBobSpeedFactor = this.bobSpeedFactorNormal;
    // Adjust intensity if aiming
    let currentBobIntensity = this.bobIntensity;
    if (this.isAiming) {
      currentBobIntensity *= Config.aiming.adsBobIntensityMultiplier;
    }

    // Determine the base target position (Hip or ADS)
    // We lerp towards this base position + bobbing offsets
    const baseTargetPos = this.targetGunPosition.clone();

    // Define the transition speed (use config value)
    const transitionSpeed = Config.aiming.adsTransitionSpeed;

    if (this.isMovingHorizontally && this.isOnGround) {
      this.bobTimer +=
        deltaTime * this.currentMoveSpeed * currentBobSpeedFactor;

      // Calculate bobbing offsets using sine waves based on adjusted intensity
      const verticalBob = Math.sin(this.bobTimer) * currentBobIntensity;
      const horizontalBob =
        Math.cos(this.bobTimer * 0.5) * currentBobIntensity * 0.5;

      // Apply bobbing relative to the base target position (which NO LONGER includes lean offset adjustment)
      const finalTargetPos = baseTargetPos.clone(); // Start with base hip/ADS pos
      finalTargetPos.y += verticalBob;
      finalTargetPos.x += horizontalBob; // Add bob offset

      // Smoothly interpolate towards the final target bob position
      this.fpGunMesh.position.lerp(finalTargetPos, deltaTime * transitionSpeed);
    } else {
      // Player is not moving horizontally or is airborne
      this.bobTimer = 0; // Reset timer

      // Smoothly return to the base target position (Hip or ADS, NO LONGER includes lean offset adjustment)
      this.fpGunMesh.position.lerp(baseTargetPos, deltaTime * transitionSpeed);
    }
  }
  // --- End Weapon Bobbing Method ---
}
