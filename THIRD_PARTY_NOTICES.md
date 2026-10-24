# 第三方来源

- 网站运行时、Shader、场景参数、环境模型、纹理、字形图集与音乐来自 [Active Theory](https://activetheory.net/) 公开发布版 `1780406240914`，保存版本时间为 2026-09-30。下载资源的原版权与原有声明保留；公开可下载不代表统一开源许可，本仓库没有为这些资源附加 MIT 等许可证。
- `vendor/activetheory/SOURCE.json` 记录公开来源、版本、原始运行包指纹及旧凭证字面量的移除数量。基线保存的是当前网站构建所需代码，不包含原站私有服务。
- Bodoni Moda 字体许可为 SIL Open Font License，原许可保存在 [src/assets/OFL.txt](src/assets/OFL.txt)。
- Node.js 工具依赖为 ws、Three.js、Sharp 和 Playwright；版本锁定在 `package-lock.json`，各包自己的许可随安装包提供。压缩资源的 Draco/Basis 解码器保留原文件声明。
- Daily Design .Art 内容、D 几何、字标与封面适配由本项目提供；不把整个原站发布包或音乐的版权声明改成项目自有。

- 2026-10-24合并加入的雨伞、深蓝根系是根据用户参考重建的几何，不是官方游戏模型提取。继续使用Active Theory发布包的SpineShader/FBR/TreeFBR/Proton等原渲染组件。
- `src/assets/umbrella-native-matcap.jpg`来自此前保存的Active Theory原生材质输入，仅用于隔离雨伞的彩虹反光；原来源和许可边界保留。压缩包内另一版本的共享材质、CG、音乐等原说明不变。
- `src/assets/art/footer-background.png`为用户本轮提供的图6原档，用于结尾场景独立背景；保留角色美术原权利归属，不为该素材追加开源许可。

- 本个人向展示项目参考了[Snychng/open-active-theory](https://github.com/Snychng/open-active-theory?utm_source=chatgpt.com)，保留其基础工程以及Active Theory原始运行资源的来源声明。
