"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 85;
const MAX_DISTANCE = 2.0;

function Constellation() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Inicializa posições, velocidades e conexões de rede
  const { positions, velocities, particleData } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const data = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Posiciona as partículas em uma caixa 3D flutuante
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 6;
      const z = (Math.random() - 0.5) * 5;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Velocidades de flutuação muito lentas e suaves
      vel[i * 3] = (Math.random() - 0.5) * 0.006;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.006;

      data.push({ x, y, z });
    }

    return { positions: pos, velocities: vel, particleData: data };
  }, []);

  useFrame((state) => {
    const pointsGeometry = pointsRef.current?.geometry;
    const linesGeometry = linesRef.current?.geometry;

    if (!pointsGeometry || !linesGeometry) return;

    const positionsAttr = pointsGeometry.attributes.position as THREE.BufferAttribute;
    const currentPositions = positionsAttr.array as Float32Array;

    // 1. Atualiza as posições das partículas e rebate nos limites
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;

      // Adiciona velocidade
      currentPositions[idx] += velocities[idx];
      currentPositions[idx + 1] += velocities[idx + 1];
      currentPositions[idx + 2] += velocities[idx + 2];

      // Limites X
      if (currentPositions[idx] > 5.5 || currentPositions[idx] < -5.5) {
        velocities[idx] = -velocities[idx];
      }
      // Limites Y
      if (currentPositions[idx + 1] > 3.5 || currentPositions[idx + 1] < -3.5) {
        velocities[idx + 1] = -velocities[idx + 1];
      }
      // Limites Z
      if (currentPositions[idx + 2] > 2.5 || currentPositions[idx + 2] < -2.5) {
        velocities[idx + 2] = -velocities[idx + 2];
      }

      particleData[i].x = currentPositions[idx];
      particleData[i].y = currentPositions[idx + 1];
      particleData[i].z = currentPositions[idx + 2];
    }

    positionsAttr.needsUpdate = true;

    // 2. Calcula conexões da teia de rede
    const linePositions = [];
    const lineColors = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p1 = particleData[i];

      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const p2 = particleData[j];

        // Distância Euclidiana entre as partículas
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Se estiver próximo, cria uma linha (conexão de teia)
        if (dist < MAX_DISTANCE) {
          // Pontos de início e fim da linha
          linePositions.push(p1.x, p1.y, p1.z);
          linePositions.push(p2.x, p2.y, p2.z);

          // Cor baseada na distância para efeito de transição suave (fade-out)
          const alpha = 1.0 - dist / MAX_DISTANCE;
          // Tons elétricos: azul brilhante a ciano
          const r = 0.0 + alpha * 0.2; // sutil avermelhado no ciano
          const g = 0.4 + alpha * 0.6; // verde elétrico no ciano
          const b = 0.8 + alpha * 0.2; // azul profundo

          lineColors.push(r, g, b, alpha * 0.35); // Vértice 1
          lineColors.push(r, g, b, alpha * 0.35); // Vértice 2
        }
      }
    }

    // 3. Atualiza os buffers da teia de linhas
    linesGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3)
    );
    linesGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(lineColors, 4)
    );

    linesGeometry.computeBoundingSphere();
    linesGeometry.computeBoundingBox();

    // 4. Rotação suave da câmera em órbita para dar profundidade 3D incrível
    const time = state.clock.getElapsedTime() * 0.05;
    state.camera.position.x = Math.sin(time) * 6.5;
    state.camera.position.z = Math.cos(time) * 6.5;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Sistema de Nós (Points) */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#38bdf8"
          size={0.08}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Sistema de Teia (LineSegments) */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial
          vertexColors={true}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1}
        />
      </lineSegments>
    </>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none bg-[#030712]">
      {/* Gradiente de fundo super escuro e futurista */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#090d1f] to-[#0f172a] opacity-98" />

      {/* Luzes ambiente */}
      <ambientLight intensity={1.0} />

      {/* Canvas do React Three Fiber */}
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Constellation />
      </Canvas>
    </div>
  );
}
