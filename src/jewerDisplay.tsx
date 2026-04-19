// src/JewerDisplay.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  BaseGroundPlugin,
  Color,
  GBufferPlugin,
  LoadingScreenPlugin,
  PickingPlugin,
  RenderTargetPreviewPlugin,
  SSAAPlugin,
  ThreeViewer,
  ShaderMaterial,
  IViewerPlugin,
} from "threepipe";
import { TweakpaneUiPlugin } from "@threepipe/plugin-tweakpane";
import {
  BloomPlugin,
  SSReflectionPlugin,
  TemporalAAPlugin,
} from "@threepipe/webgi-plugins";
import { CustomGemBloomShader } from "./shader/bloomShader";
import type { Object3D, Material, Camera } from "three";

// 扩展 ThreeViewer 类型以支持 Threepipe 插件
interface ExtendedThreeViewer {
  renderManager: {
    stableNoise: boolean;
  };
  addPluginSync: <T extends IViewerPlugin>(
    plugin: T | (new (...args: any[]) => T),
    ...args: any[]
  ) => T;
  setEnvironmentMap: (url: string) => Promise<void>;
  load: (url: string, options?: any) => Promise<Object3D>;
  dispose: () => void;
  scene: {
    backgroundColor: Color | null;
    environment: any;
    mainCamera: Camera & {
      controls?: {
        autoRotate: boolean;
        autoRotateSpeed: number;
        enableDamping: boolean;
        dampingFactor: number;
      };
    };
  };
}

// 扩展插件类型
interface ExtendedSSReflectionPlugin extends IViewerPlugin {
  inlineShaderRayTrace?: boolean;
  target?: any;
}

interface ExtendedBaseGroundPlugin extends IViewerPlugin {
  tonemapGround: boolean;
  material?: Material & {
    color: { set: (hex: number) => void };
    roughness: number;
    userData: Record<string, any>;
    envMapIntensity: number;
  };
}

interface ExtendedTweakpaneUiPlugin extends IViewerPlugin {
  setupPluginUi: (plugin: any, options?: any) => void;
}

interface JewerDisplayProps {
  modelUrl?: string;
}

const DEFAULT_MODEL = "../public/gltfModule/jewelry_ring.glb"; // 修正路径

export const JewerDisplay: React.FC<JewerDisplayProps> = ({
  modelUrl = DEFAULT_MODEL,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<ExtendedThreeViewer | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;

    async function boot(): Promise<void> {
      setReady(false);
      setError(null);

      try {
        // 方案1：使用 unknown 中转（推荐）
        const viewer = new ThreeViewer({
          canvas: canvas || undefined, // 将 null 转换为 undefined
          msaa: true,
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
        }) as unknown as ExtendedThreeViewer;

        viewer.renderManager.stableNoise = true;

        if (cancelled) {
          viewer.dispose();
          return;
        }
        viewerRef.current = viewer;

        const ssrefl = viewer.addPluginSync(
          new SSReflectionPlugin(true),
        ) as ExtendedSSReflectionPlugin;

        const ground = viewer.addPluginSync(
          BaseGroundPlugin,
        ) as ExtendedBaseGroundPlugin;
        viewer.addPluginSync(PickingPlugin);

        const ui = viewer.addPluginSync(
          new TweakpaneUiPlugin(true),
        ) as ExtendedTweakpaneUiPlugin;

        // ✅ 设置背景色
        viewer.scene.backgroundColor = new Color(0x1b1b1f);

        // 材质配置
        const material = new ShaderMaterial(CustomGemBloomShader);
        material.needsUpdate = true;

        ground.tonemapGround = false;
        if (ground.material) {
          ground.material.color.set(0x1b1b1f);
          ground.material.roughness = 0.2;
          ground.material.userData.separateEnvMapIntensity = true;
          ground.material.envMapIntensity = 0;
        }

        // 加载模型
        console.log("Loading model:", modelUrl);

        const envPromise = viewer.setEnvironmentMap(
          "https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr",
        );

        const loadResult = await viewer.load(modelUrl, {
          autoCenter: true,
          autoScale: false,
        });

        console.log("Load result:", loadResult);

        // ✅ 等待环境贴图加载完成
        await envPromise;

        // 处理材质
        if (loadResult && typeof loadResult.traverse === "function") {
          loadResult.traverse(
            (
              obj: Object3D & {
                material?: Material & { isMaterial?: boolean };
              },
            ) => {
              if (obj.material && obj.material.isMaterial) {
                const envMap = viewer.scene.environment;
                if (envMap) {
                  const mat = obj.material as Material & {
                    envMap?: any;
                    envMapIntensity?: number;
                    name?: string;
                    metalness?: number;
                    roughness?: number;
                    clearcoat?: number;
                    clearcoatRoughness?: number;
                    needsUpdate?: boolean;
                  };

                  mat.envMap = envMap;
                  mat.envMapIntensity = 1.0;
                  mat.needsUpdate = true;

                  if (
                    mat.name?.includes("anisotropic") ||
                    mat.metalness === 1
                  ) {
                    mat.roughness = 0.1;
                    mat.clearcoat = 0.5;
                    mat.clearcoatRoughness = 0.1;
                  }
                }
              }
            },
          );
        }

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
        setError(err instanceof Error ? err.message : "加载失败");
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
        background: "#1B1B1F",
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
};
