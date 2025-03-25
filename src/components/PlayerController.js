import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CollisionDetection } from "../utils/CollisionDetection.js";
import { VaultingSystem } from "./VaultingSystem.js";

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
    this.moveSpeed = 10.0;

    // Gravity and ground state
    this.gravity = 30.0;
    this.isOnGround = true;

    this.playerHeight = 1.6;
    this.headHeightOffset = 0.8;

    // Track the true player position (unaffected by lean) - Center of collision volume
    this.truePosition = new THREE.Vector3(0, 0.8, 15);

    // Initialize pointer lock controls
    this.controls = new PointerLockControls(this.cameraGroup, this.domElement);

    // Collision detection
    this.collisionDetection = new CollisionDetection(collidableObjects);

    // Vaulting System
    this.vaultingSystem = new VaultingSystem(collidableObjects, this.uiManager);

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
    const eyePosition = this.truePosition
      .clone()
      .add(new THREE.Vector3(0, this.headHeightOffset, 0));
    this.cameraGroup.position.copy(eyePosition);

    // PointerLockControls updates the cameraGroup's rotation internally

    if (this.inputManager.getIsPointerLocked()) {
      // --- Handle Input ---
      const moveF = this.inputManager.isActionActive("moveForward");
      const moveB = this.inputManager.isActionActive("moveBackward");
      const moveL = this.inputManager.isActionActive("moveLeft");
      const moveR = this.inputManager.isActionActive("moveRight");
      const leanL = this.inputManager.isActionPressed("leanLeft");
      const leanR = this.inputManager.isActionPressed("leanRight");
      const vaultPressed = this.inputManager.isActionPressed("vault"); // Check if pressed this frame

      if (leanL) {
        this.leanState = this.leanState === "left" ? "center" : "left";
      }
      if (leanR) {
        this.leanState = this.leanState === "right" ? "center" : "right";
      }

      // --- Update Vaulting System ---
      const vaultPosition = this.vaultingSystem.updateVault(deltaTime);

      // --- Check 1: Is vault active OR did it just finish? ---
      if (vaultPosition) {
        // Vault is in progress or just completed this frame
        this.truePosition.copy(vaultPosition); // Apply the calculated vault position
        this.isOnGround = false; // Assume not grounded during vault motion
        this.velocity.set(0, 0, 0); // Stop any other velocity

        // Update lean visuals and camera group position based on new vault position
        this.updateLean(deltaTime);
        this.cameraGroup.position
          .copy(this.truePosition)
          .add(new THREE.Vector3(0, this.headHeightOffset, 0));

        // If the vault is still ongoing after the update, skip the rest
        if (this.vaultingSystem.isVaulting) {
          return;
        }
        // If vault just finished (isVaulting is now false), we've set the final position.
        // Allow the rest of the update (gravity/collision check) to run to properly ground the player.
      }

      // --- Check 3 (Moved Earlier): Check for vault opportunities (if not vaulting) ---
      // Run this *before* attempting to start the vault, so 'canVault' is up-to-date
      // (respecting its internal throttle)
      if (!this.vaultingSystem.isVaulting) {
        // Only check if not already vaulting
        this.vaultingSystem.checkForVaultableObjects(
          this.truePosition,
          this.cameraGroup.quaternion,
          this.isOnGround
        );
      }

      // --- Check 2 (Modified Condition): Attempt to start a vault ---
      // Check vaultPressed AND the current state of vaultingSystem.canVault
      if (
        vaultPressed &&
        this.vaultingSystem.canVault &&
        !this.vaultingSystem.isVaulting
      ) {
        // attemptVault internally checks canVault & !isVaulting again, but checking here is clearer
        const vaultStarted = this.vaultingSystem.attemptVault(
          this.truePosition
        );
        if (vaultStarted) {
          // Vault successfully initiated
          this.velocity.set(0, 0, 0); // Stop current momentum
          this.isOnGround = false; // Immediately leave ground state
          // Skip the rest of this frame's movement/collision updates
          return;
        }
      }

      // --- Calculate Movement Intent ---
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

      this.direction.z = Number(moveF) - Number(moveB);
      this.direction.x = Number(moveR) - Number(moveL);
      this.direction.normalize();

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

      const targetVelocityX =
        (right.x * this.direction.x + forward.x * this.direction.z) *
        this.moveSpeed;
      const targetVelocityZ =
        (right.z * this.direction.x + forward.z * this.direction.z) *
        this.moveSpeed;

      this.velocity.x = targetVelocityX;
      this.velocity.z = targetVelocityZ;

      // --- Apply Gravity ---
      // Gravity applies if not vaulting (vaulting handles its own Y movement)
      this.velocity.y -= this.gravity * deltaTime;

      // --- Collision Detection and Response ---
      const collisionResult = this.collisionDetection.checkCollision(
        this.truePosition,
        this.velocity, // Pass current velocity
        deltaTime
      );

      this.velocity.copy(collisionResult.velocity); // Apply collision adjustments
      this.isOnGround = collisionResult.onGround;

      // Stick to ground if landed (including after vault)
      if (this.isOnGround && this.velocity.y < 0) {
        this.velocity.y = 0;
      }

      // --- Update Position ---
      this.truePosition.add(this.velocity.clone().multiplyScalar(deltaTime));

      // --- Update Camera Lean (Local Offset/Roll) ---
      this.updateLean(deltaTime);
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
}
