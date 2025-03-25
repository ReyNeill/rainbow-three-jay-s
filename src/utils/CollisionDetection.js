import * as THREE from "three";

export class CollisionDetection {
  constructor(objects) {
    this.objects = objects;
    this.raycaster = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.collisionDistance = 2; // Minimum distance to maintain from objects
  }

  checkCollision(position, velocity) {
    // Directions to check (forward, backward, left, right, up, down)
    const directions = [
      new THREE.Vector3(0, 0, 1), // Forward
      new THREE.Vector3(0, 0, -1), // Backward
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(1, 0, 0), // Right
      new THREE.Vector3(0, 1, 0), // Up
      new THREE.Vector3(0, -1, 0), // Down
    ];

    // Flags for collision in each direction
    let collisionResults = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    };

    // Check each direction
    for (let i = 0; i < directions.length; i++) {
      this.raycaster.set(position, directions[i]);
      const intersections = this.raycaster.intersectObjects(this.objects);

      // Use a closer threshold for vertical collisions
      const verticalThreshold = i >= 4 ? 1.0 : this.collisionDistance;

      if (
        intersections.length > 0 &&
        intersections[0].distance < verticalThreshold
      ) {
        switch (i) {
          case 0:
            collisionResults.forward = true;
            break;
          case 1:
            collisionResults.backward = true;
            break;
          case 2:
            collisionResults.left = true;
            break;
          case 3:
            collisionResults.right = true;
            break;
          case 4:
            collisionResults.up = true;
            break;
          case 5:
            collisionResults.down = true;
            // If we hit something below, we're on ground
            if (intersections[0].distance < 2.1) {
              // Slightly larger than player height
              // Set y position to be on top of the object
              position.y = intersections[0].point.y + 2.0;
            }
            break;
        }
      }
    }

    // Adjust velocity based on collisions
    if (velocity.z > 0 && collisionResults.forward) velocity.z = 0;
    if (velocity.z < 0 && collisionResults.backward) velocity.z = 0;
    if (velocity.x < 0 && collisionResults.left) velocity.x = 0;
    if (velocity.x > 0 && collisionResults.right) velocity.x = 0;
    if (velocity.y > 0 && collisionResults.up) velocity.y = 0;
    if (velocity.y < 0 && collisionResults.down) velocity.y = 0;

    return velocity;
  }
}
