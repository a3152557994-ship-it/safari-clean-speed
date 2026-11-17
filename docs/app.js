import {
  PRODUCT_SLUG,
  applyCleanReadToDom,
  VideoSpeedController,
  toggleVideoPictureInPicture,
  htmlToCleanMarkdown,
  formatMarkdownWithTemplate,
  generateFreeBookmarklet,
  generateProUserscript,
  verifyLicenseToken,
} from "./clean-speed-engine.js";

const STORAGE_KEY = "scs_opc1_license_token";

const SANDBOX_DIRTY_HTML = `
<article class="mock-article folded-article" data-clean-folded="true" style="max-height: 185px; overflow: hidden;">
  <h3>2026 Safari WebKit 渲染管线实测：为什么移动端阅读总被折叠？</h3>
  <p>在 iOS 与 macOS 日常检索技术资料时，超过 <strong>72% 的内容站点</strong> 会在正文 35% 处注入高度截断（<code>max-height: 180px; overflow: hidden</code>）与半透明诱导遮罩，强迫访客跳转客户端才能查看后半段代码与参数对比表。</p>
  <h4>1. 核心 CSS 与 DOM 净阅展开原理</h4>
  <p>合规的净阅扩展不需要破解任何付费接口——被折叠的完整正文其实早已下载在本地 DOM 树中，只需精准移除遮罩层并重置容器高度锁：</p>
  <pre><code class="language-js">// Safari Clean &amp; Speed 合规展开核心示例
document.querySelectorAll('#article_content, .RichContent-inner').forEach((el) =&gt; {
  el.style.setProperty('max-height', 'none', 'important');
  el.style.setProperty('overflow', 'visible', 'important');
});</code></pre>
  <h4>2. 桌面与移动端倍速及剪藏实测对比</h4>
  <table>
    <thead>
      <tr><th>能力维度</th><th>原生未装扩展</th><th>Safari Clean &amp; Speed</th></tr>
    </thead>
    <tbody>
      <tr><td>折叠正文与弹窗</td><td>被遮罩截断 68%</td><td>0.1 秒自动展开全文</td></tr>
      <tr><td>HTML5 视频倍速</td><td>仅 1.0x–2.0x 菜单</td><td>0.5x–4.0x + 站点记忆 + 画中画</td></tr>
      <tr><td>知识库剪藏</td><td>手工复制带广告尾巴</td><td>一键纯净 GFM Markdown</td></tr>
    </tbody>
  </table>
  <blockquote>净阅模式严格遵循本地渲染与用户主动阅读权，零远端服务器上报。</blockquote>
  <div class="ad-banner" style="padding:8px;background:#fef2f2;font-size:12px;">[噪音推荐流] 猜你喜欢：震惊！99% 的人不知道的手机省电秘籍...</div>
</article>
<div class="read-more-mask" data-clean-mask="true">
  <span class="fake-app-btn">📱 打开某某热榜 App，阅读剩余 68% 全文</span>
</div>
<div class="open-app-banner" data-open-app-modal="true">
  <span>🔔 检测到您正在使用 Safari 浏览，拉起客户端享流畅体验</span>
  <strong>立即跳转 &gt;</strong>
</div>
`;

const I18N = {
  zh: {
    brandSub: "iOS / macOS 双端净阅与倍速扩展",
    navSandbox: "在线沙盒实测",
    navInstall: "免费书签 & 脚本",
    heroBadge: "100% 本地合规运行 · 零隐私上传 · 严守标准 HTML5 API（不碰 VIP 破解与贴片广告）",
    heroTitle: "告别「打开 App 阅读全文」遮罩，<br>给 Safari 补齐 0.5x–4x 倍速画中画与 Markdown 剪藏",
    heroLead: "搜技术贴被折叠半截？手机看公开课没有 2.5x/3.0x 倍速？点下方交互沙盒按钮，无需安装任何插件，当场体验 0.1 秒净阅展开、原生倍速画中画与一键提取纯净 Markdown。",
    ctaTrySandbox: "⚡ 立即在下方沙盒点按实测",
    ctaGetFree: "免费领取 Safari 净阅书签工具",
    sandboxTitle: "交互演示场：点一下按钮，当场处决折叠遮罩与无倍速视频框",
    resetBtn: "🔄 还原折叠污染状态",
    mdPanelTitle: "纯净 GFM Markdown 提取结果",
    mdPanelSub: "自动剥离强跳 App 弹窗、推荐流与脚本噪音，完整保留代码块与表格",
    installTitle: "今天立刻可用：免费书签小工具 + 标准 Safari Web Extension 源码",
  },
  en: {
    brandSub: "Clean Read & 0.5x–4x Speed for iOS / macOS Safari",
    navSandbox: "Live Sandbox",
    navInstall: "Free Bookmarklet",
    heroBadge: "100% Local & Compliant · Zero Telemetry · Standard HTML5 Video API Only",
    heroTitle: "Kill 'Open in App to Read More' Masks.<br>Unlock 0.5x–4x Speed, PiP & Clean Markdown in Safari.",
    heroLead: "Test right inside the interactive sandbox below: expand truncated mobile articles in 0.1s, drive native HTML5 video at 3.0x with Picture-in-Picture, and clip clean GFM Markdown.",
    ctaTrySandbox: "⚡ Try Live Sandbox Below",
    ctaGetFree: "Get Free Safari Bookmarklet",
    sandboxTitle: "Interactive Sandbox: Unfold Masks, Boost 3.0x Speed & Clip Markdown",
    resetBtn: "🔄 Reset Folded State",
    mdPanelTitle: "Clean GFM Markdown Output",
    mdPanelSub: "Strips app-redirect modals & ad widgets while preserving code blocks & tables",
    installTitle: "Ready Today: Free Bookmarklet + Native Safari MV3 Web Extension",
  },
};

