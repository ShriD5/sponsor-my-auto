"use client";
import { Component, Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox, Outlines, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { SlotState } from "@/lib/state";
import { fmtUsd } from "@/lib/slots";

export type AutoSlots = { hood: SlotState; back: SlotState; tee: SlotState };

const INK = "#0f1133", CREAM = "#faf3e0", PINK = "#e63e8b", TEAL = "#0e8c8c";

/** canvas-drawn placeholder texture ("YOUR LOGO" on cream) */
function useLabelTexture(title: string, sub: string) {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = CREAM; g.fillRect(0, 0, 512, 256);
    for (let x = 4; x < 512; x += 10) for (let y = 4; y < 256; y += 10) { g.fillStyle = "rgba(27,31,92,.08)"; g.beginPath(); g.arc(x, y, 1.2, 0, 7); g.fill(); }
    g.fillStyle = "#1b1f5c"; g.font = "bold 64px 'Titan One', Impact, sans-serif"; g.textAlign = "center"; g.fillText(title, 256, 128);
    g.fillStyle = PINK; g.font = "36px Kalam, cursive"; g.fillText(sub, 256, 190);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }, [title, sub]);
}

function LogoTex({ src, w, h }: { src: string; w: number; h: number }) {
  const tex = useLoader(THREE.TextureLoader, src);
  tex.colorSpace = THREE.SRGBColorSpace;
  // letterbox: keep aspect, cream background behind it
  const img = tex.image as HTMLImageElement;
  const ar = img && img.width ? img.width / img.height : 1;
  const pw = Math.min(w, h * ar), ph = pw / ar;
  return (
    <group>
      <mesh><planeGeometry args={[w, h]} /><meshToonMaterial color={CREAM} /></mesh>
      <mesh position={[0, 0, 0.002]}><planeGeometry args={[pw * 0.9, ph * 0.9]} /><meshBasicMaterial map={tex} transparent toneMapped={false} /></mesh>
    </group>
  );
}

class TexBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

function SlotLabel({ slot, title, onPick, position }: { slot: SlotState; title: string; onPick: (s: SlotState) => void; position: [number, number, number] }) {
  const label = slot.sponsor ? `${slot.sponsor.name} · ${fmtUsd(slot.currentPriceCents)}` : title;
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "auto" }}>
      <button onClick={() => onPick(slot)}
        className="whitespace-nowrap font-display text-xs sm:text-sm bg-marigold text-ink px-2.5 py-1 rounded-md shadow-[3px_3px_0_#0f1133] border-2 border-ink hover:bg-pink hover:text-cream transition">
        {label} <span className="text-pink font-accent">{slot.sponsor ? "→ take " : "→ "}{fmtUsd(slot.nextPriceCents)}</span>
      </button>
    </Html>
  );
}

function SlotFace({ slot, w, h, position, rotation, title, sub, onPick, occlude }:
  { slot: SlotState; w: number; h: number; position: [number, number, number]; rotation: [number, number, number]; title: string; sub: string; onPick: (s: SlotState) => void; occlude?: boolean }) {
  const ph = useLabelTexture(title, sub);
  const hover = useRef(false);
  return (
    <group position={position} rotation={rotation}>
      <group onClick={(e) => { e.stopPropagation(); onPick(slot); }}
        onPointerOver={() => { hover.current = true; document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { hover.current = false; document.body.style.cursor = ""; }}>
        {slot.sponsor ? (
          <TexBoundary fallback={<mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={ph} toneMapped={false} /></mesh>}>
            <Suspense fallback={<mesh><planeGeometry args={[w, h]} /><meshToonMaterial color={CREAM} /></mesh>}>
              <LogoTex src={slot.sponsor.logo} w={w} h={h} />
            </Suspense>
          </TexBoundary>
        ) : (
          <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={ph} toneMapped={false} /></mesh>
        )}
        {/* ink frame */}
        <mesh position={[0, 0, -0.004]}><planeGeometry args={[w + 0.06, h + 0.06]} /><meshToonMaterial color={INK} /></mesh>
      </group>
      {!occlude && <SlotLabel slot={slot} title={title} onPick={onPick} position={[0, h / 2 + 0.12, 0.05]} />}
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><cylinderGeometry args={[0.3, 0.3, 0.16, 24]} /><meshToonMaterial color={INK} /><Outlines thickness={0.02} color={INK} /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.18, 16]} /><meshToonMaterial color={CREAM} /></mesh>
    </group>
  );
}

