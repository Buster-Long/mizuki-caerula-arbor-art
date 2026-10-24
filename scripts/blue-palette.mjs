// 合并底稿为用户提供的压缩包Shader；不重置另一位AI的水母/CG/背景改动。
// 白 / 深蓝 / 浅蓝主题：复用原 FBR 与最终合成，仅适配材质输入和最终色彩映射。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const NATIVE_SHA='231e61a0eaaf4d5334c45bbd1648f2fc9affc09f19538300425de13297d349b8';
const sha=b=>createHash('sha256').update(b).digest('hex');
const patches=[
  {id:'FLOWER_NATIVE_SIZE',shader:'FlowerParticleShader.glsl',before:'    gl_PointSize = (0.0125) * DPR * 2.0 * vScale * (1000.0 / length(mvPosition.xyz)) * uSizeBias;',after:'    gl_PointSize = (0.0275) * DPR * 2.0 * vScale * (1000.0 / length(mvPosition.xyz)) * uSizeBias;'},
  {id:'AMBIENT_GRADIENT',shader:'GlobalComposite.fs',before:'    gradient = mix(gradient, uUIColor, uUIBlend * 0.75);',after:`    gradient = mix(gradient, uUIColor, uUIBlend * 0.75);
    gradient = mix(gradient, vec3(0.08, 0.36, 1.0), uChatOpen);`},
  {id:'AMBIENT_CORNER',shader:'GlobalComposite.fs',before:'    vec3 cornerColor = mix(vec3(0.15, 0.11, 0.25), mix(uUIColor, vec3(0.1), 0.8), uUIBlend * 0.9);',after:`    vec3 cornerColor = mix(mix(vec3(0.15, 0.11, 0.25), vec3(0.015, 0.065, 0.21), uChatOpen), mix(uUIColor, vec3(0.1), 0.8), uUIBlend * 0.9);`},
  {id:'FLOWER_BLUE',shader:'FlowerParticleShader.glsl',before:'    color.x += vCameraPos.y * 0.02 - 0.0;',after:`    // Retain native particle luminance, matcap, sparkle and motion; adapt its pigment only.
    color.x = 0.565 + 0.050 * (0.5 + 0.5 * sin(noise * 3.0 + vRandom.w * 6.28));
    color.y = clamp(color.y, 0.40, 0.78);`},
  {id:'ROOT_PARTICLE_COLOR',shader:'TreeParticleShader.glsl',before:'    vec3 color = vLightColor;',after:'    vec3 color = mix(vec3(0.025, 0.065, 0.16), vec3(0.25, 0.55, 0.85), pow(vRandom.z, 5.0));\n    if (vRandom.y < 0.65) discard;'},
  {id:'ROOT_PARTICLE_SIZE',shader:'TreeParticleShader.glsl',before:'    gl_PointSize = (0.05) * DPR * 2.0 * vScale * (1000.0 / length(mvPosition.xyz));',after:'    gl_PointSize = (0.014) * DPR * 2.0 * vScale * (1000.0 / length(mvPosition.xyz));'},
  {id:'ROOT_BLUE_LIGHT',shader:'TreeSceneComposite.fs',before:'    gl_FragColor = vec4(color, 1.0);',after:`    float blueRootLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 blueRootTone = mix(vec3(0.22, 0.50, 1.0), vec3(0.76, 0.91, 1.0), smoothstep(0.10, 0.72, blueRootLuma));
    color = mix(color, blueRootLuma * blueRootTone * 1.12, 0.67);
    gl_FragColor = vec4(color, 1.0);`}
];
export function blueComposite(bytes) {
  let normalized=bytes.toString().replace(/    \/\/ DAILY_BLUE_PALETTE_BEGIN[\s\S]*?    \/\/ DAILY_BLUE_PALETTE_END\n/,'');
  for(const p of patches){
    const expression=new RegExp('    // DAILY_'+p.id+'_BEGIN[\\s\\S]*?    // DAILY_'+p.id+'_END\\n');
    normalized=normalized.replace(expression,p.before+'\n');
  }
  assert.equal(sha(Buffer.from(normalized)),NATIVE_SHA,'原 Shader 基线指纹不符，停止配色适配');
  const blocks=normalized.split('{@}');
  for(const p of patches){
    const i=blocks.indexOf(p.shader);assert.ok(i>0);
    assert.ok(blocks[i+1].includes(p.before),p.id);
    blocks[i+1]=blocks[i+1].replace(p.before,'    // DAILY_'+p.id+'_BEGIN\n'+p.after+'\n    // DAILY_'+p.id+'_END');
  }
  return {bytes:Buffer.from(blocks.join('{@}')),originalSHA256:NATIVE_SHA};
}
export async function buildBlueMaterials(root,write) {
  const width=1024,height=1024;
  const base=await sharp(path.join(root,'public/assets/images/pbr/alien_cracked_2_basecolor.png')).resize(width,height).removeAlpha().raw().toBuffer();
  const output=Buffer.alloc(width*height*3);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=(y*width+x)*3,v=y/(height-1),u=x/(width-1),d=Math.abs(v-.5);
    let rgb=d>.38?[10,34,83]:d>.14?[91,157,212]:[210,226,241];
    if(d>.02&&d<.14){const stripe=((u*2+v*.75)%1+1)%1;if(stripe<.045)rgb=[16,46,99];else if(stripe<.16)rgb=[132,205,250];}
    const relief=.62+.38*(.2126*base[i]+.7152*base[i+1]+.0722*base[i+2])/255;
    for(let c=0;c<3;c++)output[i+c]=Math.round(rgb[c]*relief);
  }
  await write('assets/daily/umbrella-blue-base.png',await sharp(output,{raw:{width,height,channels:3}}).png().toBuffer());
  for(const [source,target,kind] of [['assets/images/room/matcap-test.jpg','umbrella-blue-matcap.png','matcap'],['assets/images/pbr/cliffs_MRO.png','umbrella-blue-mro.png','mro']]) {
    const {data,info}=await sharp(kind==='matcap'?path.join(root,'src/assets/umbrella-native-matcap.jpg'):path.join(root,'public',source)).removeAlpha().raw().toBuffer({resolveWithObject:true});
    // 保留 Matcap 原亮度和高频变化，只收窄色相；MRO 三个物理通道逐值保留。
    if(kind==='matcap')for(let i=0;i<data.length;i+=info.channels)
      for(let c=0;c<3;c++)data[i+c]=Math.round(32+data[i+c]*.84);
    await write('assets/daily/'+target,await sharp(data,{raw:info}).png().toBuffer());
  }
}
