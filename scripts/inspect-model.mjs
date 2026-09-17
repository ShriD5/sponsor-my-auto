import { NodeIO } from "@gltf-transform/core";
import { bounds } from "@gltf-transform/functions";
const doc = await new NodeIO().read("public/models/auto.glb");
const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const b = bounds(scene);
console.log("bbox min", b.min.map((v) => +v.toFixed(3)), "max", b.max.map((v) => +v.toFixed(3)));
console.log("size", b.max.map((v, i) => +(v - b.min[i]).toFixed(3)));
for (const n of doc.getRoot().listNodes()) if (n.getMesh()) console.log("node:", n.getName(), "mesh:", n.getMesh().getName());
