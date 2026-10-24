// Only migrate the approved umbrella and root-system work into the supplied project.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {buildUmbrella} from './umbrella.mjs';
import {buildDeepBlueRoots} from './deep-blue-roots.mjs';
import {buildBlueMaterials,blueComposite} from './blue-palette.mjs';
import {adaptSpineInstances} from './native-spine-adapter.mjs';
import {adaptSceneBackgrounds,footerBackground} from './scene-background.mjs';
import {hideTopNavigation,hideMusicControls} from './top-right-ui.mjs';
import {adaptShowRuntime,adaptShowShaders} from './show-adapter.mjs';

export async function buildMergedSceneAssets(root,write){
  const umbrella=await buildUmbrella(root),roots=buildDeepBlueRoots();
  await write('assets/geometry/daily/mizuki-umbrella.json',JSON.stringify(umbrella.data));
  await write('assets/geometry/daily/deep-blue-roots.json',JSON.stringify(roots.data));
  await buildBlueMaterials(root,write);
  await write(footerBackground,await fs.readFile(path.join(root,'src/assets/art/footer-background.png')));
  await write('assets/daily/show-controller.js',await fs.readFile(path.join(root,'src/show-controller.js')));
  await write('assets/daily/deep-blue-root-base.png',await sharp(path.join(root,'public/assets/images/pbr/alien_cracked_2_basecolor.png')).resize(1024,1024).removeAlpha().greyscale().linear(.72,48).png().toBuffer());
  await fs.writeFile(path.join(root,'.artifacts/mizuki-umbrella-stats.json'),JSON.stringify(umbrella.stats,null,2));
  await fs.writeFile(path.join(root,'.artifacts/mizuki-umbrella.obj'),umbrella.obj);
  await fs.writeFile(path.join(root,'.artifacts/deep-blue-roots-stats.json'),JSON.stringify(roots.stats,null,2));
  return{umbrella:umbrella.stats,roots:roots.stats};
}
export function adaptMergedSceneRuntime(app){return adaptShowRuntime(hideMusicControls(hideTopNavigation(adaptSceneBackgrounds(adaptSpineInstances(app,{mode:'whole'})))));}
export async function applyMergedSceneBindings(root,uil,changes){
  const fields=JSON.parse(await fs.readFile(path.join(root,'src/assets/merged-scene-bindings.json'),'utf8'));
  for(const[key,value]of Object.entries(fields)){
    assert.ok(key.includes('Work')||key.includes('TreeScene'),`越界的场景绑定：${key}`);
    changes.push({key,before:uil[key],after:value});uil[key]=value;
  }
}
export function applyMergedSceneShaders(bytes){return adaptShowShaders(blueComposite(adaptShowShaders(Buffer.from(bytes),{restore:true})).bytes);}
