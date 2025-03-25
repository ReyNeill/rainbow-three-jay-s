import * as THREE from "three";
import { VaultableObjectModel } from "./VaultableObjectModel.js"; // Import base class

export class MiniTableModel extends VaultableObjectModel {
  constructor(scene, position, options = {}) {
    // Define default properties specific to MiniTableModel
    const miniTableOptions = {
      width: options.width || 3,
      height: 0.6, // Standard height for mini tables
      depth: options.depth || 3,
      color: options.color || 0x8888ff, // Default blue color
      name: "MiniTable",
      ...options, // Allow overriding defaults
    };

    // Call the base class constructor with processed options
    super(scene, position, miniTableOptions);
  }

  // Inherits createModel, addHeightLabel, getMesh, remove from base class

  // Static method specific to MiniTableModel (or could use base class static method)
  static createRow(scene, startPosition, count, spacing = 6) {
    // Use the base class static helper, passing this constructor
    return VaultableObjectModel.createRow(
      scene,
      MiniTableModel, // Pass the MiniTableModel constructor
      startPosition,
      count,
      spacing
    );
  }
}
