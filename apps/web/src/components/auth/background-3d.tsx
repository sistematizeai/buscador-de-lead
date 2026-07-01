"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ───────────────────────────────────────────────────────
   1.  WAVE PARTICLE FIELD  –  ondas de dados na parte inferior
   ─────────────────────────────────────────────────────── */
const WAVE_COLS = 120;
const WAVE_ROWS = 50;
const WAVE_TOTAL = WAVE_COLS * WAVE_ROWS;

function WaveField() {
  const ref = useRef<THREE.Points>(null);

  const { positions, basePositions } = useMemo(() => {
    const pos = new Float32Array(WAVE_TOTAL * 3);
    const base = new Float32Array(WAVE_TOTAL * 3);
    for (let row = 0; row < WAVE_ROWS; row++) {
      for (let col = 0; col < WAVE_COLS; col++) {
        const i = (row * WAVE_COLS + col) * 3;
        const x = (col / WAVE_COLS - 0.5) * 16;
        const z = (row / WAVE_ROWS) * 6 - 1;
        pos[i] = x;
        pos[i + 1] = 0;
        pos[i + 2] = z;
        base[i] = x;
        base[i + 1] = 0;
        base[i + 2] = z;
      }
    }
    return { positions: pos, basePositions: base };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const attr = ref.current?.geometry.attributes.position as THREE.BufferAttribute;
    if (!attr) return;
    const arr = attr.array as Float32Array;

    for (let row = 0; row < WAVE_ROWS; row++) {
      for (let col = 0; col < WAVE_COLS; col++) {
        const i = (row * WAVE_COLS + col) * 3;
        const bx = basePositions[i];
        const bz = basePositions[i + 2];
        // Ondas senoidais duplas com fase temporal
        arr[i + 1] =
          Math.sin(bx * 1.2 + t * 0.8) * 0.35 +
          Math.sin(bz * 2.0 + t * 1.1) * 0.25 +
          Math.cos(bx * 0.7 + bz * 1.5 + t * 0.6) * 0.15;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} position={[0, -2.8, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={WAVE_TOTAL} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#38bdf8" size={0.035} sizeAttenuation transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ───────────────────────────────────────────────────────
   2.  CONSTELLATION NETWORK  –  nós e conexões flutuantes
   ─────────────────────────────────────────────────────── */
const NODE_COUNT = 55;
const LINK_DIST = 2.5;

function NetworkNodes() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, velocities, data } = useMemo(() => {
    const pos = new Float32Array(NODE_COUNT * 3);
    const vel = new Float32Array(NODE_COUNT * 3);
    const d: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 5 + 1;
      const z = (Math.random() - 0.5) * 4 - 2;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      d.push({ x, y, z });
    }
    return { positions: pos, velocities: vel, data: d };
  }, []);

  useFrame(() => {
    const pAttr = pointsRef.current?.geometry.attributes.position as THREE.BufferAttribute;
    const lGeo = linesRef.current?.geometry;
    if (!pAttr || !lGeo) return;
    const arr = pAttr.array as Float32Array;

    for (let i = 0; i < NODE_COUNT; i++) {
      const idx = i * 3;
      arr[idx] += velocities[idx];
      arr[idx + 1] += velocities[idx + 1];
      arr[idx + 2] += velocities[idx + 2];
      if (Math.abs(arr[idx]) > 7.5) velocities[idx] *= -1;
      if (arr[idx + 1] > 4 || arr[idx + 1] < -1.5) velocities[idx + 1] *= -1;
      if (Math.abs(arr[idx + 2]) > 3) velocities[idx + 2] *= -1;
      data[i].x = arr[idx];
      data[i].y = arr[idx + 1];
      data[i].z = arr[idx + 2];
    }
    pAttr.needsUpdate = true;

    const lp: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = data[i].x - data[j].x;
        const dy = data[i].y - data[j].y;
        const dz = data[i].z - data[j].z;
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          lp.push(data[i].x, data[i].y, data[i].z, data[j].x, data[j].y, data[j].z);
        }
      }
    }
    lGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    lGeo.computeBoundingSphere();
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={NODE_COUNT} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#60a5fa" size={0.12} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#1d4ed8" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </>
  );
}

/* ───────────────────────────────────────────────────────
   3.  DATA ARCS  –  arcos parabólicos de conexão global
   ─────────────────────────────────────────────────────── */
function DataArcs() {
  const groupRef = useRef<THREE.Group>(null);

  const arcs = useMemo(() => {
    const arcData: { curve: THREE.CatmullRomCurve3; color: string }[] = [];
    const pairs: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(-5, 0.5, -1), new THREE.Vector3(2, 0.5, -2)],
      [new THREE.Vector3(-3, 1.5, -1), new THREE.Vector3(5, 1.0, -1.5)],
      [new THREE.Vector3(-6, -0.5, 0), new THREE.Vector3(0, 2.0, -2)],
      [new THREE.Vector3(1, 2.5, -1.5), new THREE.Vector3(6, 0, -1)],
      [new THREE.Vector3(-4, 2, -2), new THREE.Vector3(4, 2.5, -2.5)],
    ];
    pairs.forEach(([a, b]) => {
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      mid.y += 1.5 + Math.random() * 1.5;
      mid.z -= 1;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      arcData.push({ curve, color: "#3b82f6" });
    });
    return arcData;
  }, []);

  return (
    <group ref={groupRef}>
      {arcs.map((arc, i) => {
        const pts = arc.curve.getPoints(60);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial color={arc.color} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
          </line>
        );
      })}
    </group>
  );
}

