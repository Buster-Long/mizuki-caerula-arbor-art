/**
 * 《水月与深蓝之树》展示页视觉生成器。
 * 全部画面由矢量数学与光学滤镜生成，不使用任何官方美术素材。
 * 输出：src/assets/art/*.jpg（2048x1152，与原站封面规格一致）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/assets/art');
await fs.mkdir(outDir, { recursive: true });

const W = 2048, H = 1152;

// 深海底色盘：深渊 → 深海 → 幽蓝，附荧光青与灯火两套高光
const C = {
  abyss: '#02070C', deep: '#061726', mid: '#0D2C40', teal: '#123B52',
  glow: '#4FE3D4', ice: '#9BE8E0', pale: '#D6EDF2',
  violet: '#3A2A63', lamp: '#F6E8CB', ember: '#FFC77D'
};

const defs = (extra = '') => `
<defs>
  <radialGradient id="bg" cx="50%" cy="44%" r="80%">
    <stop offset="0" stop-color="${C.mid}"/>
    <stop offset="52%" stop-color="${C.deep}"/>
    <stop offset="100%" stop-color="${C.abyss}"/>
  </radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${C.ice}" stop-opacity="0.85"/>
    <stop offset="38%" stop-color="${C.glow}" stop-opacity="0.30"/>
    <stop offset="100%" stop-color="${C.glow}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${C.lamp}" stop-opacity="0.95"/>
    <stop offset="34%" stop-color="${C.ember}" stop-opacity="0.34"/>
    <stop offset="100%" stop-color="${C.ember}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.ice}" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${C.glow}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="veil" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="${C.teal}" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${C.deep}" stop-opacity="0"/>
  </linearGradient>
  <filter id="blur26" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="26"/></filter>
  <filter id="blur9" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="7"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <filter id="drift">
    <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="3" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="34" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  ${extra}
</defs>`;

// 伪随机但可复现，保证每次构建的图一致
let seed = 20220927;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const rr = (a, b) => a + (b - a) * rnd();

const grain = `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.055"/>`;
const vignette = `<rect width="${W}" height="${H}" fill="url(#bg)" opacity="0.0"/>
<radialGradient id="vig" cx="50%" cy="50%" r="72%">
  <stop offset="55%" stop-color="#000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000" stop-opacity="0.62"/>
</radialGradient>
<rect width="${W}" height="${H}" fill="url(#vig)"/>`;

const caption = (no, label) => `
<g opacity="0.42" font-family="Helvetica Neue, Arial, sans-serif">
  <text x="86" y="${H - 84}" font-size="19" letter-spacing="7" fill="${C.pale}">${label}</text>
  <text x="86" y="${H - 118}" font-size="15" letter-spacing="4" fill="${C.glow}">N°${no} — MIZUKI &amp; CAERULA ARBOR</text>
  <line x1="86" y1="${H - 62}" x2="360" y2="${H - 62}" stroke="${C.pale}" stroke-width="1" opacity="0.5"/>
</g>`;

/** 四环生殖腺：海月水母标志性的马蹄形。细环带、大开口、开口一律朝向伞盖中心。 */
function horseshoe(hx, hy, opening, ro, ri, tone, opacity, span = 4.72) {
  const a0 = opening - span / 2, a1 = opening + span / 2;
  const P = (r, a) => [hx + r * Math.cos(a), hy + r * Math.sin(a)];
  const [x0, y0] = P(ro, a0), [x1, y1] = P(ro, a1), [x2, y2] = P(ri, a1), [x3, y3] = P(ri, a0);
  return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${ro.toFixed(1)} ${ro.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${ri.toFixed(1)} ${ri.toFixed(1)} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z"
    fill="${tone}" opacity="${opacity.toFixed(2)}"/>`;
}

/** 一条由根到尖逐渐收细的口腕（填充路径，才有海月水母那种厚实的胶质感） */
function tentacle(x0, y0, len, sway, w0, curl, tone, opacity) {
  const n = 26, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + sway * Math.sin(t * Math.PI * 0.92) + curl * t * t;
    const y = y0 + len * t;
    const w = w0 * Math.pow(1 - t, 0.55) + 0.4;
    L.push([x - w, y]); R.push([x + w, y]);
  }
  const d = `M ${L.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} L ${R.reverse().map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;
  return `<path d="${d}" fill="${tone}" opacity="${opacity.toFixed(2)}"/>`;
}

/**
 * 海月水母（Aurelia aurita）俯视图 —— 依据实拍解剖：
 *   · 伞盖近圆形，伞缘 9 个大波浪瓣
 *   · 满布放射状辐管（细密，从中心发散到边缘）
 *   · 中央四枚马蹄形生殖腺，环带较粗、开口一律朝向中心，拼成四叶草
 *   · 四条口腕自中心向边缘甩出，呈不规则粗曲线
 */
function jellyfish(cx, cy, w, opacity = 1, tone = C.ice) {
  const R = w / 2;
  const LOBES = 9;

  // —— 伞盖轮廓：大波浪瓣 + 边缘极细微波 ——
  const N = 900;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N;
    const lobe = 0.5 - 0.5 * Math.cos(LOBES * a);          // 0 在瓣尖，1 在瓣谷
    const r = R * (1 - 0.048 * lobe - 0.003 * Math.sin(a * 113));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.955]);
  }
  const bellPath = 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ' Z';

  // —— 放射状辐管：从中心附近发散到伞缘 ——
  const canals = [];
  const NC = 132;
  for (let i = 0; i < NC; i++) {
    const a = (Math.PI * 2 * i) / NC + 0.013;
    const lobe = 0.5 - 0.5 * Math.cos(LOBES * a);
    const rOut = R * (0.93 - 0.05 * lobe);
    const rIn = R * (0.13 + rnd() * 0.10);
    const x1 = cx + Math.cos(a) * rIn, y1 = cy + Math.sin(a) * rIn * 0.955;
    const x2 = cx + Math.cos(a) * rOut, y2 = cy + Math.sin(a) * rOut * 0.955;
    canals.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${tone}" stroke-width="${(w * 0.0011).toFixed(2)}" opacity="${(opacity * (0.045 + rnd() * 0.075)).toFixed(2)}"/>`);
  }

  // —— 四枚马蹄形生殖腺：粗环带，开口朝向中心，拼成四叶草 ——
  const R_D = w * 0.108;          // 分布半径（四枚几乎相切）
  const RO = w * 0.076;           // 马蹄外径
  const RI = w * 0.047;           // 内径 → 环带厚 0.029w
  const gonads = [0, 1, 2, 3].map(i => {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    const hx = cx + Math.cos(a) * R_D, hy = cy + Math.sin(a) * R_D;
    const opening = a;                                 // 缺口在 opening+π 一侧 → 传 a 才朝圆心
    const span = 5.15;                                 // ≈295°，开口约 65°
    const a0 = opening - span / 2, a1 = opening + span / 2;
    const P = (r, ang) => [hx + r * Math.cos(ang), hy + r * Math.sin(ang)];
    const [x0, y0] = P(RO, a0), [x1, y1] = P(RO, a1), [x2, y2] = P(RI, a1), [x3, y3] = P(RI, a0);
    const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${RO.toFixed(1)} ${RO.toFixed(1)} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${RI.toFixed(1)} ${RI.toFixed(1)} 0 1 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
    // 双层：模糊辉光 + 清晰实体，还原生物荧光的那种"发光粗环"
    return `<path d="${d}" fill="${tone}" opacity="${(opacity * 0.55).toFixed(2)}" filter="url(#blur9)"/>`
      + `<path d="${d}" fill="${C.pale}" opacity="${(opacity * 0.92).toFixed(2)}"/>`;
  }).join('');

  // —— 四条口腕：自中心甩向边缘的粗曲线 ——
  const arms = [];
  for (const [deg, len, bend] of [[28, 0.90, 0.22], [104, 0.84, -0.18], [196, 0.80, 0.16], [292, 0.88, -0.20]]) {
    const a = (deg * Math.PI) / 180;
    const ex = cx + Math.cos(a) * R * len, ey = cy + Math.sin(a) * R * len;
    const mx = cx + Math.cos(a + bend) * R * len * 0.55, my = cy + Math.sin(a + bend) * R * len * 0.55;
    arms.push(`<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${tone}" stroke-width="${(w * 0.0075).toFixed(2)}" opacity="${(opacity * 0.09).toFixed(2)}" stroke-linecap="round"/>`);
    arms.push(`<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${tone}" stroke-width="${(w * 0.0022).toFixed(2)}" opacity="${(opacity * 0.16).toFixed(2)}" stroke-linecap="round"/>`);
  }

  // 中心十字（胃腔）
  const cross = [0, 90].map(d => {
    const a = (d * Math.PI) / 180, l = w * 0.030;
    return `<line x1="${(cx - Math.cos(a) * l).toFixed(1)}" y1="${(cy - Math.sin(a) * l).toFixed(1)}" x2="${(cx + Math.cos(a) * l).toFixed(1)}" y2="${(cy + Math.sin(a) * l).toFixed(1)}" stroke="${tone}" stroke-width="${(w * 0.0024).toFixed(2)}" opacity="${(opacity * 0.4).toFixed(2)}"/>`;
  }).join('');

  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${R * 0.98}" fill="${tone}" opacity="${(opacity * 0.030).toFixed(3)}"/>
    <path d="${bellPath}" fill="none" stroke="${tone}" stroke-width="${(w * 0.0028).toFixed(2)}" opacity="${(opacity * 0.55).toFixed(2)}"/>
    ${canals.join('')}
    ${arms.join('')}
    ${gonads}
    ${cross}
  </g>`;
}

const scenes = {
  // 01 海愿 · 主视觉：一只水母从正下方仰望你
  hero: () => `
    ${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <polygon points="${W * 0.32},0 ${W * 0.68},0 ${W * 0.90},${H * 0.72} ${W * 0.10},${H * 0.72}" fill="url(#shaft)" opacity="0.14" filter="url(#blur26)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 0.48}" rx="${W * 0.30}" ry="${H * 0.44}" fill="url(#halo)" filter="url(#blur26)" opacity="0.62"/>
    ${jellyfish(W * 0.5, H * 0.485, W * 0.395, 1, C.ice)}
    ${grain}${vignette}${caption('01', 'SEAWISHES')}`,

  // 02 折射：伞盖下的光被水面拆成色散
  dispersion: () => {
    const rings = [0.10, 0.17, 0.245, 0.32, 0.40, 0.49].map((r, i) =>
      `<ellipse cx="${W * 0.5}" cy="${H * 0.47}" rx="${W * r}" ry="${W * r * 0.52}" fill="none"
        stroke="${[C.ice, C.glow, C.violet, C.glow, C.ice, C.teal][i]}" stroke-width="${(3.4 - i * 0.45).toFixed(2)}"
        opacity="${(0.5 - i * 0.06).toFixed(2)}" stroke-dasharray="${i % 2 ? '2 14' : 'none'}"/>`).join('');
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 0.47}" rx="${W * 0.16}" ry="${H * 0.26}" fill="url(#halo)" filter="url(#blur26)"/>
    ${rings}
    <circle cx="${W * 0.5}" cy="${H * 0.47}" r="13" fill="${C.pale}" filter="url(#blur2)"/>
    <circle cx="${W * 0.5}" cy="${H * 0.47}" r="5" fill="#fff"/>
    ${grain}${vignette}${caption('02', 'DISPERSION')}`;
  },

  // 03 深蓝之树：时间以年轮的方式长出来
  'star-ring': () => {
    const rings = [];
    for (let i = 0; i < 11; i++) {
      const rx = W * (0.075 + i * 0.043);
      rings.push(`<ellipse cx="${W * 0.5}" cy="${H * 0.5}" rx="${rx.toFixed(0)}" ry="${(rx * rr(0.30, 0.36)).toFixed(0)}"
        fill="none" stroke="${i % 3 === 0 ? C.ice : C.glow}" stroke-width="${(2.6 - i * 0.16).toFixed(2)}"
        opacity="${(0.62 - i * 0.045).toFixed(2)}" stroke-dasharray="${i % 3 === 0 ? 'none' : `${rr(40, 200).toFixed(0)} ${rr(30, 120).toFixed(0)}`}" transform="rotate(${(i * rr(-3, 3)).toFixed(2)} ${W * 0.5} ${H * 0.5})"/>`);
    }
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 0.5}" rx="${W * 0.13}" ry="${H * 0.11}" fill="url(#halo)" filter="url(#blur26)" opacity="0.8"/>
    ${rings.join('')}
    <circle cx="${W * 0.5}" cy="${H * 0.5}" r="7" fill="${C.pale}"/>
    ${grain}${vignette}${caption('03', 'CAERULA ARBOR')}`;
  },

  // 04 灯火：黑暗里唯一被允许的暖色
  gallery: () => {
    const motes = Array.from({ length: 88 }, () => {
      const x = rr(W * 0.06, W * 0.94), y = rr(H * 0.05, H * 0.96), r = rr(1.1, 5.2);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${rnd() > 0.35 ? C.lamp : C.glow}" opacity="${rr(0.18, 0.85).toFixed(2)}"${r > 3.4 ? ' filter="url(#blur2)"' : ''}/>`;
    }).join('');
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 0.86}" rx="${W * 0.28}" ry="${H * 0.22}" fill="url(#lamp)" filter="url(#blur26)"/>
    ${motes}
    <path d="M ${W * 0.5} ${H * 0.2} L ${W * 0.5} ${H * 0.92}" stroke="${C.lamp}" stroke-width="1.4" opacity="0.25"/>
    ${grain}${vignette}${caption('04', 'LIGHT')}`;
  },

  // 05 初生：四个轨道，四位最初的生命
  orbit: () => {
    const orbits = [0.16, 0.25, 0.34, 0.44].map((r, i) => {
      const rx = W * r, ry = rx * 0.46;
      const a = Math.PI * 2 * (0.12 + i * 0.19);
      const px = W * 0.5 + Math.cos(a) * rx, py = H * 0.48 + Math.sin(a) * ry;
      const hot = i === 2;
      return `<ellipse cx="${W * 0.5}" cy="${H * 0.48}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="none"
        stroke="${C.glow}" stroke-width="1.1" opacity="0.26" transform="rotate(${-16 + i * 5} ${W * 0.5} ${H * 0.48})"/>
      <circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${hot ? 15 : 8}" fill="${hot ? C.lamp : C.ice}" opacity="${hot ? 0.95 : 0.7}"${hot ? ' filter="url(#blur2)"' : ''}/>`;
    }).join('');
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 0.48}" rx="${W * 0.11}" ry="${H * 0.16}" fill="url(#halo)" filter="url(#blur26)"/>
    ${orbits}
    <circle cx="${W * 0.5}" cy="${H * 0.48}" r="26" fill="${C.tone || C.mid}" stroke="${C.ice}" stroke-width="1.6" opacity="0.9"/>
    <circle cx="${W * 0.5}" cy="${H * 0.48}" r="6" fill="${C.pale}"/>
    ${grain}${vignette}${caption('05', 'FIRSTBORN')}`;
  },

  // 06 伞：伞尖是鱼叉，命中之后不许脱身
  slingshot: () => {
    const cx = W * 0.5;
    const umbY = H * 0.30, tipY = H * 0.74;
    const rain = Array.from({ length: 44 }, () => {
      const x = rr(W * 0.02, W * 0.98), y0 = rr(0, H * 0.58), len = rr(H * 0.05, H * 0.20);
      return `<line x1="${x.toFixed(0)}" y1="${y0.toFixed(0)}" x2="${x.toFixed(0)}" y2="${(y0 + len).toFixed(0)}" stroke="${C.pale}" stroke-width="1" opacity="${rr(0.02, 0.09).toFixed(2)}"/>`;
    }).join('');
    // 伞柄向下渐隐：三段递减
    const shaft = [0.62, 0.34, 0.14].map((o, i) => {
      const y1 = umbY + (tipY - umbY) * (i / 3), y2 = umbY + (tipY - umbY) * ((i + 1) / 3);
      return `<line x1="${cx}" y1="${y1.toFixed(0)}" x2="${cx}" y2="${y2.toFixed(0)}" stroke="${C.pale}" stroke-width="2.4" opacity="${o}" stroke-linecap="round"/>`;
    }).join('');
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${rain}
    <polygon points="${cx - 46},0 ${cx + 46},0 ${cx + 176},${tipY + H * 0.14} ${cx - 176},${tipY + H * 0.14}" fill="url(#shaft)" opacity="0.30" filter="url(#blur26)"/>
    <path d="M ${cx - W * 0.148} ${umbY} Q ${cx} ${umbY - H * 0.335} ${cx + W * 0.148} ${umbY}
      Q ${cx + W * 0.098} ${umbY + H * 0.030} ${cx + W * 0.048} ${umbY}
      Q ${cx} ${umbY + H * 0.040} ${cx - W * 0.048} ${umbY}
      Q ${cx - W * 0.098} ${umbY + H * 0.030} ${cx - W * 0.148} ${umbY} Z"
      fill="${C.ice}" opacity="0.10" stroke="${C.ice}" stroke-width="2.8" stroke-opacity="0.70"/>
    <line x1="${cx}" y1="${umbY - H * 0.055}" x2="${cx}" y2="${umbY + H * 0.008}" stroke="${C.pale}" stroke-width="3" opacity="0.75"/>
    ${shaft}
    <path d="M ${cx - 15} ${tipY - H * 0.052} L ${cx} ${tipY + H * 0.006} L ${cx + 15} ${tipY - H * 0.052}"
      fill="none" stroke="${C.glow}" stroke-width="2.6" opacity="0.88" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${tipY + H * 0.01}" rx="52" ry="34" fill="url(#halo)" opacity="0.55" filter="url(#blur9)"/>
    ${grain}${vignette}${caption('06', 'THE UMBRELLA')}`;
  },

  // 07 如星空般深蓝：它带着大群离开泰拉
  genesis: () => {
    const stars = Array.from({ length: 240 }, () => {
      const bias = rnd() ** 1.7;
      const x = rr(0, W);
      const y = H - bias * H * 0.98;
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr(0.7, 2.6).toFixed(1)}" fill="${rnd() > 0.78 ? C.lamp : C.pale}" opacity="${rr(0.18, 0.92).toFixed(2)}"/>`;
    }).join('');
    return `${defs()}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <ellipse cx="${W * 0.5}" cy="${H * 1.02}" rx="${W * 0.34}" ry="${H * 0.30}" fill="url(#halo)" filter="url(#blur26)" opacity="0.7"/>
    ${stars}
    <path d="M ${W * 0.10} ${H * 0.90} L ${W * 0.78} ${H * 0.08}" stroke="${C.ice}" stroke-width="1.2" opacity="0.22"/>
    <path d="M ${W * 0.18} ${H * 0.94} L ${W * 0.86} ${H * 0.12}" stroke="${C.violet}" stroke-width="2.4" opacity="0.28" filter="url(#blur9)"/>
    <rect width="${W}" height="${H}" fill="url(#veil)" opacity="0.22"/>
    ${grain}${vignette}${caption('07', 'STELLA CAERULA')}`;
  }
};

const files = [['hero', 'hero'], ...['dispersion', 'star-ring', 'gallery', 'orbit', 'slingshot', 'genesis'].map(k => [`cover-${k}`, k])];
for (const [filename, key] of files) {
  seed = 20220927;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${scenes[key]()}</svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  await fs.writeFile(path.join(outDir, `${filename}.jpg`), buf);
  console.log(`  ${filename}.jpg  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log('视觉生成完成：7 张 2048×1152，全部由矢量数学生成。');
