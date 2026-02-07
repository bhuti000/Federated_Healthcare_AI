import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- Organic Skin Texture (Multi-Layered Dermis) ---
const getSkinTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Higher res for pores
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Base skin glow (Warm/Realistic)
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 220, 200, 1)'); // Surface Peach
    gradient.addColorStop(0.4, 'rgba(255, 160, 140, 0.7)'); // Mid-dermis Rose
    gradient.addColorStop(0.8, 'rgba(200, 100, 100, 0.3)'); // Deep vascular
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Add micro-pores/noise
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const r = Math.random() * 2;
        ctx.fillStyle = 'rgba(100, 50, 50, 0.15)'; // Darker pores
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
};

const getLaserTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(0, 200, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(0, 50, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

function noise3D(x, y, z) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
}

function fbm(x, y, z, octaves = 5) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

function SkinSurface({ mouse, analyzing, result }) {
    const surfaceRef = useRef();
    const laserRef = useRef();
    const groupRef = useRef(); // Added group ref
    const skinTexture = useMemo(() => getSkinTexture(), []);
    const laserTexture = useMemo(() => getLaserTexture(), []);

    const count = 8000; // Optimized for performance (was 18000)
    const laserCount = 50;

    const { positions, colors, originals, particleSpeeds } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const orig = new Float32Array(count * 3);
        const speeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const u = Math.random() * 2 - 1;
            const v = Math.random() * 2.8 - 1.4;

            let x = u * 3.0;
            let y = v * 4.0;
            let z = (Math.cos(u * 0.7) * 2.0) - 1.0;

            // Micro-folds/Skin texture displacement
            const nScale = 0.6;
            const disp = fbm(x * nScale, y * nScale, z * nScale, 6) * 0.35;
            z += disp;

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            orig[i * 3] = x;
            orig[i * 3 + 1] = y;
            orig[i * 3 + 2] = z;

            speeds[i] = 0.02 + Math.random() * 0.04;

            // Base skin color
            const noiseCol = fbm(x * 3, y * 3, z * 3, 3) * 0.08;
            const r = 0.92 + noiseCol;
            const g = 0.75 + noiseCol;
            const b = 0.65 + noiseCol;

            const shadow = Math.abs(disp) * 1.5;
            col[i * 3] = r - shadow * 0.15;
            col[i * 3 + 1] = g - shadow * 0.25;
            col[i * 3 + 2] = b - shadow * 0.25;
        }
        return { positions: pos, colors: col, originals: orig, particleSpeeds: speeds };
    }, []);

    const laserPositions = useMemo(() => new Float32Array(laserCount * 3), []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const targetX = mouse.current.x * 4.0;
        const targetY = mouse.current.y * 3.0;

        const scanSpeed = analyzing ? 4.0 : 1.5; // Faster active scan
        const scanY = Math.sin(time * scanSpeed) * 3.0;
        const intro = Math.min(time * 0.4, 1.0);

        if (surfaceRef.current) {
            const p = surfaceRef.current.geometry.attributes.position.array;
            const c = surfaceRef.current.geometry.attributes.color.array;

            for (let i = 0; i < count; i++) {
                const ox = originals[i * 3];
                const oy = originals[i * 3 + 1];
                const oz = originals[i * 3 + 2];

                const destX = ox * intro + targetX;
                const destY = (oy + Math.sin(time * 0.3) * 0.1) * intro + targetY;
                const destZ = oz * intro;

                p[i * 3] += (destX - p[i * 3]) * particleSpeeds[i];
                p[i * 3 + 1] += (destY - p[i * 3 + 1]) * particleSpeeds[i];
                p[i * 3 + 2] += (destZ - p[i * 3 + 2]) * particleSpeeds[i];

                // Scanner lighting (Cyber-Pulse)
                const dist = Math.abs(p[i * 3 + 1] - scanY - targetY);
                if (dist < 0.3) {
                    // Active Scan Line Effect
                    const intensity = 1.0 - (dist / 0.3);
                    c[i * 3] += 0.2 * intensity; // Red push
                    c[i * 3 + 1] += 0.5 * intensity; // Green boost (Cyan/White)
                    c[i * 3 + 2] += 0.8 * intensity; // Blue boost

                    // Slight Z-pop on scan
                    p[i * 3 + 2] += 0.05 * intensity;
                } else {
                    c[i * 3] += (colors[i * 3] - c[i * 3]) * 0.1;
                    c[i * 3 + 1] += (colors[i * 3 + 1] - c[i * 3 + 1]) * 0.1;
                    c[i * 3 + 2] += (colors[i * 3 + 2] - c[i * 3 + 2]) * 0.1;
                }

                if (analyzing) {
                    c[i * 3] += Math.sin(time * 15 + i) * 0.08;
                    c[i * 3 + 1] += 0.1;
                    c[i * 3 + 2] += 0.2;
                }

                if (result) {
                    const isBad = /tumor|malignant|cancer/i.test(result);
                    if (isBad) {
                        c[i * 3] += 0.2; // Red tint
                        c[i * 3 + 1] -= 0.1;
                        c[i * 3 + 2] -= 0.1;
                    }
                }
            }
            surfaceRef.current.geometry.attributes.position.needsUpdate = true;
            surfaceRef.current.geometry.attributes.color.needsUpdate = true;
        }

        if (laserRef.current) {
            const lp = laserRef.current.geometry.attributes.position.array;
            for (let i = 0; i < laserCount; i++) {
                lp[i * 3] = (Math.random() - 0.5) * 6 + targetX;
                lp[i * 3 + 1] = scanY + targetY + (Math.random() - 0.5) * 0.1;
                lp[i * 3 + 2] = 1.0;
            }
            laserRef.current.geometry.attributes.position.needsUpdate = true;
        }

        if (groupRef.current) {
            const targetRotX = mouse.current.y * 0.3;
            const targetRotY = mouse.current.x * 0.3;
            groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.05;
            groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
        }
    });

    return (
        <group ref={groupRef}>
            <points ref={surfaceRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.06} map={skinTexture} vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
            </points>
            <points ref={laserRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={laserCount} array={laserPositions} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.18} map={laserTexture} transparent opacity={0.7} blending={THREE.AdditiveBlending} />
            </points>
        </group>
    );
}

function Scene({ mouse, analyzing, result }) {
    return (
        <React.Suspense fallback={null}>
            <SkinSurface mouse={mouse} analyzing={analyzing} result={result} />
            <ambientLight intensity={0.8} />
            <pointLight position={[10, 10, 10]} intensity={1.8} color="#ffe4d1" />
            <pointLight position={[-10, -10, -5]} intensity={0.8} color="#4d7cfe" />
        </React.Suspense>
    );
}

export default function Skin3D({ analyzing, result }) {
    const mouse = useRef({ x: 0, y: 0 });
    const containerRef = useRef();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 10], fov: 50 }} // Further camera for smaller view (was 7)
                style={{ background: 'transparent' }}
                gl={{ alpha: true, antialias: true }}
            >
                <Scene mouse={mouse} analyzing={analyzing} result={result} />
            </Canvas>
        </div>
    );
}
