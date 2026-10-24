// Node 构建阶段的有界装配适配。保留 vendor 基线与原 Shader，只将中央主体改为一个完整网格。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const START = 'Class((function SpineInstancer(';
const NEXT = 'Class((function SpineShader(';
const NATIVE_FRAGMENT_SHA256 = '080cd298e7ff86793041e2fbe21d733691f5e1365a7a0fd5bf564229f89f9460';
const NATIVE_LOOP = 'for(let i=0;i<40;i++){let mesh=_this.mesh.clone();mesh.position.set(0,0,0),mesh.position.y=-.65*i+4,mesh.rotation.y=.4*i,batch.add(mesh),meshes.push(mesh)}';
const WHOLE_LOOP = 'for(let i=0;i<1;i++){let mesh=_this.mesh.clone();mesh.position.set(0,0,0),mesh.position.y=0,mesh.rotation.y=0,batch.add(mesh),meshes.push(mesh)}';
const count = (text, needle) => text.split(needle).length - 1;

export function nativeSpineFragment(app) {
  assert.equal(count(app, START), 1, 'SpineInstancer 定位不唯一，停止适配');
  const start = app.indexOf(START), end = app.indexOf(NEXT, start);
  assert.ok(end > start, 'SpineShader 边界缺失，停止适配');
  const native = app.slice(start, end);
  assert.equal(createHash('sha256').update(native).digest('hex'), NATIVE_FRAGMENT_SHA256,
    '基线版本或字节已变化，请重新核对源码，勿绕过断言');
  assert.equal(count(native, NATIVE_LOOP), 1, '原实例循环未唯一匹配');
  return native;
}

export function adaptSpineInstances(app, { mode = 'module' } = {}) {
  assert.ok(['module', 'whole'].includes(mode), 'mode 必须是 module 或 whole');
  const native = nativeSpineFragment(app);
  if (mode === 'module') return app;
  // 仅完整主体模式更改实例数量与实例局部位置/旋转。
  // 沿用 clone 的 3.5 缩放、MeshBatch、材质、uniform 复制及 batch group 位置跟随。
  return app.replace(native, native.replace(NATIVE_LOOP, WHOLE_LOOP));
}

export function spineGeometryDescriptor(current, filename = 'replacement-spine.json') {
  assert.ok(current && current.src === 'assets/geometry/spine/spine.bin', '几何入口已偏离本次基线');
  assert.ok(/^[a-zA-Z0-9_-]+\.json$/.test(filename), '此模板只接受独立 JSON 文件名');
  return { ...current, filename, relative: 'assets/geometry/daily', src: `assets/geometry/daily/${filename}` };
}

