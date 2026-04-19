// src/shader/bloomShader.ts

export interface CustomGemBloomShaderUniforms {
  tDiffuse: { value: null };
  bloomStrength: { value: number };
  bloomThreshold: { value: number };
  blurSize: { value: number };
  // 添加索引签名以兼容 ShaderMaterialParameters
  [key: string]: { value: null | number };
}

export interface CustomGemBloomShaderType {
  uniforms: CustomGemBloomShaderUniforms;
  vertexShader: string;
  fragmentShader: string;
}

export const CustomGemBloomShader: CustomGemBloomShaderType = {
  uniforms: {
    tDiffuse: { value: null }, // 帧缓冲屏幕纹理
    bloomStrength: { value: 3.0 }, // 泛光强度
    bloomThreshold: { value: 0.6 }, // 宝石高光阈值
    blurSize: { value: 1.5 }, // 模糊半径
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #define PI 3.14159265
    #define COLOR_RANGE 24.0
    precision highp float;
    
    uniform sampler2D tDiffuse;
    uniform float bloomStrength;
    uniform float bloomThreshold;
    uniform float blurSize;
    varying vec2 vUv;

    // 高斯模糊5x5采样
    vec3 gaussianBlur(sampler2D tex, vec2 uv, vec2 step) {
      vec3 color = vec3(0.0);
      float weight[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
      for(int i = -2; i <= 2; i++) {
        color += texture2D(tex, uv + vec2(step.x * float(i), 0.0)).rgb * weight[abs(i)];
        color += texture2D(tex, uv + vec2(0.0, step.y * float(i))).rgb * weight[abs(i)];
      }
      return color;
    }

    // Reinhard专业色调映射
    vec3 jodieReinhardTonemap(vec3 c) {
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(c / (luma + 1.0), c / (c + 1.0), c);
    }

    void main() {
      vec2 texel = blurSize / vec2(1920.0, 1080.0);
      vec3 baseColor = texture2D(tDiffuse, vUv).rgb;
      
      // 宝石高光精准蒙版提取
      float brightness = dot(baseColor, vec3(0.299, 0.587, 0.114));
      float glowMask = smoothstep(bloomThreshold, bloomThreshold + 0.1, brightness);
      
      // 多级泛光叠加
      vec3 bloom = gaussianBlur(tDiffuse, vUv, texel) * glowMask;
      vec3 finalColor = baseColor + bloom * bloomStrength;
      
      // 伽马矫正 + 最终调色
      finalColor = pow(finalColor, vec3(1.0 / 2.2));
      finalColor = jodieReinhardTonemap(finalColor);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
