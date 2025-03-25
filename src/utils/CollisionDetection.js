import * as THREE from "three";

export class CollisionDetection {
  constructor(objects) {
    this.objects = objects;
    this.raycaster = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.collisionDistance = 1.0; // Reduced from 2.0 for more precise collision
    this.playerHeight = 2.0; // Height of player
    this.playerRadius = 0.5; // Radius of player
    this.minBlockHeight = 0.7; // Block movement for obstacles taller than 1/3 of player height
  }

  checkCollision(position, velocity) {
    // Directions to check (forward, backward, left, right, up, down)
    // Extended to include diagonal directions for better coverage
    const directions = [
      new THREE.Vector3(0, 0, 1), // Forward
      new THREE.Vector3(0, 0, -1), // Backward
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(1, 0, 0), // Right
      new THREE.Vector3(0, 1, 0), // Up
      new THREE.Vector3(0, -1, 0), // Down
      new THREE.Vector3(1, 0, 1).normalize(), // Forward-Right
      new THREE.Vector3(-1, 0, 1).normalize(), // Forward-Left
      new THREE.Vector3(1, 0, -1).normalize(), // Backward-Right
      new THREE.Vector3(-1, 0, -1).normalize(), // Backward-Left
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
    const checkPoints = [
      position.clone(), // Middle
      position.clone().add(new THREE.Vector3(0, -0.8, 0)), // Knees level
      position.clone().add(new THREE.Vector3(0, -1.5, 0)), // Feet level - to catch small objects
    ];

    for (const checkPoint of checkPoints) {
      for (let i = 0; i < directions.length; i++) {
        this.raycaster.set(checkPoint, directions[i]);
        const intersections = this.raycaster.intersectObjects(this.objects);

        // Use a closer threshold for vertical collisions
        const verticalThreshold = i >= 4 ? 1.0 : this.collisionDistance;

        if (
          intersections.length > 0 &&
          intersections[0].distance < verticalThreshold
        ) {
          const hit = intersections[0];
          const object = hit.object;
          let objectHeight = 0;

          // Get object height if available
          if (object.geometry.type === "BoxGeometry") {
            objectHeight = object.geometry.parameters.height;
          } else if (object.geometry.boundingBox) {
            const box = object.geometry.boundingBox;
            objectHeight = box.max.y - box.min.y;
          } else {
            objectHeight = object.position.y * 2; // Estimate height
          }

          // Calculate the top of the obstacle
          const objectTop = object.position.y + objectHeight / 2;

          // For horizontal collisions (index 0-3)
          if (i < 4) {
            // If obstacle height is greater than our minimum block height threshold
            // OR the object is explicitly marked as fully collidable
            if (
              objectHeight >= this.minBlockHeight ||
              objectTop >
                position.y - this.playerHeight / 2 + this.minBlockHeight ||
              object.userData.isFullyCollidable
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
          } else if (i < 6) {
            // For vertical collisions, always apply
            switch (i) {
              case 4:
                collisionResults.up = true;
                break;
              case 5:
                collisionResults.down = true;
                // If we hit something below, we're on ground
                if (intersections[0].distance < 2.1) {
                  // Slightly larger than player height
                  // Set y position to be on top of the object
                  position.y = intersections[0].point.y + this.playerHeight / 2;
                }
                break;
            }
          } else {
            // For diagonal directions (index 6-9)
            // Check which components are significant and apply to cardinal directions
            if (i === 6) {
              // Forward-Right
              collisionResults.forward = true;
              collisionResults.right = true;
            } else if (i === 7) {
              // Forward-Left
              collisionResults.forward = true;
              collisionResults.left = true;
            } else if (i === 8) {
              // Backward-Right
              collisionResults.backward = true;
              collisionResults.right = true;
            } else if (i === 9) {
              // Backward-Left
              collisionResults.backward = true;
              collisionResults.left = true;
            }
          }
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
