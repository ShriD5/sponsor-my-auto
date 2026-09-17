import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read("public/models/auto.glb");
for (const n of doc.getRoot().listNodes()) console.log(n.getName(), "| mesh:", n.getMesh()?.getName() ?? "-", "| t", n.getTranslation().map(v=>+v.toFixed(3)), "| r", n.getRotation().map(v=>+v.toFixed(3)), "| s", n.getScale().map(v=>+v.toFixed(4)), "| children", n.listChildren().map(c=>c.getName()));
