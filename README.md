# 京都慢游记 · Kyoto Notes

面向第一次前往京都的中文游客的互动旅行指南。

- **正式网站**：[kyoto.liuwa.xyz](https://kyoto.liuwa.xyz)
- **技术**：React 19、Vite、Three.js、Lucide；静态部署到 Vercel。

## 包含什么

- 16 个景点、餐饮与散步地点，可搜索、分类浏览、查看详情、收藏及打开真实地图导航。
- 原创 SVG 手绘风示意地图：景点、美食、散步图层，以及每日行程地点示意。
- 京都四季、历史时间线、寺院与神社、町家、传统工艺及旅行礼仪。
- 机场及市内交通、住宿区域、网络与时差、入境准备、紧急求助资料。
- 3 / 5 / 7 天逐日行程，附步行估算、雨天备选、文本下载。
- 人数与旅行风格联动预算、持久化出发清单与收藏。
- 按需加载的金阁寺风格 3D 示意模型：拖动、缩放、自动旋转、复位。
- 桌面与移动端响应式设计，键盘操作、弹窗焦点约束、减少动画设置。

## 本地开发

需要 Node.js 20.19+ 或 22.12+（建议 Node.js 24）。

```bash
npm ci
npm run dev
```

打开终端中显示的本地地址。构建与预览：

```bash
npm run build
npm run preview
```

## 内容与维护

- `src/data.js`：地点、行程、季节、礼仪、清单和官方来源。
- `src/main.jsx`：页面及交互。
- `src/SketchMap.jsx`：地图绘图与交互点位。
- `src/Pavilion.jsx`：按需加载的 Three.js 模型。
- `src/style.css`：响应式样式。
- `public/photo-credits.json`、`ASSETS.md`：摄影来源及独立许可。

资料整理日期：2026-10-05。官方旅游信息主要来自京都市旅游指南、JR 西日本、JNTO 和景点/店铺网站。时间、预算、步行距离属于规划建议；门票、营业、入境及交通政策应在出行前重新核查。手绘地图不按比例，3D 模型不是测绘复原。

收藏与出发清单仅写入当前浏览器的 localStorage，无账号、数据库或追踪分析。地点导航会打开 Google Maps；字体从 Google Fonts 加载，加载失败会使用系统字体。

## 部署

Vercel 配置：Framework = Vite，Build Command = `npm run build`，Output Directory = `dist`。可连接此 GitHub 仓库自动部署；自定义域名为 `kyoto.liuwa.xyz`。

## 许可

原创代码、地图与插画采用 [MIT](LICENSE)。摄影素材**不适用 MIT**，应分别遵守 `public/photo-credits.json` 和 `ASSETS.md` 的许可与署名要求。
