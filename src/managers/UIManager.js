export class UIManager {
  constructor() {
    this.elements = {};
    this.createElements();
    this.notificationTimeout = null; // For hiding notifications

    // Existing elements
    this.crosshair = document.getElementById("crosshair");
    this.vaultPrompt = document.getElementById("vault-prompt");
    this.hitMarker = document.getElementById("hit-marker");
    this.notification = document.getElementById("notification");
    this.leanModeDisplay = document.getElementById("lean-mode-display");
    this.hitOverlay = document.getElementById("hit-overlay");

    // --- Pause Menu Elements ---
    this.pauseMenuElement = null;
    this.connectButtonElement = null;
    this.connectCallback = null; // Function to call when connect is clicked
    this.createPauseMenu(); // Create the menu elements

    // Initial state setup (ensure pause menu is hidden initially)
    this.handlePointerLockChange(false);
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
    // Hide/show crosshair based on lock state
    // NOTE: PlayerController also updates crosshair based on aiming state
    if (this.elements.crosshair) {
      this.elements.crosshair.style.display = isLocked ? "block" : "none"; // Simplified logic here
    }

    // Vault prompt visibility is managed by VaultingSystem and PlayerController now
    // We don't need to manage it directly on lock change here.

    // --- Show/Hide Pause Menu ---
    if (this.pauseMenuElement) {
      this.pauseMenuElement.style.display = isLocked ? "none" : "block";
    }

    if (!isLocked) {
      this.setVaultPromptVisible(false); // Hide vault prompt if lock is lost
      this.setCrosshairVisible(false); // Explicitly hide crosshair when lock lost
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

  // --- Create Pause Menu Method ---
  createPauseMenu() {
    // Create the main div
    this.pauseMenuElement = document.createElement("div");
    this.pauseMenuElement.id = "pause-menu";
    this.pauseMenuElement.style.position = "absolute";
    this.pauseMenuElement.style.top = "50%";
    this.pauseMenuElement.style.left = "50%";
    this.pauseMenuElement.style.transform = "translate(-50%, -50%)";
    this.pauseMenuElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.pauseMenuElement.style.color = "white";
    this.pauseMenuElement.style.padding = "20px";
    this.pauseMenuElement.style.border = "1px solid white";
    this.pauseMenuElement.style.borderRadius = "5px";
    this.pauseMenuElement.style.textAlign = "center";
    this.pauseMenuElement.style.display = "none"; // Initially hidden
    this.pauseMenuElement.style.zIndex = "100"; // Ensure it's on top

    // Create title
    const title = document.createElement("h2");
    title.textContent = "Paused";
    this.pauseMenuElement.appendChild(title);

    // Create Connect Button
    this.connectButtonElement = document.createElement("button");
    this.connectButtonElement.id = "connect-button";
    this.connectButtonElement.textContent = "Connect";
    this.connectButtonElement.style.padding = "10px 15px";
    this.connectButtonElement.style.marginTop = "15px";
    this.connectButtonElement.style.cursor = "pointer";
    this.pauseMenuElement.appendChild(this.connectButtonElement);

    // Add button click listener
    this.connectButtonElement.addEventListener("click", () => {
      if (this.connectCallback) {
        this.connectCallback(); // Call the function provided by main.js
        // Update button state visually
        this.connectButtonElement.disabled = true;
        this.connectButtonElement.textContent = "Connecting...";
      }
    });

    // Append the menu to the body
    document.body.appendChild(this.pauseMenuElement);
  }
  // --- End Create Pause Menu Method ---

  // --- Method to set the connect callback ---
  setConnectCallback(callback) {
    this.connectCallback = callback;
  }
  // --- End Method ---

  // --- Method to update connect button state based on network status ---
  updateConnectButtonState(isConnected) {
    if (!this.connectButtonElement) return;

    if (isConnected) {
      this.connectButtonElement.textContent = "Connected";
      this.connectButtonElement.disabled = true;
    } else {
      // Reset if disconnected
      this.connectButtonElement.textContent = "Connect";
      this.connectButtonElement.disabled = false;
    }
  }
  // --- End Method ---
}
