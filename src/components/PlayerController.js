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

    // Gravity and ground state
    this.gravity = 9.8 * 10; // Gravity constant (multiplied for better effect)
    this.isOnGround = true;
    this.floorHeight = 2; // Player eye height (camera is at y=2)

    // Vaulting properties
    this.canVault = false;
    this.isVaulting = false;
    this.vaultTarget = null;
    this.vaultHeight = 0;
    this.vaultDuration = 0.4; // seconds
    this.vaultTimer = 0;
    this.vaultPromptElement = null;
    this.playerHeight = 2.0; // Player height (same as floorHeight)
    this.vaultDistance = 1.5; // Increased from 1.2 to better detect objects
    this.vaultMaxHeight = 1.7; // Increased from 1.5 to better accommodate Half Walls (1.2 height)
    this.vaultMinHeight = 0.3; // Reduced to allow vaulting shorter objects
    this.lastVaultCheckTime = 0;
    this.vaultCheckInterval = 0.2; // Check for vaultable objects every 0.2 seconds

    // Camera position tracking
    this.cameraOffset = new THREE.Vector3();

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

    // Create vault prompt
    this.createVaultPrompt();
  }

  createVaultPrompt() {
    this.vaultPromptElement = document.createElement("div");
    this.vaultPromptElement.id = "vault-prompt";
    this.vaultPromptElement.style.position = "absolute";
    this.vaultPromptElement.style.bottom = "30%";
    this.vaultPromptElement.style.left = "50%";
    this.vaultPromptElement.style.transform = "translateX(-50%)";
    this.vaultPromptElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.vaultPromptElement.style.color = "white";
    this.vaultPromptElement.style.padding = "12px 20px";
    this.vaultPromptElement.style.borderRadius = "5px";
    this.vaultPromptElement.style.fontWeight = "bold";
    this.vaultPromptElement.style.fontSize = "18px";
    this.vaultPromptElement.style.display = "none";
    this.vaultPromptElement.style.border = "2px solid white";
    this.vaultPromptElement.style.textAlign = "center";
    this.vaultPromptElement.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    this.vaultPromptElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center;">
        <div style="font-size: 24px; margin-right: 8px;">↑</div>
        <div>Press <span style="color: #ff9900; font-size: 20px;">[SPACE]</span> to Vault</div>
      </div>
    `;
    document.body.appendChild(this.vaultPromptElement);

    // Add animation
    this.vaultPromptElement.style.animation = "pulse 1.5s infinite ease-in-out";

    // Add keyframes for the animation
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse {
        0% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
        100% { transform: translateX(-50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  showVaultPrompt() {
    if (this.vaultPromptElement) {
      this.vaultPromptElement.style.display = "block";
    }
  }

  hideVaultPrompt() {
    if (this.vaultPromptElement) {
      this.vaultPromptElement.style.display = "none";
    }
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
        this.hideVaultPrompt();
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
        "<p>Click to play</p><p>Move: WASD<br>Look: Mouse<br>Lean: Q/E<br>Vault: Space</p>";
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
        // Only initiate vault if we're properly showing the prompt
        if (
          this.canVault &&
          !this.isVaulting &&
          this.vaultPromptElement &&
          this.vaultPromptElement.style.display === "block"
        ) {
          this.startVault();
        }
        break;
    }
  }

  startVault() {
    if (!this.vaultTarget) return;

    this.isVaulting = true;
    this.vaultTimer = 0;
    this.hideVaultPrompt();

    // Store initial position and target position
    this.vaultStartPosition = this.truePosition.clone();
    this.vaultEndPosition = new THREE.Vector3(
      this.vaultTarget.x,
      this.vaultTarget.y,
      this.vaultTarget.z
    );

    // Disable player control during vault
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
  }

  updateVault(deltaTime) {
    if (!this.isVaulting) return;

    this.vaultTimer += deltaTime;
    const progress = Math.min(1.0, this.vaultTimer / this.vaultDuration);

    if (progress < 1.0) {
      // Bezier curve for smooth vault motion
      const t = progress;
      const oneMinusT = 1 - t;

      // Start position
      const p0 = this.vaultStartPosition;

      // Control point slightly above target
      const p1 = new THREE.Vector3(
        (p0.x + this.vaultEndPosition.x) / 2,
        Math.max(p0.y, this.vaultEndPosition.y) + 0.5,
        (p0.z + this.vaultEndPosition.z) / 2
      );

      // End position
      const p2 = this.vaultEndPosition;

      // Quadratic bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      this.truePosition.x =
        oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
      this.truePosition.y =
        oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
      this.truePosition.z =
        oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z;
    } else {
      // Complete the vault
      this.truePosition.copy(this.vaultEndPosition);
      this.isVaulting = false;
      this.velocity.set(0, 0, 0);
    }
  }

  checkForVaultableObjects() {
    if (this.isVaulting) return;

    // Only check if we're on the ground
    if (!this.isOnGround) {
      this.canVault = false;
      this.hideVaultPrompt();
      return;
    }

    // Create a raycaster pointing in the direction the player is facing
    const raycaster = new THREE.Raycaster();

    // Get the direction the player is facing (from camera)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    // Zero out the Y component and normalize
    direction.y = 0;
    if (direction.length() > 0) direction.normalize();

    // Try multiple rays at different heights to better detect vaultable objects
    const rayHeights = [
      -0.3, // Upper body
      -0.8, // Waist level
      -1.3, // Knee level
    ];

    this.canVault = false;

    // Check at multiple heights
    for (const rayOffset of rayHeights) {
      // Start position is at player position, adjusted for height
      const startPos = this.truePosition.clone();
      startPos.y += rayOffset;
      raycaster.set(startPos, direction);

      // Check for intersections with collidable objects
      const intersects = raycaster.intersectObjects(
        this.collisionDetection.objects
      );

      if (intersects.length > 0) {
        const hit = intersects[0];

        // Only consider objects within vaultDistance
        if (hit.distance < this.vaultDistance) {
          // Get the object
          const object = hit.object;

          // Safely determine object height - Different geometries store dimensions differently
          let objectHeight = 0;
          let objectTop = 0;

          if (object.geometry.type === "BoxGeometry") {
            // For box geometries
            objectHeight = object.geometry.parameters.height;
            objectTop = object.position.y + objectHeight / 2;
          } else if (object.geometry.type === "PlaneGeometry") {
            // For plane geometries (like the floor)
            objectTop = object.position.y;
            objectHeight = 0.1; // Minimal height for planes
          } else {
            // For other geometries, use bounding box
            if (!object.geometry.boundingBox) {
              object.geometry.computeBoundingBox();
            }
            const boundingBox = object.geometry.boundingBox;
            objectHeight = boundingBox.max.y - boundingBox.min.y;
            objectTop = object.position.y + objectHeight / 2;
          }

          // Calculate height from feet and center
          const heightFromFeet =
            objectTop - (this.truePosition.y - this.playerHeight / 2);
          const heightDifference = objectTop - this.truePosition.y;

          // Debug: log vault information
          console.log(
            `[Ray at ${rayOffset}] Object ${
              object.userData.name || ""
            } at ${object.position.y.toFixed(2)}, h:${objectHeight.toFixed(
              2
            )}, ` +
              `top:${objectTop.toFixed(2)}, diff:${heightDifference.toFixed(
                2
              )}, fromFeet:${heightFromFeet.toFixed(2)}, maxH:${
                this.vaultMaxHeight
              }`
          );

          // More permissive check for vaultable objects
          // Either the object is tall enough for collision detection OR
          // the object's top is at a vaultable height relative to player
          if (
            ((objectHeight >= 0.6 || // Reduced from 0.7
              heightFromFeet >= 0.6) && // Consider absolute height from feet
              heightDifference > this.vaultMinHeight &&
              heightDifference < this.vaultMaxHeight) ||
            // Special handling for Half Walls
            (object.userData.name === "HalfWall" &&
              hit.distance < this.vaultDistance * 0.7)
          ) {
            this.canVault = true;

            // For Half Walls, only make vaultable if directly facing it (within 45 degrees)
            if (object.userData.name === "HalfWall") {
              // Calculate angle between player direction and hit normal
              const playerFacing = direction.clone();
              const hitNormal = hit.face.normal.clone();
              // Invert normal because it points outward from the surface
              hitNormal.negate();

              // Get the angle between the two vectors
              const angle = playerFacing.angleTo(hitNormal);

              // If not facing the wall within 60 degrees, don't vault
              if (angle > Math.PI / 3) {
                this.canVault = false;
                continue;
              }
            }

            // Calculate vault target position (on top of the object)
            const targetPos = hit.point.clone();
            targetPos.y = objectTop + 0.1; // Slightly above surface

            // Move slightly forward to get fully on the object
            targetPos.add(direction.clone().multiplyScalar(1.5));

            this.vaultTarget = targetPos;
            this.showVaultPrompt();
            return; // Exit once we find a vaultable object
          }
        }
      }
    }

    // If we get here, no valid vault target was found
    this.hideVaultPrompt();
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
      // Get camera's right vector for offset direction
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(this.camera.quaternion);

      // Zero out vertical component to keep lean horizontal
      right.y = 0;
      if (right.length() > 0) right.normalize();

      // Calculate lean offset - ONLY apply position offset, not rotation
      this.cameraOffset
        .copy(right)
        .multiplyScalar(this.leanAmount * this.maxLeanOffset);

      // Update camera position (adding lean offset to the true position)
      this.camera.position.copy(this.truePosition).add(this.cameraOffset);
    }
  }

  update(deltaTime) {
    if (this.controls.isLocked) {
      // Handle vaulting if in progress
      if (this.isVaulting) {
        this.updateVault(deltaTime);
        this.updateLean(deltaTime);
        return; // Skip normal movement processing during vault
      }

      // Don't check for vaultable objects every frame, only periodically
      const currentTime = Date.now() / 1000; // Convert to seconds
      if (currentTime - this.lastVaultCheckTime > this.vaultCheckInterval) {
        this.checkForVaultableObjects();
        this.lastVaultCheckTime = currentTime;
      }

      // Reset canVault flag if speed is too high to prevent auto-vaulting
      // This prevents accidental vaulting when moving quickly
      if (
        this.canVault &&
        (Math.abs(this.velocity.x) > 15 || Math.abs(this.velocity.z) > 15)
      ) {
        this.canVault = false;
        this.hideVaultPrompt();
      }

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

      // Only normalize if vectors are not zero length
      if (forward.length() > 0) forward.normalize();
      if (right.length() > 0) right.normalize();

      // Move the true position directly
      if (this.velocity.z !== 0 && forward.length() > 0) {
        const moveVec = forward
          .clone()
          .multiplyScalar(-this.velocity.z * deltaTime);
        this.truePosition.add(moveVec);
      }

      if (this.velocity.x !== 0 && right.length() > 0) {
        const moveVec = right
          .clone()
          .multiplyScalar(-this.velocity.x * deltaTime);
        this.truePosition.add(moveVec);
      }

      // Apply vertical movement to true position
      this.truePosition.y += this.velocity.y * deltaTime;

      // Make the camera follow the player (base position)
      this.updateLean(deltaTime);
    }
  }

  // Return the true player position (always unaffected by lean)
  getPosition() {
    return this.truePosition.clone();
  }

  getRotation() {
    // Return camera rotation
    return this.camera.rotation;
  }

  getLeanAmount() {
    return this.leanAmount;
  }
}