let currentLang = "zh";
let isProUnlocked = false;
const speedController = new VideoSpeedController({ defaultRate: 1.0 });

const hostEl = document.getElementById("sandboxArticleHost");
const telemetryEl = document.getElementById("sandboxTelemetry");
const demoVideo = document.getElementById("demoVideo");
const mockSpeedBadge = document.getElementById("mockSpeedBadge");
const mdOutput = document.getElementById("mdOutput");
const mdTemplateSelect = document.getElementById("mdTemplateSelect");

function resetSandbox() {
  hostEl.innerHTML = SANDBOX_DIRTY_HTML;
  mdOutput.value = "";
  applySandboxSpeed(1.0);
  telemetryEl.innerHTML =
    "<span>状态：当前模拟移动端网页被折叠至 38% 高度，带有底部「打开 App 阅读全文」诱导遮罩与无倍速视频框。点上方按钮立即体验！</span>";
}

// Synthesize live animated Canvas -> HTML5 <video> stream so both playbackRate & PiP work offline
function initSyntheticLectureVideo() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 260;
  const ctx = canvas.getContext("2d");
  let phase = 0;
  let simTimeSec = 0;
  let lastTs = performance.now();

  function drawFrame(now) {
    const dt = Math.min(0.1, (now - lastTs) / 1000);
    lastTs = now;
    const rate = speedController.currentRate || 1.0;
    phase += dt * rate * 2.8;
    simTimeSec += dt * rate;

    const grad = ctx.createLinearGradient(0, 0, 640, 260);
    grad.addColorStop(0, "#09111f");
    grad.addColorStop(1, "#0f2942");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 260);

    // Animated waveform
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 24; x <= 616; x += 6) {
      const y = 142 + Math.sin(x * 0.032 + phase) * 34 * Math.cos(x * 0.01 - phase * 0.4);
      if (x === 24) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Orbiting pulse dot
    const dotX = 540 + Math.cos(phase * 1.3) * 36;
    const dotY = 72 + Math.sin(phase * 1.3) * 36;
    ctx.strokeStyle = "rgba(56,189,248,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(540, 72, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#2dd4bf";
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fill();

    // HUD text inside video frame (visible inside Safari Picture-in-Picture too!)
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`WebKit OpenCourse · Speed ${rate.toFixed(rate % 1 === 0 ? 1 : 2)}x`, 26, 46);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(`Lecture Timecode: ${simTimeSec.toFixed(1)}s  |  Native HTML5 <video> Stream`, 26, 76);

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);

  if (typeof canvas.captureStream === "function") {
    try {
      demoVideo.srcObject = canvas.captureStream(30);
      demoVideo.play().catch(() => {});
    } catch {
      // Fallback if captureStream restricted
    }
  }
}

function applySandboxSpeed(rate) {
  const res = speedController.applyRateToVideo(demoVideo, rate, "m.tech-notes.example");
  mockSpeedBadge.textContent = res.label;
  document.querySelectorAll("#sandboxSpeedPills button[data-rate]").forEach((btn) => {
    btn.classList.toggle("active", Math.abs(Number(btn.dataset.rate) - res.rate) < 0.01);
  });
  return res;
}

