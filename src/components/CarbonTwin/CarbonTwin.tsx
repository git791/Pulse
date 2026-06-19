import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Trajectory, TrajectoryPoint } from '../../engine/types';

export interface CarbonTwinProps {
  baseline: Trajectory;
  hypothetical?: Trajectory | null;
  className?: string;
}

interface Branch3D {
  key: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  depth: number;
  hue: number;
  group: 'shared' | 'baseline' | 'hypothetical';
}

const BASE_MAX_DEPTH = 8;
const LENGTH_DECAY = 0.78;
const RADIUS_DECAY = 0.72;

function computePulseSpeed(rateOfChange: number): number {
  const base = 1.0;
  const sensitivity = 0.003; 
  const raw = base + rateOfChange * sensitivity;
  return Math.max(0.4, Math.min(3.0, raw));
}

function rateToHue(rateKgPerMonth: number): number {
  return Math.max(0, Math.min(180, 180 - (rateKgPerMonth / 800) * 180));
}

function hueToColor(hue: number): string {
  return `hsl(${hue}, 80%, 55%)`;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function computeBranchProps(points: TrajectoryPoint[]) {
  if (points.length < 2) return { angle: 0.45, count: 2, maxDepth: BASE_MAX_DEPTH };
  const first = points[0];
  const last = points[points.length - 1];
  const slope = Math.abs(last.rateKgPerMonth - first.rateKgPerMonth) / points.length;
  
  const count = slope < 2 ? 3 : 2;
  const maxDepth = count === 3 ? 5 : BASE_MAX_DEPTH; // dynamically cap depth
  return {
    angle: Math.max(0.2, Math.min(0.6, 0.3 + slope * 0.002)),
    count,
    maxDepth
  };
}

interface GenerateOpts {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  radius: number;
  depth: number;
  maxDepth: number;
  hue: number;
  branchAngle: number;
  branchCount: number;
  group: 'shared' | 'baseline' | 'hypothetical';
  random: () => number;
  branches: Branch3D[];
}

function generateBranches3D(opts: GenerateOpts) {
  const { pos, dir, length, radius, depth, maxDepth, hue, branchAngle, branchCount, group, random, branches } = opts;
  if (depth > maxDepth) return;

  const end = pos.clone().add(dir.clone().multiplyScalar(length));
  
  // Add natural jitter
  end.x += (random() - 0.5) * length * 0.2;
  end.y += (random() - 0.5) * length * 0.2;
  end.z += (random() - 0.5) * length * 0.2;

  branches.push({
    key: `${group}-${depth}-${branches.length}`,
    start: pos,
    end,
    radius,
    depth,
    hue,
    group
  });

  const nextLength = length * LENGTH_DECAY;
  const nextRadius = Math.max(0.05, radius * RADIUS_DECAY);

  // Generate orthonormal basis for rotation
  const up = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();

  for (let i = 0; i < branchCount; i++) {
    const angleOffset = (i / Math.max(1, branchCount - 1) - 0.5) * 2 * branchAngle;
    // Rotate around right vector (pitch) and a random roll
    const roll = random() * Math.PI * 2;
    
    const newDir = dir.clone()
      .applyAxisAngle(right, angleOffset + (random()-0.5)*0.2)
      .applyAxisAngle(dir, roll)
      .normalize();

    generateBranches3D({
      ...opts,
      pos: end,
      dir: newDir,
      length: nextLength,
      radius: nextRadius,
      depth: depth + 1
    });
  }
}

function buildOrganism3D(baseline: Trajectory, hypothetical?: Trajectory | null) {
  const branches: Branch3D[] = [];
  const currentRate = baseline.points[baseline.points.length - 1]?.rateKgPerMonth ?? 400;
  const baselineHue = rateToHue(currentRate);
  
  const { angle, count, maxDepth: blMaxDepth } = computeBranchProps(baseline.points);
  const random = seededRandom(42);

  const hasHypo = hypothetical && hypothetical.points.length > 0;
  const hypoRate = hypothetical?.points[hypothetical.points.length - 1]?.rateKgPerMonth ?? currentRate;
  const hypoHue = rateToHue(hypoRate);

  if (hasHypo) {
    const sharedDepth = 2;
    generateBranches3D({
      pos: new THREE.Vector3(0, -3, 0),
      dir: new THREE.Vector3(0, 1, 0),
      length: 1.5,
      radius: 0.2,
      depth: 0,
      maxDepth: sharedDepth,
      hue: baselineHue,
      branchAngle: angle,
      branchCount: count,
      group: 'shared',
      random,
      branches
    });

    const tips = branches.filter(b => b.depth === sharedDepth).map(b => b.end);
    const { angle: hAngle, count: hCount, maxDepth: hMaxDepth } = computeBranchProps(hypothetical!.points);

    tips.forEach(tip => {
      // Baseline fork (leans slightly left/back)
      const blDir = new THREE.Vector3(-0.2, 1, -0.1).normalize();
      generateBranches3D({
        pos: tip, dir: blDir, length: 1.5 * Math.pow(LENGTH_DECAY, sharedDepth),
        radius: 0.2 * Math.pow(RADIUS_DECAY, sharedDepth), depth: sharedDepth + 1,
        maxDepth: blMaxDepth, hue: baselineHue, branchAngle: angle, branchCount: count,
        group: 'baseline', random: seededRandom(137), branches
      });

      // Hypo fork (leans slightly right/front)
      const hDir = new THREE.Vector3(0.2, 1, 0.1).normalize();
      generateBranches3D({
        pos: tip, dir: hDir, length: 1.5 * Math.pow(LENGTH_DECAY, sharedDepth),
        radius: 0.2 * Math.pow(RADIUS_DECAY, sharedDepth), depth: sharedDepth + 1,
        maxDepth: hMaxDepth, hue: hypoHue, branchAngle: hAngle, branchCount: hCount,
        group: 'hypothetical', random: seededRandom(251), branches
      });
    });
  } else {
    generateBranches3D({
      pos: new THREE.Vector3(0, -3, 0),
      dir: new THREE.Vector3(0, 1, 0),
      length: 1.5,
      radius: 0.2,
      depth: 0,
      maxDepth: blMaxDepth,
      hue: baselineHue,
      branchAngle: angle,
      branchCount: count,
      group: 'baseline',
      random,
      branches
    });
  }

  return { branches, baselineHue, hypoHue };
}

// ─── Render Components ───

const BranchLine = memo(({ branch, isHypo }: { branch: Branch3D, isHypo: boolean }) => {
  const points = useMemo(() => [branch.start, branch.end], [branch]);
  const color = hueToColor(branch.hue);
  
  return (
    <Line 
      points={points}
      color={new THREE.Color(color)}
      lineWidth={Math.max(1, branch.radius * 20)}
      transparent
      opacity={isHypo ? 0.8 : 0.9}
    />
  );
});

const TreeSystem = ({ baseline, hypothetical, rateOfChange }: any) => {
  const { branches } = useMemo(() => buildOrganism3D(baseline, hypothetical), [baseline, hypothetical]);
  const groupRef = useRef<THREE.Group>(null);
  
  // Track speed linearly in a ref to avoid React state triggers
  const smoothSpeedRef = useRef<number>(computePulseSpeed(rateOfChange));

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1; 
      
      // Compute breathe directly in WebGL loop (0 React re-renders)
      const targetSpeed = computePulseSpeed(rateOfChange);
      const currentSpeed = smoothSpeedRef.current;
      const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.02; // Smooth lerp
      smoothSpeedRef.current = newSpeed;

      const elapsed = state.clock.getElapsedTime();
      const phase = (elapsed * newSpeed * Math.PI * 2) / 4;
      const breatheScale = 1.0 + 0.02 * Math.sin(phase);

      const scale = 1 + (breatheScale - 1) * 0.5; // Smooth breathing in 3D
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef}>
      {branches.map(b => (
        <BranchLine key={b.key} branch={b} isHypo={b.group === 'hypothetical'} />
      ))}
    </group>
  );
};

const CarbonTwin = memo(function CarbonTwin({ baseline, hypothetical, className }: CarbonTwinProps) {
  const rateOfChange = useMemo(() => {
    const pts = baseline.points;
    if (pts.length < 2) return 0;
    return pts[pts.length - 1].rateKgPerMonth - pts[pts.length - 2].rateKgPerMonth;
  }, [baseline]);

  return (
    <div className={`relative w-full h-[500px] select-none ${className ?? ''}`} role="img">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 2]}>
        <Environment preset="forest" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
          <TreeSystem baseline={baseline} hypothetical={hypothetical} rateOfChange={rateOfChange} />
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI/2} />
      </Canvas>
    </div>
  );
});

export default CarbonTwin;
