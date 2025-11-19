import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Position } from '../types';
import { Octahedron, Torus, Sphere, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Constants
const CELL_SIZE = 1;
const BOARD_SIZE = 15;
const BOARD_OFFSET = (BOARD_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2;

interface GameBoardProps {
  size: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({ size }) => {
  const halfSize = size / 2;
  const borderThickness = 0.2;
  const offset = halfSize + borderThickness / 2;

  return (
    <group position={[0, -0.5, 0]}>
      {/* Playable Surface - Frosted Glass / White Ceramic */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshPhysicalMaterial 
          color="#f8fafc" 
          roughness={0.1} 
          metalness={0.1} 
          transmission={0.2}
          thickness={1}
        />
      </mesh>

      {/* Grid Helper - Subtle Blue */}
      <gridHelper 
        args={[size, size, 0x3b82f6, 0xcbd5e1]} 
        position={[0, 0.01, 0]} 
      />

      {/* Glowing Blue Borders (WPP Blue) */}
      <group position={[0, 0.15, 0]}>
        {/* Top Border */}
        <mesh position={[0, 0, -offset]} receiveShadow castShadow>
           <boxGeometry args={[size + borderThickness * 2, 0.3, borderThickness]} />
           <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
        </mesh>
        {/* Bottom Border */}
        <mesh position={[0, 0, offset]} receiveShadow castShadow>
           <boxGeometry args={[size + borderThickness * 2, 0.3, borderThickness]} />
           <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
        </mesh>
        {/* Left Border */}
        <mesh position={[-offset, 0, 0]} receiveShadow castShadow>
           <boxGeometry args={[borderThickness, 0.3, size]} />
           <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
        </mesh>
        {/* Right Border */}
        <mesh position={[offset, 0, 0]} receiveShadow castShadow>
           <boxGeometry args={[borderThickness, 0.3, size]} />
           <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Ambient Environment Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#eff6ff" />
      </mesh>
    </group>
  );
};

interface SnakeProps {
  segments: Position[];
}

export const SnakeRenderer: React.FC<SnakeProps> = ({ segments }) => {
  return (
    <group>
      {segments.map((pos, i) => {
        const x = pos.x * CELL_SIZE - BOARD_OFFSET;
        const z = pos.y * CELL_SIZE - BOARD_OFFSET;
        const isHead = i === 0;

        if (isHead) {
          // Calculate rotation
          let rotationY = 0;
          if (segments.length > 1) {
            const dx = pos.x - segments[1].x;
            const dy = pos.y - segments[1].y;
            rotationY = Math.atan2(dx, dy);
          } else {
             rotationY = Math.PI; 
          }

          return (
            <group key={`head-${pos.x}-${pos.y}`} position={[x, 0.3, z]} rotation={[0, rotationY, 0]}>
              {/* Head - Rounded Blue Tech Capsule */}
              <RoundedBox args={[0.7, 0.5, 0.8]} radius={0.15} smoothness={4} castShadow>
                 <meshStandardMaterial color="#2563eb" roughness={0.1} metalness={0.2} />
              </RoundedBox>
              
              {/* Visor/Face - Dark Glossy */}
              <mesh position={[0, 0.05, 0.35]}>
                 <boxGeometry args={[0.6, 0.25, 0.15]} />
                 <meshStandardMaterial color="#0f172a" roughness={0} metalness={0.8} />
              </mesh>

              {/* WPP Cyan Eyes */}
              <group position={[0, 0.05, 0.43]}>
                 <mesh position={[0.15, 0, 0]}>
                    <sphereGeometry args={[0.06]} />
                    <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} toneMapped={false} />
                 </mesh>
                 <mesh position={[-0.15, 0, 0]}>
                    <sphereGeometry args={[0.06]} />
                    <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} toneMapped={false} />
                 </mesh>
              </group>
            </group>
          );
        } else {
          // Body - Connected Blue Spheres (Clean Medical/Tech Look)
          return (
            <group key={`${i}-${pos.x}-${pos.y}`} position={[x, 0.3, z]}>
              <Sphere args={[0.35, 16, 16]} castShadow>
                 <meshStandardMaterial color="#2563eb" roughness={0.2} metalness={0.1} />
              </Sphere>
              {/* Small connecting joint - White */}
              <mesh>
                <sphereGeometry args={[0.2]} />
                <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.2} />
              </mesh>
            </group>
          );
        }
      })}
    </group>
  );
};

interface FoodProps {
  position: Position;
}

export const FoodRenderer: React.FC<FoodProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.15 + 0.3;
      groupRef.current.rotation.y += 0.02;
    }
  });

  const x = position.x * CELL_SIZE - BOARD_OFFSET;
  const z = position.y * CELL_SIZE - BOARD_OFFSET;

  return (
    <group ref={groupRef} position={[x, 0, z]}>
       {/* WPP Brand Dot - Magenta/Pink Energy */}
       <Sphere ref={innerRef} args={[0.35, 32, 32]}>
          <meshStandardMaterial 
             color="#db2777" 
             emissive="#db2777" 
             emissiveIntensity={1.5} 
             toneMapped={false}
             roughness={0.2}
             metalness={0.8}
          />
       </Sphere>
       
       {/* Orbiting Ring */}
       <Torus args={[0.5, 0.03, 16, 32]} rotation={[Math.PI/2, 0, 0]}>
          <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
       </Torus>

       {/* Ground Glow */}
       <pointLight distance={2} intensity={2} color="#db2777" decay={2} />
    </group>
  );
};