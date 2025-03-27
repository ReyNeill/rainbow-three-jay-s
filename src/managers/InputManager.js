export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.keyStates = {};
    this.mouseButtonStates = {};
    this.mouseDelta = { x: 0, y: 0 };

    // Action mappings
    this.keyToAction = {
      KeyW: "moveForward",
      KeyS: "moveBackward",
      KeyA: "moveLeft",
      KeyD: "moveRight",
      KeyQ: "leanLeft",
      KeyE: "leanRight",
      Space: "vault",
      KeyL: "toggleLeanMode",
      ShiftLeft: "sprint",
      ShiftRight: "sprint",
      AltLeft: "walk",
      AltRight: "walk",
    };

    this.mouseButtonToAction = {
      0: "shoot", // Left mouse button
      // 1: 'aim', // Middle mouse button (example)
      2: "aim", // Right mouse button
    };

    this.activeActions = new Set(); // Actions currently held down
    this.pressedActions = new Set(); // Actions pressed this frame
    this.releasedActions = new Set(); // Actions released this frame

    this.isPointerLocked = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));

    this.domElement.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );
    this.domElement.addEventListener("mouseup", this.handleMouseUp.bind(this));

    document.addEventListener("mousemove", (event) =>
      this.handleMouseMove(event)
    );

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
      if (!this.isPointerLocked) {
        // Reset states when pointer lock is lost
        this.keyStates = {};
        this.mouseButtonStates = {};
        this.activeActions.clear();
        this.pressedActions.clear();
        this.releasedActions.clear();
      }
    });
  }

  handleKeyDown(event) {
    if (event.repeat || !this.isPointerLocked) return;
    const action = this.keyToAction[event.code];
    if (action && !this.keyStates[event.code]) {
      this.keyStates[event.code] = true;
      this.activeActions.add(action);
      this.pressedActions.add(action);
      // console.log(`Action pressed: ${action}`);
    }
  }

  handleKeyUp(event) {
    if (!this.isPointerLocked) return;
    const action = this.keyToAction[event.code];
    if (action && this.keyStates[event.code]) {
      this.keyStates[event.code] = false;
      this.activeActions.delete(action);
      this.releasedActions.add(action);
      // console.log(`Action released: ${action}`);
    }
  }

  handleMouseDown(event) {
    event.preventDefault();
    const action = this.mouseButtonToAction[event.button];
    if (action) {
      if (action === "aim") {
        console.log(
          `InputManager: MouseDown detected for action: ${action} (Button: ${event.button})`
        );
      }
      if (!this.activeActions.has(action)) {
        this.activeActions.add(action);
        this.pressedActions.add(action);
      }
    }
  }

  handleMouseUp(event) {
    const action = this.mouseButtonToAction[event.button];
    if (action) {
      if (action === "aim") {
        console.log(
          `InputManager: MouseUp detected for action: ${action} (Button: ${event.button})`
        );
      }
      if (this.activeActions.has(action)) {
        this.activeActions.delete(action);
        this.releasedActions.add(action);
      }
    }
  }

  handleMouseMove(event) {
    if (!this.isPointerLocked) return;
    this.mouseDelta.x += event.movementX || 0;
    this.mouseDelta.y += event.movementY || 0;
  }

  // Call this at the end of each frame/update cycle
  update() {
    // Reset per-frame states
    this.pressedActions.clear();
    this.releasedActions.clear();
    // Reset mouse delta for the next frame
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  // --- Query Methods ---

  /** Checks if an action key/button is currently held down */
  isActionActive(action) {
    return this.activeActions.has(action);
  }

  /** Checks if an action key/button was pressed down this frame */
  isActionPressed(action) {
    return this.pressedActions.has(action);
  }

  /** Checks if an action key/button was released this frame */
  isActionReleased(action) {
    return this.releasedActions.has(action);
  }

  /** Gets the accumulated mouse movement since the last update */
  getMouseDelta() {
    // Note: PointerLockControls uses mouse movement directly.
    // This delta is available if needed for other purposes or manual camera control.
    return { x: this.mouseDelta.x, y: this.mouseDelta.y };
  }

  getIsPointerLocked() {
    return this.isPointerLocked;
  }
}
