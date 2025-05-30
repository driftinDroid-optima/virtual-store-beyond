export class CameraControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.minFov = 20;
    this.maxFov = 75;
    this.zoomSpeed = 1.1;

    this._addEventListeners();
  }

  _addEventListeners() {
    this.domElement.addEventListener("wheel", this._onMouseWheel, {
      passive: false,
    });
  }

  _onMouseWheel = (event) => {
    event.preventDefault();
    if (event.deltaY < 0) {
      // Zoom in
      this.camera.fov = Math.max(this.minFov, this.camera.fov / this.zoomSpeed);
    } else {
      // Zoom out
      this.camera.fov = Math.min(this.maxFov, this.camera.fov * this.zoomSpeed);
    }
    this.camera.updateProjectionMatrix();
  };
}
