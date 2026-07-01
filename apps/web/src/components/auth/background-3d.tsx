"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function FloatingShape({
  geometry,
  color,
  position,
  scale = 1,
  rotation = [0, 0, 0],
  distort = 0,
  speed = 1.5,
  floatSpeed = 1.5,
  floatIntensity = 1,
  roughness = 0.2,
  metalness = 0.6,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  position: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  distort?: number;
  speed?: number;
  floatSpeed?: number;
  floatIntensity?: number;
  roughness?: number;
  metalness?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={1.2}
      floatIntensity={floatIntensity}
      floatingRange={[-0.4, 0.4]}
    >
      <mesh
        ref={meshRef}
        position={position}
        scale={scale}
        rotation={rotation}
        castShadow
        receiveShadow
      >
        <primitive object={geometry} attach="geometry" />
        {distort > 0 ? (
          <MeshDistortMaterial
            color={color}
            speed={speed}
            distort={distort}
            roughness={roughness}
            metalness={metalness}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        ) : (
          <meshPhysicalMaterial
            color={color}
            roughness={roughness}
            metalness={metalness}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
            reflectivity={0.9}
          />
        )}
      </mesh>
    </Float>
  );
}

function Scene() {
  // Geometrias nativas do Three.js criadas uma única vez
  const geometries = React.useMemo(() => {
    return {
      largeTorusKnot: new THREE.TorusKnotGeometry(1.2, 0.35, 200, 32, 3, 5),
      floatingTorus: new THREE.TorusGeometry(1.4, 0.35, 32, 100),
      organicSphere: new THREE.SphereGeometry(1.1, 64, 64),
      floatingRing: new THREE.RingGeometry(0.8, 1.2, 32),
      coneShape: new THREE.ConeGeometry(0.8, 1.5, 32),
    };
  }, []);

  return (
    <>
      {/* Luzes profissionais para dar volume 3D real */}
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[8, 8, 8]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-8, 8, -8]} intensity={1.0} color="#3388ff" />
      <pointLight position={[0, -5, 5]} intensity={1.5} color="#00ffff" />

      {/* 1. Curva espiral 3D (TorusKnot) no canto superior direito */}
      <FloatingShape
        geometry={geometries.largeTorusKnot}
        color="#3b82f6"
        position={[4, 2.5, -2]}
        scale={1.2}
        rotation={[0.5, 0.8, 0.2]}
        floatSpeed={1.8}
        floatIntensity={1.2}
        roughness={0.1}
        metalness={0.8}
      />

      {/* 2. Curva aberta / ferradura (Torus) no canto inferior esquerdo */}
      <FloatingShape
        geometry={geometries.floatingTorus}
        color="#60a5fa"
        position={[-4.5, -2.5, -1]}
        scale={1.1}
        rotation={[1.2, 0.5, -0.4]}
        floatSpeed={1.4}
        floatIntensity={1.0}
        roughness={0.15}
        metalness={0.7}
      />

      {/* 3. Forma orgânica distorcida e flutuante no centro-esquerda */}
      <FloatingShape
        geometry={geometries.organicSphere}
        color="#2563eb"
        position={[-3.8, 1.8, -3]}
        scale={1.0}
        distort={0.4}
        speed={1.6}
        floatSpeed={2.0}
        floatIntensity={1.5}
        roughness={0.1}
        metalness={0.5}
      />

      {/* 4. Forma de cone metálico no centro-direita */}
      <FloatingShape
        geometry={geometries.coneShape}
        color="#93c5fd"
        position={[3.8, -2.0, -2.5]}
        scale={0.9}
        rotation={[0.8, -0.4, 0.9]}
        floatSpeed={1.6}
        floatIntensity={1.1}
        roughness={0.2}
        metalness={0.9}
      />

      {/* 5. Pequeno anel flutuante decorativo no fundo */}
      <FloatingShape
        geometry={geometries.floatingRing}
        color="#1d4ed8"
        position={[1.5, 3.2, -4]}
        scale={0.7}
        rotation={[0.2, 0.2, 0.5]}
        floatSpeed={1.2}
        floatIntensity={0.8}
        roughness={0.3}
        metalness={0.6}
      />
    </>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none bg-[#004dc0]">
      {/* Gradiente de fundo super profundo e bonito */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00388b] via-[#0052d4] to-[#4364f7] opacity-95" />

      {/* Canvas do React Three Fiber para renderizar a cena WebGL */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
