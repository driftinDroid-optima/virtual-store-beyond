import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { loadAssets } from "./asset_loader.js";

const ZoomInShader = {
  uniforms: {
    tDiffuse: { value: null },
    zoom: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float zoom;
    varying vec2 vUv;

    #include <common>

    vec3 LinearTosRGB(vec3 linearRGB) {
        bvec3 cutoff = lessThan(linearRGB, vec3(0.0031308));
        vec3 higher = vec3(1.055) * pow(linearRGB, vec3(1.0 / 2.4)) - vec3(0.055);
        vec3 lower = linearRGB * vec3(12.92);
        return mix(higher, lower, cutoff);
    }

    void main() {
        vec2 zoomedUV = 0.5 + (vUv - 0.5) / zoom;
        vec4 color = texture2D(tDiffuse, zoomedUV);
        gl_FragColor = vec4(LinearTosRGB(color.rgb), color.a);
    }
  `,
};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -0.001);
controls.update();

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
scene.add(hemiLight);

let model;

loadAssets().then((_model) => {
  _model.scale.setScalar(1.4);
  scene.add(_model);
  model = _model;
  _model.position.set(3, -3, -3);
  _model.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.envMapIntensity = 1.5;
      child.material.needsUpdate = true;
    }
  });
});

// Load cube textures
const loader = new THREE.CubeTextureLoader();
const map1 = [
  "./assets/map1/left.jpg",
  "./assets/map1/right.jpg",
  "./assets/map1/up.jpg",
  "./assets/map1/down.jpg",
  "./assets/map1/front.jpg",
  "./assets/map1/back.jpg",
];
const map2 = [
  "./assets/map2/left.jpg",
  "./assets/map2/right.jpg",
  "./assets/map2/up.jpg",
  "./assets/map2/down.jpg",
  "./assets/map2/front.jpg",
  "./assets/map2/back.jpg",
];
let cubeTexture1 = loader.load(map1);
let cubeTexture2 = loader.load(map2);
let currentMap = 1;
let cubeTexture = cubeTexture1;
scene.background = cubeTexture;
scene.environment = cubeTexture;

// Add reflective sphere and ring
const shinyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.8,
  roughness: 0.2,
  envMap: scene.background,
  envMapIntensity: 1.5,
});

const geometry = new THREE.SphereGeometry(1, 64, 64);
const sphere = new THREE.Mesh(geometry, shinyMaterial);
sphere.position.set(5, -1.5, -15.2);
scene.add(sphere);

const ringGeometry = new THREE.CircleGeometry(0.3, 32);
ringGeometry.rotateX(-Math.PI / 2);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0xff9900,
  side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.position.set(0, -1.5, -5.2);
scene.add(ring);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let transitioning = false;

function switchPosition(flag) {
  if (flag) {
    ring.position.set(0, -1.5, -5.2);
    sphere.position.set(5, -1.5, -15.2);
    model.position.z = -3;
  } else {
    ring.position.set(0, -1.5, 5.2);
    sphere.position.set(5, -1.5, 0);
    model.position.z = 3;
  }
}

// Composer setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const zoomPass = new ShaderPass(ZoomInShader);
composer.addPass(zoomPass);
zoomPass.enabled = false;

let flag = true;
function transitionToNewMap() {
  transitioning = true;
  flag = !flag;
  switchPosition(flag);

  zoomPass.enabled = true;
  zoomPass.uniforms.zoom.value = 1.0;

  let zoomValue = 1.0;
  const zoomInInterval = setInterval(() => {
    zoomValue += 0.05;
    zoomPass.uniforms.zoom.value = zoomValue;

    if (zoomValue >= 3.0) {
      clearInterval(zoomInInterval);

      if (currentMap === 1) {
        cubeTexture = cubeTexture2;
        currentMap = 2;
      } else {
        cubeTexture = cubeTexture1;
        currentMap = 1;
      }
      scene.background = cubeTexture;

      zoomPass.uniforms.zoom.value = 1.0;
      zoomPass.enabled = false;
      transitioning = false;
    }
  }, 5);
}

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ring);

  if (intersects.length > 0 && !transitioning) {
    transitionToNewMap();
  }
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ring);

  document.body.style.cursor = intersects.length > 0 ? "pointer" : "auto";
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

animate();

window.addEventListener("click", onClick);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
