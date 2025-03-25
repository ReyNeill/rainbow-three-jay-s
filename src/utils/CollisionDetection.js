import * as THREE from "three";

export class CollisionDetection {
  constructor(objects) {
    this.objects = objects;
    this.raycaster = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.collisionDistance = 2; // Minimum distance to maintain from objects
  }

  checkCollision(position, velocity) {
    // Directions to check (forward, backward, left, right)
    const directions = [
      new THREE.Vector3(0, 0, 1), // Forward
      new THREE.Vector3(0, 0, -1), // Backward
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(1, 0, 0), // Right
    ];

    // Flags for collision in each direction
    let collisionResults = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    // Check each direction
    for (let i = 0; i < directions.length; i++) {
      this.raycaster.set(position, directions[i]);
      const intersections = this.raycaster.intersectObjects(this.objects);

      if (
        intersections.length > 0 &&
        intersections[0].distance < this.collisionDistance
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
        }
      }
    }

    // Adjust velocity based on collisions
    if (velocity.z > 0 && collisionResults.forward) velocity.z = 0;
    if (velocity.z < 0 && collisionResults.backward) velocity.z = 0;
    if (velocity.x < 0 && collisionResults.left) velocity.x = 0;
    if (velocity.x > 0 && collisionResults.right) velocity.x = 0;

    return velocity;
  }
}
