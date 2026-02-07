import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- Soft Ethereal Particle Texture (Warm Glow for Lungs) ---
const getGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    // Warm Organic Glow: White -> Soft Pink/Peach -> Transparent
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 180, 150, 0.5)'); // Soft Peach/Pink
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
};

// --- High-Fidelity Chest (Bronchial Swarm) ---
function ChestStructure({ mouse, analyzing, result }) {
    const pointsRef = useRef();
    const coreRef = useRef();
    const signalsRef = useRef();
    const groupRef = useRef(); // Added group ref
    const particleTexture = useMemo(() => getGlowTexture(), []);

    const outerNodeCount = 12000; // Increased density
    const coreNodeCount = 5000;
    const signalCount = 80;

    // 1. Generate Bronchial Geometry (Two Lobes with Noise)
    const { nodes, colors, originalPositions, signalPaths, originalColors } = useMemo(() => {
        const positions = new Float32Array(outerNodeCount * 3);
        const colorArray = new Float32Array(outerNodeCount * 3);
        const originalPos = new Float32Array(outerNodeCount * 3);
        const allPaths = [];

        let pIdx = 0;
        const lobes = [
            { xOffset: -1.8, xScale: 1.0, yScale: 1.6, zScale: 1.0 }, // Left Lobe
            { xOffset: 1.8, xScale: 1.0, yScale: 1.6, zScale: 1.0 }   // Right Lobe
        ];

        lobes.forEach((lobe, lIdx) => {
            const numParticles = outerNodeCount / 2;
            for (let i = 0; i < numParticles; i++) {
                if (pIdx >= outerNodeCount) break;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const rBase = Math.cbrt(Math.random()) * 1.5;

                let x = rBase * Math.sin(phi) * Math.cos(theta);
                let y = rBase * Math.cos(phi);
                let z = rBase * Math.sin(phi) * Math.sin(theta);

                const freq = 4.0;
                const noise = Math.sin(x * freq) * Math.cos(y * freq) * Math.sin(z * freq);
                x *= lobe.xScale; y *= lobe.yScale; z *= lobe.zScale;
                x += noise * 0.1; y += noise * 0.1; z += noise * 0.1;

                if (lIdx === 0 && x > 0.2) x = 0.2 + (0.2 - x) * 0.5;
                if (lIdx === 1 && x < -0.2) x = -0.2 + (-0.2 - x) * 0.5;
                x += lobe.xOffset;
                if (y > 1.0) { x *= 0.85; z *= 0.85; }

                positions[pIdx * 3] = x;
                positions[pIdx * 3 + 1] = y;
                positions[pIdx * 3 + 2] = z;
                originalPos[pIdx * 3] = x;
                originalPos[pIdx * 3 + 1] = y;
                originalPos[pIdx * 3 + 2] = z;

                if (Math.random() > 0.99) {
                    const path = [];
                    for (let k = 0; k < 10; k++) path.push(new THREE.Vector3(x + (Math.random() - 0.5) * 0.2, y + (k / 5) - 1, z + (Math.random() - 0.5) * 0.2));
                    allPaths.push(path);
                }

                let rC = 0, gC = 0, bC = 0;
                if (y > 0.6 || Math.random() > 0.85) { rC = 1.0; gC = 0.95; bC = 0.8; }
                else if (y > -0.4) { rC = 1.0; gC = 0.4; bC = 0.5; }
                else { rC = 0.6; gC = 0.1; bC = 0.2; }

                colorArray[pIdx * 3] = rC;
                colorArray[pIdx * 3 + 1] = gC;
                colorArray[pIdx * 3 + 2] = bC;
                pIdx++;
            }
        });
        const origColors = new Float32Array(colorArray);
        return { nodes: positions, colors: colorArray, originalPositions: originalPos, signalPaths: allPaths, originalColors: origColors };
    }, []);

    // 2. Generate Dense Core (Dark Volume)
    const { coreNodes, coreColors, coreOriginals } = useMemo(() => {
        const nodes = new Float32Array(coreNodeCount * 3);
        const originalPos = new Float32Array(coreNodeCount * 3);
        const cols = new Float32Array(coreNodeCount * 3);
        const lobes = [{ xOffset: -1.8 }, { xOffset: 1.8 }];
        let pIdx = 0;
        lobes.forEach((lobe) => {
            for (let i = 0; i < coreNodeCount / 2; i++) {
                if (pIdx >= coreNodeCount) break;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = Math.pow(Math.random(), 0.5) * 1.0;
                let x = r * Math.sin(phi) * Math.cos(theta) + lobe.xOffset;
                let y = r * Math.cos(phi) * 1.4;
                let z = r * Math.sin(phi) * Math.sin(theta) * 0.8;
                nodes[pIdx * 3] = x; nodes[pIdx * 3 + 1] = y; nodes[pIdx * 3 + 2] = z;
                originalPos[pIdx * 3] = x; originalPos[pIdx * 3 + 1] = y; originalPos[pIdx * 3 + 2] = z;
                cols[pIdx * 3] = 0.2; cols[pIdx * 3 + 1] = 0.05; cols[pIdx * 3 + 2] = 0.1;
                pIdx++;
            }
        });
        return { coreNodes: nodes, coreColors: cols, coreOriginals: originalPos };
    }, []);

    const signalData = useMemo(() => {
        const data = [];
        for (let i = 0; i < signalCount; i++) {
            data.push({
                pathIndex: Math.floor(Math.random() * (signalPaths.length || 1)),
                progress: Math.random(),
                speed: 0.005 + Math.random() * 0.01
            });
        }
        return data;
    }, [signalPaths]);

    const signalPositions = useMemo(() => new Float32Array(signalCount * 3), []);
    const particleSpeeds = useMemo(() => {
        const count = outerNodeCount + coreNodeCount;
        const speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) speeds[i] = 0.02 + Math.random() * 0.05;
        return speeds;
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        let breathSpeed = 1.0;
        let breathAmp = 0.12; // Deeper breathing
        let signalBoost = 1.0;

        if (analyzing) {
            breathSpeed = 3.0; // Rapid shallow breathing
            breathAmp = 0.15;
            signalBoost = 4.0;
        } else if (result) {
            const isBad = /pneumonia|covid/i.test(result);
            if (isBad) {
                breathSpeed = 0.6; // Heavy breathing
                breathAmp = 0.12;
            }
        }

        let progress = Math.min(time * 0.5, 1.0);
        progress = 1 - Math.pow(1 - progress, 3);
        const introScale = progress;

        if (pointsRef.current && coreRef.current) {
            const outerPos = pointsRef.current.geometry.attributes.position.array;
            const outerCols = pointsRef.current.geometry.attributes.color.array;
            const corePos = coreRef.current.geometry.attributes.position.array;
            const targetX = mouse.current.x * 4.0; // Increased range
            const targetY = mouse.current.y * 2.5;
            const angle = time * 0.05;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const breath = (Math.sin(time * breathSpeed) + 1.0) * 0.5;
            const scaleBreath = 1.0 + (breath * breathAmp);
            const bob = Math.sin(time * 0.5) * 0.1;

            for (let i = 0; i < outerNodeCount; i++) {
                const ox = originalPositions[i * 3];
                const oy = originalPositions[i * 3 + 1];
                const oz = originalPositions[i * 3 + 2];
                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;
                const bx = rx * (1.0 + breath * breathAmp);
                const by = oy * (1.0 + breath * breathAmp * 1.5);
                const bz = rz * (1.0 + breath * breathAmp);
                const destX = (bx * introScale) + targetX;
                const destY = (by * introScale) + bob + targetY;
                const destZ = (bz * introScale);
                const speed = particleSpeeds[i];
                outerPos[i * 3] += (destX - outerPos[i * 3]) * speed;
                outerPos[i * 3 + 1] += (destY - outerPos[i * 3 + 1]) * speed;
                outerPos[i * 3 + 2] += (destZ - outerPos[i * 3 + 2]) * speed;
                let r = originalColors[i * 3];
                let g = originalColors[i * 3 + 1];
                let b = originalColors[i * 3 + 2];
                if (breath > 0.5) { r += breath * 0.1; g += breath * 0.1; b += breath * 0.1; }
                if (analyzing) { r += 0.1; g += 0.2; b += 0.4; } // Analyzing cyan tint

                if (result) {
                    const isBad = /pneumonia|covid/i.test(result);
                    if (isBad) {
                        r += 0.3; // Red alert for inflammation
                        g -= 0.1;
                        b -= 0.1;
                    }
                }

                outerCols[i * 3] = Math.min(r, 1.0);
                outerCols[i * 3 + 1] = Math.min(g, 1.0);
                outerCols[i * 3 + 2] = Math.min(b, 1.0);
            }
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
            pointsRef.current.geometry.attributes.color.needsUpdate = true;

            for (let i = 0; i < coreNodeCount; i++) {
                const speed = particleSpeeds[outerNodeCount + i];
                const ox = coreOriginals[i * 3];
                const oy = coreOriginals[i * 3 + 1];
                const oz = coreOriginals[i * 3 + 2];
                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;
                const destX = (rx * scaleBreath * introScale) + targetX;
                const destY = (oy * scaleBreath * introScale) + bob + targetY;
                const destZ = (rz * scaleBreath * introScale);
                corePos[i * 3] += (destX - corePos[i * 3]) * speed;
                corePos[i * 3 + 1] += (destY - corePos[i * 3 + 1]) * speed;
                corePos[i * 3 + 2] += (destZ - corePos[i * 3 + 2]) * speed;
            }
            coreRef.current.geometry.attributes.position.needsUpdate = true;
        }

        if (signalsRef.current) {
            const signalPosAttr = signalsRef.current.geometry.attributes.position.array;
            const breath = (Math.sin(time * breathSpeed) + 1.0) * 0.5;
            const scaleBreath = 1.0 + (breath * breathAmp);
            const angle = time * 0.05;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const bob = Math.sin(time * 0.5) * 0.1;
            const targetX = mouse.current.x * 4.0; // Increased range
            const targetY = mouse.current.y * 2.5;

            signalData.forEach((sig, i) => {
                sig.progress += sig.speed * signalBoost;
                if (sig.progress >= 1) {
                    sig.progress = 0;
                    sig.pathIndex = Math.floor(Math.random() * (signalPaths.length || 1));
                }
                const path = signalPaths[sig.pathIndex];
                if (!path || path.length < 2) return;
                const idxA = Math.floor(sig.progress * (path.length - 1));
                const idxB = Math.min(idxA + 1, path.length - 1);
                const t = (sig.progress * (path.length - 1)) - idxA;
                const pA = path[idxA];
                const pB = path[idxB];
                const lx = pA.x + (pB.x - pA.x) * t;
                const ly = pA.y + (pB.y - pA.y) * t;
                const lz = pA.z + (pB.z - pA.z) * t;
                const rx = lx * cos - lz * sin;
                const rz = lx * sin + lz * cos;
                const bx = rx * scaleBreath;
                const by = ly * scaleBreath;
                const bz = rz * scaleBreath;
                signalPosAttr[i * 3] = (bx * introScale) + targetX;
                signalPosAttr[i * 3 + 1] = (by * introScale) + bob + targetY;
                signalPosAttr[i * 3 + 2] = (bz * introScale);
            });
            signalsRef.current.geometry.attributes.position.needsUpdate = true;
            signalsRef.current.material.opacity = 0.5 + (analyzing ? 0.3 : 0) + breath * 0.5;
        }

        // Add Group Rotation
        if (groupRef.current) {
            const targetRotX = mouse.current.y * 0.4;
            const targetRotY = mouse.current.x * 0.4;
            groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.05;
            groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
        }
    });

    return (
        <group ref={groupRef}>
            <points ref={coreRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={coreNodeCount} array={coreNodes} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={coreNodeCount} array={coreColors} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.12} color="#000510" vertexColors transparent opacity={0.6} depthWrite={false} />
            </points>
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={outerNodeCount} array={nodes} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={outerNodeCount} array={colors} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.06} map={particleTexture} vertexColors transparent opacity={0.8} alphaTest={0.001} depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
            <points ref={signalsRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={signalCount} array={signalPositions} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.25} map={particleTexture} color="#ffffff" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
        </group>
    );
}

function Scene({ mouse, analyzing, result }) {
    return (
        <React.Suspense fallback={null}>
            <ChestStructure mouse={mouse} analyzing={analyzing} result={result} />
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#4d7cfe" />
            <pointLight position={[-10, -10, -5]} intensity={0.8} color="#00ff88" />
        </React.Suspense>
    );
}

export default function Chest3D({ analyzing, result }) {
    const mouse = useRef({ x: 0, y: 0 });
    const containerRef = useRef();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const targetY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                mouse.current.x += (targetX - mouse.current.x) * 0.1;
                mouse.current.y += (targetY - mouse.current.y) * 0.1;
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
                camera={{ position: [0, 0, 6], fov: 60 }} // Closer camera for larger view (was 9)
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]}
            >
                <Scene mouse={mouse} analyzing={analyzing} result={result} />
            </Canvas>
        </div>
    );
}
