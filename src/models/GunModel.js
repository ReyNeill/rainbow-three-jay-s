import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class GunModel {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      color: 0x222222, // Darker color for rifle
      sightColor: 0x111111,
      lensColor: 0x55aaff, // Blueish tint for lens
      ...options,
    };

    this.sightModelMesh = null;
    this.isSightLoaded = false;
    this.reticleMesh = null; // Add property for reticle

    this.createModel();
  }

  createModel() {
    this.gunGroup = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.6,
      metalness: 0.3,
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

    // --- Load ACOG Sight Model ---
    this.loadSightModel();

    // --- Barrel Tip ---
    // Update barrel tip position for the longer barrel
    this.barrelTip = new THREE.Object3D();
    this.barrelTip.position.z = barrel.position.z - barrelLength / 2; // Position at the very end of the barrel mesh
    this.gunGroup.add(this.barrelTip);

    // --- Final Adjustments ---
    // Rotate the entire gun model slightly downwards for a natural holding pose
    this.gunGroup.rotation.x = Math.PI / 100;
  }

  loadSightModel() {
    const loader = new GLTFLoader();
    const modelPath = "/models/acog.glb";

    loader.load(
      modelPath,
      (gltf) => {
        this.sightModelMesh = gltf.scene;
        console.log("Loaded ACOG GLTF Scene:", this.sightModelMesh);

        const internalACOGObject = this.sightModelMesh.getObjectByName("ACOG");
        if (internalACOGObject) {
          // Keep internal adjustments
          internalACOGObject.position.y = 0;
          internalACOGObject.position.x = 0;

          // --- Create the reticle BUT DON'T ADD IT YET ---
          this.createReticle(); // Don't pass parentObject
          // ---
        } else {
          console.warn(
            "Could not find internal object named 'ACOG'. Reticle will be added to gunGroup."
          );
          // --- Create the reticle if ACOG object not found ---
          this.createReticle(); // Create it anyway
          // ---
        }

        // --- ACOG Scale/Position/Rotation (Keep as is) ---
        const desiredSightScale = 0.021;
        this.sightModelMesh.scale.set(
          desiredSightScale,
          desiredSightScale,
          desiredSightScale
        );
        this.sightModelMesh.position.set(0, 0.04, -0.05);
        this.sightModelMesh.rotation.y = Math.PI;
        // ---

        this.gunGroup.add(this.sightModelMesh); // Add ACOG model

        // --- ADJUST RETICLE POSITION RELATIVE TO gunGroup ---
        if (this.reticleMesh) {
          // Y: Vertically align with ACOG sight center (ACOG Y is 0.04)
          // Z: Place inside the ACOG model (ACOG Z is -0.05)
          this.reticleMesh.position.set(0, 0.1025, -0.05); // Was 0.045, try 0.05
          // ---

          console.log(
            "Adding reticle directly to gunGroup at adjusted position:",
            this.reticleMesh.position.toArray()
          );
          this.gunGroup.add(this.reticleMesh);
        }
        // ---

        this.isSightLoaded = true;
        console.log("ACOG sight model loaded and added to gun.");

        this.setReticleVisibility(false); // Initially hide
      },
      undefined,
      (error) => {
        console.error("Error loading ACOG sight model:", error);
      }
    );
  }

  // --- Modified function to create the reticle ---
  createReticle() {
    const arrowHeight = 0.005; // Keep the adjusted size
    const arrowWidth = arrowHeight * 0.6; // Width relative to height

    // --- Define Chevron Shape ---
    const shape = new THREE.Shape();
    const midPointY = -arrowHeight / 4; // Point where the chevron sides meet (adjust if needed)

    shape.moveTo(0, arrowHeight / 2); // Top point
    shape.lineTo(arrowWidth / 2, midPointY); // Top-right point down to middle-right
    shape.lineTo(arrowWidth / 2, -arrowHeight / 2); // Middle-right down to bottom-right
    shape.lineTo(0, -arrowHeight / 4); // Bottom-right to bottom-center (inner point)
    shape.lineTo(-arrowWidth / 2, -arrowHeight / 2); // Bottom-center to bottom-left
    shape.lineTo(-arrowWidth / 2, midPointY); // Bottom-left up to middle-left
    shape.lineTo(0, arrowHeight / 2); // Middle-left back to top point (close path)
    // --- End Chevron Shape ---

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    this.reticleMesh = new THREE.Mesh(geometry, material);

    console.log("Reticle mesh created (Chevron Shape).");
  }
  // --- End modified function ---

  // --- setReticleVisibility remains the same ---
  setReticleVisibility(visible) {
    if (this.reticleMesh) {
      // console.log(`Setting reticle visibility to: ${visible}`); // Keep commented
      this.reticleMesh.visible = visible;
    } else {
      console.log(
        "Attempted to set reticle visibility, but mesh doesn't exist yet."
      );
    }
  }
  // ---

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
    if (this.reticleMesh) {
      this.reticleMesh.geometry?.dispose();
      this.reticleMesh.material?.dispose();
      // Explicitly remove from gunGroup if it was added there
      this.gunGroup?.remove(this.reticleMesh);
    }
    this.reticleMesh = null;

    if (this.sightModelMesh) {
      this.sightModelMesh.traverse((child) => {
        if (child.isMesh && child !== this.reticleMesh) {
          // Don't re-dispose reticle
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.map?.dispose();
                mat.dispose();
              });
            } else {
              child.material.map?.dispose();
              child.material.dispose();
            }
          }
        }
      });
      this.gunGroup?.remove(this.sightModelMesh);
      this.sightModelMesh = null;
    }

    const bodyMat = this.gunGroup.children.find(
      (c) => c.isMesh && c.material?.isMeshStandardMaterial
    )?.material;
    bodyMat?.dispose();

    console.log("Disposed gun model resources.");
  }
}
