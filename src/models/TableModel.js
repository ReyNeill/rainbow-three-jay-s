import * as THREE from "three";
import { VaultableObjectModel } from "./VaultableObjectModel.js"; // Import base class

export class TableModel extends VaultableObjectModel {
  constructor(scene, position, options = {}) {
    // Define default properties specific to TableModel
    const tableOptions = {
      width: options.width || 3,
      height: 0.8, // Standard height for tables
      depth: options.depth || 3,
      color: options.color || 0x88ff88, // Default green color
      name: "Table",
      ...options, // Allow overriding defaults
    };

    // Call the base class constructor with processed options
    super(scene, position, tableOptions);
  }

  // Inherits createModel, addHeightLabel, getMesh, remove from base class

  // Static method specific to TableModel (or could use base class static method)
  static createRow(scene, startPosition, count, spacing = 6) {
    // Use the base class static helper, passing this constructor
    return VaultableObjectModel.createRow(
      scene,
      TableModel, // Pass the TableModel constructor
      startPosition,
      count,
      spacing
    );
  }
}
