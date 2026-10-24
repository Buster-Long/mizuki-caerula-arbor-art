// These scenes use the same native fragment classes, but each instance can own
// a different sampler uniform. Never mutate ViewController/video.uniform.value.
import assert from 'node:assert/strict';

export const footerBackground = 'assets/daily/footer-background.png';
// Shader fragments finish their async onInit independently. Bind their own
// sampler too, so a later HomeLogoShader callback cannot restore the global one.
export const backgroundClasses = ['ParticleTest', 'HomeColumnShader', 'HomeLogoShader'];
const before = 'let video=await _this.get("ViewController/video");';
const after = before + 'if(_this.findParent("Footer"))video={uniform:{value:Utils3D.getTexture("' + footerBackground + '")}};';

export function adaptSceneBackgrounds(app, {restore = false, classes = backgroundClasses} = {}) {
  for (const name of classes) {
    const start = app.indexOf('Class((function ' + name + '(');
    assert.ok(start >= 0, `Missing native class ${name}`);
    const next = app.indexOf('Class((function ', start + 10);
    const end = next < 0 ? app.length : next;
    let block = app.slice(start, end);
    const from = restore ? after : before, to = restore ? before : after;
    assert.equal(block.split(from).length - 1, 1, `${name} background binding changed upstream`);
    block = block.replace(from, to);
    app = app.slice(0, start) + block + app.slice(end);
  }
  return app;
}