document.getElementById("btnUnfoldNow").addEventListener("click", () => {
  const t0 = performance.now();
  const stats = applyCleanReadToDom(hostEl, "m.tech-notes.example");
  const elapsed = Math.max(0.1, (performance.now() - t0)).toFixed(2);
  telemetryEl.innerHTML = `✅ <strong>净阅展开完成（耗时 ${elapsed}ms）</strong>：已展开 <strong>${stats.unfoldedCount}</strong> 处高度锁正文，精准清除 <strong>${stats.removedMasksCount}</strong> 个「打开 App 阅读全文」诱导遮罩！`;
});

document.getElementById("btnSpeed3x").addEventListener("click", () => {
  const res = applySandboxSpeed(3.0);
  telemetryEl.innerHTML = `🚀 <strong>视频倍速已切至 ${res.label}</strong>：已同步记忆当前域名默认倍速（支持 0.5x–4.0x 无级调节与键盘 <code>[</code> <code>]</code> 微调）。`;
});

document.getElementById("btnTogglePip").addEventListener("click", async () => {
  const res = await toggleVideoPictureInPicture(demoVideo, document);
  if (res.ok) {
    telemetryEl.innerHTML = `📺 <strong>画中画状态已切换（${res.api} API）</strong>：视频已${res.active ? "悬浮至桌面画中画小窗" : "返回页面内联模式"}。`;
  } else {
    telemetryEl.innerHTML = `ℹ️ 当前浏览器环境需用户先点击视频播放或不支持 PiP（在 Safari / Chrome 真机直接生效）。`;
  }
});

function refreshMarkdownOutput() {
  const rawBody = htmlToCleanMarkdown(SANDBOX_DIRTY_HTML);
  let tpl = mdTemplateSelect.value;
  if ((tpl === "notion" || tpl === "logseq") && !isProUnlocked) {
    telemetryEl.innerHTML = `🔒 <strong>Notion / Logseq 批量剪藏模板属于 Pro 买断功能（¥8 / $2.99）</strong>，已为您展示免费的 Obsidian 标准格式预览。`;
    tpl = "obsidian";
    mdTemplateSelect.value = "obsidian";
  }
  const formatted = formatMarkdownWithTemplate(
    rawBody,
    {
      title: "2026 Safari WebKit 渲染管线实测：为什么移动端阅读总被折叠？",
      url: "https://m.tech-notes.example/webkit-rendering-2026",
      clippedAt: new Date().toISOString().slice(0, 10),
    },
    tpl
  );
  mdOutput.value = formatted;
  return formatted;
}

document.getElementById("btnExtractMd").addEventListener("click", () => {
  applyCleanReadToDom(hostEl, "m.tech-notes.example");
  const md = refreshMarkdownOutput();
  telemetryEl.innerHTML = `📝 <strong>干净 Markdown 提取成功（共 ${md.length} 字符）</strong>：已自动剔除诱导打开 App 横幅与底部噪音推荐流，完整保留 JS 代码块与 GFM 对比表格！`;
});

mdTemplateSelect.addEventListener("change", refreshMarkdownOutput);

document.getElementById("resetSandboxBtn").addEventListener("click", resetSandbox);

document.querySelectorAll("#sandboxSpeedPills button[data-rate]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const r = applySandboxSpeed(Number(btn.dataset.rate));
    telemetryEl.innerHTML = `🎬 视频倍速已调整为 <strong>${r.label}</strong>`;
  });
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  const out = speedController.handleShortcutKey(e.key, demoVideo, {
    hostname: "m.tech-notes.example",
    document,
  });
  if (out.handled && out.rate) {
    applySandboxSpeed(out.rate);
    telemetryEl.innerHTML = `⌨️ 快捷键触发：当前视频倍速 <strong>${out.label}</strong>`;
  }
});

document.getElementById("copyMdBtn").addEventListener("click", async () => {
  if (!mdOutput.value) refreshMarkdownOutput();
  await navigator.clipboard.writeText(mdOutput.value);
  telemetryEl.innerHTML = "✅ 已复制纯净 GFM Markdown 到剪贴板！可直接粘贴至 Obsidian / Bear / 备忘录。";
});

document.getElementById("downloadMdBtn").addEventListener("click", () => {
  if (!mdOutput.value) refreshMarkdownOutput();
  const blob = new Blob([mdOutput.value], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "safari-clean-clip.md";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Bookmarklet setup
const freeBookmarklet = generateFreeBookmarklet();
document.getElementById("bookmarkletLink").href = freeBookmarklet;
document.getElementById("copyBookmarkletBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(freeBookmarklet);
  document.getElementById("bookmarkletHint").textContent =
    "✅ 已复制 javascript: 书签脚本！在 iPhone Safari 任意添加书签后把网址粘贴替换即可一键净阅。";
});

// Language Toggle
document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "zh" ? "en" : "zh";
  const dict = I18N[currentLang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.innerHTML = dict[key];
  });
});

