import * as THREE from "three";

export class MiniTableModel {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.position = position.clone();

    // Default properties
    this.width = options.width || 3;
    this.height = 0.6; // Increased height from 0.5 to 0.6
    this.depth = options.depth || 3;
    this.color = options.color || 0x8888ff; // Default blue color

    // Create the model
    this.createModel();
  }

  createModel() {
    // Create main box geometry for the mini table
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);

    // Set position
    this.mesh.position.copy(this.position);
    // Adjust Y position to account for height (center the mesh vertically)
    this.mesh.position.y = this.height / 2; // Position origin at base Y=0, center at Y=height/2

    // Add user data for identification
    this.mesh.userData.type = "vaultable";
    this.mesh.userData.name = "MiniTable";
    this.mesh.userData.height = this.height; // Store the correct height

    // Add height label on top
    this.addHeightLabel(); // Label will now show h=0.6

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
    // Display the current height
    ctx.fillText(
      `h=${this.height.toFixed(1)}`,
      canvas.width / 2,
      canvas.height / 2
    ); // Use toFixed(1) for clarity

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

    // Position on top of the table (relative to the mesh's center)
    // Mesh center is at height/2, geometry top is at height/2 above that.
    label.position.y = this.height / 2 + 0.01; // Place slightly above the top surface
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

  // Static method to create standard mini tables at positions
  static createRow(scene, startPosition, count, spacing = 6) {
    const models = [];
    const basePosition = new THREE.Vector3().copy(startPosition);

    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3(
        basePosition.x + i * spacing,
        basePosition.y,
        basePosition.z
      );
      models.push(new MiniTableModel(scene, position));
    }

    return models;
  }
}
