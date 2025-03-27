import * as THREE from "three";

export class Crosshair {
  constructor(camera) {
    this.camera = camera;
    this.canvas = document.createElement("canvas");
    this.size = 128; // Texture size (power of 2)
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext("2d");

    // --- Modified Crosshair properties ---
    this.lineLength = 8; // Can be separated later if needed (lineLengthX/Y)
    this.lineWidth = 2.5; // Can be separated later if needed (lineWidthX/Y)
    this.color = "white";

    // Resting gaps
    this.gapX = 35; // Horizontal gap when stationary
    this.gapY = 25; // Vertical gap when stationary

    // Spread gaps (when moving) - Ensure these are >= respective resting gaps
    this.maxSpreadX = 85; // Max horizontal gap when moving
    this.maxSpreadY = 75; // Max vertical gap when moving (Example: slightly more vertical spread)

    this.spreadSpeed = 5; // How fast it spreads/contracts

    // Internal state for current interpolated gaps
    this.currentGapX = this.gapX;
    this.currentGapY = this.gapY;
    // --- End Modified Properties ---

    this.texture = new THREE.CanvasTexture(this.canvas);
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      renderOrder: 999,
    });

    this.sprite = new THREE.Sprite(material);
    const aspect = window.innerWidth / window.innerHeight;
    this.sprite.scale.set(0.1, 0.1 * aspect, 0.1);
    this.sprite.position.set(0, 0, -1);

    this.isVisible = false;
    this.sprite.visible = this.isVisible;

    // Initial draw using separate gaps
    this.drawCrosshair(this.currentGapX, this.currentGapY);

    this.camera.add(this.sprite);
  }

  // --- Modified drawCrosshair ---
  drawCrosshair(currentGapX, currentGapY) {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.lineWidth;

    const center = this.size / 2;

    // Vertical Lines (use gapY)
    const halfGapY = currentGapY / 2;
    const lineEndY = halfGapY + this.lineLength;
    // Top line
    this.ctx.beginPath();
    this.ctx.moveTo(center, center - halfGapY);
    this.ctx.lineTo(center, center - lineEndY);
    this.ctx.stroke();
    // Bottom line
    this.ctx.beginPath();
    this.ctx.moveTo(center, center + halfGapY);
    this.ctx.lineTo(center, center + lineEndY);
    this.ctx.stroke();

    // Horizontal Lines (use gapX)
    const halfGapX = currentGapX / 2;
    const lineEndX = halfGapX + this.lineLength;
    // Left line
    this.ctx.beginPath();
    this.ctx.moveTo(center - halfGapX, center);
    this.ctx.lineTo(center - lineEndX, center);
    this.ctx.stroke();
    // Right line
    this.ctx.beginPath();
    this.ctx.moveTo(center + halfGapX, center);
    this.ctx.lineTo(center + lineEndX, center);
    this.ctx.stroke();

    this.texture.needsUpdate = true;
  }
  // --- End Modified drawCrosshair ---

  // --- Modified update ---
  update(deltaTime, isMoving) {
    if (!this.isVisible) return;

    // Determine target gaps based on movement
    const targetGapX = isMoving ? this.maxSpreadX : this.gapX;
    const targetGapY = isMoving ? this.maxSpreadY : this.gapY;

    // Lerp horizontal gap
    this.currentGapX = THREE.MathUtils.lerp(
      this.currentGapX,
      targetGapX,
      deltaTime * this.spreadSpeed
    );

    // Lerp vertical gap
    this.currentGapY = THREE.MathUtils.lerp(
      this.currentGapY,
      targetGapY,
      deltaTime * this.spreadSpeed
    );

    // Avoid unnecessary redraws if gaps haven't changed significantly
    // Check both gaps now
    const changedX = Math.abs(this.currentGapX - targetGapX) > 0.1;
    const changedY = Math.abs(this.currentGapY - targetGapY) > 0.1;

    if (changedX || changedY || isMoving) {
      this.drawCrosshair(this.currentGapX, this.currentGapY);
    }
  }
  // --- End Modified update ---

  // --- Modified setVisible ---
  setVisible(visible) {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.sprite.visible = visible;
      if (visible) {
        // Reset gaps when becoming visible
        this.currentGapX = this.gapX;
        this.currentGapY = this.gapY;
        this.drawCrosshair(this.currentGapX, this.currentGapY);
      }
    }
  }
  // --- End Modified setVisible ---

  // Call this if the window is resized
  onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.sprite.scale.set(0.1, 0.1 * aspect, 0.1); // Re-apply aspect ratio
  }

  // Cleanup method
  dispose() {
    if (this.sprite.parent) {
      this.sprite.parent.remove(this.sprite);
    }
    this.sprite.material.map.dispose();
    this.sprite.material.dispose();
  }
}
