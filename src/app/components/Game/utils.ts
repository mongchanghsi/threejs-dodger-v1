/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { Box } from "./Box";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const CAMERA_Z = 10;
export const CAMERA_Y = 3;
const GROUND_WIDTH = 10;
const GROUND_DEPTH = 40;
const MAXIMUM_ENEMY_VELOCITY = 5;
const BASE_ENEMY_VELOCITY = 0.05;
const POINTS_DIVIDER = 100;

export const CreateBall = (): Promise<{
  hitbox: Box;
  model: THREE.Object3D;
}> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    const hitbox = new Box({
      width: 1,
      height: 1,
      depth: 1,
      color: "#ffffff",
      velocity: { x: 0, y: -0.01, z: 0 },
      visible: false,
    });
    hitbox.castShadow = false;

    loader.load(
      "/assets/BeachBall.glb",
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(2, 2, 2);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        hitbox.attachModel(model);
        resolve({ hitbox, model });
      },
      undefined,
      (error) => {
        console.error("Failed to load GLB model:", error);
        reject(error);
      }
    );
  });
};

// The default player box - deprecated
export const CreateCube = async () => {
  const cube = new Box({
    width: 1,
    height: 1,
    depth: 1,
    color: "#00ff00",
    velocity: {
      x: 0,
      y: -0.01,
      z: 0,
    },
  });
  cube.castShadow = true;
  return cube;
};

export const CreateGround = () => {
  const ground = new Box({
    width: GROUND_WIDTH,
    height: 0.2,
    depth: GROUND_DEPTH,
    color: "#e5c49c",
    position: {
      x: 0,
      y: -2,
      z: 0,
    },
  });
  ground.receiveShadow = true;
  return ground;
};

export const CreateDirectionalLight = () => {
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.y = 3;
  light.position.z = 3;
  light.castShadow = true;
  return light;
};

export const CreateAmbientLight = () => {
  return new THREE.AmbientLight(0xfffff, 0.8);
};

// The default enemy box - deprecated
export const CreateBoxEnemy = (velocity: number = 0.02) => {
  const cube = new Box({
    width: 1,
    height: 1,
    depth: 1,
    color: "#ff0000",
    position: {
      x: (Math.random() - 0.5) * GROUND_WIDTH,
      y: 0,
      z: -GROUND_DEPTH / 2,
    },
    velocity: {
      x: 0,
      y: 0,
      z: velocity,
    },
  });
  cube.castShadow = true;
  return cube;
};

export const CreateEnemy = (
  enemyModels: THREE.Object3D<THREE.Object3DEventMap>[],
  velocity: number = 0.02
) => {
  const hitbox = new Box({
    width: 1,
    height: 1,
    depth: 1,
    color: "#ffffff",
    position: {
      x: (Math.random() - 0.5) * GROUND_WIDTH,
      y: 0,
      z: -GROUND_DEPTH / 2,
    },
    velocity: {
      x: 0,
      y: 0,
      z: velocity,
    },
    visible: false,
  });

  const randomModel =
    enemyModels[Math.floor(Math.random() * enemyModels.length)];
  const modelClone = randomModel.clone(true);
  hitbox.attachModel(modelClone);

  return { hitbox, model: modelClone };
};

export const checkCollision = ({ box1, box2 }: { box1: Box; box2: Box }) => {
  const xCollision = box1.right >= box2.left && box1.left <= box2.right;
  const yCollision =
    box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
  const zCollision = box1.front >= box2.back && box1.back <= box2.front;

  return xCollision && yCollision && zCollision;
};

export const checkGainPoint = ({ box1, box2 }: { box1: Box; box2: Box }) => {
  // Don't know why need * 2 the depth
  return box1.back + box1.depth * 2 < box2.front;
};

// To keep enemy data clean
export const checkEnemyOutOfFrame = (box: Box) => {
  return box.front >= GROUND_DEPTH / 2; // Or compare y also can
};

export const getSpeed = (points: number) => {
  return Math.min(
    BASE_ENEMY_VELOCITY + points / POINTS_DIVIDER,
    MAXIMUM_ENEMY_VELOCITY
  );
};

export const preloadEnemyModels = async (
  enemyModels: THREE.Object3D<THREE.Object3DEventMap>[]
) => {
  const loader = new GLTFLoader();

  const paths = [
    "/assets/Cactus1.glb",
    "/assets/Cactus2.glb",
    "/assets/SandBag.glb",
    "/assets/SandCastle.glb",
  ];

  const loadedModels = await Promise.all(
    paths.map((path) => loadModel(loader, path))
  );

  enemyModels.push(...loadedModels);
};

const loadModel = (
  loader: GLTFLoader,
  path: string
): Promise<THREE.Object3D> => {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        normalizeModelSize(model, 1);
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(model);
      },
      undefined,
      (error) => reject(error)
    );
  });
};

export const normalizeModelSize = (model: THREE.Object3D, targetSize = 1) => {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDimension;
  model.scale.setScalar(scale);

  box.setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.z -= center.z;

  const newBox = new THREE.Box3().setFromObject(model);
  const newMinY = newBox.min.y;
  model.position.y -= newMinY;
};
