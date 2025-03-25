import * as THREE from "three";
import { TargetModel } from "../models/TargetModel";

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.objects = []; // Collidable objects
    this.targets = []; // Target instances

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

    // Create interior structure - shooting range with lanes

    // Center dividing wall with gaps for passing through
    this.createWall(-15, -20, 10, 2, 0xaa6666, 3);
    this.createWall(15, -20, 10, 2, 0xaa6666, 3);

    // Shooting range barriers - cover objects
    this.createWall(-10, -30, 2, 6, 0x444444, 1.5);
    this.createWall(0, -30, 2, 6, 0x444444, 1.5);
    this.createWall(10, -30, 2, 6, 0x444444, 1.5);

    // Low walls for crouching behind
    this.createWall(-20, -15, 8, 2, 0x888888, 1);
    this.createWall(20, -15, 8, 2, 0x888888, 1);

    // Boxes for elevation and jumping
    this.createBox(-25, -5, 6, 2, 6, 0x6666aa);
    this.createBox(25, -5, 6, 2, 6, 0x6666aa);
    this.createBox(-25, -25, 6, 1, 6, 0x6666aa);
    this.createBox(25, -25, 6, 1, 6, 0x6666aa);

    // Target area with small objects
    this.createTargets();
  }

  createTargets() {
    // Create targets in different positions
    const targetPositions = [
      { x: -30, y: 2.0, z: -25 },
      { x: -20, y: 2.0, z: -25 },
      { x: -10, y: 2.0, z: -25 },
      { x: 0, y: 2.0, z: -25 },
      { x: 10, y: 2.0, z: -25 },
      { x: 20, y: 2.0, z: -25 },
      { x: 30, y: 2.0, z: -25 },
      // Elevated targets
      { x: -25, y: 3, z: -25 },
      { x: -15, y: 4, z: -25 },
      { x: 5, y: 3.5, z: -25 },
      { x: 15, y: 4, z: -25 },
      { x: 25, y: 3, z: -25 },
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

  createBox(x, z, width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, height / 2, z);
    this.scene.add(box);
    this.objects.push(box);

    return box;
  }

  getCollidableObjects() {
    return this.objects;
  }

  getTargets() {
    return this.targets;
  }
}
