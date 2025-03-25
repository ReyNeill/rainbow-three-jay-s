export class UIManager {
  constructor() {
    this.elements = {};
    this.createElements();
    this.notificationTimeout = null; // For hiding notifications
  }

  createElements() {
    // Crosshair
    this.elements.crosshair = document.createElement("div");
    this.elements.crosshair.style.position = "absolute";
    this.elements.crosshair.style.top = "50%";
    this.elements.crosshair.style.left = "50%";
    this.elements.crosshair.style.transform = "translate(-50%, -50%)";
    this.elements.crosshair.style.width = "2px";
    this.elements.crosshair.style.height = "2px";
    this.elements.crosshair.style.backgroundColor = "white";
    this.elements.crosshair.style.borderRadius = "50%";
    this.elements.crosshair.style.border = "1px solid black";
    this.elements.crosshair.style.pointerEvents = "none";
    this.elements.crosshair.style.display = "none"; // Initially hidden
    document.body.appendChild(this.elements.crosshair);

    // Vault Prompt (Copied from VaultingSystem)
    this.elements.vaultPrompt = document.createElement("div");
    this.elements.vaultPrompt.id = "vault-prompt";
    this.elements.vaultPrompt.style.position = "absolute";
    this.elements.vaultPrompt.style.bottom = "30%";
    this.elements.vaultPrompt.style.left = "50%";
    this.elements.vaultPrompt.style.transform = "translateX(-50%)";
    this.elements.vaultPrompt.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.elements.vaultPrompt.style.color = "white";
    this.elements.vaultPrompt.style.padding = "12px 20px";
    this.elements.vaultPrompt.style.borderRadius = "5px";
    this.elements.vaultPrompt.style.fontWeight = "bold";
    this.elements.vaultPrompt.style.fontSize = "18px";
    this.elements.vaultPrompt.style.display = "none"; // Initially hidden
    this.elements.vaultPrompt.style.border = "2px solid white";
    this.elements.vaultPrompt.style.textAlign = "center";
    this.elements.vaultPrompt.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    this.elements.vaultPrompt.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="font-size: 24px; margin-right: 8px;">↑</div>
            <div>Press <span style="color: #ff9900; font-size: 20px;">[SPACE]</span> to Vault</div>
          </div>
        `;
    this.elements.vaultPrompt.style.animation =
      "pulse 1.5s infinite ease-in-out";
    document.body.appendChild(this.elements.vaultPrompt);

    // Vault Prompt Animation Keyframes (ensure only added once)
    if (!document.getElementById("vault-pulse-keyframes")) {
      const style = document.createElement("style");
      style.id = "vault-pulse-keyframes";
      style.innerHTML = `
              @keyframes pulse {
                0% { transform: translateX(-50%) scale(1); }
                50% { transform: translateX(-50%) scale(1.05); }
                100% { transform: translateX(-50%) scale(1); }
              }
            `;
      document.head.appendChild(style);
    }

    // Instructions (Copied from PlayerController)
    this.elements.instructions = document.createElement("div");
    this.elements.instructions.id = "instructions"; // Use existing ID if needed
    this.elements.instructions.style.position = "absolute";
    this.elements.instructions.style.top = "50%";
    this.elements.instructions.style.left = "50%";
    this.elements.instructions.style.transform = "translate(-50%, -50%)";
    this.elements.instructions.style.textAlign = "center";
    this.elements.instructions.style.color = "white";
    this.elements.instructions.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.elements.instructions.style.padding = "1em";
    this.elements.instructions.style.borderRadius = "5px";
    this.elements.instructions.innerHTML = `Click to Play<br>(W, A, S, D = Move, Q/E = Lean, SPACE = Vault, MOUSE = Look, CLICK = Shoot)`;
    document.body.appendChild(this.elements.instructions);

    // Testing Instructions (Copied from main.js)
    this.elements.testingInstructions = document.createElement("div");
    this.elements.testingInstructions.style.position = "absolute";
    this.elements.testingInstructions.style.top = "20px";
    this.elements.testingInstructions.style.left = "20px";
    this.elements.testingInstructions.style.color = "white";
    this.elements.testingInstructions.style.backgroundColor =
      "rgba(0, 0, 0, 0.7)";
    this.elements.testingInstructions.style.padding = "10px";
    this.elements.testingInstructions.style.borderRadius = "5px";
    this.elements.testingInstructions.style.fontWeight = "bold";
    this.elements.testingInstructions.style.fontSize = "16px";
    this.elements.testingInstructions.style.zIndex = "1000";
    this.elements.testingInstructions.innerHTML = `
          <h3 style="color: #ff9900; margin: 0 0 10px 0;">Shooting Test Arena</h3>
          <p>- Look for the <span style="color: yellow;">YELLOW</span> dummy players</p>
          <p>- Try to hit the <span style="color: red;">RED</span> moving targets - they respawn after 5 seconds</p>
          <p>- Click to lock pointer and enable shooting</p>
          <p>- WASD to move, Space to vault over obstacles</p>
          <p>- Q/E to lean left/right</p>
          <p>- Left-click to shoot targets and dummies</p>
        `;
    document.body.appendChild(this.elements.testingInstructions);

    // --- Notification Area ---
    this.elements.notificationArea = document.createElement("div");
    this.elements.notificationArea.style.position = "absolute";
    this.elements.notificationArea.style.top = "10px";
    this.elements.notificationArea.style.left = "50%";
    this.elements.notificationArea.style.transform = "translateX(-50%)";
    this.elements.notificationArea.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.elements.notificationArea.style.color = "white";
    this.elements.notificationArea.style.padding = "8px 15px";
    this.elements.notificationArea.style.borderRadius = "5px";
    this.elements.notificationArea.style.fontSize = "16px";
    this.elements.notificationArea.style.display = "none"; // Initially hidden
    this.elements.notificationArea.style.zIndex = "1002"; // Above other elements
    this.elements.notificationArea.style.textAlign = "center";
    document.body.appendChild(this.elements.notificationArea);
    // --- End Notification Area ---
  }

  // --- Control Methods ---

  setCrosshairVisible(visible) {
    if (this.elements.crosshair) {
      this.elements.crosshair.style.display = visible ? "block" : "none";
    }
  }

  setVaultPromptVisible(visible) {
    if (this.elements.vaultPrompt) {
      this.elements.vaultPrompt.style.display = visible ? "block" : "none";
    }
  }

  setInstructionsVisible(visible) {
    if (this.elements.instructions) {
      this.elements.instructions.style.display = visible ? "block" : "none";
    }
  }

  setTestingInstructionsVisible(visible) {
    if (this.elements.testingInstructions) {
      this.elements.testingInstructions.style.display = visible
        ? "block"
        : "none";
    }
  }

  // Shows a temporary hit marker
  showHitMarker(duration = 100) {
    const hitMarker = document.createElement("div");
    hitMarker.style.position = "absolute";
    hitMarker.style.top = "50%";
    hitMarker.style.left = "50%";
    hitMarker.style.transform = "translate(-50%, -50%)";
    hitMarker.style.width = "20px";
    hitMarker.style.height = "20px";
    hitMarker.style.backgroundImage =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M10 0 L10 20 M0 10 L20 10' stroke='white' stroke-width='2'/%3E%3C/svg%3E\")";
    hitMarker.style.backgroundSize = "contain";
    hitMarker.style.pointerEvents = "none";
    hitMarker.style.zIndex = "1001"; // Ensure it's above crosshair
    document.body.appendChild(hitMarker);

    setTimeout(() => {
      if (hitMarker.parentNode) {
        document.body.removeChild(hitMarker);
      }
    }, duration);
  }

  // Shows a temporary screen flash when hit
  showHitOverlay(duration = 200, color = "rgba(255, 0, 0, 0.3)") {
    const hitOverlay = document.createElement("div");
    hitOverlay.style.position = "absolute";
    hitOverlay.style.top = "0";
    hitOverlay.style.left = "0";
    hitOverlay.style.width = "100%";
    hitOverlay.style.height = "100%";
    hitOverlay.style.backgroundColor = color;
    hitOverlay.style.pointerEvents = "none";
    hitOverlay.style.zIndex = "999"; // Below other UI elements
    document.body.appendChild(hitOverlay);

    setTimeout(() => {
      if (hitOverlay.parentNode) {
        document.body.removeChild(hitOverlay);
      }
    }, duration);
  }

  // --- Event Handlers ---

  handlePointerLockChange(isLocked) {
    this.setCrosshairVisible(isLocked);
    this.setInstructionsVisible(!isLocked);
    if (!isLocked) {
      this.setVaultPromptVisible(false); // Hide vault prompt if lock is lost
    }
  }

  // --- Add Notification Method ---
  showNotification(message, duration = 2000) {
    if (this.elements.notificationArea) {
      this.elements.notificationArea.textContent = message;
      this.elements.notificationArea.style.display = "block";

      // Clear previous timeout if any
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      // Set new timeout to hide
      this.notificationTimeout = setTimeout(() => {
        this.elements.notificationArea.style.display = "none";
        this.notificationTimeout = null;
      }, duration);
    }
  }
  // --- End Notification Method ---
}
