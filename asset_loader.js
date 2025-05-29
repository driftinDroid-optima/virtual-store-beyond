import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function loadAssets() {
  const gltfLoader = new GLTFLoader();

  // Load the GLTF model
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      "./assets/rack.glb",
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(0, -Math.PI / 2, 0);
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
