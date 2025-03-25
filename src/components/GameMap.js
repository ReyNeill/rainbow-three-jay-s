import * as THREE from "three";

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.objects = []; // Collidable objects

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
    // Create some small objects that can be shot at
    const targetGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Create a ring geometry for target outline
    const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    });

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
      const target = new THREE.Mesh(targetGeometry, targetMaterial.clone());
      target.position.set(pos.x, pos.y, pos.z);
      this.scene.add(target);
      this.objects.push(target);

      // Add a ring around the target for better visibility
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
      ring.rotation.x = Math.PI / 2; // Make it face the player
      ring.position.copy(target.position);
      this.scene.add(ring);

      // Add userData for hit detection
      target.userData.isTarget = true;
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
}
