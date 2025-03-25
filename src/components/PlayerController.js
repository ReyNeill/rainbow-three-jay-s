import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CollisionDetection } from "../utils/CollisionDetection.js";

export class PlayerController {
  constructor(camera, domElement, collidableObjects = []) {
    this.camera = camera;
    this.domElement = domElement;

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Lean state
    this.leanState = "center"; // 'left', 'center', 'right'
    this.leanAmount = 0; // Current lean amount (-1 for left, 0 for center, 1 for right)
    this.maxLeanAngle = Math.PI / 12; // ~15 degrees
    this.maxLeanOffset = 0.75; // How far to move the camera sideways when leaning
    this.leanSpeed = 5.0; // Speed of lean transition

    // Movement speed and physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveSpeed = 100.0; // Units per second

    // Gravity and jumping
    this.gravity = 9.8 * 10; // Gravity constant (multiplied for better effect)
    this.isOnGround = true;
    this.floorHeight = 2; // Player eye height (camera is at y=2)
    this.jumpVelocity = 10; // Initial jump velocity

    // Camera position and rotation tracking
    this.cameraOffset = new THREE.Vector3();
    this.cameraRotation = new THREE.Euler();

    // Track the true player position (unaffected by lean)
    this.truePosition = new THREE.Vector3(0, 2, 15);

    // Initialize pointer lock controls
    this.controls = new PointerLockControls(this.camera, this.domElement);

    // Set initial camera position
    this.camera.position.copy(this.truePosition);

    // Collision detection
    this.collisionDetection = new CollisionDetection(collidableObjects);

    // Setup event listeners
    this.setupEventListeners();

    // Instruction text
    this.showInstructions();
  }

  setupEventListeners() {
    // Click event to start pointer lock
    this.domElement.addEventListener("click", () => {
      this.controls.lock();
    });

    // Setup keyboard controls
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => this.onKeyUp(event));

    // Pointer lock change events
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === this.domElement) {
        this.hideInstructions();
      } else {
        this.showInstructions();
      }
    });
  }

  showInstructions() {
    let instructions = document.getElementById("instructions");
    if (!instructions) {
      instructions = document.createElement("div");
      instructions.id = "instructions";
      instructions.style.position = "absolute";
      instructions.style.top = "50%";
      instructions.style.left = "50%";
      instructions.style.transform = "translate(-50%, -50%)";
      instructions.style.textAlign = "center";
      instructions.style.color = "white";
      instructions.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      instructions.style.padding = "1em";
      instructions.style.borderRadius = "5px";
      instructions.innerHTML =
        "<p>Click to play</p><p>Move: WASD<br>Look: Mouse<br>Lean: Q/E<br>Jump: Space</p>";
      document.body.appendChild(instructions);
    }
    instructions.style.display = "block";
  }

  hideInstructions() {
    const instructions = document.getElementById("instructions");
    if (instructions) {
      instructions.style.display = "none";
    }
  }

  setCollidableObjects(objects) {
    this.collisionDetection = new CollisionDetection(objects);
  }

  onKeyDown(event) {
    if (!this.controls.isLocked) return;

    switch (event.code) {
      case "KeyW":
        this.moveForward = true;
        break;
      case "KeyS":
        this.moveBackward = true;
        break;
      case "KeyA":
        this.moveLeft = true;
        break;
      case "KeyD":
        this.moveRight = true;
        break;
      case "KeyQ":
        if (!event.repeat) {
          // Only toggle on initial keypress, not when holding
          if (this.leanState === "left") {
            this.leanState = "center";
          } else {
            this.leanState = "left";
          }
        }
        break;
      case "KeyE":
        if (!event.repeat) {
          // Only toggle on initial keypress, not when holding
          if (this.leanState === "right") {
            this.leanState = "center";
          } else {
            this.leanState = "right";
          }
        }
        break;
      case "Space":
        // Jump only if we're on the ground
        if (this.isOnGround) {
          this.velocity.y = this.jumpVelocity;
          this.isOnGround = false;
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.moveForward = false;
        break;
      case "KeyS":
        this.moveBackward = false;
        break;
      case "KeyA":
        this.moveLeft = false;
        break;
      case "KeyD":
        this.moveRight = false;
        break;
    }
  }

  updateLean(deltaTime) {
    // Calculate target lean amount based on lean state
    let targetLean = 0;
    if (this.leanState === "left") targetLean = -1;
    if (this.leanState === "right") targetLean = 1;

    // Smoothly interpolate towards target lean
    const leanDelta = targetLean - this.leanAmount;
    if (Math.abs(leanDelta) > 0.001) {
      this.leanAmount += leanDelta * this.leanSpeed * deltaTime;
    } else {
      this.leanAmount = targetLean;
    }

    // Limit lean amount
    this.leanAmount = Math.max(-1, Math.min(1, this.leanAmount));

    if (this.controls.isLocked) {
      // Get camera right vector
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(this.camera.quaternion);

      // Calculate lean offset
      this.cameraOffset
        .copy(right)
        .multiplyScalar(this.leanAmount * this.maxLeanOffset);

      // Apply lean visually - adjust camera from true position
      this.camera.position.copy(this.truePosition).add(this.cameraOffset);

      // Apply camera rotation for leaning
      this.camera.rotation.z = -this.leanAmount * this.maxLeanAngle;

      // Remember camera rotation
      this.cameraRotation.copy(this.camera.rotation);
    }
  }

  update(deltaTime) {
    if (this.controls.isLocked) {
      // Apply damping to slow down movement
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

      // Apply gravity to y velocity
      this.velocity.y -= this.gravity * deltaTime;

      // Check for ground collision
      if (this.truePosition.y <= this.floorHeight && this.velocity.y < 0) {
        this.velocity.y = 0;
        this.truePosition.y = this.floorHeight;
        this.isOnGround = true;
      } else {
        this.isOnGround = false;
      }

      // Calculate movement direction
      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize();

      // Apply movement in the direction the camera is facing
      if (this.moveForward || this.moveBackward) {
        this.velocity.z -= this.direction.z * this.moveSpeed * deltaTime;
      }
      if (this.moveLeft || this.moveRight) {
        this.velocity.x -= this.direction.x * this.moveSpeed * deltaTime;
      }

      // Check for collisions using true position
      this.velocity = this.collisionDetection.checkCollision(
        this.truePosition,
        this.velocity
      );

      // Get direction vectors based on camera orientation
      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);
      forward.applyQuaternion(this.camera.quaternion);
      right.applyQuaternion(this.camera.quaternion);

      // Zero out the Y component to keep movement horizontal
      forward.y = 0;
      right.y = 0;
      forward.normalize();
      right.normalize();

      // Move the true position directly
      if (this.velocity.z !== 0) {
        const moveVec = forward
          .clone()
          .multiplyScalar(-this.velocity.z * deltaTime);
        this.truePosition.add(moveVec);
      }

      if (this.velocity.x !== 0) {
        const moveVec = right
          .clone()
          .multiplyScalar(-this.velocity.x * deltaTime);
        this.truePosition.add(moveVec);
      }

      // Apply vertical movement to true position
      this.truePosition.y += this.velocity.y * deltaTime;

      // Update camera position based on true position and lean
      this.updateLean(deltaTime);
    }
  }

  // Return the true player position (always unaffected by lean)
  getPosition() {
    return this.truePosition.clone();
  }

  getRotation() {
    return this.camera.rotation;
  }

  getLeanAmount() {
    return this.leanAmount;
  }
}
