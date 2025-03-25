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

    // Create walls
    this.createWall(0, 0, 50, 5, 0x8888ff);
    this.createWall(-20, 0, 5, 40, 0x88ff88);
    this.createWall(20, 0, 5, 40, 0xff8888);
    this.createWall(0, 20, 40, 5, 0xffff88);
    this.createWall(0, -20, 40, 5, 0x88ffff);

    // Create some obstacles
    this.createBox(-10, 0, 3, 3, 3, 0xaa6666);
    this.createBox(10, 0, 3, 3, 3, 0x66aa66);
    this.createBox(0, -10, 3, 3, 3, 0x6666aa);
    this.createBox(0, 10, 3, 3, 3, 0xaaaa66);
  }

  createWall(x, z, width, depth, color) {
    const wallGeometry = new THREE.BoxGeometry(width, 5, depth);
    const wallMaterial = new THREE.MeshBasicMaterial({ color });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, 2, z);
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
