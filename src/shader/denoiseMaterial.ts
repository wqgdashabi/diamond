// src/materials/DenoiseMaterial.ts

import { NoBlending, Texture } from "three";
import { MaterialBase, MaterialBaseParameters } from "./MaterialBase";

// src/materials/DenoiseMaterial.ts

export interface DenoiseMaterialUniforms {
  sigma: { value: number };
  threshold: { value: number };
  kSigma: { value: number };
  map: { value: Texture | null };
  opacity: { value: number };
  // 添加索引签名
  [key: string]: { value: number | Texture | null };
}

export interface DenoiseMaterialParameters extends MaterialBaseParameters {
  sigma?: number;
  threshold?: number;
  kSigma?: number;
  map?: Texture | null;
  opacity?: number;
}

export class DenoiseMaterial extends MaterialBase {
  // 类型声明 - uniforms 将被 MaterialBase 的 setValues 正确初始化
  declare uniforms: DenoiseMaterialUniforms;

  constructor(parameters?: DenoiseMaterialParameters) {
    super({
      blending: NoBlending,

      transparent: false,

      depthWrite: false,

      depthTest: false,

      defines: {
        USE_SLIDER: 0,
      },

      uniforms: {
        sigma: { value: 5.0 },
        threshold: { value: 0.03 },
        kSigma: { value: 1.0 },

        map: { value: null },
        opacity: { value: 1 },
      } as DenoiseMaterialUniforms,

      vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: /* glsl */ `
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //  Copyright (c) 2018-2019 Michele Morrone
        //  All rights reserved.
        //
        //  https://michelemorrone.eu - https://BrutPitt.com
        //
        //  me@michelemorrone.eu - brutpitt@gmail.com
        //  twitter: @BrutPitt - github: BrutPitt
        //
        //  https://github.com/BrutPitt/glslSmartDeNoise/
        //
        //  This software is distributed under the terms of the BSD 2-Clause license
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        uniform sampler2D map;

        uniform float sigma;
        uniform float threshold;
        uniform float kSigma;
        uniform float opacity;

        varying vec2 vUv;

        #define INV_SQRT_OF_2PI 0.39894228040143267793994605993439
        #define INV_PI 0.31830988618379067153776752674503

        // Parameters:
        //   sampler2D tex   - sampler image / texture
        //   vec2 uv         - actual fragment coord
        //   float sigma  >  0 - sigma Standard Deviation
        //   float kSigma >= 0 - sigma coefficient
        //       kSigma * sigma  -->  radius of the circular kernel
        //   float threshold   - edge sharpening threshold
        vec4 smartDeNoise(sampler2D tex, vec2 uv, float sigma, float kSigma, float threshold) {
          float radius = round(kSigma * sigma);
          float radQ = radius * radius;

          float invSigmaQx2 = 0.5 / (sigma * sigma);
          float invSigmaQx2PI = INV_PI * invSigmaQx2;

          float invThresholdSqx2 = 0.5 / (threshold * threshold);
          float invThresholdSqrt2PI = INV_SQRT_OF_2PI / threshold;

          vec4 centrPx = texture2D(tex, uv);
          centrPx.rgb *= centrPx.a;

          float zBuff = 0.0;
          vec4 aBuff = vec4(0.0);
          vec2 size = vec2(textureSize(tex, 0));

          vec2 d;
          for (d.x = -radius; d.x <= radius; d.x++) {
            float pt = sqrt(radQ - d.x * d.x);

            for (d.y = -pt; d.y <= pt; d.y++) {
              float blurFactor = exp(-dot(d, d) * invSigmaQx2) * invSigmaQx2PI;

              vec4 walkPx = texture2D(tex, uv + d / size);
              walkPx.rgb *= walkPx.a;

              vec4 dC = walkPx - centrPx;
              float deltaFactor = exp(-dot(dC.rgba, dC.rgba) * invThresholdSqx2) * invThresholdSqrt2PI * blurFactor;

              zBuff += deltaFactor;
              aBuff += deltaFactor * walkPx;
            }
          }

          return aBuff / zBuff;
        }

        void main() {
          gl_FragColor = smartDeNoise(map, vec2(vUv.x, vUv.y), sigma, kSigma, threshold);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <premultiplied_alpha_fragment>

          gl_FragColor.a *= opacity;
        }
      `,
    });

    if (parameters) {
      this.setValues(parameters);
    }
  }

  // Getter/Setter 方法提供更好的类型安全
  get sigma(): number {
    return this.uniforms.sigma.value;
  }

  set sigma(value: number) {
    this.uniforms.sigma.value = value;
  }

  get threshold(): number {
    return this.uniforms.threshold.value;
  }

  set threshold(value: number) {
    this.uniforms.threshold.value = value;
  }

  get kSigma(): number {
    return this.uniforms.kSigma.value;
  }

  set kSigma(value: number) {
    this.uniforms.kSigma.value = value;
  }

  get map(): Texture | null {
    return this.uniforms.map.value;
  }

  set map(value: Texture | null) {
    this.uniforms.map.value = value;
  }
}
