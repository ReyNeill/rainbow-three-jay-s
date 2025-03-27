import * as THREE from "three";
import { DummyModel } from "../models/DummyModel";

export class DummyPlayer {
  constructor(scene, position = { x: 0, y: 0.8, z: -25 }) {
    this.scene = scene;

    // Create position vector from input position
    const positionVector = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    );

    // Create the dummy player using DummyModel
    this.model = new DummyModel(scene, positionVector);
  }

  // Handle being hit - returns true if player is still alive
  hit(damage) {
    return this.model.hit(damage);
  }

  // Return mesh for hit detection
  getMeshes() {
    return this.model.getMeshes();
  }

  // --- Add method to get the model instance ---
  getModel() {
    return this.model;
  }
  // --- End method ---
}
