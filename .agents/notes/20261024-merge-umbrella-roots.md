# 合并水月雨伞与深蓝根系

Status: implemented; browser verification recorded separately; user visual acceptance not implied

用户于2026-10-24要求以open-active-theory-src.zip为底稿，合入本聊天的雨伞和树，其他内容由另一位AI负责。用户授权优先于旧AGENTS中品牌D的默认方向。

压缩包单独构建与693个交付文件逐一比对无漂移。合并后src/content.mjs、首页水母几何、原CG/背景/音乐文件、public/index.html、服务端和其他AI原Shader改动均保留。运行时只改变SpineInstancer的40实例循环为1实例，其余字节可逆比对回压缩包版本。

不要整体覆盖build.mjs或compiled.vs。新增merged-scenes.mjs只在原构建流程内迁移两模型；blue-palette.mjs的基线指纹对应压缩包最终Shader。全量Shader只增加GlobalComposite、FlowerParticleShader、TreeParticleShader、TreeSceneComposite的局部适配；其余原块与压缩包逐字节一致，Flower的顶点段含原AI的0.0125点径并保持字节一致。

发现压缩包替换了共用room/matcap-test.jpg，故雨伞独立引用src/assets/umbrella-native-matcap.jpg。不得为修伞覆盖共享材质，不能恢复整层去色滤镜，否则会再次压掉彩虹反光。

根系几何和新生成材质与此前独立工程逐字节一致。根系继续受当前项目的全局媒体/光照输入影响，不声称每帧像素与独立工程一致。原相机、场景顺序和时长保留；无需重写浏览器渲染器。

检查脚本按压缩包实际内容更新：HomeLogoShader仅允许其已声明的matcap路径差异并验证精确指纹；检查新增UIL键必须列在构建清单；以Deep分类和真实记录名测试筛选/检索。原生Work导航目标为start+20，可能仍处于About过渡，验证滚动目标而非误等立即work路由。源代码的真实外链导航在浏览器测试中仅记录并阻止网络，其他外部资源仍不允许。
