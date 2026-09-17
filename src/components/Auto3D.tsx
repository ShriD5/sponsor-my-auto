"use client";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Decal, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { SlotState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

const INK = "#0f1133", CREAM = "#faf3e0", PINK = "#e63e8b";

/* ------------------------------------------------------------------ */
/* Sticker textures: everything the buyer needs to know is ON the auto  */
/* ------------------------------------------------------------------ */

function cssFont(v: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const f = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return f ? `${f}, ${fallback}` : fallback;
}

async function drawSticker(slot: SlotState, aspect: number): Promise<HTMLCanvasElement> {
  const W = 1024, H = Math.max(96, Math.round(W / aspect));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const display = cssFont("--font-titan", "Impact, sans-serif");
  const accent = cssFont("--font-kalam", "cursive");
  try { await document.fonts.ready; } catch {}
  const thin = aspect > 3;
  const pad = Math.round(H * 0.06);

  // base + ink border
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  g.fillStyle = slot.sponsor ? "#ffffff" : CREAM; g.fillRect(pad, pad, W - pad * 2, H - pad * 2);

  if (slot.sponsor) {
    const img = new Image();
    await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = slot.sponsor!.logo; });
    const footer = thin ? 0 : Math.round(H * 0.16);
    const box = { x: pad * 2, y: pad * 2, w: W - pad * 4, h: H - pad * 4 - footer };
    if (img.naturalWidth) {
      const s = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      g.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
    }
    if (footer) {
      g.fillStyle = INK; g.fillRect(pad, H - pad - footer, W - pad * 2, footer);
      g.fillStyle = CREAM; g.font = `${Math.round(footer * 0.55)}px ${display}`; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText(`${slot.sponsor.name.toUpperCase()} · ${fmtUsd(slot.currentPriceCents)}`, pad * 3, H - pad - footer / 2);
      g.fillStyle = PINK; g.font = `${Math.round(footer * 0.5)}px ${accent}`; g.textAlign = "right";
      g.fillText(`take it for ${fmtUsd(slot.nextPriceCents)} →`, W - pad * 3, H - pad - footer / 2);
    }
    return c;
  }

  // placeholder: dotted paper
  g.fillStyle = "rgba(27,31,92,.08)";
  for (let x = pad + 6; x < W - pad; x += 14) for (let y = pad + 6; y < H - pad; y += 14) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  g.textAlign = "center"; g.textBaseline = "middle";
  if (thin) {
    g.fillStyle = "#1b1f5c"; g.font = `${Math.round(H * 0.58)}px ${display}`;
    g.fillText(`YOUR LOGO HERE  ·  ${fmtUsd(slot.nextPriceCents)}`, W / 2, H / 2 + H * 0.03);
  } else {
    g.fillStyle = PINK; g.font = `${Math.round(H * 0.11)}px ${accent}`;
    g.fillText(slot.short.toLowerCase(), W / 2, H * 0.2);
    g.fillStyle = "#1b1f5c"; g.font = `${Math.round(H * 0.24)}px ${display}`;
    g.fillText("YOUR LOGO", W / 2, H * 0.45);
    g.fillText("HERE", W / 2, H * 0.66);
    g.fillStyle = INK; g.fillRect(pad, H - pad - H * 0.16, W - pad * 2, H * 0.16);
    g.fillStyle = "#f5a524"; g.font = `${Math.round(H * 0.09)}px ${display}`;
    g.fillText(`${fmtUsd(slot.nextPriceCents)}   ·   tap to take it`, W / 2, H - pad - H * 0.08);
  }
  return c;
}

