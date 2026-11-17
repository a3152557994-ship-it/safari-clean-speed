# Safari Clean & Speed (iOS / macOS)

**网页净阅（自动展开折叠全文遮罩 + 拦截强跳 App 弹窗）+ 原生 HTML5 视频 0.5x–4x 倍速与悬浮画中画 + 一键提取干净 Markdown**

- 🌐 **在线沙盒实测官网**：[https://a3152557994-ship-it.github.io/safari-clean-speed/](https://a3152557994-ship-it.github.io/safari-clean-speed/)
- 💰 **定价**：免费提供基础净阅书签栏工具 & MV3 扩展源码；Pro 一次性买断 **¥8 / $2.99**（离线 `OPC1.` Ed25519 验签，解锁全站自动规则用户脚本包、按域名倍速记忆、快捷键订制与 Obsidian/Notion 剪藏模板）
- 📬 **购买激活联系邮箱**：`3152557994@qq.com` / `a3152557994@gmail.com`

## 目录结构

- `safari-extension/`：符合 Apple `xcrun safari-web-extension-converter` 规范的完整 Manifest V3 Web Extension 源码（含 `manifest.json`, `rules-clean-read.js`, `content.js`, `popup.html/css/js` 及全尺寸 PNG 图标）。
- `src/clean-speed-engine.mjs`：零依赖同构核心引擎（净阅规则清理、倍速与 WebKit 画中画控制、HTML 转 GFM Markdown 转换器、Ed25519 离线验签）。
- `docs/`：中英双语在线交互沙盒官网（含 `llms.txt`, `robots.txt`, `sitemap.xml`）。
- `tests/safari-clean.test.mjs`：自动化单元测试套件。

## 快速运行与 Xcode 转换指南

```bash
npm run build:icons
npm run sync:docs
npm test

# 待命转换原生 iOS/macOS Safari App 工程：
xcrun safari-web-extension-converter ./safari-extension \
  --project-location ./apple-build \
  --app-name "SafariCleanSpeed" \
  --bundle-identifier com.opc.safaricleanspeed
```

## 合规说明

本工具严格遵循浏览器扩展合规标准，仅处理公开网页正文折叠样式、标准 HTML5 `<video>` 倍速与画中画接口及本地 Markdown 提取，**绝不触碰任何长视频平台 VIP 破解、DRM 解密或去贴片广告红线**。