/* ───────────────────────────────────────────────────────
   4.  HUD RINGS  –  radares holográficos giratórios
   ─────────────────────────────────────────────────────── */
function HudRing({
  position,
  scale,
  speed,
  color,
}: {
  position: [number, number, number];
  scale: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed;
    }
  });

  const segGeo = useMemo(() => {
    const shape = new THREE.RingGeometry(0.9, 1.0, 64, 1, 0, Math.PI * 1.5);
    return shape;
  }, []);

  const innerGeo = useMemo(() => new THREE.RingGeometry(0.55, 0.62, 48, 1, 0.3, Math.PI * 1.2), []);
  const dotGeo = useMemo(() => new THREE.RingGeometry(0.35, 0.38, 32, 1, 0.8, Math.PI * 0.8), []);

  return (
    <group position={position} scale={scale}>
      <group ref={ref}>
        <mesh rotation={[0, 0, 0]}>
          <primitive object={segGeo} attach="geometry" />
          <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI * 0.5]}>
          <primitive object={innerGeo} attach="geometry" />
          <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI * 0.3]}>
          <primitive object={dotGeo} attach="geometry" />
          <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────────────────────────────────────────────────
   5.  BRIGHT GLOW NODES  –  pontos de brilho intenso
   ─────────────────────────────────────────────────────── */
function GlowNodes() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 12;
    const pos = new Float32Array(count * 3);
    const coords = [
      [-5, 0.5, -1], [2, 0.5, -2], [-3, 1.5, -1], [5, 1.0, -1.5],
      [-6, -0.5, 0], [0, 2.0, -2], [1, 2.5, -1.5], [6, 0, -1],
      [-4, 2, -2], [4, 2.5, -2.5], [-2, -1, 0], [3, -0.5, -0.5],
    ];
    coords.forEach((c, i) => {
      pos[i * 3] = c[0];
      pos[i * 3 + 1] = c[1];
      pos[i * 3 + 2] = c[2];
    });
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.PointsMaterial;
      mat.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 2.0) * 0.3;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={12} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.25} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ───────────────────────────────────────────────────────
   SCENE  –  composição de todos os elementos
   ─────────────────────────────────────────────────────── */
function Scene() {
  return (
    <>
      <WaveField />
      <NetworkNodes />
      <DataArcs />
      <GlowNodes />

      {/* HUD Radares Holográficos */}
      <HudRing position={[-6.2, -1.8, 0]} scale={1.6} speed={0.3} color="#3b82f6" />
      <HudRing position={[-6.2, -1.8, 0]} scale={1.2} speed={-0.5} color="#60a5fa" />
      <HudRing position={[6.5, 1.5, -1]} scale={1.3} speed={-0.25} color="#2563eb" />
      <HudRing position={[6.5, 1.5, -1]} scale={0.9} speed={0.4} color="#38bdf8" />
    </>
  );
}

/* ───────────────────────────────────────────────────────
   EXPORT  –  container de background com Canvas
   ─────────────────────────────────────────────────────── */
export default function Background3D() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none">
      {/* Gradiente de fundo azul profundo idêntico à referência */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#041230] via-[#0a2463] to-[#0d47a1]" />

      {/* Brilho central suave (radial glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,_rgba(30,100,220,0.25)_0%,_transparent_65%)]" />

      {/* Canvas 3D */}
      <Canvas
        camera={{ position: [0, 0.5, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
