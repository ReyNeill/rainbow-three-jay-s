import * as THREE from "three";

export class VaultingSystem {
  constructor(collidableObjects = [], uiManager) {
    this.collidableObjects = collidableObjects;
    this.uiManager = uiManager;

    // Vaulting state
    this.canVault = false;
    this.isVaulting = false;
    this.vaultTargetPosition = null; // Where the player lands after vaulting
    this.vaultObjectTopY = 0; // The Y coordinate of the top of the object being vaulted
    this.vaultDuration = 0.4; // seconds
    this.vaultTimer = 0;
    this.vaultStartPosition = new THREE.Vector3(); // Where the player starts the vault

    // Configuration
    this.vaultDistance = 1.5; // How far ahead to check for vaultable objects
    this.vaultMaxHeightDiff = 1.7; // Max height difference player center vs object top
    this.vaultMinHeightDiff = 0.3; // Min height difference player center vs object top
    this.playerHeight = 1.6; // Keep consistent with PlayerController/CollisionDetection
    this.playerRadius = 0.4; // Keep consistent

    // Timing
    this.lastVaultCheckTime = 0;
    this.vaultCheckInterval = 0.2; // Check for vaultable objects every 0.2 seconds
  }

  setCollidableObjects(objects) {
    this.collidableObjects = objects;
  }

  showVaultPrompt() {
    if (this.uiManager) {
      this.uiManager.setVaultPromptVisible(true);
    }
  }

  hideVaultPrompt() {
    if (this.uiManager) {
      this.uiManager.setVaultPromptVisible(false);
    }
  }

  // Checks if a vault is possible from the current state
  checkForVaultableObjects(playerPos, cameraQuaternion, isOnGround) {
    this.canVault = false; // Reset before check

    if (this.isVaulting || !isOnGround) {
      this.hideVaultPrompt();
      return;
    }

    // Throttle checks
    const currentTime = Date.now() / 1000;
    if (currentTime - this.lastVaultCheckTime < this.vaultCheckInterval) {
      // Keep showing prompt if canVault was true from last check
      if (this.canVault) this.showVaultPrompt();
      return;
    }
    this.lastVaultCheckTime = currentTime;

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(cameraQuaternion);
    direction.y = 0; // Horizontal direction
    if (direction.lengthSq() === 0) return; // Avoid issues if looking straight up/down
    direction.normalize();

    // Ray origin slightly below player center (waist height)
    const origin = playerPos.clone();
    origin.y -= 0.4; // Adjust origin height for better detection

    raycaster.set(origin, direction);
    raycaster.far = this.vaultDistance;

    const intersects = raycaster.intersectObjects(this.collidableObjects, true); // Recursive check

    let foundVaultable = false;
    if (intersects.length > 0) {
      const hit = intersects[0];
      const object = hit.object;

      // Determine object's top Y coordinate
      let objectTopY = 0;
      if (object.geometry.boundingBox) {
        objectTopY = object.position.y + object.geometry.boundingBox.max.y;
      } else if (object.geometry.parameters) {
        // Approx for BoxGeometry, PlaneGeometry etc.
        objectTopY =
          object.position.y + (object.geometry.parameters.height || 0) / 2;
      } else {
        // Fallback: use hit point y (less reliable)
        objectTopY = hit.point.y;
      }

      const heightDifference = objectTopY - playerPos.y;

      // Check height criteria
      if (
        heightDifference > this.vaultMinHeightDiff &&
        heightDifference < this.vaultMaxHeightDiff
      ) {
        // Calculate landing position: on top of the object, slightly forward
        this.vaultTargetPosition = hit.point.clone();
        this.vaultTargetPosition.y = objectTopY + this.playerHeight / 2; // Land with feet on top
        // Move slightly past the hit point along the direction vector
        this.vaultTargetPosition.addScaledVector(
          direction,
          this.playerRadius * 1.5
        );

        this.vaultObjectTopY = objectTopY; // Store the peak height for the curve
        this.canVault = true;
        foundVaultable = true;
        this.showVaultPrompt();
      }
    }

    if (!foundVaultable) {
      this.hideVaultPrompt();
    }
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
