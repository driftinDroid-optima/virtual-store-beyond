import { Raycaster, Vector2 } from "three";

export default class Raycast {
  constructor(camera, hotspots) {
    this.camera = camera;
    this.hotspots = hotspots;
    this.mouse = new Vector2();
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    document.addEventListener("click", (event) => {
      this.onClick(event);
    });
    document.addEventListener("mousemove", (event) => {
      this.onMouseMove(event);
    });
  }

  onClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hotspotIntersects = this.raycaster.intersectObjects(this.hotspots);

    if (hotspotIntersects.length > 0) {
      this.openModal();
    }
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hotspotIntersects = this.raycaster.intersectObjects(this.hotspots);

    document.body.style.cursor =
      hotspotIntersects.length > 0 ? "pointer" : "auto";
  }

  openModal() {
    const modal = document.querySelector(".ui-modal");
    if (modal) {
      modal.style.display = "flex";
    } else {
      console.error("Modal element not found");
    }
  }
}
