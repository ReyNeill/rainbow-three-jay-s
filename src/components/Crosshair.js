import * as THREE from "three";

export class Crosshair {
  constructor(camera) {
    this.camera = camera;
    this.canvas = document.createElement("canvas");
    this.size = 128; // Texture size (power of 2)
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext("2d");

    // Crosshair properties
    this.lineLength = 15;
    this.lineWidth = 2;
    this.gap = 8; // Initial gap
    this.color = "white";
    this.maxSpread = 20; // Max gap when moving
    this.spreadSpeed = 5; // How fast it spreads/contracts

    this.texture = new THREE.CanvasTexture(this.canvas);
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false, // Render on top
      depthWrite: false,
      renderOrder: 999, // Ensure it renders above everything else
    });

    this.sprite = new THREE.Sprite(material);
    // Scale the sprite. Adjust as needed for desired on-screen size.
    const aspect = window.innerWidth / window.innerHeight;
    this.sprite.scale.set(0.1, 0.1 * aspect, 0.1); // Adjust scale as needed

    // Position relative to camera (will be added as child)
    this.sprite.position.set(0, 0, -1); // Position in front of camera

    this.isVisible = false; // Initially hidden
    this.sprite.visible = this.isVisible;

    this.drawCrosshair(this.gap); // Initial draw

    // Add the sprite to the camera
    this.camera.add(this.sprite);
  }

  drawCrosshair(currentGap) {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.lineWidth;

    const center = this.size / 2;
    const halfGap = currentGap / 2;
    const lineEnd = halfGap + this.lineLength;

    // Top line
    this.ctx.beginPath();
    this.ctx.moveTo(center, center - halfGap);
    this.ctx.lineTo(center, center - lineEnd);
    this.ctx.stroke();

    // Bottom line
    this.ctx.beginPath();
    this.ctx.moveTo(center, center + halfGap);
    this.ctx.lineTo(center, center + lineEnd);
    this.ctx.stroke();

    // Left line
    this.ctx.beginPath();
    this.ctx.moveTo(center - halfGap, center);
    this.ctx.lineTo(center - lineEnd, center);
    this.ctx.stroke();

    // Right line
    this.ctx.beginPath();
    this.ctx.moveTo(center + halfGap, center);
    this.ctx.lineTo(center + lineEnd, center);
    this.ctx.stroke();

    this.texture.needsUpdate = true; // IMPORTANT: Update the texture
  }

  update(deltaTime, isMoving) {
    if (!this.isVisible) return;

    const targetGap = isMoving ? this.maxSpread : this.gap;
    const currentGap = parseFloat(this.ctx.lineDashOffset); // Using dash offset to store current gap state hackily, let's refine this.
    // A better way: store currentGap as a class property
    // Let's assume we have this.currentGap property initialized to this.gap

    // Let's properly store and lerp the gap
    if (!this.hasOwnProperty("currentGap")) {
      this.currentGap = this.gap; // Initialize if not present
    }

    this.currentGap = THREE.MathUtils.lerp(
      this.currentGap,
      targetGap,
      deltaTime * this.spreadSpeed
    );

    // Avoid unnecessary redraws if the gap hasn't changed significantly
    if (Math.abs(this.currentGap - targetGap) > 0.1 || isMoving) {
      this.drawCrosshair(this.currentGap);
    }
  }

  setVisible(visible) {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.sprite.visible = visible;
      if (visible) {
        // Reset gap when becoming visible if needed
        this.currentGap = this.gap;
        this.drawCrosshair(this.currentGap);
      }
    }
  }

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
    // No geometry to dispose for Sprite
  }
}
