/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- Enhanced Glow Particle Texture (Cyber-Medical Palette) ---
const getGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    // Cyan Core -> Blue Glow -> Fade
    gradient.addColorStop(0, 'rgba(200, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(0, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

const getSynapseTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    // Electric Purple/Pink for activity
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 0, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(100, 0, 200, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

const getCoreTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    // Deep Blue Core
    gradient.addColorStop(0, 'rgba(50, 100, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(20, 40, 150, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

function noise3D(x, y, z) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
}

function fbm(x, y, z, octaves = 4) {
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

function brainSurfaceDisplacement(theta, phi, baseR) {
    const scaleX = 1.35;
    const scaleY = 1.0;
    const scaleZ = 1.15;

    let x = baseR * Math.sin(phi) * Math.cos(theta) * scaleX;
    let y = baseR * Math.cos(phi) * scaleY;
    let z = baseR * Math.sin(phi) * Math.sin(theta) * scaleZ;

    // Central fissure
    const xNorm = Math.abs(x) / (baseR * scaleX);
    if (xNorm < 0.08) {
        const fissureDepth = 0.3 * (1.0 - xNorm / 0.08);
        const factor = 1.0 - fissureDepth;
        x *= factor;
        y *= factor;
        z *= factor;
    }

    // Gyri and Sulci wrinkles
    const noiseScale = 2.5;
    const wrinkleAmount = 0.18;
    const n1 = fbm(x * noiseScale, y * noiseScale, z * noiseScale, 5);
    const n2 = fbm(x * noiseScale * 1.7 + 5.0, y * noiseScale * 1.7 + 3.0, z * noiseScale * 1.7 + 7.0, 4);
    const displacement = n1 * wrinkleAmount + n2 * wrinkleAmount * 0.5;

    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0.001) {
        x += (x / len) * displacement;
        y += (y / len) * displacement;
        z += (z / len) * displacement;
    }

    if (y < -baseR * 0.6) {
        y = -baseR * 0.6 + (y + baseR * 0.6) * 0.3;
    }

    return { x, y, z };
}

// Helper to create a points layer using imperative geometry
function PointsLayer({ positions, colors, size, texture, opacity, blending, pointsRef }) {
    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return g;
    }, [positions, colors]);

    const mat = useMemo(() => {
        return new THREE.PointsMaterial({
            size,
            map: texture,
            vertexColors: true,
            transparent: true,
            opacity,
            depthWrite: false,
            blending,
            sizeAttenuation: true,
            alphaTest: 0.001,
        });
    }, [size, texture, opacity, blending]);

    return <points ref={pointsRef} geometry={geo} material={mat} />;
}

