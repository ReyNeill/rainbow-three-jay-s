import * as THREE from "three";

export class VaultingSystem {
  constructor(
    collidableObjects = [],
    uiManager,
    playerHeight, // Receive from PlayerController
    playerRadius, // Receive from PlayerController
    vaultDistance, // Receive from PlayerController
    vaultMaxHeightDiff, // Receive from PlayerController
    vaultMinHeightDiff, // Receive from PlayerController
    vaultDuration // Receive from PlayerController
  ) {
    this.collidableObjects = collidableObjects;
    this.uiManager = uiManager;

    // Vaulting state
    this.canVault = false;
    this.isVaulting = false;
    this.vaultTargetPosition = null; // Where the player lands after vaulting
    this.vaultObjectTopY = 0; // The Y coordinate of the top of the object being vaulted
    this.vaultTimer = 0;
    this.vaultStartPosition = new THREE.Vector3(); // Where the player starts the vault

    // Configuration - Use passed-in values
    this.vaultDistance = vaultDistance;
    this.vaultMaxHeightDiff = vaultMaxHeightDiff;
    this.vaultMinHeightDiff = vaultMinHeightDiff;
    this.playerHeight = playerHeight;
    this.playerRadius = playerRadius;
    this.vaultDuration = vaultDuration;

    // Internal state for UI updates
    this._isPromptVisible = false;
  }

  setCollidableObjects(objects) {
    this.collidableObjects = objects;
  }

  showVaultPrompt() {
    if (this.uiManager?.elements?.vaultPrompt && !this._isPromptVisible) {
      this.uiManager.elements.vaultPrompt.style.display = "block";
      this._isPromptVisible = true;
    }
  }

  hideVaultPrompt() {
    if (this.uiManager?.elements?.vaultPrompt && this._isPromptVisible) {
      this.uiManager.elements.vaultPrompt.style.display = "none";
      this._isPromptVisible = false;
    }
  }

  // Checks if a vault is possible from the current state
  checkForVaultableObjects(playerPos, cameraQuaternion, isOnGround) {
    // Store previous state to check if UI needs update
    const previouslyCouldVault = this.canVault;
    this.canVault = false; // Reset before check

    // Don't check if already vaulting or not on the ground
    if (this.isVaulting || !isOnGround) {
      if (previouslyCouldVault) this.hideVaultPrompt(); // Hide if state changed
      return;
    }

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(cameraQuaternion);
    direction.y = 0; // Horizontal direction only
    if (direction.lengthSq() === 0) {
      if (previouslyCouldVault) this.hideVaultPrompt();
      return;
    }
    direction.normalize();

    // Ray origin: Lowered slightly from player center for better low object detection
    // Player center is at playerPos.y (e.g., 0.8 when grounded)
    // Let's try originating from 0.3 units below the center.
    const origin = playerPos.clone().add(new THREE.Vector3(0, -0.3, 0)); // Origin at Y = 0.5 when grounded

    raycaster.set(origin, direction);
    raycaster.far = this.vaultDistance; // Check up to 1.5 units ahead

    const intersects = raycaster.intersectObjects(this.collidableObjects, true);

    let foundVaultableThisFrame = false;
    if (intersects.length > 0) {
      const hit = intersects[0];
      const object = hit.object;

      // --- Check 1: Is the object explicitly marked as vaultable? ---
      if (object.userData && object.userData.type === "vaultable") {
        // --- Check 2: Calculate object's top Y coordinate ---
        let objectHeight = object.userData.height;
        if (objectHeight === undefined && object.geometry.parameters) {
          objectHeight = object.geometry.parameters.height || 0;
        }
        // Calculate top Y based on object's world position and height
        // Assumes object's pivot/origin is at its base or center.
        // Our Table/MiniTable models have origin at center, position.y = height/2
        // So, top Y = object.position.y + objectHeight / 2
        const objectTopY = object.position.y + objectHeight / 2;

        // --- Check 3: Is the object height relative to player feet within range? ---
        const playerFeetY = playerPos.y - this.playerHeight / 2;
        const heightDifference = objectTopY - playerFeetY;

        // Use the relative height difference checks
        if (
          heightDifference >= this.vaultMinHeightDiff &&
          heightDifference <= this.vaultMaxHeightDiff
        ) {
          // --- Vault is possible ---
          // Calculate landing position: on top of the object, slightly forward
          this.vaultTargetPosition = hit.point.clone();
          // Land with player center at correct height above object top
          this.vaultTargetPosition.y = objectTopY + this.playerHeight / 2;
          // Move slightly past the hit point along the direction vector
          this.vaultTargetPosition.addScaledVector(
            direction,
            this.playerRadius * 1.5 // Adjust multiplier as needed
          );

          this.vaultObjectTopY = objectTopY; // Store the peak height for the curve
          this.canVault = true; // Set canVault for this frame
          foundVaultableThisFrame = true;
        }
      }
    }

    // Update UI only if the vaultable state changed
    if (foundVaultableThisFrame && !previouslyCouldVault) {
      this.showVaultPrompt();
    } else if (!foundVaultableThisFrame && previouslyCouldVault) {
      this.hideVaultPrompt();
    }
    // If state didn't change, do nothing to the UI
  }

  // Attempts to start a vault if possible
  attemptVault(playerPos) {
    if (this.canVault && !this.isVaulting) {
      this.isVaulting = true;
      this.vaultTimer = 0;
      this.vaultStartPosition.copy(playerPos);
      this.hideVaultPrompt();
      return true; // Vault started
    }
    return false; // Vault not started
  }

  // Updates the vault animation if active
  // Returns the new player position if vaulting, otherwise null
  updateVault(deltaTime) {
    if (!this.isVaulting) return null;

    this.vaultTimer += deltaTime;
    const progress = Math.min(1.0, this.vaultTimer / this.vaultDuration);

    let newPosition;
    if (progress < 1.0) {
      // Simple parabolic arc for vault motion
      const t = progress;
      const p0 = this.vaultStartPosition;
      const p2 = this.vaultTargetPosition;

      // Control point for the arc (peak height)
      const p1 = new THREE.Vector3(
        (p0.x + p2.x) / 2,
        Math.max(p0.y, p2.y, this.vaultObjectTopY + 0.5), // Ensure peak is above object
        (p0.z + p2.z) / 2
      );

      // Quadratic bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      newPosition = new THREE.Vector3().lerpVectors(p0, p1, t).lerp(p2, t); // Simplified interpolation for arc

      // More direct Bezier calculation:
      const oneMinusT = 1 - t;
      newPosition = new THREE.Vector3();
      newPosition.x =
        oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
      newPosition.y =
        oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
      newPosition.z =
        oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z;
    } else {
      // Complete the vault
      newPosition = this.vaultTargetPosition.clone();
      this.isVaulting = false; // Vault finished
    }

    return newPosition;
  }

  // Call this when pointer lock is lost to clean up UI
  onPointerUnlock() {
    this.hideVaultPrompt();
  }
}