// Pro License Verification & Downloads
function updateProUi(unlocked, payload = null) {
  isProUnlocked = unlocked;
  const dot = document.getElementById("proStatusDot");
  const txt = document.getElementById("proStatusText");
  const uBtn = document.getElementById("downloadUserscriptBtn");
  const cBtn = document.getElementById("downloadClipPackBtn");

  if (unlocked) {
    dot.classList.add("unlocked");
    txt.textContent = `已激活 Pro 永久买断版（授权标识：${payload?.e || payload?.plan || PRODUCT_SLUG}）`;
    uBtn.textContent = "⬇️ 下载全站自动净阅 + 倍速记忆脚本 (.user.js)";
    cBtn.textContent = "⬇️ 下载 Obsidian / Notion / Logseq 批量剪藏模板包 (.md)";
  } else {
    dot.classList.remove("unlocked");
    txt.textContent = "当前状态：免费基础版（输入 OPC1. 激活码解锁 Pro）";
    uBtn.textContent = "🔒 下载全站自动净阅 + 倍速记忆脚本 (.user.js)";
    cBtn.textContent = "🔒 下载 Obsidian / Notion 剪藏模板包 (.md)";
  }
}

document.getElementById("verifyLicenseBtn").addEventListener("click", async () => {
  const code = document.getElementById("licenseInput").value.trim();
  const fb = document.getElementById("licenseFeedback");
  const res = await verifyLicenseToken(code, { expectedProduct: PRODUCT_SLUG });
  if (res.valid) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
    fb.style.color = "#059669";
    fb.textContent = "✅ Ed25519 签名验证通过！Pro 全站自动脚本与批量剪藏模板已永久解锁。";
    updateProUi(true, res.payload);
  } else {
    fb.style.color = "#dc2626";
    fb.textContent = `❌ 激活码无效（原因：${res.reason}）。请核对完整 OPC1. 激活码或联系邮箱获取。`;
    updateProUi(false);
  }
});

document.getElementById("downloadUserscriptBtn").addEventListener("click", () => {
  if (!isProUnlocked) {
    document.getElementById("licenseInput").focus();
    document.getElementById("licenseFeedback").style.color = "#d97706";
    document.getElementById("licenseFeedback").textContent =
      "💡 请先输入 Pro 激活码（¥8 / $2.99 一次性买断），或先使用上方免费的 Safari 书签小工具！";
    return;
  }
  const scriptBody = generateProUserscript({
    defaultSpeed: Number(document.getElementById("proDefaultSpeed").value || 1.5),
    pipKey: document.getElementById("proPipKey").value || "p",
  });
  const blob = new Blob([scriptBody], { type: "text/javascript;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "safari-clean-speed-pro.user.js";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("downloadClipPackBtn").addEventListener("click", () => {
  if (!isProUnlocked) {
    document.getElementById("licenseInput").focus();
    document.getElementById("licenseFeedback").style.color = "#d97706";
    document.getElementById("licenseFeedback").textContent =
      "💡 请先输入 OPC1. Pro 激活码解锁三合一知识库剪藏模板包。";
    return;
  }
  const pack = [
    "# Safari Clean & Speed Pro — 知识库剪藏模板包 (Obsidian / Notion / Logseq)",
    "",
    "## 1. Obsidian Vault Frontmatter 模板",
    formatMarkdownWithTemplate("{{article_clean_markdown}}", { title: "{{title}}", url: "{{url}}" }, "obsidian"),
    "",
    "## 2. Notion Callout 剪藏模板",
    formatMarkdownWithTemplate("{{article_clean_markdown}}", { title: "{{title}}", url: "{{url}}" }, "notion"),
    "",
    "## 3. Logseq 双链大纲模板",
    formatMarkdownWithTemplate("{{article_clean_markdown}}", { title: "{{title}}", url: "{{url}}" }, "logseq"),
  ].join("\n");
  const blob = new Blob([pack], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "safari-clean-speed-clip-templates.md";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Auto-restore saved license if valid
(async () => {
  resetSandbox();
  initSyntheticLectureVideo();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      document.getElementById("licenseInput").value = saved;
      const res = await verifyLicenseToken(saved, { expectedProduct: PRODUCT_SLUG });
      if (res.valid) updateProUi(true, res.payload);
    }
  } catch {}
})();