function BrainStructure({ mouse, analyzing, result }) {
    const outerRef = useRef();
    const midRef = useRef();
    const coreRef = useRef();
    const signalsRef = useRef();
    const dendritesRef = useRef();
    const groupRef = useRef();

    const particleTexture = useMemo(() => getGlowTexture(), []);
    const synapseTexture = useMemo(() => getSynapseTexture(), []);
    const coreTexture = useMemo(() => getCoreTexture(), []);

    // Optimized particle counts for smoother performance
    const outerCount = 15000; // Increased for density
    const midCount = 7000;
    const coreCount = 4000;
    const signalCount = 80;
    const dendriteCount = 2000;

    // Outer cortex
    const { outerPositions, outerColors, outerOriginals, outerOriginalColors, foldPaths } = useMemo(() => {
        const positions = new Float32Array(outerCount * 3);
        const colors = new Float32Array(outerCount * 3);
        const originals = new Float32Array(outerCount * 3);
        const origColors = new Float32Array(outerCount * 3);
        const paths = [];

        let idx = 0;
        const numFolds = 350;
        const ptsPerFold = Math.ceil(outerCount / numFolds);

        for (let f = 0; f < numFolds && idx < outerCount; f++) {
            const theta0 = Math.random() * Math.PI * 2;
            const phi0 = Math.acos(2 * Math.random() - 1);
            const foldPath = [];

            let curTheta = theta0;
            let curPhi = phi0;

            for (let i = 0; i < ptsPerFold && idx < outerCount; i++) {
                curTheta += (Math.random() - 0.5) * 0.15;
                curPhi += (Math.random() - 0.5) * 0.1;
                curPhi = Math.max(0.15, Math.min(Math.PI - 0.15, curPhi));

                const baseR = 2.2 + Math.random() * 0.3;
                const pos = brainSurfaceDisplacement(curTheta, curPhi, baseR);

                pos.x += (Math.random() - 0.5) * 0.05;
                pos.y += (Math.random() - 0.5) * 0.05;
                pos.z += (Math.random() - 0.5) * 0.05;

                positions[idx * 3] = pos.x;
                positions[idx * 3 + 1] = pos.y;
                positions[idx * 3 + 2] = pos.z;
                originals[idx * 3] = pos.x;
                originals[idx * 3 + 1] = pos.y;
                originals[idx * 3 + 2] = pos.z;
                foldPath.push(new THREE.Vector3(pos.x, pos.y, pos.z));

                // Unified Electric Blue/Cyan Gradient based on Depth (Ridges vs Valleys)
                // Normalize dist: ~2.0 to ~2.8
                const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
                const nDist = (dist - 1.8) / 1.2; // roughly 0 to 1

                let r, g, b;

                if (nDist > 0.6) {
                    // Ridges: Bright Electric Cyan
                    r = 0.0 + nDist * 0.1;
                    g = 0.6 + nDist * 0.4;
                    b = 1.0;
                } else if (nDist > 0.3) {
                    // Slopes: Deep Blue
                    r = 0.05;
                    g = 0.2 + nDist * 0.3;
                    b = 0.8 + nDist * 0.2;
                } else {
                    // Valleys: Dark Indigo
                    r = 0.02;
                    g = 0.05;
                    b = 0.4 + nDist * 0.2;
                }

                // Slight variation
                if (pos.y > 0.5) { r += 0.05; g += 0.05; }

                if (pos.x > 0) { r += 0.03; g += 0.02; }

                colors[idx * 3] = r;
                colors[idx * 3 + 1] = g;
                colors[idx * 3 + 2] = b;
                origColors[idx * 3] = r;
                origColors[idx * 3 + 1] = g;
                origColors[idx * 3 + 2] = b;

                idx++;
            }
            if (foldPath.length > 2) paths.push(foldPath);
        }

        return { outerPositions: positions, outerColors: colors, outerOriginals: originals, outerOriginalColors: origColors, foldPaths: paths };
    }, []);

    // Mid-layer
    const { midPositions, midColors, midOriginals } = useMemo(() => {
        const positions = new Float32Array(midCount * 3);
        const colors = new Float32Array(midCount * 3);
        const originals = new Float32Array(midCount * 3);

        for (let i = 0; i < midCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 0.8 + Math.random() * 1.4;
            const pos = brainSurfaceDisplacement(theta, phi, r);
            pos.x *= 0.85; pos.y *= 0.85; pos.z *= 0.85;

            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            originals[i * 3] = pos.x;
            originals[i * 3 + 1] = pos.y;
            originals[i * 3 + 2] = pos.z;

            const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            const n = dist / 2.5;
            colors[i * 3] = 0.1 + n * 0.15;
            colors[i * 3 + 1] = 0.15 + n * 0.2;
            colors[i * 3 + 2] = 0.4 + n * 0.3;
        }
        return { midPositions: positions, midColors: colors, midOriginals: originals };
    }, []);

    // Core
    const { corePositions, coreColors, coreOriginals } = useMemo(() => {
        const positions = new Float32Array(coreCount * 3);
        const colors = new Float32Array(coreCount * 3);
        const originals = new Float32Array(coreCount * 3);

        for (let i = 0; i < coreCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.6) * 1.2;

            let x = r * Math.sin(phi) * Math.cos(theta) * 1.1;
            let y = r * Math.cos(phi) * 0.8;
            let z = r * Math.sin(phi) * Math.sin(theta) * 0.9;

            if (Math.random() < 0.1) {
                x *= 0.3; y = -1.5 - Math.random() * 0.8; z *= 0.3;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            originals[i * 3] = x;
            originals[i * 3 + 1] = y;
            originals[i * 3 + 2] = z;

            const dist = Math.sqrt(x * x + y * y + z * z);
            const n = dist / 2.0;
            // Deep glowing core
            colors[i * 3] = 0.05 + n * 0.1;
            colors[i * 3 + 1] = 0.1 + n * 0.2;
            colors[i * 3 + 2] = 0.4 + n * 0.4;
        }
        return { corePositions: positions, coreColors: colors, coreOriginals: originals };
    }, []);

    // Dendrites
    const { dendritePositions, dendriteColors, dendriteOriginals } = useMemo(() => {
        const positions = new Float32Array(dendriteCount * 3);
        const colors = new Float32Array(dendriteCount * 3);
        const originals = new Float32Array(dendriteCount * 3);

        for (let i = 0; i < dendriteCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1.5 + Math.random() * 1.0;
            const pos = brainSurfaceDisplacement(theta, phi, r);
            pos.x *= 0.92 + Math.random() * 0.16;
            pos.y *= 0.92 + Math.random() * 0.16;
            pos.z *= 0.92 + Math.random() * 0.16;

            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            originals[i * 3] = pos.x;
            originals[i * 3 + 1] = pos.y;
            originals[i * 3 + 2] = pos.z;

            colors[i * 3] = 0.3;
            colors[i * 3 + 1] = 0.5;
            colors[i * 3 + 2] = 0.85;
        }
        return { dendritePositions: positions, dendriteColors: colors, dendriteOriginals: originals };
    }, []);

    // Signals
    const signalData = useMemo(() => {
        const data = [];
        const signalColorOptions = [
            new THREE.Color(0.2, 0.9, 1.0), // Cyan
            new THREE.Color(0.4, 0.6, 1.0), // Electric Blue
            new THREE.Color(0.8, 0.9, 1.0), // White-Blue
            new THREE.Color(0.1, 0.3, 0.9), // Deep Blue
        ];
        for (let i = 0; i < signalCount; i++) {
            data.push({
                pathIndex: Math.floor(Math.random() * foldPaths.length),
                progress: Math.random(),
                speed: 0.002 + Math.random() * 0.008,
                color: signalColorOptions[Math.floor(Math.random() * signalColorOptions.length)]
            });
        }
        return data;
    }, [foldPaths]);

    const signalPositions = useMemo(() => new Float32Array(signalCount * 3), []);
    const signalColorArray = useMemo(() => {
        const c = new Float32Array(signalCount * 3);
        signalData.forEach((s, i) => {
            c[i * 3] = s.color.r;
            c[i * 3 + 1] = s.color.g;
            c[i * 3 + 2] = s.color.b;
        });
        return c;
    }, [signalData]);

    const particleSpeeds = useMemo(() => {
        const total = outerCount + midCount + coreCount + dendriteCount;
        const speeds = new Float32Array(total);
        for (let i = 0; i < total; i++) speeds[i] = 0.015 + Math.random() * 0.035;
        return speeds;
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // Reactive Vars
        let breathSpeed = 1.2;
        let breathAmp = 0.05; // Increased breathing amplitude
        let pulseSpeed = 1.0;
        let colorShift = { r: 0, g: 0, b: 0 };
        let activeOpacity = 1.0;

        if (analyzing) {
            breathSpeed = 3.5;
            breathAmp = 0.05;
            pulseSpeed = 4.0;
            colorShift = { r: 0.5, g: 0.8, b: 1.0 }; // Cyan shift
            activeOpacity = 1.25;
        } else if (result) {
            const isBad = /tumor|malignant|cancer/i.test(result);
            const isGood = /normal|healthy|benign/i.test(result);

            if (isBad) {
                breathSpeed = 0.8;
                pulseSpeed = 0.5;
                colorShift = { r: 0.8, g: -0.2, b: -0.2 }; // Red shift
            } else if (isGood) {
                breathSpeed = 1.2;
                pulseSpeed = 1.2;
                colorShift = { r: -0.2, g: 0.5, b: 0.1 }; // Teal/Green shift
            }
        }

        let progress = Math.min(time * 0.35, 1.0);
        progress = 1 - Math.pow(1 - progress, 3);
        const introScale = progress;

        const angle = time * 0.08;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const bob = Math.sin(time * 0.6) * 0.15; // Increased bobbing
        const breath = 1.0 + Math.sin(time * breathSpeed) * breathAmp;

        const targetX = mouse.current.x * 4.0; // Increased movement range
        const targetY = mouse.current.y * 3.0;

        const pulse1Phase = (time * 1.8 * pulseSpeed) % (Math.PI * 6);
        const pulse2Phase = (time * 2.5 * pulseSpeed + 2.0) % (Math.PI * 6);
        const pulse3Phase = (time * 1.2 * pulseSpeed + 4.0) % (Math.PI * 6);

        const heartbeat = Math.pow(Math.sin(time * 1.5 * pulseSpeed) * 0.5 + 0.5, 3) * 0.15 * activeOpacity;

        // Outer cortex
        if (outerRef.current) {
            const pos = outerRef.current.geometry.attributes.position.array;
            const col = outerRef.current.geometry.attributes.color.array;

            for (let i = 0; i < outerCount; i++) {
                const ox = outerOriginals[i * 3];
                const oy = outerOriginals[i * 3 + 1];
                const oz = outerOriginals[i * 3 + 2];

                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;

                const destX = rx * breath * introScale + targetX;
                const destY = oy * breath * introScale + bob + targetY;
                const destZ = rz * breath * introScale;

                const spd = particleSpeeds[i];
                pos[i * 3] += (destX - pos[i * 3]) * spd;
                pos[i * 3 + 1] += (destY - pos[i * 3 + 1]) * spd;
                pos[i * 3 + 2] += (destZ - pos[i * 3 + 2]) * spd;

                const wave1 = Math.sin(rx * 2.0 + pulse1Phase);
                const wave2 = Math.sin(oy * 2.5 + pulse2Phase);
                const wave3 = Math.sin(rz * 1.8 + pulse3Phase);

                let r = outerOriginalColors[i * 3];
                let g = outerOriginalColors[i * 3 + 1];
                let b = outerOriginalColors[i * 3 + 2];

                if (wave1 > 0.93) { r += 0.35; g += 0.3; b += 0.2; }
                if (wave2 > 0.95) { r += 0.1; g += 0.3; b += 0.35; }
                if (wave3 > 0.94) { r += 0.25; g += 0.15; b += 0.3; }

                r += heartbeat;
                g += heartbeat * 0.7;
                b += heartbeat * 0.5;

                // Apply dynamic shift
                r += colorShift.r;
                g += colorShift.g;
                b += colorShift.b;

                // Random twinkle
                if (Math.random() > 0.998) {
                    r += 0.4; g += 0.4; b += 0.3;
                }

                col[i * 3] = Math.max(0, Math.min(r, 1.0));
                col[i * 3 + 1] = Math.max(0, Math.min(g, 1.0));
                col[i * 3 + 2] = Math.max(0, Math.min(b, 1.0));
            }
            outerRef.current.geometry.attributes.position.needsUpdate = true;
            outerRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // Mid-layer
        if (midRef.current) {
            const pos = midRef.current.geometry.attributes.position.array;
            for (let i = 0; i < midCount; i++) {
                const ox = midOriginals[i * 3];
                const oy = midOriginals[i * 3 + 1];
                const oz = midOriginals[i * 3 + 2];
                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;
                const destX = rx * breath * introScale + targetX;
                const destY = oy * breath * introScale + bob + targetY;
                const destZ = rz * breath * introScale;
                const spd = particleSpeeds[outerCount + i];
                pos[i * 3] += (destX - pos[i * 3]) * spd;
                pos[i * 3 + 1] += (destY - pos[i * 3 + 1]) * spd;
                pos[i * 3 + 2] += (destZ - pos[i * 3 + 2]) * spd;
            }
            midRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Core
        if (coreRef.current) {
            const pos = coreRef.current.geometry.attributes.position.array;
            const col = coreRef.current.geometry.attributes.color.array;
            for (let i = 0; i < coreCount; i++) {
                const ox = coreOriginals[i * 3];
                const oy = coreOriginals[i * 3 + 1];
                const oz = coreOriginals[i * 3 + 2];
                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;
                const destX = rx * breath * introScale + targetX;
                const destY = oy * breath * introScale + bob + targetY;
                const destZ = rz * breath * introScale;
                const spd = particleSpeeds[outerCount + midCount + i];
                pos[i * 3] += (destX - pos[i * 3]) * spd;
                pos[i * 3 + 1] += (destY - pos[i * 3 + 1]) * spd;
                pos[i * 3 + 2] += (destZ - pos[i * 3 + 2]) * spd;

                const corePulse = Math.sin(time * 2.0 * pulseSpeed + i * 0.01) * 0.5 + 0.5;
                col[i * 3] = 0.15 + corePulse * 0.15 + heartbeat + colorShift.r * 0.5;
                col[i * 3 + 1] = 0.05 + corePulse * 0.1 + colorShift.g * 0.5;
                col[i * 3 + 2] = 0.35 + corePulse * 0.25 + colorShift.b * 0.5;
            }
            coreRef.current.geometry.attributes.position.needsUpdate = true;
            coreRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // Dendrites
        if (dendritesRef.current) {
            const pos = dendritesRef.current.geometry.attributes.position.array;
            for (let i = 0; i < dendriteCount; i++) {
                const ox = dendriteOriginals[i * 3];
                const oy = dendriteOriginals[i * 3 + 1];
                const oz = dendriteOriginals[i * 3 + 2];
                const rx = ox * cos - oz * sin;
                const rz = ox * sin + oz * cos;
                const flutter = Math.sin(time * 3.0 + i * 0.5) * 0.02;
                const destX = (rx + flutter) * breath * introScale + targetX;
                const destY = oy * breath * introScale + bob + targetY;
                const destZ = (rz + flutter) * breath * introScale;
                const spd = particleSpeeds[outerCount + midCount + coreCount + i];
                pos[i * 3] += (destX - pos[i * 3]) * spd;
                pos[i * 3 + 1] += (destY - pos[i * 3 + 1]) * spd;
                pos[i * 3 + 2] += (destZ - pos[i * 3 + 2]) * spd;
            }
            dendritesRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Group tilt from mouse
        if (groupRef.current) {
            // Significantly increased rotation range
            const targetRotX = mouse.current.y * 0.8; // Was 0.25
            const targetRotY = mouse.current.x * 0.8; // Added Y rotation for better feeling
            const targetRotZ = -mouse.current.x * 0.2; // Slight tilt

            groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.05;
            groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
            groupRef.current.rotation.z += (targetRotZ - groupRef.current.rotation.z) * 0.05;
        }

        // Signals
        if (signalsRef.current) {
            const signalPos = signalsRef.current.geometry.attributes.position.array;
            signalData.forEach((sig, i) => {
                sig.progress += sig.speed * pulseSpeed;
                if (sig.progress >= 1) {
                    sig.progress = 0;
                    sig.pathIndex = Math.floor(Math.random() * foldPaths.length);
                }
                const path = foldPaths[sig.pathIndex];
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
                signalPos[i * 3] = rx * breath * introScale + targetX;
                signalPos[i * 3 + 1] = ly * breath * introScale + bob + targetY;
                signalPos[i * 3 + 2] = rz * breath * introScale;
            });
            signalsRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef}>
            <PointsLayer
                pointsRef={coreRef}
                positions={corePositions}
                colors={coreColors}
                size={0.08}
                texture={coreTexture}
                opacity={0.5}
                blending={THREE.AdditiveBlending}
            />
            <PointsLayer
                pointsRef={midRef}
                positions={midPositions}
                colors={midColors}
                size={0.04}
                texture={particleTexture}
                opacity={0.35}
                blending={THREE.AdditiveBlending}
            />
            <PointsLayer
                pointsRef={dendritesRef}
                positions={dendritePositions}
                colors={dendriteColors}
                size={0.025}
                texture={particleTexture}
                opacity={0.3}
                blending={THREE.AdditiveBlending}
            />
            <PointsLayer
                pointsRef={outerRef}
                positions={outerPositions}
                colors={outerColors}
                size={0.05}
                texture={particleTexture}
                opacity={0.85}
                blending={THREE.AdditiveBlending}
            />
            <PointsLayer
                pointsRef={signalsRef}
                positions={signalPositions}
                colors={signalColorArray}
                size={0.2}
                texture={synapseTexture}
                opacity={0.9}
                blending={THREE.AdditiveBlending}
            />
        </group>
    );
}

function AmbientParticles() {
    const ref = useRef();
    const count = 500;

    const { positions, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
            col[i * 3] = 0.3 + Math.random() * 0.2;
            col[i * 3 + 1] = 0.4 + Math.random() * 0.2;
            col[i * 3 + 2] = 0.7 + Math.random() * 0.3;
        }
        return { positions: pos, colors: col };
    }, []);

    const texture = useMemo(() => getGlowTexture(), []);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.01;
            ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1;
        }
    });

    return (
        <PointsLayer
            pointsRef={ref}
            positions={positions}
            colors={colors}
            size={0.06}
            texture={texture}
            opacity={0.4}
            blending={THREE.AdditiveBlending}
        />
    );
}

function Scene({ mouse, analyzing, result }) {
    return (
        <React.Suspense fallback={null}>
            <BrainStructure mouse={mouse} analyzing={analyzing} result={result} />
            <AmbientParticles />
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.2} color="#4d7cfe" />
            <pointLight position={[-10, -5, -10]} intensity={0.8} color="#9b59b6" />
            <pointLight position={[0, -10, 5]} intensity={0.6} color="#00b4d8" />
        </React.Suspense>
    );
}

export default function Brain3D({ analyzing, result }) {
    const mouse = useRef({ x: 0, y: 0 });
    const containerRef = useRef();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const targetY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                mouse.current.x += (targetX - mouse.current.x) * 0.1; // Faster smoothing
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
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 7], fov: 50 }} // Closer camera for larger view
                gl={{ alpha: true, antialias: true }}
                dpr={1} // Safe DPR for performance
                style={{ background: 'transparent' }}
            >
                <Scene mouse={mouse} analyzing={analyzing} result={result} />
            </Canvas>
        </div>
    );
}
