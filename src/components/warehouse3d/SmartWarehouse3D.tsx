import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StockBatch, RiskLevel } from '../../types/inventory';
import { getRiskColorHex } from '../../utils/kineticPredictor';

interface SmartWarehouse3DProps {
  batches: StockBatch[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string | null) => void;
  filterMode: 'all' | 'critical' | 'cold-breach' | 'high-value';
  activeCameraPreset: 'overview' | 'cold-storage' | 'aisle-1' | 'aisle-2' | 'top-down';
  onCameraPresetChange: (preset: 'overview' | 'cold-storage' | 'aisle-1' | 'aisle-2' | 'top-down') => void;
}

export const SmartWarehouse3D: React.FC<SmartWarehouse3DProps> = ({
  batches,
  selectedBatchId,
  onSelectBatch,
  filterMode,
  activeCameraPreset,
  onCameraPresetChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Mesh map for raycasting and hover
  const crateMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const hoveredBatchIdRef = useRef<string | null>(null);

  // Target camera state for smooth damping
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 14, 24));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3, 0));
  const isTransitioningCameraRef = useRef<boolean>(false);

  // Keep references to props for animation loop without re-triggering effect
  const propsRef = useRef({ batches, selectedBatchId, onSelectBatch, filterMode });
  propsRef.current = { batches, selectedBatchId, onSelectBatch, filterMode };

  // Sync camera preset triggers
  useEffect(() => {
    isTransitioningCameraRef.current = true;
    switch (activeCameraPreset) {
      case 'overview':
        targetCamPosRef.current.set(0, 16, 26);
        targetLookAtRef.current.set(0, 3, 0);
        break;
      case 'cold-storage':
        targetCamPosRef.current.set(-7, 7, 6);
        targetLookAtRef.current.set(-7, 2, 0);
        break;
      case 'aisle-1':
        targetCamPosRef.current.set(-6, 8, 12);
        targetLookAtRef.current.set(-6, 3, 0);
        break;
      case 'aisle-2':
        targetCamPosRef.current.set(6, 8, 12);
        targetLookAtRef.current.set(6, 3, 0);
        break;
      case 'top-down':
        targetCamPosRef.current.set(0, 28, 0.1);
        targetLookAtRef.current.set(0, 0, 0);
        break;
    }
  }, [activeCameraPreset]);

  // Focus on selected batch if selection changed
  useEffect(() => {
    if (!selectedBatchId) return;
    const group = crateMeshMapRef.current.get(selectedBatchId);
    if (group) {
      isTransitioningCameraRef.current = true;
      const pos = group.position;
      targetCamPosRef.current.set(pos.x + 3.5, pos.y + 2.5, pos.z + 5.5);
      targetLookAtRef.current.set(pos.x, pos.y + 0.5, pos.z);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene setup with crisp white/light aesthetic
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const lightBgColor = new THREE.Color(0xf8fafc); // slate-50 crisp light
    scene.background = lightBgColor;
    scene.fog = new THREE.Fog(lightBgColor, 28, 65);

    // 2. Camera setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 100);
    camera.position.set(0, 16, 26);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Room Environment for studio PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below floor
    controls.minDistance = 4;
    controls.maxDistance = 50;
    controls.target.set(0, 3, 0);
    controlsRef.current = controls;

    // Cancel camera auto-transition if user manually pans or rotates
    controls.addEventListener('start', () => {
      isTransitioningCameraRef.current = false;
    });

    // 6. Lighting rig: Warm directional key + cool hemisphere fill + ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.85);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
    keyLight.position.set(15, 25, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 60;
      keyLight.shadow.camera.left = -22;
      keyLight.shadow.camera.right = 22;
      keyLight.shadow.camera.top = 22;
      keyLight.shadow.camera.bottom = -22;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.6);
    rimLight.position.set(-18, 18, -15);
    scene.add(rimLight);

    // 7. Ground / Warehouse Floor with clean light epoxy & subtle grid
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // slate-100
      roughness: 0.35,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Procedural grid floor markings (white lines)
    const gridHelper = new THREE.GridHelper(60, 30, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Aisle floor safety stripes (subtle light yellow/gray boundary decals)
    const createAisleMarking = (x: number, z: number, length: number, width: number) => {
      const geo = new THREE.PlaneGeometry(width, length);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfde047, // yellow-300
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.02, z);
      scene.add(mesh);
    };
    createAisleMarking(-10.5, 0, 24, 0.2);
    createAisleMarking(-1.5, 0, 24, 0.2);
    createAisleMarking(1.5, 0, 24, 0.2);
    createAisleMarking(10.5, 0, 24, 0.2);

    // 8. Build 3D Warehouse Racking System (Aisle 1 and Aisle 2)
    // Industrial racks with upright steel posts, horizontal orange beams, wire decking
    const rackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate-700
      roughness: 0.4,
      metalness: 0.7,
    });
    const rackBeamMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // industrial safety orange
      roughness: 0.45,
      metalness: 0.3,
    });
    const rackDeckMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // slate-400
      roughness: 0.6,
      metalness: 0.2,
      wireframe: false,
    });

    const aisleOffsets = [-6, 6]; // X coordinates for Aisle 1 (left) and Aisle 2 (right)
    const rackZPositions = [-7, 0, 7]; // 3 bays along Z
    const shelfHeights = [0.8, 3.2, 5.6]; // 3 tiers along Y

    aisleOffsets.forEach((aisleX) => {
      rackZPositions.forEach((rackZ) => {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(aisleX, 0, rackZ);

        const bayWidth = 4.4;
        const bayDepth = 2.0;
        const uprightHeight = 7.5;

        // 4 Vertical corner posts (composite profile with foot plates)
        const postGeo = new THREE.BoxGeometry(0.12, uprightHeight, 0.12);
        const footGeo = new THREE.BoxGeometry(0.3, 0.05, 0.3);
        const postPositions = [
          [-bayWidth / 2, uprightHeight / 2, -bayDepth / 2],
          [bayWidth / 2, uprightHeight / 2, -bayDepth / 2],
          [-bayWidth / 2, uprightHeight / 2, bayDepth / 2],
          [bayWidth / 2, uprightHeight / 2, bayDepth / 2],
        ];

        postPositions.forEach(([px, py, pz]) => {
          const post = new THREE.Mesh(postGeo, rackSteelMat);
          post.position.set(px, py, pz);
          post.castShadow = !isSoftwareGl;
          rackGroup.add(post);

          const foot = new THREE.Mesh(footGeo, rackSteelMat);
          foot.position.set(px, 0.025, pz);
          rackGroup.add(foot);
        });

        // Shelf horizontal beams & decking
        shelfHeights.forEach((shY) => {
          // Front & back crossbeams
          const beamGeo = new THREE.BoxGeometry(bayWidth, 0.14, 0.08);
          const frontBeam = new THREE.Mesh(beamGeo, rackBeamMat);
          frontBeam.position.set(0, shY, bayDepth / 2);
          frontBeam.castShadow = !isSoftwareGl;
          rackGroup.add(frontBeam);

          const backBeam = new THREE.Mesh(beamGeo, rackBeamMat);
          backBeam.position.set(0, shY, -bayDepth / 2);
          rackGroup.add(backBeam);

          // Side ties
          const tieGeo = new THREE.BoxGeometry(0.08, 0.12, bayDepth);
          const leftTie = new THREE.Mesh(tieGeo, rackSteelMat);
          leftTie.position.set(-bayWidth / 2, shY, 0);
          rackGroup.add(leftTie);

          const rightTie = new THREE.Mesh(tieGeo, rackSteelMat);
          rightTie.position.set(bayWidth / 2, shY, 0);
          rackGroup.add(rightTie);

          // Mesh wire decking shelf platform
          const deckGeo = new THREE.BoxGeometry(bayWidth - 0.1, 0.04, bayDepth - 0.1);
          const deck = new THREE.Mesh(deckGeo, rackDeckMat);
          deck.position.set(0, shY + 0.06, 0);
          deck.receiveShadow = !isSoftwareGl;
          rackGroup.add(deck);
        });

        // Diagonal side bracing
        const braceGeo = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(bayDepth, 2.5), 6);
        const braceLeft = new THREE.Mesh(braceGeo, rackSteelMat);
        braceLeft.position.set(-bayWidth / 2, 2.5, 0);
        braceLeft.rotation.x = Math.atan2(bayDepth, 2.5);
        rackGroup.add(braceLeft);

        const braceRight = new THREE.Mesh(braceGeo, rackSteelMat);
        braceRight.position.set(bayWidth / 2, 2.5, 0);
        braceRight.rotation.x = -Math.atan2(bayDepth, 2.5);
        rackGroup.add(braceRight);

        scene.add(rackGroup);
      });
    });

    // 9. Procedural 3D Batches (Pallet + Crates + Sensor Puck + Status Badge)
    const palletWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // pine wood
      roughness: 0.85,
      metalness: 0.0,
    });
    const palletGeo = new THREE.BoxGeometry(1.6, 0.12, 1.2);

    const sensorPuckGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
    const sensorPuckMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });

    const createBatch3DObject = (batch: StockBatch) => {
      const group = new THREE.Group();
      group.name = `batch_${batch.id}`;
      group.userData = { batchId: batch.id };

      // Calculate world coordinates from rackLocation
      // aisle 1 -> x = -6, aisle 2 -> x = 6
      const aisleX = batch.rackLocation.aisle === 1 ? -6 : 6;
      // rack 1 -> z = -7, rack 2 -> z = 0, rack 3 -> z = 7
      const rackZ = rackZPositions[batch.rackLocation.rack - 1] ?? 0;
      // shelf 1 -> 0.8, shelf 2 -> 3.2, shelf 3 -> 5.6
      const shelfY = shelfHeights[batch.rackLocation.shelf - 1] ?? 0.8;
      // slot 1 -> x offset -0.9, slot 2 -> x offset +0.9
      const slotOffsetX = batch.rackLocation.slot === 1 ? -1.0 : 1.0;

      const posX = aisleX + slotOffsetX;
      const posY = shelfY + 0.1;
      const posZ = rackZ;
      group.position.set(posX, posY, posZ);

      // (1) Pallet base
      const pallet = new THREE.Mesh(palletGeo, palletWoodMat);
      pallet.position.set(0, 0.06, 0);
      pallet.castShadow = !isSoftwareGl;
      pallet.receiveShadow = !isSoftwareGl;
      group.add(pallet);

      // (2) Crate boxes composite (3 stacked/adjacent cartons)
      const riskColorHex = getRiskColorHex(batch.riskLevel);
      const crateMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(riskColorHex),
        roughness: 0.35,
        metalness: 0.15,
      });

      // Main storage container body
      const boxGeo = new THREE.BoxGeometry(1.4, 0.8, 1.0);
      const boxMesh = new THREE.Mesh(boxGeo, crateMat);
      boxMesh.position.set(0, 0.12 + 0.4, 0);
      boxMesh.castShadow = !isSoftwareGl;
      boxMesh.receiveShadow = !isSoftwareGl;
      boxMesh.userData = { isClickableCrate: true, batchId: batch.id };
      group.add(boxMesh);

      // Shrink-wrap or lid accent (multi-part composite design)
      const lidGeo = new THREE.BoxGeometry(1.44, 0.08, 1.04);
      const lidMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const lidMesh = new THREE.Mesh(lidGeo, lidMat);
      lidMesh.position.set(0, 0.12 + 0.82, 0);
      group.add(lidMesh);

      // (3) Telemetry IoT Sensor Puck with LED indicator
      const sensorPuck = new THREE.Mesh(sensorPuckGeo, sensorPuckMat);
      sensorPuck.position.set(0.5, 0.12 + 0.86, 0.3);
      group.add(sensorPuck);

      const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const ledColor = batch.telemetry.sensorStatus === 'online' ? 0x10b981 : 0xf43f5e;
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(0.5, 0.12 + 0.89, 0.3);
      group.add(ledMesh);

      // (4) Shelf batch label plate (procedural mini canvas)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(batch.sku, 12, 28);
        ctx.fillStyle = riskColorHex;
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(`${batch.remainingDaysPredicted}d left (${batch.freshnessScore}%)`, 12, 52);
      }
      const labelTex = new THREE.CanvasTexture(canvas);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      const labelGeo = new THREE.PlaneGeometry(1.0, 0.25);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        side: THREE.DoubleSide,
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 0.12 + 0.4, 0.52);
      group.add(labelMesh);

      // Soft contact shadow plane beneath the pallet
      const shadowGeo = new THREE.PlaneGeometry(1.8, 1.4);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, 0.005, 0);
      group.add(shadowMesh);

      scene.add(group);
      crateMeshMapRef.current.set(batch.id, group);
    };

    // Instantiate all batches
    batches.forEach((batch) => createBatch3DObject(batch));

    // 10. Ambient cold-storage mist particles in Aisle 1
    const mistCount = isSoftwareGl ? 30 : 90;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      mistPositions[i * 3 + 0] = -6 + (Math.random() - 0.5) * 6; // around Aisle 1
      mistPositions[i * 3 + 1] = 0.5 + Math.random() * 5.0;
      mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0x38bdf8, // light sky blue cold chain vibe
      size: 0.18,
      transparent: true,
      opacity: 0.4,
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    scene.add(mistPoints);

    // 11. Raycasting for hover & click inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundBatchId: string | null = null;
      for (const hit of intersects) {
        if (hit.object.userData?.batchId) {
          foundBatchId = hit.object.userData.batchId;
          break;
        }
      }

      if (foundBatchId !== hoveredBatchIdRef.current) {
        // Reset old hover
        if (hoveredBatchIdRef.current) {
          const oldGroup = crateMeshMapRef.current.get(hoveredBatchIdRef.current);
          if (oldGroup && oldGroup.userData.batchId !== propsRef.current.selectedBatchId) {
            oldGroup.scale.set(1.0, 1.0, 1.0);
          }
        }
        // Set new hover
        hoveredBatchIdRef.current = foundBatchId;
        if (foundBatchId) {
          const newGroup = crateMeshMapRef.current.get(foundBatchId);
          if (newGroup) {
            newGroup.scale.set(1.05, 1.05, 1.05);
            container.style.cursor = 'pointer';
          }
        } else {
          container.style.cursor = 'default';
        }
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      // Only primary left button
      if (event.button !== 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData?.batchId) {
          propsRef.current.onSelectBatch(hit.object.userData.batchId);
          return;
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', handlePointerMove);
    domElement.addEventListener('mousedown', handlePointerDown);

    // 12. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 13. Smooth Animation Loop with exponential damping
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Camera transition interpolation
      if (isTransitioningCameraRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPosRef.current.x, 3.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPosRef.current.y, 3.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPosRef.current.z, 3.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLookAtRef.current.x, 4.0, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLookAtRef.current.y, 4.0, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLookAtRef.current.z, 4.0, delta);

        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.1 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.1
        ) {
          isTransitioningCameraRef.current = false;
        }
      }

      controls.update();

      // Subtle gentle floating oscillation for mist particles
      const posAttr = mistGeo.attributes.position as THREE.BufferAttribute;
      if (posAttr) {
        const arr = posAttr.array as Float32Array;
        const time = clock.getElapsedTime();
        for (let i = 0; i < mistCount; i++) {
          arr[i * 3 + 1] += Math.sin(time + i) * 0.002;
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domElement.removeEventListener('mousemove', handlePointerMove);
      domElement.removeEventListener('mousedown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      crateMeshMapRef.current.clear();
    };
  }, []);

  // Update crate visual filters and highlight selected crate dynamically
  useEffect(() => {
    const { batches, selectedBatchId, filterMode } = propsRef.current;
    batches.forEach((b) => {
      const group = crateMeshMapRef.current.get(b.id);
      if (!group) return;

      // Filter visibility
      let visible = true;
      if (filterMode === 'critical') {
        visible = b.riskLevel === 'critical' || b.riskLevel === 'expired';
      } else if (filterMode === 'cold-breach') {
        visible = b.telemetry.coldChainBreachMinutes > 0;
      } else if (filterMode === 'high-value') {
        visible = b.totalValue > 3000;
      }

      group.visible = visible;

      // Highlight selected batch
      const isSelected = b.id === selectedBatchId;
      if (isSelected) {
        group.scale.set(1.08, 1.08, 1.08);
      } else if (hoveredBatchIdRef.current !== b.id) {
        group.scale.set(1.0, 1.0, 1.0);
      }
    });
  }, [batches, selectedBatchId, filterMode]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-50">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
