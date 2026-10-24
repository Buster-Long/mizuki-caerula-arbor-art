# 歌曲时间驱动原生场景

Status: implemented

入口为src/show-controller.js、scripts/show-adapter.mjs。使用已有#bgm元素的currentTime推进，勿另写独立滚动计时器。Work详情调用原work.navigate与Work/project；关详情后保持该卡片原滚动位置再向后走。先用CMS实际perma定位，不能猜slug字段。

场景进度包含视口预滚区：用start+p*(end-start+innerHeight)-innerHeight换算；末端上限为Footer.end，不能减innerHeight，否则会卡在Footer约0.8而非底端。Work卡片按原smoothstep位置求逆，保持14张原顺序。

ParticleTestShader仅新增默认0的uShowActive和uShowWave；原ripple公式保留，默认运行与之前相同。演出期间替换ripple幅值，用原生光学渲染流动；垂直波中心参考原uLogoPos，兼容Footer翻转坐标。Home/ Footer独立背景不改。

录像必须在导航之前启用页面捕获，完整包含LoaderView、LoaderGLUI和水母片旋转。不能等visibleV>.99才开始录。内部autoplay=1会在Global/loadFinished时启动音轨，录制时记录音乐起点相对导航起点的偏移，并将音轨延迟同样长度后封装MP4。自动有声播放只对授权的录制浏览器开启；普通网页用空格手势启动。

用户要求快速前端验收：不重复跑全站慢回归。本次完成实际演出与MP4，旧全站报告属于此前版本，不作为新功能完整覆盖声明。
