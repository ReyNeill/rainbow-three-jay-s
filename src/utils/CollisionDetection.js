import * as THREE from "three";

export class CollisionDetection {
  constructor(objects) {
    this.objects = objects; // Assumes these are the collidable objects
    this.raycaster = new THREE.Raycaster();
    this.playerHeight = 1.6; // Changed from 1.8 to 1.6
    this.playerRadius = 0.4; // Player collision cylinder radius
    this.stepHeight = 0.5; // Maximum height the player can step over
    this.groundCheckOffset = 0.1; // Small offset for ground detection ray
    this.collisionMargin = 0.05; // Small margin to prevent sticking
  }

  // Helper to check intersections and filter by distance
  _intersect(origin, direction, maxDistance) {
    this.raycaster.set(origin, direction);
    this.raycaster.far = maxDistance; // Limit ray distance
    const intersections = this.raycaster.intersectObjects(this.objects, true); // Check recursively

    // Filter out non-collidable objects if needed (using userData)
    // For now, assume all objects passed in are collidable
    return intersections.filter(
      (hit) => hit.object.userData.isFullyCollidable !== false // Allow objects without the flag, block if explicitly false
    );
  }

  checkCollision(position, velocity, deltaTime) {
    const currentPos = position.clone();
    const predictedPos = position
      .clone()
      .add(velocity.clone().multiplyScalar(deltaTime));
    const moveDirection = velocity.clone().normalize();
    const moveDistance = velocity.length() * deltaTime;

    let collisionDetected = false;
    let onGround = false;

    // --- Ground Check ---
    const groundRayOrigin = currentPos
      .clone()
      .add(new THREE.Vector3(0, this.groundCheckOffset, 0));
    const groundDirection = new THREE.Vector3(0, -1, 0);
    // Check slightly further than the offset + step height
    const groundIntersections = this._intersect(
      groundRayOrigin,
      groundDirection,
      this.playerHeight / 2 + this.groundCheckOffset + this.collisionMargin
    );

    if (groundIntersections.length > 0) {
      const groundHit = groundIntersections[0];
      // Check if the ground is close enough to be considered 'onGround'
      if (
        groundHit.distance <=
        this.playerHeight / 2 + this.groundCheckOffset + this.collisionMargin
      ) {
        onGround = true;
        // If moving downwards, stop vertical velocity
        if (velocity.y < 0) {
          velocity.y = 0;
          // Optional: Snap position exactly to ground height + player half-height
          // position.y = groundHit.point.y + this.playerHeight / 2;
          // Avoid direct position manipulation here, just adjust velocity
        }
      }
    } else {
      onGround = false; // No ground detected below
    }

    // --- Horizontal Collision Check ---
    if (moveDistance > 0.001) {
      // Only check if actually moving horizontally
      const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
      const horizontalDir = horizontalVelocity.clone().normalize();
      const horizontalDist = horizontalVelocity.length() * deltaTime;

      // Check from player center at different heights
      const checkHeights = [
        this.stepHeight + this.collisionMargin, // Just above step height
        this.playerHeight / 2, // Middle
        this.playerHeight - this.collisionMargin, // Top
      ];

      let horizontalCollision = false;
      for (const height of checkHeights) {
        const origin = currentPos
          .clone()
          .add(new THREE.Vector3(0, height - this.playerHeight / 2, 0));
        // Check slightly ahead + radius
        const intersections = this._intersect(
          origin,
          horizontalDir,
          this.playerRadius + horizontalDist + this.collisionMargin
        );

        if (intersections.length > 0) {
          const hit = intersections[0];
          // Simple blocking: stop horizontal movement if collision is close
          if (
            hit.distance <
            this.playerRadius + horizontalDist + this.collisionMargin
          ) {
            horizontalCollision = true;
            break; // Stop checking heights if collision found
          }
        }
      }

      if (horizontalCollision) {
        // Basic stop - More advanced would involve sliding
        velocity.x = 0;
        velocity.z = 0;
        collisionDetected = true;
      }
    }

    // --- Ceiling Check --- (Simple version)
    const ceilingRayOrigin = currentPos
      .clone()
      .add(
        new THREE.Vector3(0, this.playerHeight / 2 - this.collisionMargin, 0)
      );
    const ceilingDirection = new THREE.Vector3(0, 1, 0);
    const ceilingIntersections = this._intersect(
      ceilingRayOrigin,
      ceilingDirection,
      this.collisionMargin * 2
    ); // Check just above head

    if (ceilingIntersections.length > 0) {
      if (velocity.y > 0) {
        velocity.y = 0; // Stop upward movement if head hits ceiling
      }
      collisionDetected = true;
    }

    // Return the adjusted velocity and onGround status
    // The caller should apply gravity if !onGround
    // The caller should update position using the adjusted velocity
    return { velocity, onGround, collisionDetected };
  }

  // Removed old checkCollision method content
  // ...
}