/** Procedural auto rickshaw. +x is forward. Rear face at x = -1.15. */
function Rickshaw({ tint, slots, onPick }: { tint: string; slots: { hood: SlotState; back: SlotState; tee: SlotState }; onPick: (s: SlotState) => void }) {
  const mat = (c: string) => <meshToonMaterial color={c} />;
  return (
    <group>
      {/* floor / chassis */}
      <mesh position={[0, 0.34, 0]}><boxGeometry args={[2.5, 0.08, 1.3]} />{mat(INK)}</mesh>
      {/* rear cabin body */}
      <RoundedBox args={[1.5, 0.66, 1.3]} radius={0.06} smoothness={3} position={[-0.4, 0.68, 0]}>{mat(tint)}<Outlines thickness={0.015} color={INK} /></RoundedBox>
      {/* canopy / hood */}
      <RoundedBox args={[1.7, 0.85, 1.36]} radius={0.16} smoothness={4} position={[-0.3, 1.44, 0]}>{mat(INK)}</RoundedBox>
      {/* canopy side windows (open) */}
      <mesh position={[-0.2, 1.42, 0.69]}><planeGeometry args={[1.1, 0.5]} /><meshToonMaterial color="#1b1f5c" /></mesh>
      <mesh position={[-0.2, 1.42, -0.69]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.1, 0.5]} /><meshToonMaterial color="#1b1f5c" /></mesh>
      {/* nose */}
      <RoundedBox args={[0.7, 0.55, 0.9]} radius={0.12} smoothness={3} position={[0.85, 0.7, 0]}>{mat(tint)}<Outlines thickness={0.015} color={INK} /></RoundedBox>
      {/* windshield */}
      <mesh position={[0.62, 1.32, 0]} rotation={[0, 0, -0.18]}><boxGeometry args={[0.05, 0.75, 1.15]} /><meshToonMaterial color="#8fd3f4" transparent opacity={0.6} /></mesh>
      {/* headlight */}
      <mesh position={[1.22, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.06, 20]} /><meshToonMaterial color={CREAM} emissive="#ffd" emissiveIntensity={0.4} /></mesh>
      {/* taillights */}
      <mesh position={[-1.16, 0.55, 0.5]}><boxGeometry args={[0.04, 0.12, 0.2]} />{mat(PINK)}</mesh>
      <mesh position={[-1.16, 0.55, -0.5]}><boxGeometry args={[0.04, 0.12, 0.2]} />{mat(PINK)}</mesh>
      {/* handlebar */}
      <mesh position={[0.55, 1.0, 0]}><boxGeometry args={[0.05, 0.05, 0.7]} />{mat(INK)}</mesh>
      {/* driver: torso + head, faces +x */}
      <group position={[0.2, 0, 0]}>
        <mesh position={[0, 1.02, 0]}><boxGeometry args={[0.3, 0.55, 0.42]} /><meshToonMaterial color={TEAL} /><Outlines thickness={0.015} color={INK} /></mesh>
        <mesh position={[0, 1.45, 0]}><sphereGeometry args={[0.16, 20, 16]} /><meshToonMaterial color="#c68642" /><Outlines thickness={0.015} color={INK} /></mesh>
        {/* tee front */}
        <SlotFace slot={slots.tee} w={0.3} h={0.34} position={[0.16, 1.04, 0]} rotation={[0, Math.PI / 2, 0]} title="TEE" sub="driver" onPick={onPick} occlude />
        <SlotLabel slot={slots.tee} title="DRIVER TEE" onPick={onPick} position={[0.3, 1.05, 1.0]} />
      </group>
      {/* garland on rear */}
      <mesh position={[-1.17, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.035, 8, 24, Math.PI]} /><meshToonMaterial color="#f5a524" /></mesh>
      {/* hood slot: rear of canopy */}
      <SlotFace slot={slots.hood} w={1.2} h={0.66} position={[-1.16, 1.44, 0]} rotation={[0, -Math.PI / 2, 0]} title="YOUR LOGO" sub="hood · 8–9 sq ft" onPick={onPick} />
      {/* back panel slot: rear of cabin */}
      <SlotFace slot={slots.back} w={1.0} h={0.36} position={[-1.16, 0.78, 0]} rotation={[0, -Math.PI / 2, 0]} title="BACK PANEL" sub="3–4 sq ft" onPick={onPick} />
      {/* plate */}
      <Html position={[-1.2, 0.42, 0]} center transform rotation={[0, -Math.PI / 2, 0]} scale={0.25} style={{ pointerEvents: "none" }}>
        <div className="font-display text-ink bg-cream border-2 border-ink px-2 rounded text-[10px]">HORN OK PLEASE</div>
      </Html>
      <Wheel position={[1.0, 0.3, 0]} />
      <Wheel position={[-0.7, 0.3, 0.62]} />
      <Wheel position={[-0.7, 0.3, -0.62]} />
    </group>
  );
}

/**
 * Real model (public/models/auto.glb, fetched via scripts/fetch-model.mjs). The mesh is normalized so the
 * auto is LENGTH long, sits on y=0, faces +x. Slot faces are placed in fractions of the normalized bbox;
 * tune these after running scripts/inspect-model.mjs for a new model.
 */
export const MODEL_CFG = {
  url: "/models/auto.glb",
  yaw: Math.PI / 2,       // raw model nose points +z; rotate so it points +x
  length: 2.6,
  hood: { y: 0.70, w: 0.34, h: 0.21, xInset: 0.01 },   // rear face, fractions of H (y) and L (w) / H (h)
  back: { y: 0.33, w: 0.30, h: 0.11, xInset: 0.01 },
  tee:  { x: 0.18, y: 0.55, z: 0, w: 0.12, h: 0.14 },   // fractions of L (x), H (y), W (z)
};

