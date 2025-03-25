import * as THREE from "three";

export class TargetModel {
  constructor(scene, position, size = 0.7) {
    this.scene = scene;
    this.position = position;
    this.size = size;

    this.createTarget();
  }

  createTarget() {
    // Create a sphere for the target
    const geometry = new THREE.SphereGeometry(this.size, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    this.targetMesh = new THREE.Mesh(geometry, material);
    this.targetMesh.position.copy(this.position);

    // Add metadata for hit detection
    this.targetMesh.userData.isTarget = true;

    // Add to scene
    this.scene.add(this.targetMesh);
  }

  // Get the mesh for hit detection
  getMesh() {
    return this.targetMesh;
  }

  // Remove the target from the scene
  remove() {
    if (this.targetMesh) {
      this.scene.remove(this.targetMesh);
    }
  }

  // Show hit effect and remove target
  hit(onComplete) {
    // Create an explosion effect for the hit
    this.createHitEffect();

    // Remove the target
    this.remove();

    // Call the completion callback if provided
    if (typeof onComplete === "function") {
      onComplete();
    }
  }

  createHitEffect() {
    // Create a particle explosion effect for target hit
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true }), // Red
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true }), // Orange
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true }), // Yellow
    ];

    // Create multiple particles
    for (let i = 0; i < 15; i++) {
      // Randomly select a material
      const material =
        materials[Math.floor(Math.random() * materials.length)].clone();
      const particle = new THREE.Mesh(geometry, material);

      // Set initial position at the target center
      particle.position.copy(this.position);

      // Random velocity direction
      const velocity = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      )
        .normalize()
        .multiplyScalar(0.1 + Math.random() * 0.2);

      this.scene.add(particle);

      // Animate the particle
      const startTime = Date.now();
      const duration = 300 + Math.random() * 200; // 300-500ms duration

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          // Remove particle when animation is complete
          this.scene.remove(particle);
          return;
        }

        // Move outward
        particle.position.add(velocity);

        // Fade out
        particle.material.opacity = 1 - progress;

        // Continue animation
        requestAnimationFrame(animate);
      };

      // Start animation
      animate();
    }

    // Add a flash at the hit point
    const flashGeometry = new THREE.SphereGeometry(this.size, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(this.position);
    this.scene.add(flash);

    // Animate the flash
    const flashStartTime = Date.now();
    const flashDuration = 200;

    const animateFlash = () => {
      const elapsed = Date.now() - flashStartTime;
      const progress = elapsed / flashDuration;

      if (progress >= 1) {
        // Remove flash when animation is complete
        this.scene.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
        return;
      }

      // Expand and fade out
      const scale = 1 + progress;
      flash.scale.set(scale, scale, scale);
      flash.material.opacity = 0.8 * (1 - progress);

      // Continue animation
      requestAnimationFrame(animateFlash);
    };

    // Start flash animation
    animateFlash();
  }

  // Create a new target at this position with a respawn effect
  static createWithRespawnEffect(scene, position, size = 0.7) {
    // Create respawn effect
    TargetModel.createRespawnEffect(scene, position);

    // Create and return new target
    return new TargetModel(scene, position, size);
  }

  static createRespawnEffect(scene, position) {
    // Create a particle effect for target respawn
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    });

    // Create multiple particles
    for (let i = 0; i < 10; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());

      // Random position around the target
      const offset = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );

      particle.position.copy(position).add(offset.multiplyScalar(0.5));
      scene.add(particle);

      // Animate the particle
      const startTime = Date.now();
      const duration = 500 + Math.random() * 500; // 500-1000ms duration

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          // Remove particle when animation is complete
          scene.remove(particle);
          return;
        }

        // Scale up and fade out
        const scale = 1 + progress * 3;
        particle.scale.set(scale, scale, scale);
        particle.material.opacity = 0.8 * (1 - progress);

        // Continue animation
        requestAnimationFrame(animate);
      };

      // Start animation
      animate();
    }
  }
}
