import assert from 'node:assert/strict';
const uniformBefore='uniform float uSizeBias;';
const uniformAfter=uniformBefore+'\nuniform float uShowActive;\nuniform vec4 uShowWave;';
const waveBefore='    ripple = pow(ripple, 2.0);';
const waveAfter=waveBefore+`
    // Reuse the native ripple's displacement, light, sparkle and refraction.
    float showVertical = exp(-pow((vWorldPos.y-uShowWave.x)/2.8, 2.0)) * uShowWave.y;
    float showRadial = exp(-pow((rippleDist-uShowWave.z)/1.8, 2.0)) * uShowWave.w;
    ripple = mix(ripple, max(showVertical, showRadial), uShowActive);`;
export function adaptShowShaders(bytes,{restore=false}={}) {
  const blocks=bytes.toString().split('{@}'),i=blocks.indexOf('ParticleTestShader.glsl');assert.ok(i>0);
  let b=blocks[i+1];
  for(const[id,before,after]of [['UNIFORMS',uniformBefore,uniformAfter],['WAVE',waveBefore,waveAfter]]){
    const marked='// MIZUKI_SHOW_'+id+'_BEGIN\n'+after+'\n// MIZUKI_SHOW_'+id+'_END';
    if(restore){if(b.includes(marked))b=b.replace(marked,before);}
    else{assert.ok(b.includes(before),'Native show ripple entry changed');b=b.replace(before,marked);}
  }
  blocks[i+1]=b;return Buffer.from(blocks.join('{@}'));
}
export function adaptShowRuntime(app){
  const before='_this.layers.particles.shader.addUniforms({uSizeBias:{value:attenuation}})';
  const after='_this.layers.particles.shader.addUniforms({uSizeBias:{value:attenuation},uShowActive:{value:0},uShowWave:{value:new Vector4(0,0,0,0)}})';
  assert.equal(app.split(before).length-1,1,'ParticleTest uniform setup changed');return app.replace(before,after);
}
