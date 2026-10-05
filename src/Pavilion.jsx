import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export default function Pavilion() {
  const el = useRef();
  const controlsRef = useRef();
  const [error, setError] = useState(false);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    let renderer, frame, observer;
    const meshes = [];
    let dispose = () => {};
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#e9e9df");
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(10, 8, 12);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute(
        "aria-label",
        "可旋转的金阁寺风格三维示意模型",
      );
      renderer.domElement.setAttribute("role", "img");
      el.current.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 2, 0);
      controls.saveState();
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 7;
      controls.maxDistance = 22;
      controls.maxPolarAngle = Math.PI / 2.1;
      controlsRef.current = controls;
      scene.add(new THREE.HemisphereLight(0xfff5db, 0x6b826e, 3));
      const sun = new THREE.DirectionalLight(0xffefcf, 4);
      sun.position.set(6, 12, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);
      const materials = {
        gold: new THREE.MeshStandardMaterial({
          color: 0xc6a150,
          roughness: 0.4,
          metalness: 0.35,
        }),
        wood: new THREE.MeshStandardMaterial({ color: 0x6c4930 }),
        roof: new THREE.MeshStandardMaterial({ color: 0x444f48 }),
        stone: new THREE.MeshStandardMaterial({ color: 0xbab9a6 }),
        green: new THREE.MeshStandardMaterial({ color: 0x6f845e }),
        water: new THREE.MeshStandardMaterial({
          color: 0x88a9a0,
          roughness: 0.2,
          metalness: 0.3,
        }),
      };
      function box(w, h, d, x, y, z, mat) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          materials[mat],
        );
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
        meshes.push(m);
        return m;
      }
      function roof(w, d, y) {
        const geo = new THREE.BufferGeometry();
        const v = [
          -w / 2,
          0,
          -d / 2,
          w / 2,
          0,
          -d / 2,
          w / 2,
          0,
          d / 2,
          -w / 2,
          0,
          d / 2,
          -w * 0.25,
          0.65,
          0,
          w * 0.25,
          0.65,
          0,
        ];
        geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
        geo.setIndex([
          0, 1, 5, 0, 5, 4, 1, 2, 5, 2, 3, 4, 2, 4, 5, 3, 0, 4, 3, 2, 1, 3, 1,
          0,
        ]);
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, materials.roof);
        m.position.y = y;
        m.castShadow = true;
        scene.add(m);
        meshes.push(m);
        box(w, 0.12, d, 0, y, 0, "roof");
      }
      const island = new THREE.Mesh(
        new THREE.CylinderGeometry(4.6, 4.8, 0.35, 64),
        materials.green,
      );
      island.position.y = -0.22;
      island.receiveShadow = true;
      scene.add(island);
      meshes.push(island);
      const pond = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 0.12, 80),
        materials.water,
      );
      pond.position.y = -0.46;
      scene.add(pond);
      meshes.push(pond);
      box(4.5, 0.3, 3.7, 0, 0, 0, "stone");
      for (let level = 0; level < 3; level++) {
        let w = 3.8 - level * 0.65,
          d = 3 - level * 0.4,
          y = 0.2 + level * 1.5;
        box(w - 0.3, 1.2, d - 0.3, 0, y + 0.6, 0, level ? "gold" : "wood");
        box(w + 0.4, 0.14, d + 0.4, 0, y + 0.13, 0, "gold");
        for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) {
          box(0.1, 1.25, 0.1, x, y + 0.65, d / 2, "gold");
          box(0.1, 1.25, 0.1, x, y + 0.65, -d / 2, "gold");
        }
        for (let z of [-d / 2 - 0.15, d / 2 + 0.15]) {
          box(w + 0.2, 0.08, 0.07, 0, y + 0.45, z, "gold");
          for (let i = -4; i <= 4; i++)
            box(0.045, 0.4, 0.045, (i * w) / 8, y + 0.28, z, "gold");
        }
        for (let i = -1; i <= 1; i++)
          box(0.48, 0.64, 0.04, (i * w) / 3, y + 0.7, d / 2 - 0.13, "roof");
        roof(w + 1.1, d + 0.95, y + 1.25);
      }
      box(0.09, 0.6, 0.09, 0, 5.3, 0, "gold");
      const bird = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 8),
        materials.gold,
      );
      bird.position.set(0, 5.65, 0);
      scene.add(bird);
      meshes.push(bird);
      const wing = box(0.8, 0.05, 0.25, 0, 5.65, 0, "gold");
      wing.rotation.z = 0.15;
      for (const [x, z] of [
        [-3, 1],
        [3, -2],
        [-2.7, -2],
      ]) {
        box(0.16, 1, 0.16, x, 0.3, z, "wood");
        for (let n = 0; n < 3; n++) {
          const t = new THREE.Mesh(
            new THREE.SphereGeometry(0.62 - n * 0.11, 8, 5),
            materials.green,
          );
          t.scale.y = 0.55;
          t.position.set(x + n * 0.1, 0.8 + n * 0.25, z);
          scene.add(t);
          meshes.push(t);
        }
      }
      const size = () => {
        if (!el.current) return;
        let { width, height } = el.current.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(size);
      observer.observe(el.current);
      size();
      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(el.current);
      function draw() {
        frame = requestAnimationFrame(draw);
        if (visible) {
          controls.update();
          renderer.render(scene, camera);
        }
      }
      draw();
      dispose = () => {
        io.disconnect();
        controls.dispose();
        meshes.forEach((m) => m.geometry.dispose());
        Object.values(materials).forEach((m) => m.dispose());
      };
    } catch (e) {
      setError(true);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);
  return (
    <div className="model">
      <div className="model-canvas" ref={el} />
      {error ? (
        <p className="model-fallback">
          当前设备无法启用
          3D。金阁寺的三个楼层融合了不同建筑风格，可继续阅读右侧介绍。
        </p>
      ) : (
        <div className="model-controls">
          <button
            onClick={() => {
              const c = controlsRef.current;
              if (c) {
                c.autoRotate = !auto;
                setAuto(!auto);
              }
            }}
          >
            {auto ? "暂停旋转" : "自动旋转"} ↻
          </button>
          <button onClick={() => controlsRef.current?.reset()}>复位</button>
        </div>
      )}
      <span className="model-caption">
        拖动旋转 · 双指缩放 / 滚轮缩放 · 建筑风格示意，非测绘复原
      </span>
    </div>
  );
}