function useStickerTexture(slot: SlotState, aspect: number) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const key = `${slot.id}|${slot.sponsor?.logo?.slice(0, 64) ?? ""}|${slot.sponsor?.name ?? ""}|${slot.currentPriceCents}|${slot.nextPriceCents}|${aspect.toFixed(2)}`;
  useEffect(() => {
    let dead = false;
    drawSticker(slot, aspect).then((c) => {
      if (dead) return;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      setTex((old) => { old?.dispose(); return t; });
    });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return tex;
}

/* ------------------------------------------------------------------ */
/* Placement: raycast onto the model, project a Decal there            */
/* ------------------------------------------------------------------ */

type Placement = { mesh: THREE.Mesh; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3; point: THREE.Vector3; quat: THREE.Quaternion; dir: THREE.Vector3; w: number; h: number; lift: number };

function place(obj: THREE.Object3D, origin: THREE.Vector3, dir: THREE.Vector3, w: number, h: number, depth: number, up?: THREE.Vector3, lift = 0.012): Placement | null {
  const d = dir.clone().normalize();
  const rc = new THREE.Raycaster(origin, d);
  const all = rc.intersectObject(obj, true).filter((x) => (x.object as THREE.Mesh).isMesh);
  if (typeof window !== "undefined" && window.location.search.includes("dbg")) console.log("[place]", origin.toArray().map((v) => +v.toFixed(2)), "->", all.slice(0, 4).map((x) => `${x.object.name}@${x.point.toArray().map((v) => +v.toFixed(2)).join(",")}`).join(" | "));
  const hit = all[0]; // first surface the ray touches, glass included: stickers go on the outside
  if (!hit) return null;
  const mesh = hit.object as THREE.Mesh;
  const helper = new THREE.Object3D();
  helper.position.copy(hit.point);
  if (up) helper.up.copy(up);
  helper.lookAt(hit.point.clone().sub(d)); // +z points back toward the viewer
  const qMesh = new THREE.Quaternion(); mesh.getWorldQuaternion(qMesh);
  const qLocal = qMesh.invert().multiply(helper.quaternion);
  const ws = new THREE.Vector3(); mesh.getWorldScale(ws);
  return {
    mesh,
    position: mesh.worldToLocal(hit.point.clone()),
    rotation: new THREE.Euler().setFromQuaternion(qLocal),
    scale: new THREE.Vector3(w / ws.x, h / ws.y, depth / ws.z),
    point: hit.point.clone(), quat: helper.quaternion.clone(), dir: d, w, h, lift,
  };
}

function Sticker({ p, slot, aspect, onPick }: { p: Placement; slot: SlotState; aspect: number; onPick: (s: SlotState) => void }) {
  const tex = useStickerTexture(slot, aspect);
  const [hover, setHover] = useState(false);
  if (!tex) return null;
  const over = (e: { stopPropagation: () => void }) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; };
  const out = () => { setHover(false); document.body.style.cursor = ""; };
  const click = (e: { stopPropagation: () => void }) => { e.stopPropagation(); onPick(slot); };
  const tint = hover ? "#ffffff" : "#e9e2d0";
  // backing panel a hair outside the skin: covers window glass and open sides, so the sticker reads as a stretched fabric panel
  const backPos = p.point.clone().sub(p.dir.clone().multiplyScalar(p.lift));
  return (
    <>
      {createPortal(
        <Decal position={p.position} rotation={p.rotation} scale={p.scale} renderOrder={20} onClick={click} onPointerOver={over} onPointerOut={out}>
          <meshBasicMaterial map={tex} transparent polygonOffset polygonOffsetFactor={-12} toneMapped={false} color={tint} side={THREE.DoubleSide} />
        </Decal>,
        p.mesh
      )}
      <mesh position={backPos} quaternion={p.quat} renderOrder={19} onClick={click} onPointerOver={over} onPointerOut={out}>
        <planeGeometry args={[p.w, p.h]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={tint} side={THREE.FrontSide} />
      </mesh>
    </>
  );
}

/** Model normalized so the auto is LENGTH long, sits on y=0, nose points +x. Slots are raycast onto the surface. */
export const MODEL_CFG = { url: "/models/auto.glb", yaw: Math.PI / 2, length: 2.6 };

export type AutoSlotMap = Partial<Record<"hood" | "visor" | "side-l" | "side-r" | "top", SlotState>>;

function GlbRickshaw({ slots, onPick }: { slots: AutoSlotMap; onPick: (s: SlotState) => void }) {
  const { scene } = useGLTF(MODEL_CFG.url);
  const { obj, L, H, W } = useMemo(() => {
    const obj = scene.clone(true);
    obj.rotation.y = MODEL_CFG.yaw;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj, true);
    const size = new THREE.Vector3(); box.getSize(size);
    const k = MODEL_CFG.length / Math.max(size.x, 1e-3);
    obj.scale.setScalar(k);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj, true);
    const c = new THREE.Vector3(); box2.getCenter(c);
    obj.position.set(-c.x, -box2.min.y, -c.z);
    obj.updateMatrixWorld(true);
    obj.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return { obj, L: size.x * k, H: size.y * k, W: size.z * k };
  }, [scene]);

  // one raycast per slot; sizes in metres (auto is 2.6 long)
  const placements = useMemo(() => {
    const far = 4;
    if (typeof window !== "undefined" && window.location.search.includes("dbg")) console.log("[dims]", { L: +L.toFixed(3), H: +H.toFixed(3), W: +W.toFixed(3) });
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    return {
      hood:     { p: place(obj, v(-far, H * 0.745, 0), v(1, 0, 0), W * 0.80, H * 0.34, 0.16, undefined, 0.06), aspect: (W * 0.80) / (H * 0.34) },
      visor:    { p: place(obj, v(far, H * 0.935, 0), v(-1, 0, 0), W * 0.70, H * 0.055, 0.12), aspect: (W * 0.70) / (H * 0.055) },
      "side-l": { p: place(obj, v(-L * 0.34, H * 0.755, far), v(0, 0, -1), L * 0.17, H * 0.23, 0.08), aspect: (L * 0.17) / (H * 0.23) },
      "side-r": { p: place(obj, v(-L * 0.34, H * 0.755, -far), v(0, 0, 1), L * 0.17, H * 0.23, 0.08), aspect: (L * 0.17) / (H * 0.23) },
      top:      { p: place(obj, v(-L * 0.41, far, 0), v(0, -1, 0), W * 0.66, L * 0.055, 0.12, v(1, 0, 0)), aspect: (W * 0.66) / (L * 0.055) },
    } as Record<keyof AutoSlotMap, { p: Placement | null; aspect: number }>;
  }, [obj, L, H, W]);

  return (
    <group>
      <primitive object={obj} />
      {(Object.keys(placements) as (keyof AutoSlotMap)[]).map((k) => {
        const slot = slots[k]; const pl = placements[k];
        return slot && pl.p ? <Sticker key={k} p={pl.p} slot={slot} aspect={pl.aspect} onPick={onPick} /> : null;
      })}
    </group>
  );
}

class Boundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function debugCam(): [number, number, number] | null {
  if (typeof window === "undefined") return null;
  const c = new URLSearchParams(window.location.search).get("cam");
  const d = 6;
  return c === "rear" ? [-d, 1.6, 0.01] : c === "front" ? [d, 1.6, 0.01] : c === "side" ? [0.01, 1.6, d] : c === "side2" ? [0.01, 1.6, -d] : c === "top" ? [0.01, d + 1, 0.01] : null;
}

function FitCamera({ base }: { base: [number, number, number] }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const k = aspect < 0.8 ? 1.7 : aspect < 1.2 ? 1.12 : 1;
    camera.position.set(base[0] * k, base[1] * k * 0.95, base[2] * k);
    camera.lookAt(0, 0.9, 0);
  }, [camera, size, base]);
  return null;
}

function AllowPageScroll() {
  const { gl } = useThree();
  useEffect(() => { const t = setTimeout(() => { gl.domElement.style.touchAction = "pan-y"; }, 0); return () => clearTimeout(t); }, [gl]);
  return null;
}

function Turntable({ children, speed = 0.15 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  const frozen = !!debugCam();
  useFrame((_, dt) => { if (ref.current && !frozen) ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

export function Auto3D({ slots, onPick, className }: { slots: AutoSlotMap; onPick: (s: SlotState) => void; className?: string }) {
  const dbg = debugCam();
  const base: [number, number, number] = dbg ?? [-4.4, 1.7, 2.6];
  return (
    <div className={className ?? "w-full h-[400px] sm:h-[520px]"}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: base, fov: 36 }} gl={{ antialias: true, alpha: true }}>
        {!dbg && <FitCamera base={base} />}
        <AllowPageScroll />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 7, 3]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 3, -3]} intensity={0.9} color="#e63e8b" />
        <pointLight position={[-3, 1.5, 2]} intensity={6} color="#f5a524" distance={9} />
        <Turntable speed={0.18}>
          <Boundary>
            <Suspense fallback={null}>
              <GlbRickshaw slots={slots} onPick={onPick} />
            </Suspense>
          </Boundary>
        </Turntable>
        <ContactShadows position={[0, 0.02, 0]} opacity={0.75} scale={10} blur={2.4} far={3} color="#000" />
        <OrbitControls target={[0, 0.9, 0]} enablePan={false} enableZoom={false} touches={{ ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.ROTATE }} minDistance={3} maxDistance={12} minPolarAngle={0.6} maxPolarAngle={1.5} />
      </Canvas>
    </div>
  );
}
