import * as THREE from "three";
import { TargetModel } from "../models/TargetModel";
import { MiniTableModel } from "../models/MiniTableModel";
import { TableModel } from "../models/TableModel";
import { HalfWallModel } from "../models/HalfWallModel";

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.objects = []; // Collidable objects
    this.targets = []; // Target instances
    this.vaultables = []; // Vaultable objects

    this.createMap();
  }

  createMap() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x777777,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -0.5;
    this.scene.add(floor);

    // Create main boundary walls
    this.createWall(-40, -10, 2, 60, 0x88ff88, 5); // Left wall
    this.createWall(40, -10, 2, 60, 0xff8888, 5); // Right wall
    this.createWall(0, -40, 80, 2, 0xffff88, 5); // Front wall

    // Clean testing space - remove the old vaultable obstacles

    // Create clearly defined vaultable objects for testing
    this.createVaultTestingArea();

    // Target area with small objects
    this.createTargets();
  }

  createVaultTestingArea() {
    // Create a clear testing area in front of the player
    const startX = -15;
    const centerZ = 0;
    const spacing = 8; // Spacing between obstacle types

    // Create text labels for each section
    this.createTextLabel(
      "MINI TABLES (0.5 height)",
      startX,
      centerZ - spacing,
      0xffffff
    );
    this.createTextLabel("TABLES (0.8 height)", startX, centerZ, 0xffffff);
    this.createTextLabel(
      "HALF WALLS (1.2 height)",
      startX,
      centerZ + spacing,
      0xffffff
    );

    // Create the models using the specific model classes

    // Row 1: Mini Tables - lowest height (0.5)
    const miniTables = MiniTableModel.createRow(
      this.scene,
      new THREE.Vector3(startX, 0, centerZ - spacing),
      5
    );

    // Row 2: Tables - medium height (0.8)
    const tables = TableModel.createRow(
      this.scene,
      new THREE.Vector3(startX, 0, centerZ),
      5
    );

    // Row 3: Half Walls - tallest vaultable (1.2)
    const halfWalls = HalfWallModel.createRow(
      this.scene,
      new THREE.Vector3(startX, 0, centerZ + spacing),
      5
    );

    // Add an example of a non-vaultable obstacle (too tall)
    const tooTallObstacle = this.createBox(
      15,
      centerZ,
      3,
      2.0,
      3,
      0x888888,
      "TooTall (non-vaultable)"
    );

    // Add the meshes to the collidable objects list
    [...miniTables, ...tables, ...halfWalls].forEach((model) => {
      this.objects.push(model.getMesh());
      this.vaultables.push(model.getMesh());
    });

    // Create a clear space for the shooting range
    this.createWall(0, -25, 30, 1, 0xaaaaaa, 0.5); // Divider to shooting range
  }

  createTextLabel(text, x, z, color) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    // Fill background with semi-transparent black
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = "Bold 48px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create label mesh
    const geometry = new THREE.PlaneGeometry(6, 1.5);
    const label = new THREE.Mesh(geometry, material);

    // Position the label
    label.position.set(x, 3.5, z);

    // Add to scene
    this.scene.add(label);
  }

  createTargets() {
    // Create fewer targets in different positions
    const targetPositions = [
      // Different Z depths for more interesting movement
      { x: -20, y: 2.0, z: -20 },
      { x: 0, y: 3.0, z: -25 },
      { x: 20, y: 2.0, z: -30 },
      // Elevated targets on sides
      { x: -15, y: 5, z: -25 },
      { x: 15, y: 5, z: -25 },
    ];

    targetPositions.forEach((pos) => {
      const position = new THREE.Vector3(pos.x, pos.y, pos.z);
      const target = new TargetModel(this.scene, position);

      // Store target instance
      this.targets.push(target);

      // Add mesh to collidable objects
      this.objects.push(target.getMesh());
    });
  }

  createWall(x, z, width, depth, color, height = 5) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wallMaterial = new THREE.MeshBasicMaterial({ color });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, height / 2, z);
    this.scene.add(wall);
    this.objects.push(wall);

    return wall;
  }

  createBox(x, z, width, height, depth, color, name = "") {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, height / 2, z);
    this.scene.add(box);
    this.objects.push(box);

    // If name is provided, add it as userData
    if (name) {
      box.userData.name = name;

      // Add a small text label on the object showing its height
      const heightLabel = document.createElement("canvas");
      const ctx = heightLabel.getContext("2d");
      heightLabel.width = 128;
      heightLabel.height = 64;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, heightLabel.width, heightLabel.height);
      ctx.font = "Bold 24px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `h=${height}`,
        heightLabel.width / 2,
        heightLabel.height / 2
      );

      const labelTexture = new THREE.CanvasTexture(heightLabel);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const labelGeometry = new THREE.PlaneGeometry(1, 0.5);
      const label = new THREE.Mesh(labelGeometry, labelMaterial);

      // Position the label on top of the object
      label.position.y = height / 2 + 0.3;
      label.rotation.x = -Math.PI / 2; // Lay flat on top

      box.add(label);
    }

    return box;
  }

  getCollidableObjects() {
    return this.objects;
  }

  getTargets() {
    return this.targets;
  }

  getVaultableObjects() {
    return this.vaultables;
  }

  // Add method to update targets
  updateTargets(deltaTime) {
    this.targets.forEach((target) => {
      target.update(deltaTime);
    });
  }
}
