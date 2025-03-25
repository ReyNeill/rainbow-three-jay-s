import * as THREE from "three";

export class TableModel {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.position = position.clone();

    // Default properties
    this.width = options.width || 3;
    this.height = 0.8; // Standard height for tables
    this.depth = options.depth || 3;
    this.color = options.color || 0x88ff88; // Default green color

    // Create the model
    this.createModel();
  }

  createModel() {
    // Create main box geometry for the table
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);

    // Set position
    this.mesh.position.copy(this.position);
    // Adjust Y position to account for height
    this.mesh.position.y = this.height / 2;

    // Add user data for identification
    this.mesh.userData.type = "vaultable";
    this.mesh.userData.name = "Table";
    this.mesh.userData.height = this.height;

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
    ctx.fillText(`h=${this.height}`, canvas.width / 2, canvas.height / 2);

    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create label mesh
    const labelGeometry = new THREE.PlaneGeometry(1, 0.5);
    const label = new THREE.Mesh(labelGeometry, material);

    // Position on top of the table
    label.position.y = this.height / 2 + 0.3;
    label.rotation.x = -Math.PI / 2; // Flat on top

    // Add to main mesh
    this.mesh.add(label);
  }

  // Get the mesh for collision detection
  getMesh() {
    return this.mesh;
  }

  // Remove from scene
  remove() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
  }

  // Static method to create standard tables at positions
  static createRow(scene, startPosition, count, spacing = 6) {
    const models = [];
    const basePosition = new THREE.Vector3().copy(startPosition);

    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3(
        basePosition.x + i * spacing,
        basePosition.y,
        basePosition.z
      );
      models.push(new TableModel(scene, position));
    }

    return models;
  }
}