function GlbRickshaw({ slots, onPick, name }: { slots: AutoSlots; onPick: (s: SlotState) => void; name?: string }) {
  const { scene } = useGLTF(MODEL_CFG.url);
  const { obj, L, H, W } = useMemo(() => {
    const obj = scene.clone(true);
    obj.rotation.y = MODEL_CFG.yaw;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const k = MODEL_CFG.length / Math.max(size.x, 1e-3);
    obj.scale.setScalar(k);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3(); box2.getCenter(c);
    obj.position.set(-c.x, -box2.min.y, -c.z);
    obj.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return { obj, L: size.x * k, H: size.y * k, W: size.z * k };
  }, [scene]);
  const rearX = -L / 2;
  return (
    <group>
      <primitive object={obj} />
      {name && (
        <Html position={[0, H + 0.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="sticker whitespace-nowrap bg-pink text-cream px-3 py-0.5 rounded text-sm border-2 border-ink shadow-[3px_3px_0_#0f1133]">{name}</div>
        </Html>
      )}
      <SlotFace slot={slots.hood} w={L * MODEL_CFG.hood.w} h={H * MODEL_CFG.hood.h}
        position={[rearX - MODEL_CFG.hood.xInset, H * MODEL_CFG.hood.y, 0]} rotation={[0, -Math.PI / 2, 0]}
        title="YOUR LOGO" sub="hood · 8–9 sq ft" onPick={onPick} />
      <SlotFace slot={slots.back} w={L * MODEL_CFG.back.w} h={H * MODEL_CFG.back.h}
        position={[rearX - MODEL_CFG.back.xInset, H * MODEL_CFG.back.y, 0]} rotation={[0, -Math.PI / 2, 0]}
        title="BACK PANEL" sub="3–4 sq ft" onPick={onPick} />
      <SlotFace slot={slots.tee} w={L * MODEL_CFG.tee.w} h={H * MODEL_CFG.tee.h}
        position={[L * MODEL_CFG.tee.x, H * MODEL_CFG.tee.y, W * MODEL_CFG.tee.z]} rotation={[0, Math.PI / 2, 0]}
        title="TEE" sub="driver" onPick={onPick} occlude />
      <SlotLabel slot={slots.tee} title="DRIVER TEE" onPick={onPick} position={[L * MODEL_CFG.tee.x, H * MODEL_CFG.tee.y, W * 0.75]} />
    </group>
  );
}

/** Uses the real GLB when present, falls back to the procedural auto if it is missing or fails to load. */
const HAS_MODEL = process.env.NEXT_PUBLIC_AUTO_MODEL === "1";
function AutoModel({ tint, slots, onPick, name }: { tint: string; slots: AutoSlots; onPick: (s: SlotState) => void; name?: string }) {
  if (!HAS_MODEL) return <Rickshaw tint={tint} slots={slots} onPick={onPick} />;
  return (
    <TexBoundary fallback={<Rickshaw tint={tint} slots={slots} onPick={onPick} />}>
      <Suspense fallback={null}>
        <GlbRickshaw slots={slots} onPick={onPick} name={name} />
      </Suspense>
    </TexBoundary>
  );
}

function debugCam(): [number, number, number] | null {
  if (typeof window === "undefined") return null;
  const c = new URLSearchParams(window.location.search).get("cam");
  const d = 6;
  return c === "rear" ? [-d, 1.6, 0.01] : c === "front" ? [d, 1.6, 0.01] : c === "side" ? [0.01, 1.6, d] : c === "top" ? [0.01, d + 1, 0.01] : null;
}

function Turntable({ children, speed = 0.15 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  const frozen = !!debugCam();
  useFrame((_, dt) => { if (ref.current && !frozen) ref.current.rotation.y += dt * speed; });
  return <group ref={ref}>{children}</group>;
}

export function Auto3D({ autos, onPick, className }: { autos: { id: string; name?: string; tint: string; slots: AutoSlots }[]; onPick: (s: SlotState) => void; className?: string }) {
  const gap = 3.4;
  const dbg = debugCam();
  return (
    <div className={className ?? "w-full h-[420px] sm:h-[520px]"}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: dbg ?? [-7.4, 2.6, 2.0], fov: 36 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 7, 3]} intensity={1.4} castShadow />
        <directionalLight position={[-5, 3, -3]} intensity={0.5} color="#e63e8b" />
        <Turntable>
          {autos.map((a, i) => (
            <group key={a.id} position={[0, 0, (i - (autos.length - 1) / 2) * gap]} rotation={[0, dbg ? 0 : 0.25, 0]}>
              <AutoModel tint={a.tint} slots={a.slots} onPick={onPick} name={a.name} />
            </group>
          ))}
        </Turntable>
        <ContactShadows position={[0, 0.02, 0]} opacity={0.6} scale={12} blur={2.2} far={3} color="#000" />
        <OrbitControls target={[0, 1.0, 0]} enablePan={false} minDistance={4} maxDistance={11} minPolarAngle={0.6} maxPolarAngle={1.5} />
      </Canvas>
    </div>
  );
}
