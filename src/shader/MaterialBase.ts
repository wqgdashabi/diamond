// src/materials/MaterialBase.ts

import { ShaderMaterial, ShaderMaterialParameters, IUniform } from "three";

export interface MaterialBaseParameters extends ShaderMaterialParameters {
  uniforms?: { [uniform: string]: IUniform };
  defines?: { [define: string]: any };
}

export class MaterialBase extends ShaderMaterial {
  // 声明 uniforms 类型，以便在子类中正确推断
  declare uniforms: { [uniform: string]: IUniform };

  constructor(shader: MaterialBaseParameters) {
    super(shader);

    // 为每个 uniform 动态创建 getter/setter
    for (const key in this.uniforms) {
      // 检查是否已经有自定义属性描述符
      const descriptor = Object.getOwnPropertyDescriptor(this, key);

      if (!descriptor || descriptor.configurable) {
        Object.defineProperty(this, key, {
          get(this: MaterialBase) {
            return this.uniforms[key].value;
          },
          set(this: MaterialBase, v: any) {
            this.uniforms[key].value = v;
          },
          configurable: true,
          enumerable: true,
        });
      }
    }
  }

  /**
   * 设置指定的 define 值，如果值不同则设置 needsUpdate 为 true
   * @param name - define 名称
   * @param value - define 值，如果为 undefined 或 null 则删除该 define
   * @returns 如果 define 值发生变化返回 true，否则返回 false
   */
  setDefine(name: string, value: any = undefined): boolean {
    if (value === undefined || value === null) {
      if (name in this.defines) {
        delete this.defines[name];
        this.needsUpdate = true;
        return true;
      }
    } else {
      if (this.defines[name] !== value) {
        this.defines[name] = value;
        this.needsUpdate = true;
        return true;
      }
    }

    return false;
  }

  /**
   * 批量设置多个 defines
   * @param defines - 要设置的 defines 对象
   * @returns 是否有任何 define 发生变化
   */
  setDefines(defines: Record<string, any>): boolean {
    let changed = false;

    for (const key in defines) {
      if (this.setDefine(key, defines[key])) {
        changed = true;
      }
    }

    return changed;
  }

  /**
   * 获取当前的 define 值
   * @param name - define 名称
   * @returns define 值，如果不存在返回 undefined
   */
  getDefine(name: string): any {
    return this.defines[name];
  }

  /**
   * 检查是否存在某个 define
   * @param name - define 名称
   * @returns 是否存在该 define
   */
  hasDefine(name: string): boolean {
    return name in this.defines;
  }

  /**
   * 删除指定 define
   * @param name - define 名称
   * @returns 如果成功删除返回 true，否则返回 false
   */
  deleteDefine(name: string): boolean {
    if (name in this.defines) {
      delete this.defines[name];
      this.needsUpdate = true;
      return true;
    }
    return false;
  }
}
