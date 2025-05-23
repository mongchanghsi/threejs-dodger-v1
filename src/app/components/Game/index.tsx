/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  checkCollision,
  CreateEnemy,
  CreateGround,
  CreateDirectionalLight,
  CreateAmbientLight,
  checkGainPoint,
  CAMERA_Y,
  CAMERA_Z,
  checkEnemyOutOfFrame,
  CreateBall,
  getSpeed,
  preloadEnemyModels,
  CalculateEnemySpawnPosition,
  GROUND_WIDTH,
  checkIfPlayerFalls,
} from "./utils";
import { Box } from "./Box";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type Keys = {
  a: boolean;
  d: boolean;
};

enum GameState {
  LOADING = "LOADING",
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  GAME_OVER = "GAME_OVER",
}

const Game = () => {
  const [points, setPoints] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const gameStateRef = useRef<GameState>(GameState.LOADING);
  const mountRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Keys>({ a: false, d: false });
  // const enemiesRef = useRef<Box[]>([]);
  const enemiesRef = useRef<
    { hitbox: Box; model: THREE.Object3D<THREE.Object3DEventMap> }[]
  >([]);
  const pastEnemiesRef = useRef<number[]>([]);
  const framesRef = useRef<number>(0);
  const spawnDelayFrameRef = useRef<number>(200);
  const animationRef = useRef<number>(0);
  const pointsRef = useRef<number>(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groundRef = useRef<Box | null>(null);
  const playerRef = useRef<{
    hitbox: Box;
    model: THREE.Object3D<THREE.Object3DEventMap>;
  } | null>(null);
  const enemyModels = useRef<THREE.Object3D<THREE.Object3DEventMap>[]>([]);

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyA":
        keysRef.current.a = true;
        break;
      case "KeyD":
        keysRef.current.d = true;
        break;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case "KeyA":
        keysRef.current.a = false;
        break;
      case "KeyD":
        keysRef.current.d = false;
        break;
    }
  };

  const animate = () => {
    if (!playerRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const { hitbox: cube, model } = playerRef.current;
    const ground = groundRef.current;

    if (!scene || !camera || !renderer || !ground) return;

    animationRef.current = requestAnimationFrame(animate);

    const BASE_SPEED = 0.05;
    cube.velocity.x = 0;
    cube.velocity.z = 0;

    if (keysRef.current.a) {
      cube.velocity.x = -BASE_SPEED;
      model.rotation.z += 0.05;
    } else if (keysRef.current.d) {
      cube.velocity.x = BASE_SPEED;
      model.rotation.z -= 0.05;
    }

    cube.update(ground);
    model.rotation.x -= 0.05; // rotate forward

    if (
      gameStateRef.current === GameState.PLAYING ||
      gameStateRef.current === GameState.GAME_OVER
    ) {
      if (checkIfPlayerFalls({ box1: cube, box2: ground })) {
        cancelAnimationFrame(animationRef.current);
        toggleGameState(GameState.GAME_OVER);
      }

      enemiesRef.current.forEach(({ hitbox: enemy, model: _ }) => {
        enemy.update(ground);

        if (checkCollision({ box1: cube, box2: enemy })) {
          cancelAnimationFrame(animationRef.current);
          toggleGameState(GameState.GAME_OVER);
        }

        if (checkGainPoint({ box1: cube, box2: enemy })) {
          if (!pastEnemiesRef.current.includes(enemy.id)) {
            pastEnemiesRef.current.push(enemy.id);
            setPoints((prev) => prev + 1);
            pointsRef.current++;

            if (spawnDelayFrameRef.current >= 50) {
              spawnDelayFrameRef.current -= 10;
            }
          }
        }

        if (checkEnemyOutOfFrame(enemy)) {
          enemiesRef.current = enemiesRef.current.filter(
            ({ hitbox: e, model: _ }) => e.id !== enemy.id
          );
          pastEnemiesRef.current = pastEnemiesRef.current.filter(
            (e) => e !== enemy.id
          );
          scene.remove(enemy);
        }
      });

      if (framesRef.current % spawnDelayFrameRef.current === 0) {
        const numEnemy = Math.floor(Math.random() * 3) + 1;
        const enemyPositions = CalculateEnemySpawnPosition(
          numEnemy,
          GROUND_WIDTH - 1
        );
        for (let i = 0; i < numEnemy; i++) {
          const { hitbox, model } = CreateEnemy(
            enemyModels.current,
            enemyPositions[i],
            getSpeed(pointsRef.current)
          );
          scene.add(model);
          scene.add(hitbox);
          enemiesRef.current.push({ hitbox, model });
        }
      }
    }

    // IMPORTANT - To render entire game
    renderer.render(scene, camera);
    if (gameStateRef.current === GameState.PLAYING) {
      framesRef.current++;
    }
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      alpha: true, // Remove threejs default bg, rely on html bg
      antialias: true,
    });
    renderer.shadowMap.enabled = true;

    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);

    const ground = CreateGround();
    scene.add(ground);

    const light = CreateDirectionalLight();
    scene.add(light);
    const ambientLight = CreateAmbientLight();
    scene.add(ambientLight);

    camera.position.z = CAMERA_Z;
    camera.position.y = CAMERA_Y;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groundRef.current = ground;

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.05;

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;

    if (!scene || !renderer) return;

    enemiesRef.current = [];

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const loadEnemies = async () => {
      await preloadEnemyModels(enemyModels.current);
    };

    loadEnemies();

    const createPlayerObject = async () => {
      const { hitbox, model } = await CreateBall();
      playerRef.current = { hitbox, model };
      scene.add(hitbox);
      scene.add(model);

      animate();
    };

    createPlayerObject();

    toggleGameState(GameState.IDLE);

    return () => {
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const startGame = () => {
    cancelAnimationFrame(animationRef.current);

    enemiesRef.current.forEach(({ hitbox, model }) => {
      sceneRef.current?.remove(hitbox);
      sceneRef.current?.remove(model);
    });
    enemiesRef.current = [];
    pastEnemiesRef.current = [];

    setPoints(0);
    pointsRef.current = 0;
    framesRef.current = 0;
    spawnDelayFrameRef.current = 200;
    keysRef.current = { a: false, d: false };
    playerRef.current!.hitbox.position.x = 0;
    playerRef.current!.hitbox.position.y = 0;
    playerRef.current!.hitbox.position.z = 0;

    toggleGameState(GameState.PLAYING);

    animationRef.current = requestAnimationFrame(animate);
  };

  const toggleGameState = useCallback((state: GameState) => {
    setGameState(state);
    gameStateRef.current = state;
  }, []);

  return (
    <div className="relative w-full h-full">
      {gameState === GameState.IDLE && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 text-white">
          <h1 className="text-4xl font-bold mb-6">READY TO PLAY?</h1>
          <button
            onClick={startGame}
            className="px-6 py-3 text-lg font-semibold bg-green-500 hover:bg-green-600 rounded-lg transition"
          >
            START GAME
          </button>
        </div>
      )}

      <div ref={mountRef} />

      {gameState === GameState.PLAYING && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-white text-2xl font-bold drop-shadow-md">
          {points}
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white">
          <h1 className="text-5xl font-extrabold mb-4">GAME OVER</h1>
          <p className="text-2xl mb-8">Points: {points}</p>
          <button
            onClick={startGame}
            className="px-6 py-3 text-lg font-semibold bg-red-500 hover:bg-red-600 rounded-lg transition"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;
