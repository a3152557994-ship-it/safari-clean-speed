import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PUBLIC_SPKI_BASE64,
  PRODUCT_SLUG,
  cleanFoldedHtml,
  applyCleanReadToDom,
  clampPlaybackRate,
  stepPlaybackRate,
  VideoSpeedController,
  toggleVideoPictureInPicture,
  htmlToCleanMarkdown,
  formatMarkdownWithTemplate,
  generateFreeBookmarklet,
  generateProUserscript,
  verifyLicenseToken,
} from "../src/clean-speed-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signTestToken(payloadObj, privateKey) {
  const payloadB64 = toBase64Url(Buffer.from(JSON.stringify(payloadObj), "utf8"));
  const sig = crypto.sign(null, Buffer.from(`OPC1.${payloadB64}`, "utf8"), privateKey);
  return `OPC1.${payloadB64}.${toBase64Url(sig)}`;
}

test("src/clean-speed-engine.mjs and docs/clean-speed-engine.js are byte-identical", () => {
  const srcBytes = fs.readFileSync(path.join(ROOT, "src", "clean-speed-engine.mjs"), "utf8");
  const docsBytes = fs.readFileSync(path.join(ROOT, "docs", "clean-speed-engine.js"), "utf8");
  assert.equal(srcBytes, docsBytes);
  assert.equal(PUBLIC_SPKI_BASE64, "MCowBQYDK2VwAyEAP5NCVP7CT0tgaGLSGMe4r87SjYRWTM6gN6igBZYSXys=");
  assert.equal(PRODUCT_SLUG, "safari-clean-speed");
});

test("Clean Read unfolder strips Open-in-App masks, expands max-height folded article, and unlocks body scroll", () => {
  const dirtyHtml = `
    <body style="overflow: hidden;">
      <article id="article_content" class="folded-article" style="max-height: 220px; overflow: hidden;">
        <h1>SwiftUI & WebKit 性能调优实战</h1>
        <p>第一段导语公开可见。</p>
        <p>第二段深度剖析原本被遮罩截断不可见。</p>
      </article>
      <div class="hide-article-box read-more-mask">
        <a class="btn">打开 App 阅读剩余 72% 全文</a>
      </div>
      <div class="open-app-modal">强制拉起客户端弹窗</div>
    </body>
  `;

  const cleaned = cleanFoldedHtml(dirtyHtml, { hostname: "blog.csdn.net" });
  assert.equal(cleaned.unlockedScroll, true);
  assert.ok(cleaned.unfoldedCount >= 1);
  assert.equal(cleaned.removedMasksCount, 2);
  assert.ok(!cleaned.html.includes("打开 App 阅读剩余"));
  assert.ok(!cleaned.html.includes("强制拉起客户端弹窗"));
  assert.ok(cleaned.html.includes("第二段深度剖析原本被遮罩截断不可见"));
  assert.ok(cleaned.html.includes("max-height: none !important"));
  assert.ok(cleaned.matchedRules.includes("csdn-blog"));
});

test("applyCleanReadToDom works on DOM-like root objects", () => {
  let removed = 0;
  const fakeMask = { remove() { removed += 1; } };
  const styleProps = {};
  const fakeArticle = {
    style: {
      maxHeight: "180px",
      setProperty(k, v) { styleProps[k] = v; },
    },
    removeAttribute() {},
    setAttribute() {},
  };
  const fakeRoot = {
    querySelectorAll(sel) {
      if (sel === ".read-more-mask") return [fakeMask];
      if (sel === ".folded-article") return [fakeArticle];
      return [];
    },
  };
  const stats = applyCleanReadToDom(fakeRoot, "m.zhihu.com");
  assert.equal(removed, 1);
  assert.equal(styleProps["max-height"], "none");
  assert.equal(styleProps["overflow"], "visible");
  assert.ok(stats.unfoldedCount >= 1);
});

