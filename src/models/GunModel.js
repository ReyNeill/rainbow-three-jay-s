import * as THREE from "three";

export class GunModel {
  constructor(options = {}) {
    this.options = {
      color: 0x222222, // Darker color for rifle
      sightColor: 0x111111,
      lensColor: 0x55aaff, // Blueish tint for lens
      ...options,
    };

    this.createModel();
  }

  createModel() {
    this.gunGroup = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.6,
      metalness: 0.3,
    });
    const sightMaterial = new THREE.MeshStandardMaterial({
      color: this.options.sightColor,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: this.options.lensColor,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    // --- Rifle Components ---

    // 1. Receiver/Body (Main central part)
    const receiverGeo = new THREE.BoxGeometry(0.08, 0.1, 0.3);
    const receiver = new THREE.Mesh(receiverGeo, bodyMaterial);
    receiver.position.set(0, 0, 0); // Center the receiver
    this.gunGroup.add(receiver);

    // 2. Barrel (Longer than pistol)
    const barrelLength = 0.5;
    const barrelRadius = 0.025;
    const barrelGeo = new THREE.CylinderGeometry(
      barrelRadius,
      barrelRadius,
      barrelLength,
      16
    );
    const barrel = new THREE.Mesh(barrelGeo, bodyMaterial);
    barrel.rotation.x = Math.PI / 2; // Point forward along Z
    // Position barrel in front of receiver
    barrel.position.z = -(0.3 / 2 + barrelLength / 2);
    this.gunGroup.add(barrel);

    // 3. Handguard (Around the barrel)
    const handguardGeo = new THREE.BoxGeometry(0.07, 0.08, barrelLength * 0.8);
    const handguard = new THREE.Mesh(handguardGeo, bodyMaterial);
    // Position handguard around the barrel, slightly lower
    handguard.position.set(0, -0.01, barrel.position.z);
    this.gunGroup.add(handguard);

    // 4. Stock (Extends backwards)
    const stockHeight = 0.08;
    const stockGeo = new THREE.BoxGeometry(0.06, stockHeight, 0.35);
    const stock = new THREE.Mesh(stockGeo, bodyMaterial);
    // Position stock behind receiver, slightly lower
    stock.position.set(0, -0.03, 0.3 / 2 + 0.35 / 2);
    this.gunGroup.add(stock);
    // Butt plate for stock
    const buttPlateGeo = new THREE.BoxGeometry(0.07, stockHeight + 0.02, 0.02);
    const buttPlate = new THREE.Mesh(buttPlateGeo, bodyMaterial);
    buttPlate.position.set(
      0,
      stock.position.y,
      stock.position.z + 0.35 / 2 + 0.01
    );
    this.gunGroup.add(buttPlate);

    // 5. Pistol Grip (Below receiver)
    const gripGeo = new THREE.BoxGeometry(0.05, 0.2, 0.06);
    const grip = new THREE.Mesh(gripGeo, bodyMaterial);
    grip.position.set(0, -0.12, 0.05); // Below receiver, slightly back
    grip.rotation.x = -Math.PI / 15; // Slight angle
    this.gunGroup.add(grip);

    // 6. Magazine (Below receiver, in front of grip)
    const magGeo = new THREE.BoxGeometry(0.04, 0.18, 0.1);
    const magazine = new THREE.Mesh(magGeo, bodyMaterial);
    magazine.position.set(0, -0.11, -0.08); // Below receiver, forward
    magazine.rotation.x = Math.PI / 25; // Slight angle forward
    this.gunGroup.add(magazine);

    // --- ACOG Sight Components ---
    const sightGroup = new THREE.Group();

    // Scope Body (Main tube)
    const scopeBodyLength = 0.15;
    const scopeBodyRadius = 0.03;
    const scopeBodyGeo = new THREE.CylinderGeometry(
      scopeBodyRadius,
      scopeBodyRadius,
      scopeBodyLength,
      16,
      1,
      true
    );
    const scopeBody = new THREE.Mesh(scopeBodyGeo, sightMaterial);
    scopeBody.rotation.x = Math.PI / 2; // Align with Z axis
    sightGroup.add(scopeBody);

    // Scope Mount (Connects scope to receiver)
    const mountGeo = new THREE.BoxGeometry(0.03, 0.03, 0.1);
    const mount = new THREE.Mesh(mountGeo, sightMaterial);
    mount.position.y = -scopeBodyRadius - 0.015; // Position below scope body
    sightGroup.add(mount);

    // Front Lens Placeholder
    const lensGeo = new THREE.CircleGeometry(scopeBodyRadius * 0.9, 16);
    const frontLens = new THREE.Mesh(lensGeo, lensMaterial);
    frontLens.position.z = -scopeBodyLength / 2 - 0.001; // Position relative to sightGroup origin
    frontLens.castShadow = false;
    frontLens.receiveShadow = false;
    sightGroup.add(frontLens);

    // Rear Lens Placeholder
    const rearLens = new THREE.Mesh(lensGeo, lensMaterial);
    rearLens.position.z = scopeBodyLength / 2 + 0.001; // Position relative to sightGroup origin
    rearLens.castShadow = false;
    rearLens.receiveShadow = false;
    sightGroup.add(rearLens);

    // Position the sight group on top of the receiver
    sightGroup.position.set(0, 0.1 / 2 + scopeBodyRadius + 0.015, -0.05); // Y: receiver_half_height + mount_half_height + scope_radius
    this.gunGroup.add(sightGroup);

    // --- Barrel Tip ---
    // Update barrel tip position for the longer barrel
    this.barrelTip = new THREE.Object3D();
    this.barrelTip.position.z = barrel.position.z - barrelLength / 2; // Position at the very end of the barrel mesh
    this.gunGroup.add(this.barrelTip);

    // --- Final Adjustments ---
    // Rotate the entire gun model slightly downwards for a natural holding pose
    this.gunGroup.rotation.x = Math.PI / 100;
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
        // Dispose materials carefully, especially if shared or cloned
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    // Also dispose materials created directly
    this.options.bodyMaterial?.dispose();
    this.options.sightMaterial?.dispose();
    this.options.lensMaterial?.dispose();
  }
}
