import * as THREE from "three";

/**
 * Base class for simple box-shaped vaultable objects.
 */
export class VaultableObjectModel {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.position = position.clone();

    // Default properties overridden by options
    this.width = options.width || 1;
    this.height = options.height || 1;
    this.depth = options.depth || 1;
    this.color = options.color || 0xaaaaaa;
    this.name = options.name || "VaultableObject";

    // Create the model
    this.createModel();
  }

  createModel() {
    // Create main box geometry
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);

    // Set position (center the mesh vertically at the given base position)
    this.mesh.position.copy(this.position);
    this.mesh.position.y = this.height / 2; // Center Y

    // Add user data for identification
    this.mesh.userData.type = "vaultable";
    this.mesh.userData.name = this.name;
    this.mesh.userData.height = this.height;
    this.mesh.userData.isFullyCollidable = true; // Mark as collidable

    // Add height label on top
    this.addHeightLabel();

    // Add to scene
    this.scene.add(this.mesh);
  }

  addHeightLabel() {
    // Create canvas for the height label
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 128;
    canvas.height = 64;

    // Draw label background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.font = "Bold 24px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `h=${this.height.toFixed(1)}`,
      canvas.width / 2,
      canvas.height / 2
    );

    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create label mesh
    const labelGeometry = new THREE.PlaneGeometry(1, 0.5);
    this.labelMesh = new THREE.Mesh(labelGeometry, material); // Store reference

    // Position on top of the table (relative to the mesh's center)
    this.labelMesh.position.y = this.height / 2 + 0.01; // Place slightly above the top surface
    this.labelMesh.rotation.x = -Math.PI / 2; // Flat on top

    // Add to main mesh
    this.mesh.add(this.labelMesh);
  }

  // Get the mesh for collision detection
  getMesh() {
    return this.mesh;
  }

  // Remove from scene and dispose resources
  remove() {
    if (this.mesh) {
      // Dispose label resources
      if (this.labelMesh) {
        this.labelMesh.geometry.dispose();
        if (this.labelMesh.material.map) this.labelMesh.material.map.dispose();
        this.labelMesh.material.dispose();
      }
      // Dispose main mesh resources
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      // Remove from scene
      this.scene.remove(this.mesh);
      this.mesh = null; // Clear reference
    }
  }

  // Static method helper (can be overridden or used by subclasses)
  static createRow(scene, constructor, startPosition, count, spacing = 6) {
    const models = [];
    const basePosition = new THREE.Vector3().copy(startPosition);

    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3(
        basePosition.x + i * spacing,
        basePosition.y,
        basePosition.z
      );
      // Use the provided constructor (e.g., TableModel, MiniTableModel)
      models.push(new constructor(scene, position));
    }
    return models;
  }
}
