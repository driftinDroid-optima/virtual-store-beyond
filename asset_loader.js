import { Sprite, SpriteMaterial, TextureLoader } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Raycast from "./raycast.js";

// const gui = new GUI();

const params = {
  "pos-x": 1.5,
  "pos-y": -1.5,
  "pos-z": 0,
  "rot-x": 0,
  "rot-y": -Math.PI / 2,
  "rot-z": 0,
  scale: 1,
};

const hotspots = [];

export function addControls(model) {
  const pos = gui.addFolder("Position");
  pos.add(params, "pos-x", -10, 10).onChange((value) => {
    model.position.x = value;
  });
  pos.add(params, "pos-y", -10, 10).onChange((value) => {
    model.position.y = value;
  });
  pos.add(params, "pos-z", -10, 10).onChange((value) => {
    model.position.z = value;
  });

  const rot = gui.addFolder("Rotation");
  rot.add(params, "rot-x", -Math.PI, Math.PI).onChange((value) => {
    model.rotation.x = value;
  });
  rot.add(params, "rot-y", -Math.PI, Math.PI).onChange((value) => {
    model.rotation.y = value;
  });
  rot.add(params, "rot-z", -Math.PI, Math.PI).onChange((value) => {
    model.rotation.z = value;
  });

  const scale = gui.addFolder("Scale");
  scale.add(params, "scale", 0.1, 5).onChange((value) => {
    model.scale.set(value, value, value);
  });
}

function addHotspots(model, camera) {
  const infoLogo = new TextureLoader().load("./assets/info.png");
  const posy = [0.75, 1.2, 1.8];

  posy.forEach((y) => {
    const hotspot = new Sprite(new SpriteMaterial({ map: infoLogo }));
    model.add(hotspot);
    hotspot.position.set(0, y, 0.32);
    hotspots.push(hotspot);
    console.log("Hotspot added at position:", hotspot.position);
  });
  new Raycast(camera, hotspots);
  animateHotspots();
}

export function loadAssets(camera) {
  const gltfLoader = new GLTFLoader();

  // Load the GLTF model
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      "./assets/rack.glb",
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(0, -Math.PI / 2, 0);
        addHotspots(model, camera);
        resolve(model);
      },
      undefined,
      (error) => {
        console.error("An error occurred while loading the model:", error);
        reject(error);
      }
    );
  });
}

function animateHotspots() {
  const scaleFactor = 0.075 + 0.01 * Math.sin(Date.now() * 0.005);
  hotspots.forEach((hotspot) => {
    hotspot.scale.setScalar(scaleFactor);
  });

  requestAnimationFrame(animateHotspots);
}
