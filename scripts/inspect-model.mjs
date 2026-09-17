import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read("public/models/auto.glb");
const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const b = getBounds(scene);
console.log("bbox min", b.min.map((v) => +v.toFixed(3)), "max", b.max.map((v) => +v.toFixed(3)));
console.log("size", b.max.map((v, i) => +(v - b.min[i]).toFixed(3)));
for (const n of doc.getRoot().listNodes()) if (n.getMesh()) { const nb = getBounds(n); console.log("node:", n.getName(), "| mesh:", n.getMesh().getName(), "| center", nb.min.map((v,i)=>+((v+nb.max[i])/2).toFixed(2))); }
for (const m of doc.getRoot().listMaterials()) console.log("material:", m.getName());
