// 内容适配层：《水月与深蓝之树》展示页
// 十四条观测 —— 全部引用《Mizuki & Caerula Arbor》官方英文文案（楼层描述 / 节点标语 / 开场白）。
// 不自行创作句子；名称也统一使用官方楼层名与节点类型名。
// 封面按 CG 编号升序排列；01 / 02 / 54 已被占用（首屏背景、底部水母片、六边形鳞甲），此处不再重复。
export const github = 'https://github.com/Buster-Long/mizuki-caerula-arbor-art';
export const brand = 'MIZUKI & CAERULA ARBOR';
export const slogan = 'How to become a better human.';

// [显示名, 封面, 主色, 标签, 正文]
// 标签四类：DEEP（深海/结局）· HUMAN（人类/心理）· WE MANY（大群）· LIGHT（灯火/命运）
export const studies = [
  ['The Hanging Grave', 'cg03', '3a7fa8', 'Deep, Shore, Light',
    '悬高之葬：你正站在一座悬崖墓园内。这里正在举行送别逝者的仪式。海民们将焚烧遗体，任由海风带走骨灰，棺木则原地竖起，作为寄托哀思的墓碑。'],
  ['Ignorance Is Bliss', 'cg06', '4fe3d4', 'We Many, Trace, Deep',
    '无知是福：你在海洋深处的溶洞中发现了一座科研设施，这里的大部分仪器都已损坏，完全无法分辨用途，只有个终端看上去还能启动。'],
  ['A Single Spark', 'cg07', 'f6e8cb', 'Light, Fate, Human',
    '点滴星火：噬尘已经覆盖了整座城市，文明产物都将被有序消解，化作海嗣生育后代与进化的养料。你在即将分解的废墟间艰难前行，寻找还能使用的物资。无意之间，你见到一块噬尘下正有什么东西在发出光亮。'],
  ['The Beginning', 'cg26', '9be8e0', 'Human, Trace, Deep',
    '开端：世界正在发生剧变，消息终端不断鸣响，坏消息接踵而至：恐鱼潮向着陆地行进，惩戒军舰队覆灭，深海教徒攻击伊比利亚颂圣棱堡。'],
  ['Heart of Caerula', 'cg27', '4fe3d4', 'We Many, Trace, Deep',
    '深蓝之心：地图标注的地点上存在着一具巨大的尸骸。大群恐鱼聚集其间，吞食着不断生长的残躯。水月带领着你避开恐鱼，向着尸骸内部前进。'],
  ['Glimpse', 'cg29', '3a2a63', 'We Many, Firstborn, Root',
    '瞥视：碑林的碎片被溟痕同化，沉落在消亡巨物旁，碑文不断变化，昭示着万千可能性：你与相识的女性结为伴侣，抑或成为她的死敌；你引领人类对抗海嗣，或身为海嗣带领族群。'],
  ['Kindling Wood', 'cg35', '3a7fa8', 'Deep, Grow, We Many',
    '引火之木：你在收集引火的木头时发现了一个奇怪的林子，树木片叶不生，树皮薄而通透，光滑得像是皮肤，轻轻用刀割开便流出带有异香的树脂。'],
  ['The Lighthouse Keeper', 'cg36', 'd6edf2', 'Human, Appetite, Light',
    '灯塔看守人：老人在沙滩上画了一座灯塔，涌上来的潮水迅速抹去了所有痕迹。“大海这次真正吞噬了它们。”他自言自语。'],
  ['Precious Days', 'cg48', 'f6e8cb', 'Deep, Ending, Light',
    '平凡即是喜乐：出发时预想的目标在终点达成，介于海嗣与人类之间的生物准备在饱餐一顿后迎来明天。日常是命运赐予生灵最大的善意，平凡，即是喜乐。'],
  ['Age of the Silence', 'cg49', '3a7fa8', 'Deep, Ending, We Many',
    '静谧时代：无声巨浪拔地而起，骑士的怒吼消失在静谧之中，毁灭伊比利亚的灾难重新降临，而它再也不会褪去。'],
  ['Price of Peace', 'cg50', '9be8e0', 'Deep, Ending, Human',
    '息潮的代价：“初生”的争端告一段落，为人的祂胜过了非人的祂。'],
  ['Price of Peace II', 'cg51', 'd6edf2', 'Deep, Ending, Firstborn',
    '息潮的代价 · 其二：静谧褪去，海潮平息，名为水月的生灵再也无法返回大地。'],
  ['Stella Caerula', 'cg52', '4fe3d4', 'Deep, Ending, Firstborn',
    '如星空般深蓝：进化的后裔从泰拉潮水中升起，破开云霄，去往无际星海。此刻，世间再无苦难，只余下新生的喜悦。'],
  ['The Caerula Rite', 'cg53', '3a2a63', 'We Many, Firstborn, Grow',
    '深蓝仪式：你目送水月进入了通向实验中枢底层的传输舱，自己则前往主控台查询水月即将面对的实验内容。这是一个漫长的全自动化改造流程，百年，还是千年？'],
].map(([name, cover, uiColor, tags, description], index) => ({
  id: `mizuki-record-${index + 1}`,
  name, slug: name.toLowerCase().replaceAll(' ', '-'), description,
  clientName: index < 4 ? 'Mizuki / Observation' : 'Mizuki / Record',
  completionDate: '2026-10-24T00:00:00.000Z', uiColor, tags,
  priority: index + 1, projectURL: github,
  projectLogo: { url: '/assets/daily/wordmark.png', width: 400, height: 200 },
  // 原 WorkItem 以媒体 URL 判断当前卡片；每项保持唯一 URL，避免同时激活复用封面的卡片。
  video: { url: `/assets/daily/study-${name.toLowerCase().replaceAll(' ', '-')}.jpg`, thumbnail: `/assets/daily/cover-${cover}.jpg` }
}));
