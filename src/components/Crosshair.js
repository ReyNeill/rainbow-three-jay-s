export class Crosshair {
  constructor() {
    this.element = document.createElement("div");
    this.element.id = "crosshair";
    this.element.style.position = "absolute";
    this.element.style.top = "50%";
    this.element.style.left = "50%";
    this.element.style.transform = "translate(-50%, -50%)";
    this.element.style.width = "10px";
    this.element.style.height = "10px";
    this.element.style.borderRadius = "50%";
    this.element.style.border = "1px solid white";
    this.element.style.backgroundColor = "transparent";
    this.element.style.pointerEvents = "none"; // Prevent interference with mouse events

    document.body.appendChild(this.element);
  }

  show() {
    this.element.style.display = "block";
  }

  hide() {
    this.element.style.display = "none";
  }
}
