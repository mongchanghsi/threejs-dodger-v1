import * as THREE from "three";
import { checkCollision } from "./utils";

type Coordinate = {
  x: number;
  y: number;
  z: number;
};

const DefaultCoordinate: Coordinate = {
  x: 0,
  y: 0,
  z: 0,
};

export class Box extends THREE.Mesh {
  width: number;
  height: number;
  depth: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  front: number;
  back: number;
  velocity: Coordinate;
  gravity: number;
  modelMesh: THREE.Object3D | null = null;
  visible: boolean = true;

  constructor({
    width = 1,
    height = 1,
    depth = 1,
    color,
    velocity = DefaultCoordinate,
    position = DefaultCoordinate,
    visible = true,
  }: {
    width: number;
    height: number;
    depth: number;
    color: string;
    velocity?: Coordinate;
    position?: Coordinate;
    visible?: boolean;
  }) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = visible
      ? new THREE.MeshLambertMaterial({ color })
      : new THREE.MeshBasicMaterial({ visible: false });
    super(geometry, material);

    this.width = width;
    this.height = height;
    this.depth = depth;

    this.position.set(position.x, position.y, position.z);
    this.bottom = this.position.y - this.height / 2;
    this.top = this.position.y + this.height / 2;
    this.left = this.position.x - this.width / 2;
    this.right = this.position.x + this.width / 2;
    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;

    this.velocity = velocity;
    this.gravity = -0.002;
  }

  updateSides() {
    this.bottom = this.position.y - this.height / 2;
    this.top = this.position.y + this.height / 2;
    this.left = this.position.x - this.width / 2;
    this.right = this.position.x + this.width / 2;
    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;
  }

  // Update the current position of the object
  update(ground: Box) {
    this.updateSides();
    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;
    this.applyGravity(ground);

    if (this.modelMesh) {
      this.modelMesh.position.copy(this.position);
      this.modelMesh.rotation.copy(this.rotation); // Optional
    }
  }

  applyGravity(ground: Box) {
    this.velocity.y += this.gravity;

    if (
      checkCollision({
        box1: this,
        box2: ground,
      })
    ) {
      const friction = 0.5;
      this.velocity.y *= friction;
      this.velocity.y = -this.velocity.y;
    } else this.position.y += this.velocity.y;
  }

  attachModel(model: THREE.Object3D) {
    this.modelMesh = model;
    model.position.copy(this.position);
  }
}
