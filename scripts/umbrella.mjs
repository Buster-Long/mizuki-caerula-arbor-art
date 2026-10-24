// 参考图驱动的闭合雨伞网格。Three.js 仅离线建模；浏览器仍使用原 Hydra 管线。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3,
  TubeGeometry, TorusGeometry, SphereGeometry, CylinderGeometry, BoxGeometry, Shape, ExtrudeGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const smooth = t => t * t * (3 - 2 * t);
function profileRadius(profile, y, curved = true) {
  let i = 0;
  while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
  const [a, b] = [profile[i], profile[i + 1]];
  const t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return a[1] + (b[1] - a[1]) * (curved ? smooth(t) : t);
}

export async function buildUmbrella(root) {
  const config = JSON.parse(await fs.readFile(path.join(root, 'src/assets/mizuki-umbrella-profile.json')));
  const parts = [], manifest = [];
  // 不增添新材质。各部件仍由同一原生 FBR 采样，UV 区域兼顾褶皱与金属小件。
  const uvModes = {
    cloth: (u, v) => [u + v * .1, .38 + v * .09],
    silver: (u, v) => [.77 + u * .075, .495 + v * .005],
    dark: (u, v) => [.22 + u * .028, .035 + v * .020],
    trim: (u, v) => [.62 + u * .06, .23 + v * .035],
    cord: (u, v) => [.390 + u * .008, .495 + v * .005]
  };
  function add(name, geometry, mode = 'cloth') {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const [u, v] = uvModes[mode](uv.getX(i), uv.getY(i)); uv.setXY(i, u, v);
    }
    manifest.push({ name, triangles: g.attributes.position.count / 3, uvMode: mode });
    parts.push(g);
  }
  function loft(name, y0, y1, segmentsY, segmentsR, point, mode = 'cloth') {
    const positions = [], uvs = [], index = [];
    for (let iy = 0; iy <= segmentsY; iy++) {
      const t = iy / segmentsY, y = y0 + (y1 - y0) * t;
      for (let ix = 0; ix <= segmentsR; ix++) {
        const u = ix / segmentsR, p = point(y, u * TAU, t);
        positions.push(...p); uvs.push(u, t);
      }
    }
    for (let iy = 0; iy < segmentsY; iy++) for (let ix = 0; ix < segmentsR; ix++) {
      const a = iy * (segmentsR + 1) + ix, b = a + 1, c = a + segmentsR + 1, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); g.setIndex(index); g.computeVertexNormals();
    add(name, g, mode);
  }
  function tube(name, points, radius, mode = 'silver', segments = 64, sides = 8) {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)), false, 'centripetal');
    add(name, new TubeGeometry(curve, segments, radius, sides, false), mode);
  }
  function roundSleeve(name, points) {
    const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'centripetal'),segments=32,sides=12;
    const g=new TubeGeometry(curve,segments,1,sides,false),p=g.attributes.position;
    for(let row=0;row<=segments;row++) {
      const t=row/segments,c=curve.getPointAt(t),bulge=smooth(Math.max(0,Math.min(1,(t-.72)/.18))),radius=.020+.010*bulge;
      for(let j=0;j<=sides;j++) {const i=row*(sides+1)+j;p.setXYZ(i,c.x+(p.getX(i)-c.x)*radius,c.y+(p.getY(i)-c.y)*radius,c.z+(p.getZ(i)-c.z)*radius);}
    }
    g.computeVertexNormals();add(name,g,'silver');
  }
  function cylinder(name, top, bottom, height, y, mode = 'silver', sides = 32, x = 0, z = 0) {
    const g = new CylinderGeometry(top, bottom, height, sides, 1, false); g.translate(x, y, z); add(name, g, mode);
  }
  function ring(name, radius, thickness, y, mode = 'silver', x = 0, z = 0) {
    const g = new TorusGeometry(radius, thickness, 8, 48); g.rotateX(Math.PI / 2); g.translate(x, y, z); add(name, g, mode);
  }
  function sphere(name, x, y, z, r, mode = 'silver', scale = [1, 1, 1]) {
    const g = new SphereGeometry(r, 16, 10); g.scale(...scale); g.translate(x, y, z); add(name, g, mode);
  }

  // 柄的中心线由解析直线/圆弧组成。CatmullRom 会把平行回折段拉成螺旋，不能用于这里。
  function buildParallelReturnHandle(h) {
    const mainLength = h.arcBaseY - h.shaftBaseY, arcLength = Math.PI * h.bendRadius;
    const tailLength = Math.PI / 2 * h.tailRadius, totalLength = mainLength + arcLength + h.returnLength + tailLength + h.endLength;
    const returnX = h.bendRadius * 2, returnY = h.arcBaseY - h.returnLength;
    function sample(distance) {
      if (distance <= mainLength) return { p: [0,h.shaftBaseY+distance,0], tangent: [0,1], width: h.halfWidth };
      distance -= mainLength;
      if (distance <= arcLength) {
        const a = Math.PI - distance / h.bendRadius;
        return { p: [h.bendRadius+h.bendRadius*Math.cos(a),h.arcBaseY+h.bendRadius*Math.sin(a),0], tangent: [Math.sin(a),-Math.cos(a)], width: h.halfWidth+.035*Math.sin(a) };
      }
      distance -= arcLength;
      if (distance <= h.returnLength) return { p: [returnX,h.arcBaseY-distance,0], tangent: [0,-1], width: h.halfWidth };
      distance -= h.returnLength;
      if (distance <= tailLength) {
        const a = distance / h.tailRadius;
        return { p: [returnX-h.tailRadius*(1-Math.cos(a)),returnY-h.tailRadius*Math.sin(a),0], tangent: [-Math.sin(a),-Math.cos(a)], width: h.halfWidth*(1-.12*a/(Math.PI/2)) };
      }
      distance -= tailLength;
      return { p: [returnX-h.tailRadius-distance,returnY-h.tailRadius,0], tangent: [-1,0], width: h.halfWidth*.88 };
    }
    // 把每个接缝作为单独采样边界，长短两段严格平行，顶部恰好180度。
    const distances = [0]; let cursor = 0;
    for (const [length,count] of [[mainLength,16],[arcLength,64],[h.returnLength,12],[tailLength,12],[h.endLength,2]]) {
      for (let j=1;j<=count;j++) distances.push(cursor+length*j/count); cursor+=length;
    }
    const section = [[-.82,-1],[.82,-1],[1,-.70],[1,.70],[.82,1],[-.82,1],[-1,.70],[-1,-.70]];
    const position=[],uv=[],index=[];
    function pointAt(distance,q) { const s=sample(distance); return [s.p[0]+s.tangent[1]*q[0]*s.width,s.p[1]-s.tangent[0]*q[0]*s.width,q[1]*h.halfDepth]; }
    // 各倒角面分开法线，保留参考柄宽面/窄侧面的光学差异。
    for(let face=0;face<section.length;face++) {
      const start=position.length/3;
      for(const d of distances) for(const side of [face,(face+1)%section.length]) { position.push(...pointAt(d,section[side]));uv.push(side/section.length,d/totalLength); }
      for(let j=0;j<distances.length-1;j++) { const a=start+j*2,b=a+1,c=a+2,e=a+3;index.push(a,c,b,b,c,e); }
    }
    for(const [distance,end] of [[0,false],[totalLength,true]]) {
      const start=position.length/3, s=sample(distance);position.push(...s.p);uv.push(.5,.5);
      for(const q of section) {position.push(...pointAt(distance,q));uv.push((q[0]+1)/2,(q[1]+1)/2);}
      for(let i=0;i<section.length;i++) {const a=start+1+i,b=start+1+(i+1)%section.length;index.push(start,...(end?[b,a]:[a,b]));}
    }
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(position,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    add('straight semicircle parallel-return handle with short finish',g,'silver');
    return { topology:'straight / 180-degree semicircle / parallel return / small finish',mainLine:[[0,h.shaftBaseY,0],[0,h.arcBaseY,0]],arcCenter:[h.bendRadius,h.arcBaseY,0],arcRadius:h.bendRadius,arcDegrees:180,returnLine:[[returnX,h.arcBaseY,0],[returnX,returnY,0]],end:sample(totalLength).p };
  }

  // 独立有厚度的布片：正反面及边缘均为几何，不能依赖双面材质或细管假装叠层。
  // uBreaks 在折返处拆开法线，纵向保持连续；原 Shader 的高光因此能读出折面。
  function clothSheet(name, rows, uBreaks, sample, thickness = .014) {
    const pos = [], uv = [], idx = [];
    for (let strip = 0; strip < uBreaks.length - 1; strip++) {
      const begin = pos.length / 3, columns = 3;
      for (let iy = 0; iy <= rows; iy++) for (let ix = 0; ix <= columns; ix++) {
        const t = iy / rows, u = uBreaks[strip] + (uBreaks[strip + 1] - uBreaks[strip]) * ix / columns;
        pos.push(...sample(t, u)); uv.push(u, t);
      }
      for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < columns; ix++) {
        const a = begin + iy * (columns + 1) + ix, b = a + 1, c = a + columns + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const normals = g.attributes.normal.array, n = pos.length / 3;
    for (let i = 0; i < n; i++) { pos.push(pos[i * 3] - normals[i * 3] * thickness, pos[i * 3 + 1] - normals[i * 3 + 1] * thickness, pos[i * 3 + 2] - normals[i * 3 + 2] * thickness); uv.push(uv[i * 2], uv[i * 2 + 1]); }
    const front = idx.slice(); for (let i = 0; i < front.length; i += 3) idx.push(front[i] + n, front[i + 2] + n, front[i + 1] + n);
    // 只封实际外边界，折线的法线断口不加多余的封边。
    const rowSize = 4, stripSize = (rows + 1) * rowSize;
    function edge(a, b) { idx.push(a, b, a + n, b, b + n, a + n); }
    for (let s = 0; s < uBreaks.length - 1; s++) {
      const start = s * stripSize;
      for (let x = 0; x < rowSize - 1; x++) { edge(start + x + 1, start + x); edge(start + rows * rowSize + x, start + rows * rowSize + x + 1); }
    }
    for (let y = 0; y < rows; y++) { edge(y * rowSize, (y + 1) * rowSize); const e = (uBreaks.length - 2) * stripSize + y * rowSize + rowSize - 1; edge(e + rowSize, e); }
    g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.deleteAttribute('normal'); g.computeVertexNormals();
    add(name, g, 'cloth');
  }
  function linearProfile(points, t) {
    let i = 0; while (i < points.length - 2 && t > points[i + 1][0]) i++;
    const [a, b] = [points[i], points[i + 1]], f = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
    return a[1] + (b[1] - a[1]) * f;
  }

  // 八片实际包卷的伞布。外片覆盖相邻内片，并在边沿折回，留下窄阴影缝。
  const body = config.bodyProfile;
  const bodyTwist = t => -.52 + 4.4 * t + .07 * Math.sin(t * Math.PI * 3);
  loft('gathered inner cloth bundle', body[0][0], body.at(-1)[0], 80, 48, (y, theta, t) => {
    const r = profileRadius(body, y) * (.60 + .035 * Math.cos((theta - bodyTwist(t)) * 16));
    return [r * Math.cos(theta), y, r * Math.sin(theta)];
  });
  for (let panel = 0; panel < config.folds; panel++) {
    const offset = panel * TAU / config.folds;
    function point(t, u) {
      const y = body[0][0] + (body.at(-1)[0] - body[0][0]) * t;
      const fold = linearProfile([[0,.68],[.22,.97],[.46,.76],[.64,1.03],[.86,.99],[1,.80]], u);
      const r = profileRadius(body, y) * fold * (1 + .022 * Math.sin(t * 18 + panel * 1.7));
      const theta = offset + bodyTwist(t) + (u - .5) * TAU / config.folds * 1.22;
      return [r * Math.cos(theta) + .075 * Math.sin(t * Math.PI * 1.3), y + .045 * Math.sin(panel * 2 + u * 2) * Math.sin(Math.PI * t), r * Math.sin(theta) + .04 * Math.sin(t * TAU)];
    }
    clothSheet(`overlapping spiral cloth gore ${panel + 1}`, 76, [0,.22,.46,.64,.86,1], point, .016);
    // 布边为窄的折返片，保留布面材质；不用金属粗管画出假褶皱。
    clothSheet(`turned spiral hem ${panel + 1}`, 76, [0,1], (t,u) => {
      const p = point(t,.86 + u * .10); const a = offset + bodyTwist(t);
      p[0] += .016 * Math.cos(a); p[2] += .016 * Math.sin(a); return p;
    }, .011);
  }

  // 伞冠不是对称花瓶：一层内衬、八片错开的风琴折面、斜向覆片和外翻布边。
  const crown = config.crownProfile;
  loft('inner crown folded lining', crown[0][0], -.15, 40, 48, (y,theta,t) => {
    const r = profileRadius(crown,y,false) * (.81 + .025 * Math.cos(theta * 16 + t * 3));
    return [r * Math.cos(theta),y,r * Math.sin(theta)];
  });
  for (let panel = 0; panel < config.folds; panel++) {
    const offset = panel * TAU / config.folds + .12;
    function crownFold(t,u) {
      const baseY = -3.12 + t * 2.97;
      const flare = Math.sin(Math.PI * t), bias = Math.sin(panel * 2.3);
      const y = baseY + (.10 * bias + .18 * (u-.5)) * flare;
      const fold = linearProfile([[0,.84],[.20,.99],[.38,.90],[.64,1.02],[.90,.99],[1,.88]],u);
      const radius = profileRadius(crown, y, false) * fold * (1 + .045 * bias * flare);
      // 颈部布料沿轴扭收，褶脊斜向绕入束带，避免直立花瓶式的放射条纹。
      const turn = 1.15 - 2.30 * t + .12 * Math.sin(t * Math.PI * 3);
      const angle = offset + turn + (u-.5) * TAU / config.folds * 1.25;
      return [radius * Math.cos(angle), y, radius * Math.sin(angle)];
    }
    clothSheet(`staggered accordion crown gore ${panel + 1}`, 42, [0,.20,.38,.64,.90,1], crownFold, .021);
    // 宽覆片斜向叠压在伞冠上半部，边缘略翘起；不是套在外面的细带。
    for (let tier = 0; tier < 3; tier++) {
      const centerT = .53 + tier * .145 + .015 * Math.sin(panel * 2.3);
      clothSheet(`crown overlapping diagonal fold ${panel + 1}-${tier + 1}`, 10, [0,.20,.38,.64,.90,1], (v,u) => {
        const t = centerT - .21 * (u-.5) + .16 * (v-.5);
        const p = crownFold(t,u), a = Math.atan2(p[2],p[0]);
        const lift = .016 + .046 * (1-v) * Math.sin(u * Math.PI);
        p[0] += lift * Math.cos(a); p[2] += lift * Math.sin(a); return p;
      }, .012);
    }
  }

  const handleConstruction = buildParallelReturnHandle(config.handle);
  // 图2：套环下独立的陀螺形接头。宽腰、上下收束和尖腹都属于实体轮廓。
  cylinder('handle lower sleeve', .157, .169, .18, 1.32, 'silver', 12);
  ring('handle sleeve bottom rim', .17, .021, 1.23, 'dark');
  cylinder('neck below handle sleeve', .125, .113, .14, 1.14, 'silver', 12);
  const spindle = [[.52,.062],[.57,.11],[.65,.205],[.735,.282],[.78,.313],[.815,.309],[.86,.264],[.94,.166],[1.015,.112],[1.08,.12],[1.115,.153]];
  // 连续UV/法线避免每段圆台重新采样纹理而出现假横环；外廓仍有明确宽腰和尖腹。
  loft('spinning-top connector continuous pointed body',spindle[0][0],spindle.at(-1)[0],44,24,(y,theta)=>{
    const r=profileRadius(spindle,y,false);return [r*Math.cos(theta),y,r*Math.sin(theta)];
  },'silver');
  ring('spinning-top equatorial rim', .310, .014, .790, 'silver');
  // 套口的锯齿饰边，参考中紧贴陀螺上方，不挪到布边骨端上。
  const zigzag=[];
  for(let i=0;i<=24;i++) {const a=i/24*TAU;zigzag.push([.132*Math.cos(a),1.17+(i%2?-.028:.028),.132*Math.sin(a)]);}
  tube('connector zigzag collar trim',zigzag,.009,'dark',72,5);
  // 接头完整露在骨架上方。布口下收，不能让前排伞骨爬到陀螺腹部前面。
  cylinder('gathered cloth neck', .18, .22, .14, -.21, 'dark', 12);
  cylinder('thin central stem below exposed connector', .044, .046, .66, .19, 'dark', 10);
  for (let i = 0; i < 8; i++) {
    const a=i*TAU/8-.90,c=Math.cos(a),s=Math.sin(a),topY=.35+.020*Math.sin(a*2+.5);
    // 用户明确纠正：这是铁丝架外包软胶，有圆截面；不是扁片、耳板或带孔装饰。
    const core=[[c*.17,-.33,s*.17],[c*.205,-.17,s*.205],[c*.245,.20,s*.245],[c*.26,topY,s*.26]];
    tube(`round steel umbrella rib wire ${i+1}`,core,.0105,'dark',24,10);
    const sleeve=[[c*.206,-.16,s*.206],[c*.226,-.02,s*.226],[c*.247,.22,s*.247],[c*.26,topY,s*.26]];
    roundSleeve(`continuous soft round sleeve over wire ${i+1}`,sleeve);
    sphere(`hemispherical soft sleeve end ${i+1}`,c*.26,topY,s*.26,.030,'silver');
    tube(`thin steel frame root ${i+1}`,[[c*.08,.06,s*.08],[c*.14,-.19,s*.14],[c*.17,-.33,s*.17]],.0105,'silver',14,8);
  }
  const ribFinialConstruction={type:'round steel wire with soft cylindrical sleeve and hemispherical end',count:8,coreRadius:.0105,sleeveRadius:.020,roundedHeadRadius:.030,tipYMax:.400,connectorBottomY:spindle[0][0],verticalClearance:spindle[0][0]-.400};
  assert.ok(ribFinialConstruction.verticalClearance>.10,'骨架端头须在陀螺下方留出间隙，不能挡住接头');
  const stop = new BoxGeometry(.045,.12,.028); stop.translate(.14,1.38,.072); add('small handle sleeve locking catch',stop,'silver');

  // 黑色束带、铆钉和小扣件；所有小件仍走同一原生材质。
  cylinder('wide retaining band', .832, .838, .34, -3.10, 'dark', 64);
  ring('band top piped edge', .830, .026, -2.932, 'dark');
  ring('band bottom piped edge', .838, .026, -3.272, 'dark');
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + .15;
    sphere(`silver band eyelet ${i + 1}`, Math.cos(a) * .847, -3.10, Math.sin(a) * .847, .064, 'silver', [1, 1.28, 1]);
  }
  const buckle = new BoxGeometry(.32, .27, .06, 1, 1, 1); buckle.translate(.10, -3.09, .87); add('front strap clasp', buckle, 'dark');
  for (const x of [-.025, .23]) sphere('clasp rivet', x, -3.09, .912, .04, 'silver');

  // 晴天娃娃：圆头、细颈系结、完整布裙。没有触手，裙摆为连续布面。
  const attachment = new TorusGeometry(.115, .028, 7, 24); attachment.rotateY(.5); attachment.translate(.87, -3.07, .28); add('pendant attachment ring', attachment, 'silver');
  for (let i = 0; i < 4; i++) {
    const g = new TorusGeometry(.07, .018, 6, 16); if (i % 2) g.rotateY(Math.PI / 2);
    g.translate(.96 + i * .03, -3.23 - i * .10, .34); add(`pendant chain ${i + 1}`, g, 'dark');
  }
  const headRing = new TorusGeometry(.05, .014, 6, 16); headRing.translate(1.10, -3.60, .34); add('doll head hanging eyelet', headRing, 'silver');
  sphere('teru teru bozu round head', 1.10, -3.86, .34, .20, 'dark', [1, 1, .88]);
  cylinder('doll tied neck', .072, .085, .13, -4.07, 'dark', 16, 1.10, .34);
  ring('doll neck tying cord', .082, .010, -4.07, 'cord', 1.10, .34);
  // 原图是偏侧的细绳结：两个空心绳环和不等长下垂绳头，不是厚实对称叶片。
  tube('doll neck cord to side knot', [[1.02, -4.07, .34], [1.04, -4.08, .41], [1.12, -4.08, .43], [1.18, -4.075, .45]], .0105, 'cord', 18, 6);
  sphere('doll small side knot', 1.18, -4.075, .45, .024, 'cord');
  tube('doll small lower bow cord loop', [[1.18, -4.075, .45], [1.12, -4.00, .455], [1.035, -4.02, .46], [1.02, -4.08, .46], [1.08, -4.105, .458], [1.18, -4.075, .45]], .0105, 'cord', 36, 6);
  tube('doll raised side bow cord loop', [[1.18, -4.075, .45], [1.22, -3.99, .45], [1.29, -3.95, .445], [1.34, -4.005, .44], [1.30, -4.065, .445], [1.18, -4.075, .45]], .0105, 'cord', 36, 6);
  tube('doll longer hanging cord end', [[1.18, -4.09, .46], [1.13, -4.18, .46], [1.15, -4.30, .48], [1.10, -4.38, .51]], .010, 'cord', 24, 6);
  tube('doll shorter hanging cord end', [[1.195, -4.09, .46], [1.24, -4.16, .47], [1.28, -4.27, .48], [1.34, -4.35, .49]], .010, 'cord', 24, 6);
  loft('teru teru bozu continuous cloth skirt', -4.64, -4.13, 18, 48, (y, theta, t) => {
    const r = (.285 - .20 * t) * (1 + .09 * Math.cos(theta * 6));
    return [1.10 + r * Math.cos(theta), y + .035 * Math.cos(theta * 6) * (1 - t), .34 + r * Math.sin(theta)];
  }, 'dark');
  for (const x of [1.04, 1.16]) sphere('doll reference white dot eye', x, -3.86, .516, .025, 'cord');

  // 收拢伞骨与多段尖端；并非简单长圆锥。
  cylinder('lower cloth gathering cuff', .17, .14, .28, -12.43, 'dark', 16);
  ring('lower cuff seam', .168, .027, -12.31, 'silver');
  cylinder('ferrule shaft', .11, .07, 1.95, -13.47, 'dark', 10);
  cylinder('faceted pointed ferrule', .095, .009, 1.82, -15.37, 'dark', 6);
  ring('ferrule upper ring', .12, .03, -12.72, 'silver');
  ring('ferrule lower ring', .10, .026, -14.34, 'silver');
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + .3;
    tube(`folded metal rib tip ${i + 1}`, [[.18 * Math.cos(a), -12.28, .18 * Math.sin(a)], [.19 * Math.cos(a + .25), -13.61, .19 * Math.sin(a + .25)], [.045 * Math.cos(a + .45), -14.96, .045 * Math.sin(a + .45)]], .025, 'silver', 20, 6);
  }
  // 独立的上指倒刺，带尖锐外轮廓与窄倒角；不能用圆环代替。
  for (let row = 0; row < 3; row++) for (let side = 0; side < 2; side++) {
    const extent = [.40, .35, .28][row], y = -13.55 - row * .72 + side * .14;
    const shape = new Shape(); shape.moveTo(.045, -.30); shape.lineTo(.16, -.13);
    shape.lineTo(extent, .38); shape.lineTo(.12, .065); shape.lineTo(.047, .16); shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelThickness: .007, bevelSize: .007, bevelSegments: 1, steps: 1, curveSegments: 1 });
    g.translate(0, 0, -.0275); g.rotateY(side * Math.PI + row * .26); g.translate(0, y, 0);
    add(`swept backward ferrule barb ${row + 1}-${side + 1}`, g, 'dark');
  }

  const expanded = mergeGeometries(parts, false); assert.ok(expanded);
  const merged = mergeVertices(expanded, 1e-5); expanded.dispose();
  merged.scale(config.displayScale, config.displayScale, config.displayScale);
  merged.rotateY(config.worldYaw); merged.translate(0, config.worldYOffset, 0);
  merged.computeBoundingBox();
  const worldBounds = { min: merged.boundingBox.min.toArray(), max: merged.boundingBox.max.toArray(), size: merged.boundingBox.getSize(new Vector3()).toArray() };
  const worldPositions = merged.attributes.position.array.slice();
  const normals = merged.attributes.normal.array;
  merged.translate(...config.nativeGroupPosition.map(v => -v));
  merged.scale(1 / config.nativePrototypeScale, 1 / config.nativePrototypeScale, 1 / config.nativePrototypeScale);
  const data = Object.fromEntries(['position', 'normal', 'uv'].map(key => [key, Array.from(merged.attributes[key].array, v => Math.round(v * 1e7) / 1e7)]));
  data.index = Array.from(merged.index.array);
  const vertexCount = data.position.length / 3;
  assert.equal(data.normal.length, vertexCount * 3); assert.equal(data.uv.length, vertexCount * 2);
  assert.ok(Object.values(data).every(a => a.every(Number.isFinite)));
  assert.ok(data.index.length / 3 < 169760, '主体三角形预算不应超过原40节脊椎');
  const stats = { name: config.name, mode: 'one native MeshBatch instance', vertices: vertexCount, triangles: data.index.length / 3,
    parts: manifest, handleConstruction, ribFinialConstruction, worldBounds, displayScale: config.displayScale, worldYOffset: config.worldYOffset, nativeScale: config.nativePrototypeScale, nativeGroupPosition: config.nativeGroupPosition,
    shader: 'SpineShader', originalTextures: false, originalNormalTexture: true, originalShaderSource: true, palette: ['#f5fbff','#12376b','#91ceff'] };
  // 同时保留世界坐标 OBJ，便于在 DCC 中继续编辑；网站只加载原生 JSON。
  const obj = ['# Mizuki folded umbrella, reference reconstruction. Generated by scripts/umbrella.mjs'];
  for (let i = 0; i < worldPositions.length; i += 3) obj.push(`v ${worldPositions[i]} ${worldPositions[i + 1]} ${worldPositions[i + 2]}`);
  for (let i = 0; i < data.uv.length; i += 2) obj.push(`vt ${data.uv[i]} ${data.uv[i + 1]}`);
  for (let i = 0; i < normals.length; i += 3) obj.push(`vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}`);
  for (let i = 0; i < data.index.length; i += 3) {
    const [a, b, c] = data.index.slice(i, i + 3).map(n => n + 1);
    obj.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
  }
  for (const g of parts) g.dispose(); merged.dispose();
  return { data, stats, obj: obj.join('\n') + '\n' };
}
