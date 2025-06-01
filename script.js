import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CameraControls } from "./cameraControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { loadAssets, addControls } from "./asset_loader.js";

const ZoomInShader = {
  uniforms: {
    tDiffuse: { value: null },
    zoom: { value: 1.0 },
    time: { value: 0.0 }, 
    center: { value: new THREE.Vector2(0.5, 0.5) }, // Center of screen
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `uniform sampler2D tDiffuse;
uniform float time; // 0.0 to 1.0 for complete transition
uniform vec2 center; // Ripple center point
varying vec2 vUv;

#include <common>

vec3 LinearTosRGB(vec3 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB, vec3(0.0031308));
    vec3 higher = vec3(1.055) * pow(linearRGB, vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower = linearRGB * vec3(12.92);
    return mix(higher, lower, cutoff);
}

void main() {
    vec2 uv = vUv;
    
    // Calculate distance from ripple center
    float dist = distance(uv, center);
    
    // Ripple parameters
    float rippleFreq = 25.0;      // Frequency of ripples
    float rippleSpeed = 8.0;      // Speed of ripple propagation
    float maxDistortion = 0.04;   // Maximum distortion strength
    
    // Calculate ripple wave
    float rippleTime = time * rippleSpeed;
    float ripple = sin((dist * rippleFreq) - rippleTime);
    
    // Create ripple distortion that fades with distance and time
    float rippleRadius = time * 1.2; // Ripples expand outward
    float rippleFalloff = 1.0 - smoothstep(0.0, 0.8, abs(dist - rippleRadius));
    
    // Apply distortion based on ripple
    float distortionStrength = maxDistortion * ripple * rippleFalloff;
    
    // Calculate distortion direction (perpendicular to radius)
    vec2 direction = normalize(uv - center);
    vec2 perpendicular = vec2(-direction.y, direction.x);
    
    // Apply ripple distortion
    vec2 distortedUV = uv + perpendicular * distortionStrength;
    
    // Blur calculation - peaks at middle of transition
    float blurIntensity;
    if (time <= 0.5) {
        // Blur increases from 0 to max (blur in)
        blurIntensity = time * 3.0; // 0.0 to 1.0
    } else {
        // Blur decreases from max to 0 (blur out)
        blurIntensity = 3.0 - (time * 2.0); // 1.0 to 0.0
    }
    
    // Maximum blur radius
    float maxBlurRadius = 0.008;
    float blurRadius = blurIntensity * maxBlurRadius;
    
    // Sample with blur
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;
    
    // Multi-sample blur
    int samples = 8;
    for (int i = 0; i < samples; i++) {
        float angle = float(i) * 6.28318 / float(samples); // 2*PI / samples
        for (int j = 1; j <= 3; j++) {
            float radius = blurRadius * float(j) / 3.0;
            vec2 offset = vec2(cos(angle), sin(angle)) * radius;
            
            // Sample the distorted UV
            vec2 sampleUV = clamp(distortedUV + offset, 0.0, 1.0);
            
            // Weight decreases with distance from center
            float weight = 1.0 / float(j);
            color += texture2D(tDiffuse, sampleUV) * weight;
            totalWeight += weight;
        }
    }
    
    // Add center sample with higher weight
    color += texture2D(tDiffuse, clamp(distortedUV, 0.0, 1.0)) * 2.0;
    totalWeight += 2.0;
    
    color /= totalWeight;
    
    // Add subtle chromatic aberration during high distortion
    float aberrationStrength = blurIntensity * 0.003;
    if (aberrationStrength > 0.0) {
        vec2 redUV = clamp(distortedUV + vec2(aberrationStrength, 0.0), 0.0, 1.0);
        vec2 blueUV = clamp(distortedUV - vec2(aberrationStrength, 0.0), 0.0, 1.0);
        
        color.r = texture2D(tDiffuse, redUV).r;
        color.b = texture2D(tDiffuse, blueUV).b;
    }
    
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

const cameraControls = new CameraControls(camera, renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -0.001);
controls.update();

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
scene.add(hemiLight);

let model;

loadAssets(camera).then((_model) => {
  _model.scale.setScalar(1);
  scene.add(_model);
  model = _model;
  // addControls(model);
  _model.position.set(1.5, -1.5, 0);
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
    model.position.z = 0;
  } else {
    ring.position.set(0, -1.5, 5.2);
    sphere.position.set(5, -1.5, 0);
    model.position.z = 5.2;
  }
}

// Composer setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const zoomPass = new ShaderPass(ZoomInShader);
composer.addPass(zoomPass);
zoomPass.enabled = false;

let flag = true;
// function transitionToNewMap() {
//   transitioning = true;
//   flag = !flag;
//   switchPosition(flag);

//   zoomPass.enabled = true;
//   zoomPass.uniforms.zoom.value = 1.0;

//   let zoomValue = 1.0;
//   const zoomInInterval = setInterval(() => {
//     zoomValue += 0.05;
//     zoomPass.uniforms.zoom.value = zoomValue;

//     if (zoomValue >= 3.0) {
//       clearInterval(zoomInInterval);

//       if (currentMap === 1) {
//         cubeTexture = cubeTexture2;
//         currentMap = 2;
//       } else {
//         cubeTexture = cubeTexture1;
//         currentMap = 1;
//       }
//       scene.background = cubeTexture;

//       zoomPass.uniforms.zoom.value = 1.0;
//       zoomPass.enabled = false;
//       transitioning = false;
//     }
//   }, 5);
// }
function transitionToNewMap() {
  transitioning = true;
  flag = !flag;
  
  zoomPass.enabled = true;
  zoomPass.uniforms.time.value = 0.0;
  zoomPass.uniforms.center.value.set(0.5, 0.5); // Center of screen

  let timeValue = 0.0;
  const transitionInterval = setInterval(() => {
    timeValue += 0.016; // ~60fps for 1 second transition
    zoomPass.uniforms.time.value = timeValue;

    // Switch scenes at peak blur (time = 0.5)
    if (timeValue >= 0.5 && timeValue < 0.52) {
      switchPosition(flag);
      
      if (currentMap === 1) {
        cubeTexture = cubeTexture2;
        currentMap = 2;
      } else {
        cubeTexture = cubeTexture1;
        currentMap = 1;
      }
      scene.background = cubeTexture;
    }

    if (timeValue >= 1.0) {
      clearInterval(transitionInterval);
      zoomPass.uniforms.time.value = 0.0;
      zoomPass.enabled = false;
      transitioning = false;
    }
  }, 16); // ~60fps
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