test("Native HTML5 Video 0.5x-4.0x speed controller & Safari WebKit / W3C PiP toggling", async () => {
  assert.equal(clampPlaybackRate(0.1), 0.5);
  assert.equal(clampPlaybackRate(8.0), 4.0);
  assert.equal(stepPlaybackRate(2.75, 0.25), 3.0);

  const ctrl = new VideoSpeedController({ defaultRate: 1.0 });
  const mockVideo = {
    playbackRate: 1.0,
    webkitPresentationMode: "inline",
    webkitSupportsPresentationMode(mode) { return mode === "picture-in-picture"; },
    webkitSetPresentationMode(mode) { this.webkitPresentationMode = mode; },
  };

  const res3x = ctrl.applyRateToVideo(mockVideo, 3.0, "courses.example.edu");
  assert.equal(mockVideo.playbackRate, 3.0);
  assert.equal(res3x.label, "3.0x");
  assert.equal(ctrl.getPreferredRateForDomain("courses.example.edu"), 3.0);

  // Keyboard shortcuts: ] -> 3.25x, \ -> 1.0x, x -> toggle back to 3.25x
  ctrl.handleShortcutKey("]", mockVideo, { hostname: "courses.example.edu" });
  assert.equal(mockVideo.playbackRate, 3.25);

  ctrl.handleShortcutKey("\\", mockVideo, { hostname: "courses.example.edu" });
  assert.equal(mockVideo.playbackRate, 1.0);

  ctrl.handleShortcutKey("x", mockVideo, { hostname: "courses.example.edu" });
  assert.equal(mockVideo.playbackRate, 3.25);

  // WebKit Safari PiP API
  const pipOn = await toggleVideoPictureInPicture(mockVideo, {});
  assert.equal(pipOn.ok, true);
  assert.equal(pipOn.active, true);
  assert.equal(pipOn.api, "webkit");
  assert.equal(mockVideo.webkitPresentationMode, "picture-in-picture");

  const pipOff = await toggleVideoPictureInPicture(mockVideo, {});
  assert.equal(pipOff.active, false);
});

test("HTML -> Clean GFM Markdown converter preserves headings, code blocks, lists, and tables while stripping masks & ads", () => {
  const articleHtml = `
    <article class="folded-article" style="max-height:150px;overflow:hidden">
      <h1>Safari 扩展架构指南</h1>
      <p>支持 <strong>iOS</strong> 与 <em>macOS</em> 双端共享同一套 <code>WebExtension</code> 代码。</p>
      <ul>
        <li>零远程追踪</li>
        <li>原生倍速画中画</li>
      </ul>
      <pre><code class="language-swift">let rate: Double = 3.0
player.rate = Float(rate)</code></pre>
      <table>
        <tr><th>平台</th><th>最低系统</th></tr>
        <tr><td>iOS Safari</td><td>15.4+</td></tr>
        <tr><td>macOS Safari</td><td>12.0+</td></tr>
      </table>
      <div class="ad-banner">垃圾广告推荐</div>
    </article>
    <div class="open-app-banner">打开 App 阅读全文</div>
    <script>window.__tracker = 1;</script>
  `;

  const md = htmlToCleanMarkdown(articleHtml, {
    includeFrontmatter: true,
    title: "Safari 扩展架构指南",
    url: "https://example.com/safari",
    clippedAt: "2026-11-17",
  });

  assert.ok(md.startsWith("---\ntitle: \"Safari 扩展架构指南\""));
  assert.ok(md.includes("# Safari 扩展架构指南"));
  assert.ok(md.includes("**iOS**"));
  assert.ok(md.includes("*macOS*"));
  assert.ok(md.includes("`WebExtension`"));
  assert.ok(md.includes("```swift\nlet rate: Double = 3.0\nplayer.rate = Float(rate)\n```"));
  assert.ok(md.includes("| 平台 | 最低系统 |"));
  assert.ok(md.includes("| iOS Safari | 15.4+ |"));
  assert.ok(!md.includes("垃圾广告推荐"));
  assert.ok(!md.includes("打开 App 阅读全文"));
  assert.ok(!md.includes("__tracker"));

  const notionMd = formatMarkdownWithTemplate("正文内容", { title: "测试笔记", url: "https://a.example" }, "notion");
  assert.ok(notionMd.includes("> 🔗 Source: https://a.example"));

  assert.ok(generateFreeBookmarklet().startsWith("javascript:"));
  assert.ok(generateProUserscript({ defaultSpeed: 2.0 }).includes("// ==UserScript=="));
});

