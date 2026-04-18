import { useEffect, useRef, useState } from "react";
import {
  BaseGroundPlugin,
  Color,
  GBufferPlugin,
  LoadingScreenPlugin,
  PickingPlugin,
  RenderTargetPreviewPlugin,
  SSAAPlugin,
  ThreeViewer,
} from "threepipe";
import { TweakpaneUiPlugin } from "@threepipe/plugin-tweakpane";
import {
  BloomPlugin,
  SSReflectionPlugin,
  TemporalAAPlugin,
} from "@threepipe/webgi-plugins";

const DEFAULT_MODEL = "../public/gltfModule/jewelry_ring.glb";

export function JewerDisplay({ modelUrl = DEFAULT_MODEL } = {}) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;

    async function boot() {
      setReady(false);
      setError(null);

      try {
        const viewer = new ThreeViewer({
          canvas,
          msaa: true, // 改为 true，参考源码
          rgbm: true,
          dropzone: {
            addOptions: { disposeSceneObjects: true },
          },
          plugins: [
            LoadingScreenPlugin,
            GBufferPlugin,
            BloomPlugin,
            SSAAPlugin,
            TemporalAAPlugin,
          ],
        });
        viewer.renderManager.stableNoise = true;

        if (cancelled) {
          viewer.dispose();
          return;
        }
        viewerRef.current = viewer;

        const ssrefl = viewer.addPluginSync(new SSReflectionPlugin(true));
        const ground = viewer.addPluginSync(BaseGroundPlugin);
        viewer.addPluginSync(PickingPlugin);

        const ui = viewer.addPluginSync(new TweakpaneUiPlugin(true));

        // ✅ 关键修复1：先设置背景色
        viewer.scene.backgroundColor = new Color(0x1b1b1f);

        // ✅ 关键修复2：先设置地面材质
        ground.tonemapGround = false;
        if (ground.material) {
          ground.material.color.set(0x1b1b1f);
          ground.material.roughness = 0.2;
          ground.material.userData.separateEnvMapIntensity = true;
          ground.material.envMapIntensity = 0;
        }

        // 加载模型
        console.log("Loading model:", modelUrl);
        // 1. 先准备环境贴图 Promise
        const envPromise = viewer.setEnvironmentMap(
          "https://samples.threepipe.org/minimal/venice_sunset_1k.hdr",
        );

        // 2. 再加载模型
        const modelPromise = viewer.load(modelUrl, {
          autoCenter: true,
          autoScale: false,
        });

        // 3. 等待两者都完成
        await Promise.all([envPromise, modelPromise]);

        // UI面板
        ui.setupPluginUi(ssrefl, { expanded: true });
        ui.setupPluginUi(BaseGroundPlugin);
        ui.setupPluginUi(PickingPlugin);
        ui.setupPluginUi(BloomPlugin);

        const targetPreview = viewer.addPluginSync(RenderTargetPreviewPlugin);
        if (!ssrefl.inlineShaderRayTrace) {
          targetPreview.addTarget(() => ssrefl.target, "ssrefl");
        }

        // 相机控制
        const camera = viewer.scene.mainCamera;
        if (camera?.controls) {
          camera.controls.autoRotate = true;
          camera.controls.autoRotateSpeed = 1.0;
          camera.controls.enableDamping = true;
          camera.controls.dampingFactor = 0.05;
        }

        setReady(true);
        console.log("Scene initialized successfully");
      } catch (err) {
        console.error("Initialization failed:", err);
        setError(err.message || "加载失败");
      }
    }

    boot();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [modelUrl]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        position: "relative",
        background: "#1B1B1F", // 添加背景色
      }}
    >
      <canvas
        ref={canvasRef}
        id="mcanvas"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {!ready && !error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            background: "rgba(0,0,0,0.7)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          加载中...
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            color: "red",
            background: "rgba(0,0,0,0.8)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          错误: {error}
        </div>
      )}
    </div>
  );
}
