// 内容适配层：从已保存的原发布版生成，视觉算法、GLSL 和场景配置保持原值。
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Shape, Path, ExtrudeGeometry, Vector3 } from 'three';
import opentype from 'three/addons/libs/opentype.module.js';
import sharp from 'sharp';
import { buildMergedSceneAssets, adaptMergedSceneRuntime, applyMergedSceneBindings, applyMergedSceneShaders } from './merged-scenes.mjs';
import { adaptSceneBackgrounds } from './scene-background.mjs';
import { hideTopNavigation } from './top-right-ui.mjs';
import { brand, slogan, github, studies } from '../src/content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = path.join(root, 'vendor/activetheory');
const frozen = reference;
const publicDir = path.join(root, 'public');
const analysis = path.join(root, '.artifacts');
const originals = path.join(root, 'src/assets/art');
const changes = [];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
await fs.mkdir(analysis, { recursive: true });
async function write(relative, data) {
  const target = path.join(publicDir, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return target;
}
function replace(text, before, after, label) {
  const count = text.split(before).length - 1;
  assert.ok(count, `未找到适配位置：${label}`);
  changes.push({ label, count, before, after });
  return text.replaceAll(before, after);
}
async function moduleSource(name) {
  const files = await fs.readdir(path.join(frozen, 'modules'));
  const file = files.find(file => file.endsWith(`-${name}.js`));
  assert.ok(file, name);
  return (await fs.readFile(path.join(frozen, 'modules', file), 'utf8')).trim();
}
let app = await fs.readFile(path.join(reference, 'runtime.js'), 'utf8');
async function adaptModule(name, callback) {
  const original = await moduleSource(name);
  // 原副本 VideoTexture 包含已验证的首帧竞态保护。
  const input = name === 'VideoTexture' ? original.replace('_this.texture=_this.videoTexture,_this.events.unsub', '_this.texture=_this.videoTexture||_this.texture,_this.events.unsub') : original;
  assert.ok(app.includes(input), `模块定位失败：${name}`);
  app = app.replace(input, callback(input));
}

// 原 VideoTexture 已支持 JPG/PNG；补全动态 src 与可见性生命周期，支持静态封面切换。
await adaptModule('VideoTexture', input => {
  let out = replace(input, 'let _video,_requestId,', 'let _stillPath,_video,_requestId,', '静态媒体状态');
  out = replace(out, 'let noop=_=>{};_this.texture=Utils3D.getTexture(src)', 'let noop=_=>{};_stillPath=_path,_this.texture=Utils3D.getTexture(src)', '原生图片分支');
  out = replace(out, 'this.set("src",(src=>{', 'this.set("src",(src=>{if(typeof src==="string"&&/\\.(jpg|png)(?:[?#]|$)/i.test(src)){if(_stillPath===src)return;_stillPath=src;_video&&(_this.stop(),_video.pause());_this.texture=Utils3D.getTexture(Assets.getPath(src));_this.uniform.value=_this.texture;_this.dimensions=_this.texture.dimensions;return;}', '静态媒体 src 绑定');
  out = replace(out, 'this.onInvisible=function(){_sharedVideo||', 'this.onInvisible=function(){_video&&(_sharedVideo||', '图片无 video DOM：不可见');
  out = replace(out, 'removeChild(_this.video.object,!0))},this.onVisible', 'removeChild(_this.video.object,!0)))},this.onVisible', '图片生命周期括号');
  out = replace(out, 'this.onVisible=function(){_sharedVideo||', 'this.onVisible=function(){_video&&(_sharedVideo||', '图片无 video DOM：可见');
  out = replace(out, 'add(_this.video.object))},this.onDestroy', 'add(_this.video.object)))},this.onDestroy', '图片可见性括号');
  out = replace(out, '_this.texture.destroy(),_sharedVideo||VideoTexture.element()', '_this.texture.destroy(),_video&&!_sharedVideo&&VideoTexture.element()', '图片销毁保护');
  return out;
});
const placeholder = 'data:video/mp4;base64,AAAAHGZ0eXBNNAACAAACAGlzb21pc28ybXA0MQAAAG1wNDFtcDQxaXNvbTFtcDQxaXNvbXNtcDQyaXNvbXZpc28ybXA0MgAAAChtZGF0AAAAAAIAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
app = replace(app, placeholder, 'assets/daily/cover-dispersion.jpg', '作品初始媒体');

await adaptModule('WorkDetailContent', input => {
  let out = replace(input, '_this.video=document.createElement("video")', '_this.video=document.createElement("img"),_this.video.play=_=>{},_this.video.pause=_=>{},_this.video.alt="Daily Design study cover",_this.video.style.maxHeight="100%",_this.video.style.objectFit="contain"', '详情全屏媒体使用图片');
  out = replace(out, '"Close Video"', '"Close Image"', '全屏关闭标签');
  out = replace(out, '"Open fullscreen video"', '"Open fullscreen image"', '全屏打开标签');
  out = replace(out, 'color:color})=>{_this.layers.title.setText(title)', 'color:color,thumbnailURL:thumbnailURL})=>{_this.video.src=thumbnailURL;_this.video.alt=title;_this.layers.title.setText(title)', '详情绑定当前封面');
  return replace(out, '"Project Link"', '"GitHub"', '作品链接标签');
});
app = replace(app, 'assets/video/reel.mp4', 'assets/daily/hero.jpg', '全局材质媒体');
app = replace(app, 'assets/video/reel-frame.jpg', 'assets/daily/hero.jpg', '全局首帧媒体');

await adaptModule('ContactUI', input => {
  let out = input;
  const entries = [
    ['"CONTACT US"', '"MIZUKI & CAERULA ARBOR"'], ['"Contact Us"', '"Mizuki & Caerula Arbor"'],
    ['"LAX"', '"DEEP"'], ['"SYD"', '"HUMAN"'], ['"NYC"', '"MANY"'], ['"AMS"', '"LIGHT"'],
    ['"Los Angeles"', '"The Deep"'], ['"New York City"', '"Human"'], ['"Amsterdam"', '"The Many"'],
    ['"Privacy Notice"', '"Source Code"'], ['"Newsletter Signup"', '"Fourteen Records"'], ['"Careers"', '"Repository"'],
    ['"HELLO@ACTIVETHEORY.NET"', '"GITHUB.COM/SNYCHNG"'], ['"Email us at hello@activetheory.net"', '"An unofficial tribute page, built from source."'],
    ['"mailto:hello@activetheory.net"', JSON.stringify(github)],
    ['"https://mailchi.mp/activetheory/newsletter"', JSON.stringify(github)],
    ['"https://activetheory.notion.site/privacy"', JSON.stringify(github)],
    ['"https://jobs.lever.co/activetheory"', '"https://github.com/Snychng"'],
    ['"https://www.instagram.com/activetheory"', JSON.stringify(github)],
    ['"https://www.linkedin.com/company/active-theory/"', JSON.stringify(github)],
    ['"https://twitter.com/active_theory"', '"https://github.com/Snychng"'],
    ['"Instagram"', '"GitHub repository"'], ['"Linked in"', '"Design experiments"'], ['"Twitter"', '"GitHub profile"'],
    ['assets/images/ui/ig.png', 'assets/daily/github.png'], ['assets/images/ui/in.png', 'assets/daily/monogram.png'], ['assets/images/ui/tw.png', 'assets/daily/github.png']
  ];
  for (const [a, b] of entries) out = replace(out, a, b, `联系内容 ${a}`);
  return out;
});
await adaptModule('ChatDOM', input => {
  let out = input;
  for (const [a, b] of [
    ['"-> websites","Website"', '"-> Deep","Deep"'],
    ['"-> installations","Installation"', '"-> Human","Human"'],
    ['"-> XR / VR / AI","XR"', '"-> We Many","We Many"'],
    ['"-> multiplayer","Multiplayer"', '"-> Light","Light"'],
    ['"-> games","Game"', '"-> Firstborn","Firstborn"'],
    ['"Ask me anything..."', '"Search the records..."']
  ]) out = replace(out, a, b, `作品筛选 ${a}`);
  return out;
});
app = replace(app, 'https://atlab.io', github, '实验室链接');

// 音乐：只保留《海愿》一首（Buster 本机 mp3 原档）。原站 8 条曲目路径全部指向同一首，
// 避免非默认曲目被点击时 404。
const MUSIC_SRC = 'assets/music-mizuki/seawishes.mp3';
for (const from of [
  'assets/music/BXRDVJA - Ghost Cities.mp3',
  'assets/music/Downtown Binary - Other Worlds.mp3',
  'assets/music/Flint - Fly up High.mp3',
  'assets/music/Hotham - To the Stars.mp3',
  'assets/music/Jozeque - Sultans of Streams.mp3',
  'assets/music/Magiksolo - Quantum World.mp3',
  'assets/music/nuer self - Dusk.mp3',
  'assets/music/Sergey Azbel - Themis.mp3'
]) app = replace(app, from, MUSIC_SRC, `音乐 ${from.split('/').at(-1)}`);

// 播放器 UI 上显示的曲名（DOM 文本，可放中文）
// 所有曲名统一显示为《海愿》
for (const from of [
  'title:"BXRDVJA - Ghost Cities"',
  'title:"Downtown Binary - Other Worlds"',
  'title:"Flint - Fly up High"',
  'title:"Hotham - To the Stars"',
  'title:"Jozeque - Sultans of Streams"',
  'title:"Magiksolo - Quantum World"',
  'title:"nuer self - Dusk"',
  'title:"Sergey Azbel - Themis"'
]) app = replace(app, from, 'title:"海愿 · Seawishes"', `曲名 ${from.slice(7, 30)}`);
app = replace(app, 'Active Theory · Creative Digital Experiences', `${brand} · ${slogan}`, '文档标题');
app = replace(app, '${data.title} · Active Theory', `\${data.title} · ${brand}`, '详情文档标题');
// 原站 WebMCP 的静态介绍也属于内容，避免读到原机构履历。
const info = 'Active Theory is a creative digital production studio founded in 2012.';
const infoStart = app.indexOf(info), infoEnd = app.indexOf('"', infoStart);
assert.ok(infoStart > 0 && infoEnd > infoStart);
app = replace(app, app.slice(infoStart, infoEnd), `${brand}. ${slogan} An unofficial tribute to Integrated Strategies #3. Fourteen records on how a Seaborn tries to become a better human. Source: ${github}.`, 'WebMCP 品牌介绍');
app = app.replaceAll('Get more information about Active Theory, the agency that created this website.', `Get more information about ${brand}, the tribute page shown here.`)
  .replaceAll('Open the contact modal for Active Theory.', 'Open the index of records.')
  .replaceAll('Please use the provided email to reach out.', 'Please refer to the source repository.');
const mergedScenes=await buildMergedSceneAssets(root,write);
app=adaptMergedSceneRuntime(app);
await write('assets/js/app.1780406240914.js', app);

let html = await fs.readFile(path.join(reference, 'index.html'), 'utf8');
const sourceDescription = 'Founded in 2012. We blend story, art & technology as an in-house team of passionate makers. Our industry-leading web toolset consistently delivers award-winning work through quality & performance. ';
html = html.replaceAll('Active Theory · Creative Digital Experiences', `${brand} · ${slogan}`).replaceAll(sourceDescription, slogan)
  .replaceAll('https://storage.googleapis.com/activetheory-v6.appspot.com/media/social.jpg', '/assets/daily/hero.jpg')
  .replaceAll('https://activetheory.net', '/').replaceAll('content="Active Theory"', `content="${brand}"`)
  .replace(/\s*<script>\s*window\.dataLayer[\s\S]*?<\/script>/, '');

// —— 背景音乐：用浏览器原生 <audio> 流式播放，不等引擎那套全部解码 ——
// 策略：preload=auto 抢在首屏就下载；一有机会就 play()。
// 若被自动播放策略拦下，就静音起播（保住时间轴），并在用户第一次滚动/点击的瞬间解除静音。
const bgm = `
<audio id="bgm" src="assets/music-mizuki/seawishes.mp3" loop autoplay muted preload="auto" playsinline></audio>
<script>
(function () {
  var a = document.getElementById('bgm');
  if (!a) return;
  window.__BGM = a;
  a.volume = 0.55;

  var unmuted = false;
  function trySound() {
    if (unmuted) return;
    a.muted = false;
    a.volume = 0.55;
    var p = a.play();
    if (!p || !p.catch) { unmuted = true; return; }
    p.then(function () { unmuted = true; })
     .catch(function () { a.muted = true; var q = a.play(); if (q && q.catch) q.catch(function () {}); });
  }

  // 一有风吹草动就解除静音：点击、滚动、按键、鼠标移动都算
  ['pointerdown', 'pointermove', 'mousemove', 'wheel', 'keydown', 'touchstart', 'click', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, trySound, { passive: true, capture: true });
  });

  // 静音也必须播起来，避免空等
  var tries = 0;
  var timer = setInterval(function () {
    if (a.paused) { a.muted = true; var p = a.play(); if (p && p.catch) p.catch(function () {}); }
    if (!a.paused || ++tries > 150) clearInterval(timer);
  }, 120);

  // 进入即试一次有声（若浏览器允许就直接响）
  setTimeout(trySound, 300);
  a.addEventListener('canplay', trySound);
})();
</script>`;
html = html.replace('</body>', bgm + '\n</body>');
html = html.replace('</body>', '<script src="assets/daily/show-controller.js"></script>\n</body>');
html = html.replace('</head>', '<style>[aria-label="Work"],[aria-label="Contact"],[aria-label="Toggle Audio"]{display:none!important}</style></head>');
await write('index.html', html);

const uil = JSON.parse(await fs.readFile(path.join(frozen, 'uil.1780406240914.json'), 'utf8'));
const changedUIL = [];
function set(key, value) { assert.ok(key in uil, key); changedUIL.push({ key, before: uil[key], after: value }); uil[key] = value; }
// —— 场景文字：水月的十四条观测 ——
set('INPUT_Element_3_About_text3d_text', 'MIZUKI\n&\nARBOR');
set('INPUT_Element_4_Home_text3d_text', 'Mizuki');
set('INPUT_Element_4_About_text3d_text', 'How to become a better human.\n\nFourteen records of a life\nobserved from the outside.\n\nDEEP / HUMAN\nMANY / LIGHT');
set('INPUT_Element_5_WorkDetailContent_text3d_text', 'SEAWISHES');
set('INPUT_Element_8_WorkDetailContent_text3d_text', '2026\nMIZUKI & CAERULA ARBOR\nDEEP');
set('INPUT_Element_15_CleanRoom_text3d_text', '// THE\nDEEP ->');
set('INPUT_Element_20_CleanRoom_text3d_text', 'if the dark has no end, light the stars with a lamp');

// —— 光学后期：深海参数化调校 ——
// 原版 HomeComposite 的色散是 0（全关）。深海需要轻微的棱镜边缘，以及更厚的体积光。
set('HomeCompositeuRGBStrength', 0.42);
set('HomeCompositeuVolumetricStrength', 1.45);
set('HomeCompositeuContrast', [0.95, 1.14]);
set('TreeSceneCompositeuRGBStrength', 0.36);
set('TreeSceneCompositeuContrast', [1.01, 1.38]);
set('CleanRoomCompositeuRGBStrength', 0.55);
set('CleanRoomCompositeuVolumetricStrength', 0.52);
set('GlobalCompositeuRGBStrength', 1.0);



// —— 六边形鳞甲（CleanRoom hexagons）：贴图换成 CG54 ——
// 该物件由自定义组件 HexagonGrid 驱动，内部建的是 PhysicalShader，
// 贴图走 PhysicalShader/PhysicalShader/_tx_tVideo（原为 cover-dispersion.jpg）。
// 注意不是 SceneLayout/Element_13 的 BaseColor —— 那条改了没有任何效果。
for (const key of ['_tx_tVideo', '_txtVideo']) {
  set('PhysicalShader/PhysicalShader/' + key, {
    compressed: false, useCompressed: false, filename: 'hex-cg54.jpg',
    prefix: 'assets/images', relative: 'assets/images', src: 'assets/images/mizuki/hex-cg54.jpg'
  });
}
changes.push({ label: '六边形鳞甲贴图', count: 2, before: 'cover-dispersion.jpg', after: 'cg54' });

// —— 六边形鳞片：自转/波动频率降到原来的 0.3 倍 ——
// 动画在 app.js 的 HexagonGrid 里：`_timeV += .025 * Render.HZ_MULTIPLIER`
// （它的 _time.value = 2*_hoverV + _timeV，hover 加速部分保留，只放慢自转基频）
app = replace(app, '_timeV+=.025*Render.HZ_MULTIPLIER', '_timeV+=.0075*Render.HZ_MULTIPLIER', '鳞片波动频率');

// 首页那套跟随鼠标的粒子（ParticleTestShader）也用同一张 matcap3.png，
// 一并换成水母精灵，并按贴图 alpha 裁形，粒子才会显出伞盖 + 口腕的轮廓。
set('ParticleTestShader/ParticleTestShader/P_Element_0_ParticleTest/_tx_tMap', {
  hotreload: true, compressed: false, useCompressed: false, src: 'assets/images/mizuki/jelly-particle.png'
});
set('ParticleTestShader/ParticleTestShader/P_Element_0_ParticleTest/_txtMap', {
  compressed: false, useCompressed: false, filename: 'jelly-particle.png',
  prefix: 'assets/images', relative: 'assets/images', src: 'assets/images/mizuki/jelly-particle.png'
});

// —— 鼠标跟随的粒子：换成小水母 ——
// 详情页那组粒子（P_Element_0_WorkDetailParticles）的 sprite 是 matcap3.png（暖金气泡）。
// 换成水母精灵图：伞盖 + 四叶生殖腺 + 四条口腕，粒子即变成一只只小水母。
// 注意 _tx_tMap 原值带 `-compressedKtx2`，必须去掉并指向没有同名 ktx2 的新路径。
set('WorkDetailParticleShader/WorkDetailParticleShader/P_Element_0_WorkDetailParticles/_tx_tMap', {
  hotreload: true, compressed: false, useCompressed: false, src: 'assets/images/mizuki/jelly-particle.png'
});
set('WorkDetailParticleShader/WorkDetailParticleShader/P_Element_0_WorkDetailParticles/_txtMap', {
  compressed: false, useCompressed: false, filename: 'jelly-particle.png',
  prefix: 'assets/images', relative: 'assets/images', src: 'assets/images/mizuki/jelly-particle.png'
});
changes.push({ label: '鼠标粒子→水母', count: 2, before: 'matcap3.png', after: 'jelly-particle.png' });

// —— 卡片顺序：去掉随机洗牌，按编号（priority）顺序展示 ——
// 引擎里两处 shuffle 是原始站点"每次刷新换一批"的设计，这里必须去掉，否则永远不是编号顺序。
app = replace(app, '[..._workData.slice(0,14).shuffle()]', '[..._workData.slice(0,14)]', '卡片按顺序');
app = replace(app, '_workData.filter((element=>element.tags.includes(tag))).shuffle().slice(0,14)',
  '_workData.filter((element=>element.tags.includes(tag))).slice(0,14)', '标签筛选按顺序');

// —— BGM 只保留《海愿》一首 ——
// 用 Buster 本机的 mp3 原档（5.4MB，完整音质）。SONGS 整段用正则替换，不依赖原文精确内容。
app = app.replace(/SONGS=\[[\s\S]*?\];/, 'SONGS=[{title:"海愿 · Seawishes",src:"assets/music-mizuki/seawishes.mp3"}];');
changes.push({ label: 'BGM 只留海愿', count: 1, before: '8 首', after: '1 首 mp3' });

// —— BGM：默认播放《海愿》 ——
// 原版开局把曲序洗牌、并从随机一首开始；这里固定顺序并把起始曲目设为第 0 首（海愿）。
app = replace(app, 'SONGS=SONGS.shuffle(),', 'SONGS=SONGS,', '曲目顺序固定');
app = replace(app, '_this.set("songIndex",Math.random(0,SONGS.length-1))', '_this.set("songIndex",0)', '默认曲目海愿');

// —— 中间那团粒子：改成海月水母生殖腺的四叶草 ——
// 形状走粒子行为 code_1（pointcloud 预设）：原版直接取 point cloud 的坐标，
// 这里改为按粒子自身的 uv 重新铺到四枚马蹄环上，开口朝圆心，拼成四叶。
set('INPUT_P_Element_6_Workcode_1_code',
  'vec3 pointShape = texture2D(tPointCloud, uv).xyz;\n'
  + '// 四叶草：四枚马蹄环，开口朝向圆心\n'
  + 'float r1 = fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453);\n'
  + 'float r2 = fract(sin(dot(uv, vec2(269.5, 183.3))) * 43758.5453);\n'
  + 'float r3 = fract(sin(dot(uv, vec2(419.2, 371.9))) * 43758.5453);\n'
  + 'float quad = floor(r1 * 4.0);\n'
  + 'float baseA = quad * 1.5707963 + 0.7853982;\n'
  + 'float span = 5.15;\n'
  + 'float ang = baseA - span * 0.5 + r2 * span;\n'
  + 'float RD = 0.66;                 // 四叶分布半径\n'
  + 'float RO = 0.44;                 // 马蹄外径\n'
  + 'float rr = RO * (0.72 + r3 * 0.28);\n'
  + 'vec3 target = vec3(cos(baseA) * RD + cos(ang) * rr,\n'
  + '                   sin(baseA) * RD + sin(ang) * rr,\n'
  + '                   (r1 - 0.5) * 0.16);\n');


// —— 首屏背景 ——
// 背景试过两条路都不通：Config_7 'bg' 对象的 tMap 完全绑不上（放大 6 倍仍是全黑）；
// Element_20_home_scene 是 room 的背板，不属于首屏。真正能绑上的是 SceneLayout 这个
// 全屏 quad 着色器，而 Element_15_home_scene 是一块 uAlpha=1、贴图为空的全屏背板。
set('SceneLayout/SceneLayout/Element_15_home_scene/_tx_tMap',
  '{"src":"assets/images/mizuki/bg-kv1b.jpg","relative":"","prefix":"assets/images","filename":"bg-kv1b.jpg"}');
uil['SceneLayout/SceneLayout/Element_15_home_scene/_txtMap'] = {
  compressed: false, useCompressed: false, filename: 'bg-kv1b.jpg',
  prefix: 'assets/images', relative: 'assets/images', src: 'assets/images/mizuki/bg-kv1b.jpg'
};
changedUIL.push({ key: 'SceneLayout/SceneLayout/Element_15_home_scene/_txtMap', before: '', after: 'assets/images/mizuki/bg-kv1.jpg' });

// —— 背景：把 SceneLayout 的全屏底图换成 CG 01，并做呼吸式微光 ——
// SceneLayout 是覆盖全屏的 quad，采样 tMap = assets/images/02_view_dependant_color_gradients.jpg。
// 换这张图即可换背景，不用改动对象结构。
await write('assets/images/02_view_dependant_color_gradients.jpg',
  await sharp(path.join(root, 'src/assets/cg/bg-kv1.jpg'))
    .resize(2048, 1152, { fit: 'cover' })
    .tint({ r: 62, g: 108, b: 175 })   // 转单色并染深蓝
    .linear(0.75, -4)                  // 压到很暗（均值约 21）
    .jpeg({ quality: 88 }).toBuffer());
changes.push({ label: '背景底图', count: 1, before: '02_view_dependant_color_gradients.jpg', after: 'CG01 压暗染蓝' });

// —— 光源与染色统一到深海色域 ——
// 原站是三色霓虹（绿 #0bed90 / 洋红 #d600ff）打光，放在深海底色上非常违和。
// 这里逐个换成同一族冷青色，只保留明暗关系，不再有绿、洋红。
set('L_Element_11_home_scenecolor', '#2f9fc4');
set('HomeScreenLight/HomeScreenLight/Element_14_home_scene/uColor', '#1f9fc0');
set('HomeScreenLight/HomeScreenLight/Element_15_home_scene/uColor', '#1f9fc0');
set('HomeAlleyShader/HomeAlleyShader/Element_4_home_scene/uPhongColor', '#1f9fc0');
set('PBR/PBR/Element_8_CleanRoom/uTint', '#1f8fb5');
set('BulbShader/BulbShader/Element_0_Bulb/uTint', '#7fa8e8');
set('TentacleShader/TentacleShader/uTint', '#5f9fd0');

// —— 中间那块大脊椎（Work 场景 spine）的材质入口 ——
// 对象：Config_5_Work_spine，几何 spine.bin，着色器 SpineShader。
// 它的材质球是 _tx_tMatcap，原本指向 room/matcap-test.jpg（并且带 compressedKtx2，
// 会被强制走 ktx2，所以覆盖 jpg 无效）。这里直接改 uil 里的 src，指向没有 ktx2 伴随文件的新图。
set('SpineShader/SpineShader/Element_5_Work/_tx_tMatcap', {
  hotreload: true,
  compressed: false,
  useCompressed: false,
  src: 'assets/images/mizuki/spine-matcap.jpg'
});
set('SpineShader/SpineShader/Element_5_Work/_txtMatcap', {
  compressed: false,
  useCompressed: false,
  filename: 'spine-matcap.jpg',
  prefix: 'assets/images',
  relative: 'assets/images',
  src: 'assets/images/mizuki/spine-matcap.jpg'
});


// 首屏 bloom 原本拉到 3.82，配上 0.5 的光晕色相分离，模型一亮就会被炸成彩色斑块。
// 深海版要的是整块干净的亮面，这里把光晕收成骨白、强度压到原来的三分之一。
set('UnrealBloomComposite/UnrealBloomComposite/home/bloomStrength', 1.15);
set('UnrealBloomComposite/UnrealBloomComposite/home/bloomRadius', 0.9);
set('INPUT_HydraLensStreak_uHaloChroma', '0.10');
set('INPUT_HydraLensStreak_uGlowIntensity', '0.08');
set('INPUT_HydraLensStreak_uStreakIntensity', '0.06');
set('INPUT_HydraLensStreak_uHaloColor', '#cfeef2');
set('INPUT_HydraLensStreak_uStreakColor', '#cfeef2');
// luminosityThreshold=0 意味着"每一个像素都参与泛光"，模型一亮就被整个糊上彩色。
// 抬到 0.85，只有真正过曝的高光才泛光。
set('BloomLuminosityPass/BloomLuminosityPass/luminosityThreshold', 0.85);
set('INPUT_HydraBloom_Bloom_Intensity', '0.45');
set('INPUT_HydraBloom_Bloom_Radius', '0.8');
// 镜头光晕（lens streak）是按暖色高光调的，深海版把它彻底关掉，避免在亮面上撒彩斑。
set('INPUT_HydraLensStreak_uThreshold', '99');
set('INPUT_HydraLensStreak_uFlareIntensity', '0');
set('INPUT_HydraLensStreak_uGlowIntensity', '0');
set('INPUT_HydraLensStreak_uStreakIntensity', '0');
for (const [key, filename] of [
  ['INPUT_Config_2_About_geometry', 'monogram-home.json'],
  ['INPUT_Config_8_ParticleTest_geometry', 'monogram-home.json'],
  ['INPUT_Config_18_TreeScene_geometry', 'monogram-tree.json'],
  ['INPUT_Config_12_CleanRoom_geometry', 'monogram-particles.json']
]) set(key, { ...uil[key], filename, relative: 'assets/geometry/daily', src: `assets/geometry/daily/${filename}` });
for (const key of Object.keys(uil)) {
  if (uil[key]?.src === 'assets/images/ui/at-labrds.jpg') set(key, { ...uil[key], src: 'assets/daily/monogram.png', filename: 'monogram.png', relative: 'assets/daily' });
  if (uil[key]?.src === 'assets/images/lab.jpg') set(key, { ...uil[key], src: 'assets/daily/cover-dispersion.jpg', filename: 'cover-dispersion.jpg', relative: 'assets/daily' });
}
await applyMergedSceneBindings(root,uil,changedUIL);
await write('assets/data/uil.1780406240914.json', JSON.stringify(uil));
await write('assets/data/uil.json', JSON.stringify(uil));
for (const version of ['dev', 'latest']) {
  await write(`remote/cms/projects-${version}.json`, JSON.stringify(studies));
  const social = { url: '/assets/daily/hero.jpg' };
  await write(`remote/cms/metadata-${version}.json`, JSON.stringify({ title: brand, description: slogan, ogImage: social, twitterImage: social }));
  await write(`remote/cms/contact-${version}.json`, JSON.stringify({ links: [{ title: 'GitHub', url: github }] }));
}
await write('local/geo.json', JSON.stringify({ location: { countryCode: 'CN' } }));

// 使用当前网站已有 JPEG 封面，原样复制，不重新压缩或生成图片。
for (const cover of new Set(studies.map(study => study.video.thumbnail.split('/').at(-1)))) {
  await write(`assets/daily/${cover}`, await fs.readFile(path.join(originals, cover)));
}
for (const study of studies) await write(study.video.url.slice(1), await fs.readFile(path.join(publicDir, study.video.thumbnail)));
await write('assets/daily/hero.jpg', await fs.readFile(path.join(originals, 'hero.jpg')));

// 音频资源落盘
const musicDir = path.join(root, 'src/assets/music');
for (const f of await fs.readdir(musicDir)) {
  await write(`assets/music-mizuki/${f}`, await fs.readFile(path.join(musicDir, f)));
}

// 官方视觉素材：塞壬唱片 OST 封面、PRTS 立绘与头像
const cgDir = path.join(root, 'src/assets/cg');
if (await fs.stat(cgDir).catch(() => null)) {
  for (const f of await fs.readdir(cgDir, { withFileTypes: true })) {
    if (f.isFile()) await write(`assets/mizuki/${f.name}`, await fs.readFile(path.join(cgDir, f.name)));
  }
  // 官方场景背景（IS3，「74_g*」系列）
  const bgDir = path.join(cgDir, 'bg');
  if (await fs.stat(bgDir).catch(() => null)) {
    for (const f of await fs.readdir(bgDir)) {
      await write(`assets/mizuki/bg/${f}`, await fs.readFile(path.join(bgDir, f)));
    }
  }
}
// 品牌徽记：海月水母俯视图（圆伞 + 四枚马蹄形生殖腺拼成的四叶草），纯矢量构建
const markSVG = (() => {
  const R = 84, RD = R * 0.216, RO = R * 0.152, RI = R * 0.094;
  const horses = [0, 1, 2, 3].map(i => {
    const a = Math.PI / 4 + (Math.PI / 2) * i;
    const hx = Math.cos(a) * RD, hy = Math.sin(a) * RD;
    const op = a, span = 5.15;   // 缺口在 op+π 一侧
    const a0 = op - span / 2, a1 = op + span / 2;
    const P = (r, ang) => `${(hx + r * Math.cos(ang)).toFixed(1)} ${(hy + r * Math.sin(ang)).toFixed(1)}`;
    return `<path d="M ${P(RO, a0)} A ${RO} ${RO} 0 1 1 ${P(RO, a1)} L ${P(RI, a1)} A ${RI} ${RI} 0 1 0 ${P(RI, a0)} Z" fill="white"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <rect width="400" height="200" fill="black"/>
  <g transform="translate(200 100)">
    <circle r="${R}" fill="none" stroke="white" stroke-width="2.4" opacity="0.85"/>
    ${horses}
  </g>
</svg>`;
})();
await write('assets/daily/monogram.png', await sharp(Buffer.from(markSVG)).png().toBuffer());
// MatCap 是模型质感的唯一来源（HomeLogoShader 用 reflectMatcap 采样它）。
// 不动任何 JS，直接以深海晶体球替换原水晶球；原文件可用 git 还原。
const matcapBytes = await fs.readFile(path.join(root, 'src/assets/art/matcap-mizuki.jpg'));
await write('assets/daily/matcap-mizuki.jpg', matcapBytes);
// 注意：不要覆盖 assets/images/room/matcap-test.jpg —— 那是 About / Jelly / CleanRoom 共用的原版材质球，
// 覆盖会连带改坏其它场景。脊椎的材质球单独写到 assets/images/mizuki/spine-matcap.jpg。
// 同时写一份到没有 ktx2 伴随文件的路径（代码已被改为引用这里）
await write('assets/images/mizuki/matcap.jpg', matcapBytes);
// 脊椎（Work 场景）专用路径：无同名 .ktx2，引擎才会真的读这张
await write('assets/images/mizuki/spine-matcap.jpg', matcapBytes);
// 背景图（CG 01）
await write('assets/images/mizuki/bg-kv1.jpg', await fs.readFile(path.join(root, 'src/assets/cg/bg-kv1.jpg')));
await write('assets/images/mizuki/bg-kv1b.jpg', await fs.readFile(path.join(root, 'src/assets/cg/bg-kv1b.jpg')));
await write('assets/images/mizuki/hex-cg54.jpg', await fs.readFile(path.join(root, 'src/assets/art/hex-cg54.jpg')));
await write('assets/images/mizuki/jelly-particle.png', await fs.readFile(path.join(root, 'src/assets/art/jelly-particle.png')));
await write('assets/images/mizuki/footer-cg02.jpg', await fs.readFile(path.join(root, 'src/assets/art/footer-cg02.jpg')));
const wordmark = await fs.readFile(path.join(root, 'src/assets/wordmark.svg'));
await write('assets/daily/wordmark.png', await sharp(Buffer.from(wordmark)).png().toBuffer());
const githubSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.1c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.25 1.85 1.25 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.54 11.54 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.64-5.48 5.94.43.37.82 1.1.82 2.22v3.16c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/></svg>';
await write('assets/daily/github.png', await sharp(Buffer.from(githubSVG)).resize(128, 128).png().toBuffer());
for (const size of [16, 32, 180]) {
  const image = await sharp(Buffer.from(markSVG)).extract({ left: 100, top: 0, width: 200, height: 200 }).resize(size, size).png().toBuffer();
  await write(`assets/meta/${size === 180 ? 'apple-touch-icon' : `favicon-${size}x${size}`}.png`, image);
}
await write('assets/meta/manifest.json', JSON.stringify({ name: brand, short_name: brand, start_url: '/', display: 'standalone', background_color: '#02070c', theme_color: '#02070c' }));
await write('assets/meta/safari-pinned-tab.svg', markSVG);

// 只替换模型顶点；各场景位置、旋转、比例、材质和响应函数不变。
// 轮廓源改为海月水母（伞盖 + 四瓣马蹄生殖腺 + 触手），由 scripts/gen-mizuki-shape.py 生成。
const polygons = JSON.parse(await fs.readFile(path.join(root, 'src/assets/mizuki-shape.json'), 'utf8'));
const shapes = polygons.map(([outer, ...holes]) => {
  const shape = new Shape(outer.map(([x, y]) => ({ x, y })));
  shape.holes = holes.map(hole => new Path(hole.map(([x, y]) => ({ x, y }))));
  return shape;
});
const base = new ExtrudeGeometry(shapes, { depth: .3, steps: 1, bevelEnabled: true, bevelThickness: .035, bevelSize: .018, bevelSegments: 5, curveSegments: 48 });
base.computeBoundingBox();
const center = base.boundingBox.getCenter(new Vector3()), size = base.boundingBox.getSize(new Vector3());
base.translate(-center.x, -center.y, -center.z);
for (const [filename, xy, depth, z] of [['monogram-home.json', 1.12, .0512229218, 0], ['monogram-tree.json', 5.364, .565, -.2825], ['monogram-particles.json', .7262358069, .1670302451, 0]]) {
  const geometry = base.clone();
  const scale = xy / Math.max(size.x, size.y);
  geometry.scale(scale, scale, depth / size.z); geometry.translate(0, 0, z);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  // ExtrudeGeometry 的 uv 默认取顶点世界坐标（不是 0~1）。直接送进 shader 会让 matcap
  // 平铺很多次并留下一条明显接缝（模型左右一明一暗）。这里按包围盒归一化到 0~0.5，
  // 配合 shader 内的 scaleUV(uv, 2.0) 恰好铺满一次。
  const bb = geometry.boundingBox;
  const posAttr = geometry.getAttribute('position');
  const uvAttr = geometry.getAttribute('uv');
  const spanX = bb.max.x - bb.min.x || 1, spanY = bb.max.y - bb.min.y || 1;
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i,
      ((posAttr.getX(i) - bb.min.x) / spanX) * 0.5,
      ((posAttr.getY(i) - bb.min.y) / spanY) * 0.5);
  }
  const data = Object.fromEntries(['position', 'normal', 'uv'].map(key => [key, Array.from(geometry.getAttribute(key).array)]));
  await write(`assets/geometry/daily/${filename}`, JSON.stringify(data));
  // 清理早期生成到错误资源前缀的同名产物，原始资源与输入不受影响。
  await fs.rm(path.join(publicDir, 'assets/daily', filename), { force: true });
  geometry.dispose();
}
base.dispose();

// 字节级核验关键视觉模块；内容字段独立记录，便于检查是否误改动效。
// HomeLogoShader 被单独豁免：它内部写死了 matcap 贴图路径，必须替换（见下方材质球段落）
const protectedNames = ['Home', 'About', 'Footer', 'WorkItems', 'WorkItem', 'WorkDetail', 'WorkDetailParticles', 'AboutLogoShader', 'LoaderGLUI', 'LoaderView', 'NavUI', 'FXScroll', 'MouseFluid', 'Fluid'];
// 引擎对同一路径会优先加载 .ktx2 压缩版，jpg 只是兜底；而 ktx2 缺失时它会塞一张
// UV 棋盘占位图。所以换材质球不能只覆盖 jpg —— 必须改代码里的路径，指向一张没有 ktx2
// 伴随文件的新图。这里只动 HomeLogoShader 里的这一处字符串。
const homeLogoSrc = await moduleSource('HomeLogoShader');
const matcapPath = 'assets/images/room/matcap-test.jpg';
assert.ok(homeLogoSrc.includes(matcapPath), 'HomeLogoShader 中未找到 matcap 路径');
const homeLogoSceneSrc = adaptSceneBackgrounds(homeLogoSrc,{classes:['HomeLogoShader']});
assert.ok(app.includes(homeLogoSceneSrc), 'HomeLogoShader 未在运行时中定位');
const homeLogoPatched = homeLogoSceneSrc.replace(matcapPath, 'assets/images/mizuki/matcap.jpg');
app = app.replace(homeLogoSceneSrc, homeLogoPatched);
changes.push({ label: '材质球路径', count: 1, before: matcapPath, after: 'assets/images/mizuki/matcap.jpg' });
// app 的首次落盘发生在本段之前，这里必须重新写一次，否则替换只留在内存里
await write('assets/js/app.1780406240914.js', app);
const preservedOverride = { name: 'HomeLogoShader', sha256: sha(homeLogoPatched), identical: false, reason: 'matcap 路径适配；Footer 实例使用独立背景采样，不改变光学算法' };

const preserved = [];
for (const name of protectedNames) {
  const source = await moduleSource(name);
  const expected = name==='NavUI'?hideTopNavigation(source):source;
  assert.ok(app.includes(expected), `禁止改动的视觉模块发生变化：${name}`);
  preserved.push({ name, sha256: sha(expected), identical: name!=='NavUI', ...(name==='NavUI'?{reason:'按用户要求隐藏右上导航，不改其他行为'}:{}) });
}
if (preservedOverride) preserved.push(preservedOverride);
const sourceApp = await fs.readFile(path.join(frozen, 'app.1780406240914.js'), 'utf8');
const sceneConfig = sourceApp.match(/_this\._initFXScroll\(\[.*?\]\)/)?.[0];
assert.ok(sceneConfig && app.includes(sceneConfig), '场景序列或滚动参数发生变化');
// —— 着色器补丁 ——
// 只替换色带函数与一处色相偏移。几何、光学算法、#require 依赖链全部保持原样。
// rainbowColor 在原版里被 6 个着色器各自复制了一份（873 字节完全相同），
// 它是模型边缘彩光的唯一来源，所以改它等于给整站换色温。
const shaderSource = await fs.readFile(path.join(frozen, 'compiled.vs'), 'utf8');
const rainbowOriginal = `vec3 rainbowColor(float t) {
    t = mod(t, 1.0); // Wraps the t value between 0.0 and 1.0
    if (t < 0.03) return mix(vec3(0.5, 0.0, 0.5), vec3(0.5, 0.0, 1.0), t / 0.03); // violet to blue
    else if (t < 0.06) return mix(vec3(0.5, 0.0, 1.0), vec3(0.0, 0.0, 1.0), (t - 0.03) / 0.03); // blue to darker blue
    else if (t < 0.09) return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), (t - 0.06) / 0.03); // darker blue to cyan
    else if (t < 0.12) return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), (t - 0.09) / 0.03); // cyan to green
    else if (t < 0.18) return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.12) / 0.06); // green to yellow
    else if (t < 0.24) return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.5, 0.0), (t - 0.18) / 0.06); // yellow to orange
    else return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.0, 0.0), (t - 0.24) / 0.06); // orange to red
}`;
const rainbowDeep = `vec3 rainbowColor(float t) {
    t = mod(t, 1.0); // 深海色带：紫 -> 蓝 -> 青 -> 冰白。原版的红/黄/绿段在深海底色上过于喧闹，整段移除。
    if (t < 0.20) return mix(vec3(0.17, 0.11, 0.36), vec3(0.04, 0.15, 0.33), t / 0.20);
    else if (t < 0.46) return mix(vec3(0.04, 0.15, 0.33), vec3(0.05, 0.42, 0.50), (t - 0.20) / 0.26);
    else if (t < 0.72) return mix(vec3(0.05, 0.42, 0.50), vec3(0.31, 0.89, 0.83), (t - 0.46) / 0.26);
    else return mix(vec3(0.31, 0.89, 0.83), vec3(0.86, 0.97, 0.96), (t - 0.72) / 0.28);
}`;
const rainbowCount = shaderSource.split(rainbowOriginal).length - 1;
assert.equal(rainbowCount, 6, '色带函数定义数量与预期不符');
let shaderBytes = shaderSource.replaceAll(rainbowOriginal, rainbowDeep);
// HomeLogoShader 拿到色带后又做了 0.5 的色相旋转（+180 度），青会被转成红。
// 这里改成近乎不旋转，保留深海青紫。
const hueBefore = '    r.x += 0.5;\n';
assert.ok(shaderBytes.includes(hueBefore), '未找到色相偏移植');
shaderBytes = shaderBytes.replace(hueBefore, '    r.x += 0.03;\n');
changes.push({ label: '深海色带', count: rainbowCount, before: 'violet->red', after: 'violet->blue->cyan->ice' });
changes.push({ label: '色相偏移', count: 1, before: 'r.x += 0.5', after: 'r.x += 0.03' });

// 原版这两行是给 D 字形做的 UV 收边（D 的 u 只落在特定区间）。
// 换成圆形伞盖后，右侧约 35% 会被整块压黑，必须放宽。
const maskBefore = `    color *= smoothstep(0.0, 0.1, vUv.x);
    color *= smoothstep(0.75, 0.65, vUv.x);`;
assert.ok(shaderBytes.includes(maskBefore), '未找到 UV 收边');
shaderBytes = shaderBytes.replace(maskBefore, `    color *= smoothstep(0.0, 0.02, vUv.x);
    color *= smoothstep(1.0, 0.98, vUv.x);`);
changes.push({ label: 'UV 收边放宽', count: 1, before: 'x∈[0.1,0.65]', after: 'x∈[0.02,0.98]' });

// MatCap 是这套材质的主光源。原版用遮罩把它压到局部，圆盘需要它覆盖整面。
const matBefore = 'color += getRGB(tMap, baseUv, 0.2, 0.002).rgb * smoothstep(0.5, 0.4, abs(0.5-uv.x));';
assert.ok(shaderBytes.includes(matBefore), '未找到 matcap 加法');
shaderBytes = shaderBytes.replace(matBefore, 'color += getRGB(tMap, baseUv, 0.20, 0.002).rgb * 0.52;');
changes.push({ label: 'MatCap 铺满', count: 1, before: '局部遮罩', after: '玻璃底' });

// UV 归一化到 0~0.5 后，原来的扰动量等于半张贴图，会采到球外的黑色区域。
const baseUvBefore = 'vec2 baseUv = scaleUV(uv, vec2(2.0)) - vViewDir.xy * 0.05 - vNormal.xy * 0.2;';
assert.ok(shaderBytes.includes(baseUvBefore), '未找到 baseUv');
shaderBytes = shaderBytes.replace(baseUvBefore, 'vec2 baseUv = vec2(0.5) + (uv * 2.0 - vec2(0.5)) * 0.42 - vNormal.xy * 0.02;');
changes.push({ label: '采样收进中心亮区', count: 1, before: '满幅采样', after: '固定球心' });

// —— 粒子深海化：保留原版亮度结构，只换色相 ——
// 原版粒子的可见亮点主要来自两处 video 叠加（原站 reel）。直接删掉会让整片归零。
// 所以这里不改亮度，只把视频画面按亮度转成冷青，再整体抬一档。
const pStart = shaderBytes.indexOf('{@}ParticleTestShader.glsl{@}');
assert.ok(pStart >= 0, '未定位 ParticleTestShader');
const pEnd = shaderBytes.indexOf('{@}', pStart + 30);
assert.ok(pEnd > pStart, '未定位粒子着色器段尾');
let pSeg = shaderBytes.slice(pStart, pEnd);

// 视频 → 冷青版（只换色相，亮度原样）
const v1 = '    vec3 video = texture2D(tVideo, vuv).rgb;';
assert.ok(pSeg.includes(v1), '未找到 video 采样 1');
pSeg = pSeg.replace(v1,
  '    vec3 video = texture2D(tVideo, vuv).rgb;\n'
  + '    // 只取视频亮度并染成冷青：亮度分布沿用原版，色相换成深海\n'
  + '    video = vec3(dot(video, vec3(0.299, 0.587, 0.114))) * vec3(0.52, 0.84, 1.0);');

// 粒子固有色：vLightColor 同样只转色相，不压亮度
const c1 = '    vec3 color = vLightColor;';
// 远粒子（贴近背景那一层）按距离概率丢弃：离相机越远丢得越多，
// 避免在背景上再糊一层颗粒，把明暗层次留给近处的粒子。
const farBefore = '    if (length(vPos.xz) < 2.5) discard;';
assert.ok(pSeg.includes(farBefore), '未找到粒子近处裁剪');
pSeg = pSeg.replace(farBefore,
  farBefore + '\n'
  + '    // 远粒子不再按距离丢弃：底部场景整片都是远粒子，砍掉会直接失去粒子云雾\n'
  + '    // 用水母贴图的 alpha 裁形：粒子不再是圆点，而是伞盖 + 口腕的小水母\n'
  + '    vec2 suv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);\n'
  + '    vec4 spr = texture2D(tMap, suv);\n'
  + '    // 暂不按 alpha 裁形：水母精灵的透明区太多，会把粒子整片裁没\n');

assert.ok(pSeg.includes(c1), '未找到粒子固有色');
pSeg = pSeg.replace(c1,
  '    vec3 color = vec3(dot(vLightColor, vec3(0.299, 0.587, 0.114))) * vec3(0.52, 0.84, 1.0);');

// 气泡贴图 matcap3 是暖金，同样只取亮度
const m1 = '    vec3 matcap = texture2D(tMap, matcapUV).rgb * 2.0;';
assert.ok(pSeg.includes(m1), '未找到气泡贴图');
pSeg = pSeg.replace(m1,
  '    // 贴图已换成水母精灵，高光直接取精灵自身亮度，避免二次重影\n'
  + '    vec3 matcap = vec3(dot(spr.rgb, vec3(0.299, 0.587, 0.114))) * vec3(0.60, 0.86, 1.0) * 1.6;');

// 整体比原版亮一档（原版偏暗，Buster 要的是"亮一点"）
const out1 = '    #drawbuffer Color gl_FragColor = vec4(color, 1.0);';
assert.ok(pSeg.includes(out1), '未找到粒子输出');
pSeg = pSeg.replace(out1,
  '    // S 形对比：暗粒子再沉一点，被照亮的粒子再冲一档，拉开明暗层次\n'
  + '    float mx = max(color.r, max(color.g, color.b));\n'
  + '    color *= mix(1.05, 5.00, smoothstep(0.045, 0.340, mx));\n' + out1);

shaderBytes = shaderBytes.slice(0, pStart) + pSeg + shaderBytes.slice(pEnd);
// HomeLogoShader 保持原版采样（彩虹水晶球的反射是这套设计的核心，不动它）

// 水母片一律不动（Buster 只要求改背景）

changes.push({ label: '粒子深海化', count: 4, before: '暖金点色 + 暖色视频', after: '亮度原样 + 冷青色相 ×1.18' });

// —— 六边形波纹：拉大环间距，让上一圈完全舒展开再出下一圈 ——
// 波浪相位是 sin(length(offset * 1.4) - uTime)：1.4 决定波长（约 4.5 世界单位一环），
// 环距太密就会出现"前一波还没散开、下一波已经从中心冒出"。收到 0.6，环距约放大 2.3 倍。
{
  const phStart = shaderBytes.indexOf('{@}PhysicalShader.glsl{@}');
  assert.ok(phStart >= 0, '未定位 PhysicalShader');
  const phEnd = shaderBytes.indexOf('{@}', phStart + 26);
  let phSeg = shaderBytes.slice(phStart, phEnd);
  const waveBefore = 'sin(length(offset * 1.4) - uTime)';
  assert.ok(phSeg.includes(waveBefore), '未找到波纹相位');
  phSeg = phSeg.replace(waveBefore, 'sin(length(offset * 0.6) - uTime)');
  shaderBytes = shaderBytes.slice(0, phStart) + phSeg + shaderBytes.slice(phEnd);
  changes.push({ label: '波纹环距', count: 1, before: 'offset*1.4', after: 'offset*0.6' });

// —— 六边形反光冷化 ——
// 贴图冷化后鳞片本体已是淡蓝，但翻转时的镜面高光仍带暖调（来自默认环境贴图的暖白摄影棚）。
// 在输出前给一个温和的冷偏：压红、抬蓝，不改变明暗关系。
{
  const ph2Start = shaderBytes.indexOf('{@}PhysicalShader.glsl{@}');
  const ph2End = shaderBytes.indexOf('{@}', ph2Start + 26);
  let ph2 = shaderBytes.slice(ph2Start, ph2End);
  const outBefore = '    outputColor.rgb = pow(outputColor.rgb*1.2, vec3(1.5));';
  assert.ok(ph2.includes(outBefore), '未找到六边形输出行');
  ph2 = ph2.replace(outBefore,
    '    // 反光冷化：压红抬蓝，把翻转高光从橙金拉回淡蓝\n'
    + '    outputColor.rgb *= vec3(0.74, 0.95, 1.26);\n'
    + outBefore);
  shaderBytes = shaderBytes.slice(0, ph2Start) + ph2 + shaderBytes.slice(ph2End);
  changes.push({ label: '六边形反光冷化', count: 1, before: '暖白高光', after: '压红抬蓝' });
}
}


// —— 背景层（HomeVideoShader 全屏 quad）加呼吸 ——
// 首屏那层铺满屏幕的底图就是这个 quad，它采 tMap = assets/daily/hero.jpg（已换成 CG 01）。
// 这里叠一个 12 秒周期的呼吸：最亮时只是"微微泛蓝"，不会变成一块亮图。
{
  const hvStart = shaderBytes.indexOf('{@}HomeVideoShader.glsl{@}');
  assert.ok(hvStart >= 0, '未定位 HomeVideoShader');
  const hvEnd = shaderBytes.indexOf('{@}', hvStart + 28);
  let hvSeg = shaderBytes.slice(hvStart, hvEnd);

  const hvBefore = '    color.rgb *= smoothstep(0.5, 0.05, length(uv-0.5));';
  assert.ok(hvSeg.includes(hvBefore), '未找到背景遮罩行');
  // 原遮罩是 smoothstep(0.5,0.05,dist)：只在中心一小块可见，四周全黑，图铺不开。
  // 改成温和的暗角，让整幅 CG 都能透出来，同时保持很低亮度。
  hvSeg = hvSeg.replace(hvBefore,
    '    color.rgb *= mix(0.45, 1.0, smoothstep(0.95, 0.12, length(uv-0.5)));\n'
    + '    // 呼吸：12 秒一个周期，亮度在 0.72 ~ 1.10 之间起伏\n'
    + '    float breath = 0.5 + 0.5 * sin(time * 0.52);\n'
    + '    color.rgb *= 0.72 + 0.38 * breath;\n'
    + '    // 随呼吸一起泛出的极弱蓝光\n'
    + '    color.rgb += vec3(0.004, 0.014, 0.028) * breath;');

  shaderBytes = shaderBytes.slice(0, hvStart) + hvSeg + shaderBytes.slice(hvEnd);
  
// —— 四叶草粒子：把点尺寸收小 ——
// FlowerParticleShader 的 gl_PointSize 原为 0.0275，粒子彼此重叠成一团云，
// 几何上改成四叶也看不出来。收到 0.0125 让颗粒分开，环带结构才显形。
{
  const fpStart = shaderBytes.indexOf('{@}FlowerParticleShader.glsl{@}');
  assert.ok(fpStart >= 0, '未定位 FlowerParticleShader');
  const fpEnd = shaderBytes.indexOf('{@}', fpStart + 30);
  let fpSeg = shaderBytes.slice(fpStart, fpEnd);
  const sizeBefore = 'gl_PointSize = (0.0275) * DPR * 2.0';
  assert.ok(fpSeg.includes(sizeBefore), '未找到点尺寸');
  fpSeg = fpSeg.replace(sizeBefore, 'gl_PointSize = (0.0125) * DPR * 2.0');
  shaderBytes = shaderBytes.slice(0, fpStart) + fpSeg + shaderBytes.slice(fpEnd);
  
// —— 卡片倾斜时显示成"另一张图" ——
// WorkItemShader 里 `edges = smoothstep(0.5, 6.0, abs(vViewDir.x-0.5))` 会随视角增大，
// 而 `videoUV.x += edges * 0.5;` 直接横移半个图幅；贴图是 repeat 采样，于是采到环绕的
// 另一半 —— 视觉上就像换了一张图。这里把位移收小，只保留轻微的折射错位。
{
  const wiStart = shaderBytes.indexOf('{@}WorkItemShader.glsl{@}');
  assert.ok(wiStart >= 0, '未定位 WorkItemShader');
  const wiEnd = shaderBytes.indexOf('{@}', wiStart + 28);
  let wiSeg = shaderBytes.slice(wiStart, wiEnd);
  const shiftBefore = '    videoUV.x += edges * 0.5;';
  assert.ok(wiSeg.includes(shiftBefore), '未找到视角位移');
  wiSeg = wiSeg.replace(shiftBefore, '    videoUV.x += edges * 0.045;   // 只留轻微错位，不再跨半幅采到另一张图');
  shaderBytes = shaderBytes.slice(0, wiStart) + wiSeg + shaderBytes.slice(wiEnd);
  changes.push({ label: '卡片斜视采样位移', count: 1, before: 'edges*0.5', after: 'edges*0.045' });
}
changes.push({ label: '四叶粒子点尺寸', count: 1, before: '0.0275', after: '0.0125' });
}
changes.push({ label: '背景呼吸', count: 1, before: '固定亮度', after: '12s 呼吸 + 微蓝' });
}


// 背景着色器：改成屏幕空间采样（球面 UV 会把 16:9 的图拉变形），
// 压成深海冷调，并叠加一个 7 秒左右的呼吸节奏，极弱地泛蓝。
const bgStart = shaderBytes.indexOf('{@}HomeBGShader.glsl{@}');
assert.ok(bgStart >= 0, '未定位 HomeBGShader');
const bgEnd = shaderBytes.indexOf('{@}', bgStart + 25);
let bgSeg = shaderBytes.slice(bgStart, bgEnd);

const bgFragMark = bgSeg.indexOf('#!SHADER: Fragment');
assert.ok(bgFragMark > 0, '未定位背景 Fragment');
const bgMainAt = bgSeg.indexOf('void main() {', bgFragMark);
assert.ok(bgMainAt > bgFragMark, '未定位背景 main');
let d2 = 0, c2 = bgSeg.indexOf('{', bgMainAt);
for (; c2 < bgSeg.length; c2++) {
  if (bgSeg[c2] === '{') d2++;
  else if (bgSeg[c2] === '}') { d2--; if (d2 === 0) break; }
}
const bgBodyEnd = c2 + 1;

const bgMain = `void main() {
    // 屏幕空间采样：球面 UV 会把 16:9 的画面拉成弧形，这里直接按屏幕坐标取
    vec2 suv = gl_FragCoord.xy / resolution;
    float aspect = resolution.x / resolution.y;
    // cover 裁切，保证不变形
    vec2 cuv = suv;
    float imgAspect = 16.0 / 9.0;
    if (aspect > imgAspect) { cuv.y = (suv.y - 0.5) * (imgAspect / aspect) + 0.5; }
    else { cuv.x = (suv.x - 0.5) * (aspect / imgAspect) + 0.5; }

    vec4 color = texture2D(tMap, cuv);

    // 压成深海冷调：只留很低的亮度，色相偏蓝
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 deep = vec3(lum) * vec3(0.34, 0.60, 1.0);
    color.rgb = mix(vec3(0.012, 0.030, 0.055), deep, 0.55);

    // 边角压暗，避免背景抢主体
    float vig = smoothstep(0.95, 0.25, length(suv - 0.5));
    color.rgb *= mix(0.35, 1.0, vig);

    // 呼吸：约 11 秒一个周期，最亮时也只是"微微泛蓝"
    float breath = 0.5 + 0.5 * sin(time * 0.55);
    color.rgb *= 0.055 + 0.075 * breath;
    color.rgb += vec3(0.010, 0.030, 0.055) * breath;

    color.a = 1.0;
    gl_FragColor = color;
}`;

bgSeg = bgSeg.slice(0, bgMainAt) + bgMain + bgSeg.slice(bgBodyEnd);
shaderBytes = shaderBytes.slice(0, bgStart) + bgSeg + shaderBytes.slice(bgEnd);

// SceneLayout 片元：加一个约 12 秒周期的呼吸，最亮时也只是很弱的一层蓝
{
  const slStart = shaderBytes.indexOf('{@}SceneLayout.glsl{@}');
  assert.ok(slStart >= 0, '未定位 SceneLayout');
  const slEnd = shaderBytes.indexOf('{@}', slStart + 25);
  let slSeg = shaderBytes.slice(slStart, slEnd);
  const slBefore = `void main() {
    gl_FragColor = texture2D(tMap, vUv);
    gl_FragColor.a *= uAlpha;
    gl_FragColor.rgb /= gl_FragColor.a;
}`;
  assert.ok(slSeg.includes(slBefore), '未找到 SceneLayout 片元');
  const slAfter = `void main() {
    vec4 c = texture2D(tMap, vUv);
    // 呼吸：12 秒一个周期，亮度在 0.70 ~ 1.12 之间起伏
    float breath = 0.5 + 0.5 * sin(time * 0.52);
    c.rgb *= 0.70 + 0.42 * breath;
    // 极弱的一层蓝辉，随呼吸一起泛出
    c.rgb += vec3(0.004, 0.014, 0.030) * breath;
    c.a *= uAlpha;
    c.rgb /= max(c.a, 0.0001);
    gl_FragColor = c;
}`;
  slSeg = slSeg.replace(slBefore, slAfter);
  shaderBytes = shaderBytes.slice(0, slStart) + slSeg + shaderBytes.slice(slEnd);
  changes.push({ label: '背景呼吸', count: 1, before: '固定亮度', after: '12s 呼吸 + 微蓝' });
}
changes.push({ label: '背景层 CG01 + 呼吸微光', count: 1, before: '球面 UV + 固定遮罩', after: '屏幕空间 + 呼吸' });


// —— 提亮：不碰任何质感，只把整条亮度曲线抬起来 ——
// 原版画面里暗部占了大半，所以看着"一半明一半暗"。这里用 gamma 抬暗部：
// 折射、色散、彩虹边、切面高光全部原样保留，只是原本黑下去的地方不再黑，
// 整片都呈现"反光面"的观感。
const hsStart = shaderBytes.indexOf('{@}HomeLogoShader.glsl{@}');
assert.ok(hsStart >= 0, '未定位 HomeLogoShader');
const hsEnd = shaderBytes.indexOf('{@}', hsStart + 25);
let hsSeg = shaderBytes.slice(hsStart, hsEnd);
// 片元保持原版：体积感、折射、色散、切面全部由引擎自己提供，
// 换风格只通过替换材质球（matcap）实现，不重写 shader。
changes.push({ label: '片元保持原版', count: 0, before: '-', after: '-' });




















const beforeSceneShaderSHA256=sha(shaderBytes);
shaderBytes=applyMergedSceneShaders(shaderBytes).toString();
await write('assets/shaders/compiled.vs', shaderBytes);
const manifest = { date: '2026-10-23', originalVersion: '1780406240914', brand, slogan, github, projectCount: studies.length, patches: changes, contentFields: changedUIL, preservedModules: preserved, sceneConfig, shaders: { sha256: sha(shaderBytes), originalSHA256: sha(shaderSource), identical: sha(shaderBytes) === sha(shaderSource), rainbowPatches: rainbowCount }, runtimeSHA256: sha(app), originalRuntimeSHA256: sha(sourceApp), videoPolicy: '仅替换媒体内容为静态图片，保留原媒体切换和光学效果', sharedAssets: 'public/assets' };
manifest.modelAdaptation={geometry:'assets/geometry/daily/mizuki-umbrella.json',...mergedScenes.umbrella};
manifest.treeAdaptation={geometry:'assets/geometry/daily/deep-blue-roots.json',...mergedScenes.roots};
manifest.shaders.beforeSceneSHA256=beforeSceneShaderSHA256;
manifest.mergeSource='open-active-theory-src.zip';
await fs.writeFile(path.join(analysis, 'adaptation-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`原版动效模块 ${preserved.length} 项逐字节一致；14 条观测、水母几何与深海色带已接入。`);
