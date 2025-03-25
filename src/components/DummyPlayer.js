import * as THREE from "three";

export class DummyPlayer {
  constructor(scene, position = { x: 0, y: 2, z: -25 }, team = "red") {
    this.scene = scene;
    this.position = position;

    // Create the dummy player mesh
    this.createDummyPlayer(team);

    // Store player health
    this.health = 100;

    // Update health bar
    this.updateHealth(this.health);
  }

  createDummyPlayer(team) {
    // Create player mesh - make it larger
    const geometry = new THREE.BoxGeometry(2, 4, 2);
    const material = new THREE.MeshBasicMaterial({
      color: team === "red" ? 0xff0000 : 0x0000ff,
      emissive: team === "red" ? 0xff0000 : 0x0000ff,
      emissiveIntensity: 0.5,
    });
    this.playerMesh = new THREE.Mesh(geometry, material);

    // Add player ID to userData for hit detection
    this.playerMesh.userData.playerId = "dummy";
    this.playerMesh.userData.isPlayer = true;

    // Create a head for the player - make it larger
    const headGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const headMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.set(0, 2.6, 0.6); // Higher up for larger body
    this.headMesh.userData.playerId = "dummy";
    this.headMesh.userData.isPlayer = true;
    this.playerMesh.add(this.headMesh);

    // Add a much larger floating indicator arrow above the player
    const arrowGeometry = new THREE.ConeGeometry(1, 2, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.arrowMesh.position.set(0, 6, 0); // Much higher
    this.arrowMesh.rotation.x = Math.PI; // Point downward
    this.playerMesh.add(this.arrowMesh);

    // Add a large glowing ring around the player
    const ringGeometry = new THREE.TorusGeometry(2, 0.3, 16, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: team === "red" ? 0xff8888 : 0x8888ff,
      transparent: true,
      opacity: 0.9,
    });
    this.ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ringMesh.rotation.x = Math.PI / 2; // Lay flat
    this.ringMesh.position.set(0, -0.8, 0); // Position below the player
    this.playerMesh.add(this.ringMesh);

    // Add a text label with "DUMMY" above the player
    const textGeometry = new THREE.PlaneGeometry(4, 1);
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = team === "red" ? "red" : "blue";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DUMMY", 100, 25);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.position.set(0, 4.5, 0);
    this.playerMesh.add(this.textMesh);

    // Create a group to hold the player
    this.playerGroup = new THREE.Group();
    this.playerGroup.add(this.playerMesh);
    this.playerGroup.userData.playerId = "dummy";
    this.playerGroup.userData.isPlayer = true;

    // Add larger health bar
    this.healthBarGroup = this.createHealthBar();
    this.playerGroup.add(this.healthBarGroup);
    this.healthBarGroup.position.y = 5.5; // Higher up for taller dummy

    // Position the player
    this.playerGroup.position.set(
      this.position.x,
      this.position.y,
      this.position.z
    );

    // Add to scene
    this.scene.add(this.playerGroup);
  }

  createHealthBar() {
    const group = new THREE.Group();

    // Create health bar background - larger
    const bgGeometry = new THREE.PlaneGeometry(3, 0.5);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(background);

    // Create health bar foreground (green part) - larger
    const fgGeometry = new THREE.PlaneGeometry(2.8, 0.3);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    this.healthBar = new THREE.Mesh(fgGeometry, fgMaterial);
    this.healthBar.position.z = 0.01; // Slightly in front of background

    // Set origin to left side for easy scaling
    fgGeometry.translate(1.4, 0, 0);
    this.healthBar.position.x = -1.4; // Position at left of background

    group.add(this.healthBar);

    // Make health bar always face the camera
    group.rotation.x = Math.PI / 2;

    return group;
  }

  // Handle being hit - returns true if player is still alive
  hit(damage) {
    this.health = Math.max(0, this.health - damage);
    this.updateHealth(this.health);

    // Show hit effect
    this.showHitEffect();

    // Reset health after 2 seconds
    if (this.health <= 0) {
      setTimeout(() => {
        this.health = 100;
        this.updateHealth(this.health);
      }, 2000);
    }

    return this.health > 0;
  }

  updateHealth(health) {
    // Update health bar scale based on health percentage
    const healthPercent = Math.max(0, Math.min(100, health)) / 100;
    this.healthBar.scale.x = healthPercent;

    // Change color based on health
    if (healthPercent > 0.6) {
      this.healthBar.material.color.setHex(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      this.healthBar.material.color.setHex(0xffff00); // Yellow
    } else {
      this.healthBar.material.color.setHex(0xff0000); // Red
    }
  }

  showHitEffect() {
    // Store original material
    const originalMaterial = this.playerMesh.material;

    // Set to hit material (white flash)
    this.playerMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Reset after short delay
    setTimeout(() => {
      if (this.playerMesh) {
        this.playerMesh.material = originalMaterial;
      }
    }, 100);
  }

  // Return mesh for hit detection
  getMeshes() {
    return [
      this.playerMesh,
      this.headMesh,
      this.arrowMesh,
      this.ringMesh,
      this.textMesh,
    ];
  }
}
