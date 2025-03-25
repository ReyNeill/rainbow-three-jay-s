import * as THREE from "three";

export class GunModel {
  constructor(options = {}) {
    this.options = {
      color: 0x333333, // Dark grey default color
      ...options,
    };

    this.createModel();
  }

  createModel() {
    this.gunGroup = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.6,
      metalness: 0.8,
    });

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16);
    const barrel = new THREE.Mesh(barrelGeometry, material);
    barrel.rotation.x = Math.PI / 2; // Point forward along Z
    barrel.position.z = -0.2; // Center the barrel
    this.gunGroup.add(barrel);

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.2);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.z = 0.05; // Position behind the barrel start
    body.position.y = -0.03;
    this.gunGroup.add(body);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    const handle = new THREE.Mesh(handleGeometry, material);
    handle.position.z = 0.1;
    handle.position.y = -0.15;
    handle.rotation.x = -Math.PI / 10; // Slight angle
    this.gunGroup.add(handle);

    // Define barrel tip for muzzle flash positioning
    this.barrelTip = new THREE.Object3D();
    this.barrelTip.position.z = -0.4; // Position at the end of the barrel
    this.gunGroup.add(this.barrelTip);
  }

  // Get the main group containing the gun parts
  getMesh() {
    return this.gunGroup;
  }

  // Get the world position of the barrel tip
  getBarrelTipPosition() {
    const worldPosition = new THREE.Vector3();
    this.barrelTip.getWorldPosition(worldPosition);
    return worldPosition;
  }

  // Clean up resources
  dispose() {
    this.gunGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