test("Safari MV3 Extension manifest & icons are valid and ready for xcrun safari-web-extension-converter", () => {
  const manifestPath = path.join(ROOT, "safari-extension", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.browser_specific_settings?.safari?.strict_min_version);
  for (const size of ["16", "32", "48", "96", "128", "256", "512"]) {
    const iconFile = path.join(ROOT, "safari-extension", manifest.icons[size]);
    const bytes = fs.readFileSync(iconFile);
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50); // 'P'
    assert.equal(bytes[2], 0x4e); // 'N'
    assert.equal(bytes[3], 0x47); // 'G'
  }
});

test("OPC1 Ed25519 license verification validates authentic tokens and rejects tampered/expired/wrong-product tokens", async () => {
  // Reject forged signature against production public key
  const fakePayloadB64 = toBase64Url(Buffer.from(JSON.stringify({ v: 1, p: PRODUCT_SLUG, exp: 0 }), "utf8"));
  const fakeSigB64 = toBase64Url(Buffer.alloc(64, 7));
  const forged = await verifyLicenseToken(`OPC1.${fakePayloadB64}.${fakeSigB64}`);
  assert.equal(forged.valid, false);
  assert.equal(forged.reason, "BAD_SIGNATURE");

  // Ephemeral Ed25519 keypair end-to-end test
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const testSpkiB64 = publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const nowSec = 1794900000;

  const validToken = signTestToken(
    { v: 1, p: "safari-clean-speed", e: "reader@icloud.com", plan: "pro-buyout", iat: nowSec, exp: 0 },
    privateKey
  );
  const okRes = await verifyLicenseToken(validToken, { publicSpkiBase64: testSpkiB64, nowSec });
  assert.equal(okRes.valid, true);
  assert.equal(okRes.payload.e, "reader@icloud.com");

  const wildcardToken = signTestToken({ v: 1, p: "*", e: "all@icloud.com", exp: 0 }, privateKey);
  const okWild = await verifyLicenseToken(wildcardToken, { publicSpkiBase64: testSpkiB64, nowSec });
  assert.equal(okWild.valid, true);

  const wrongProd = signTestToken({ v: 1, p: "seal-pdf", exp: 0 }, privateKey);
  const wrongRes = await verifyLicenseToken(wrongProd, { publicSpkiBase64: testSpkiB64, nowSec });
  assert.equal(wrongRes.valid, false);
  assert.equal(wrongRes.reason, "PRODUCT_MISMATCH");

  const expired = signTestToken({ v: 1, p: "safari-clean-speed", exp: nowSec - 10 }, privateKey);
  const expRes = await verifyLicenseToken(expired, { publicSpkiBase64: testSpkiB64, nowSec });
  assert.equal(expRes.valid, false);
  assert.equal(expRes.reason, "EXPIRED");
});

test("Repository contains zero local path or private key leaks", () => {
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".git" || ent.name === "node_modules") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(mjs|js|json|html|css|md|txt|xml)$/i.test(ent.name)) {
        const text = fs.readFileSync(full, "utf8");
        assert.equal(text.includes("/Users/" + "wang"), false, `Path leak in ${full}`);
        assert.equal(text.includes("BEGIN " + "PRIVATE KEY"), false, `Private key leak in ${full}`);
      }
    }
  }
  walk(ROOT);
});
