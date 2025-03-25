import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export class PlayerController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Movement speed and physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveSpeed = 100.0; // Units per second

    // Initialize pointer lock controls
    this.controls = new PointerLockControls(this.camera, this.domElement);

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Click event to start pointer lock
    this.domElement.addEventListener("click", () => {
      this.controls.lock();
    });

    // Setup keyboard controls
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => this.onKeyUp(event));
  }

  onKeyDown(event) {
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

  update(deltaTime) {
    if (this.controls.isLocked) {
      // Apply damping to slow down movement
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

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

      // Move the camera
      this.controls.moveRight(-this.velocity.x * deltaTime);
      this.controls.moveForward(-this.velocity.z * deltaTime);
    }
  }

  getPosition() {
    return this.camera.position;
  }

  getRotation() {
    return this.camera.rotation;
  }
}
