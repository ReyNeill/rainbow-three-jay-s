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
    // 1. Determine target lean and interpolate leanAmount
    let targetLean = 0;
    if (this.leanState === "left") targetLean = 1;
    if (this.leanState === "right") targetLean = -1;

    this.leanAmount +=
      (targetLean - this.leanAmount) * this.leanSpeed * deltaTime;
    this.leanAmount = THREE.MathUtils.clamp(this.leanAmount, -1, 1);

    // 2. Calculate the sideways positional offset
    this.cameraGroup.updateMatrixWorld();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      this.cameraGroup.quaternion
    );
    const leanOffsetVector = right
      .clone()
      .multiplyScalar(-this.leanAmount * this.maxLeanOffset);

    // 3. Apply positional offset to the camera's LOCAL position
    this.camera.position.copy(leanOffsetVector);

    // 4. Apply roll rotation to the camera's LOCAL rotation
    this.camera.rotation.z = this.leanAmount * this.maxLeanAngle;
  }

  update(deltaTime) {
    // Update cameraGroup position to follow player's eye level
    // Do this *before* calculating movement vectors
    const eyePosition = this.truePosition
      .clone()
      .add(new THREE.Vector3(0, this.headHeightOffset, 0));
    this.cameraGroup.position.copy(eyePosition);

    // PointerLockControls updates the cameraGroup's rotation based on mouse input internally

    if (this.inputManager.getIsPointerLocked()) {
      // --- Handle Input ---
      const moveF = this.inputManager.isActionActive("moveForward");
      const moveB = this.inputManager.isActionActive("moveBackward");
      const moveL = this.inputManager.isActionActive("moveLeft");
      const moveR = this.inputManager.isActionActive("moveRight");
      const leanL = this.inputManager.isActionPressed("leanLeft");
      const leanR = this.inputManager.isActionPressed("leanRight");
      const vaultPressed = this.inputManager.isActionPressed("vault");

      if (leanL) {
        this.leanState = this.leanState === "left" ? "center" : "left";
      }
      if (leanR) {
        this.leanState = this.leanState === "right" ? "center" : "right";
      }

      // --- Update Vaulting System ---
      const vaultPosition = this.vaultingSystem.updateVault(deltaTime);

      if (this.vaultingSystem.isVaulting && vaultPosition) {
        this.truePosition.copy(vaultPosition);
        this.isOnGround = false;
        this.velocity.set(0, 0, 0);
        // Update lean visuals even during vault
        this.updateLean(deltaTime); // Apply local camera offset/roll
        // Update camera group position explicitly during vault
        this.cameraGroup.position
          .copy(this.truePosition)
          .add(new THREE.Vector3(0, this.headHeightOffset, 0));
        return; // Skip normal movement processing during vault
      }

      if (vaultPressed && !this.vaultingSystem.isVaulting) {
        const vaultStarted = this.vaultingSystem.attemptVault(
          this.truePosition
        );
        if (vaultStarted) {
          this.velocity.set(0, 0, 0);
        }
      }

      if (!this.vaultingSystem.isVaulting) {
        // Pass cameraGroup quaternion for vault check direction
        this.vaultingSystem.checkForVaultableObjects(
          this.truePosition,
          this.cameraGroup.quaternion, // Use group's orientation
          this.isOnGround
        );
      }

      // --- Calculate Movement Intent ---
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

      this.direction.z = Number(moveF) - Number(moveB);
      this.direction.x = Number(moveR) - Number(moveL);
      this.direction.normalize();

      // Get movement vectors based on cameraGroup's orientation (player's look direction)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.cameraGroup.quaternion // Use group's quaternion
      );
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.cameraGroup.quaternion // Use group's quaternion
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

      // --- Update Velocity/Gravity/Collision/Position ---
      if (!this.vaultingSystem.isVaulting) {
        this.velocity.x = targetVelocityX;
        this.velocity.z = targetVelocityZ;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      if (!this.vaultingSystem.isVaulting) {
        this.velocity.y -= this.gravity * deltaTime;
      } else {
        this.velocity.y = 0;
      }

      const velocityToCheck = this.vaultingSystem.isVaulting
        ? new THREE.Vector3()
        : this.velocity.clone();
      const collisionResult = this.collisionDetection.checkCollision(
        this.truePosition,
        velocityToCheck,
        deltaTime
      );

      if (!this.vaultingSystem.isVaulting) {
        this.velocity.copy(collisionResult.velocity);
        this.isOnGround = collisionResult.onGround;
        if (this.isOnGround && this.velocity.y < 0) {
          this.velocity.y = 0;
        }
      } else {
        this.isOnGround = collisionResult.onGround;
      }

      if (!this.vaultingSystem.isVaulting) {
        this.truePosition.add(this.velocity.clone().multiplyScalar(deltaTime));
      }

      // --- Update Camera Lean (Local Offset/Roll) ---
      // This applies the visual lean effect to the camera within the group
      this.updateLean(deltaTime);
    } else {
      // Not pointer locked
      this.velocity.set(0, 0, 0);
      // Ensure lean is reset visually if lock was lost
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
