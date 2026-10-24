# 首尾背景实例隔离

Status: implemented

入口为scripts/scene-background.mjs，经merged-scenes.mjs调用。原运行时只有一个全局视频提供者，但Home和Footer有独立ParticleTest实例，不能误认为所有采样器不可分。

只给Footer下的ParticleTest、HomeColumnShader、HomeLogoShader新建uniform，纹理来自src/assets/art/footer-background.png；不要修改global.uniform.value。HomeLogoShader异步回调可能晚于ParticleTest，必须一并按父场景处理。Home和Footer六槽在往返切场后仍分别绑定hero与footer-background。Home/ Footer场景类和所有背景/光学Shader未改。

Work按用户新授权恢复原生pointcloud以及0.0275点径，其他AI鼠标小水母、卡片CG和其他粒子系统不变。Price of Peace II按用户提供的中文句子修改。原ZIP和原独立工程保持不变。

验收见.artifacts/runtime-verification.json及screenshots；这些属于工程检查，非用户视觉确认。

用户后续要求去掉右上两块UI，top-right-ui.mjs隐藏NavUI.group与MusicPlayerDOM.wrapper，保留音乐，不再重复完整浏览器检查。
