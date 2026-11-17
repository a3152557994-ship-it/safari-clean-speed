/**
 * Safari Clean & Speed — Content Script (iOS & macOS Safari Web Extension)
 * Native HTML5 <video> 0.5x-4.0x speed, WebKit PiP, Clean Read & Markdown extraction.
 */
(function () {
  "use strict";

  const extApi = typeof browser !== "undefined" ? browser : chrome;
  let currentRate = 1.0;
  let autoClean = true;

  function clampRate(r) {
    const n = Number(r);
    if (!Number.isFinite(n)) return 1.0;
    return Math.round(Math.min(4.0, Math.max(0.5, n)) * 100) / 100;
  }

  function runCleanRead() {
    if (window.__SafariCleanReadRules) {
      return window.__SafariCleanReadRules.applyRules(document);
    }
    return { unfolded: 0, removed: 0 };
  }

  function setPageVideoSpeed(rate) {
    currentRate = clampRate(rate);
    const videos = Array.from(document.querySelectorAll("video"));
    videos.forEach((v) => {
      v.playbackRate = currentRate;
    });
    return { ok: true, rate: currentRate, videoCount: videos.length };
  }

  async function togglePagePiP() {
    const v = document.querySelector("video");
    if (!v) return { ok: false, reason: "NO_VIDEO" };
    if (typeof v.webkitSupportsPresentationMode === "function" && v.webkitSupportsPresentationMode("picture-in-picture")) {
      const next = v.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture";
      v.webkitSetPresentationMode(next);
      return { ok: true, mode: next };
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return { ok: true, mode: "inline" };
    }
    if (typeof v.requestPictureInPicture === "function") {
      await v.requestPictureInPicture();
      return { ok: true, mode: "picture-in-picture" };
    }
    return { ok: false, reason: "UNSUPPORTED" };
  }

  function extractArticleMarkdown() {
    runCleanRead();
    const root = document.querySelector("article, main, #article_content, .RichContent-inner") || document.body;
    const clone = root.cloneNode(true);
    clone.querySelectorAll("script, style, nav, footer, aside, iframe, .ad-banner, .share-bar").forEach((n) => n.remove());

    const lines = [`---`, `title: "${document.title.replace(/"/g, '\\"')}"`, `source: "${location.href}"`, `---`, ""];
    clone.querySelectorAll("h1, h2, h3, h4, p, pre, li, blockquote").forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const txt = (el.textContent || "").trim();
      if (!txt) return;
      if (tag.startsWith("h")) lines.push(`${"#".repeat(Number(tag[1]))} ${txt}\n`);
      else if (tag === "pre") lines.push("```\n" + txt + "\n```\n");
      else if (tag === "li") lines.push(`- ${txt}`);
      else if (tag === "blockquote") lines.push(`> ${txt}\n`);
      else lines.push(`${txt}\n`);
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Keyboard shortcuts ([ slower, ] faster, \ reset 1.0x, P PiP)
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    if (e.key === "[") setPageVideoSpeed(currentRate - 0.25);
    else if (e.key === "]") setPageVideoSpeed(currentRate + 0.25);
    else if (e.key === "\\") setPageVideoSpeed(1.0);
    else if (e.key.toLowerCase() === "p" && e.altKey) togglePagePiP();
  });

  if (extApi && extApi.runtime && extApi.runtime.onMessage) {
    extApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || !msg.type) return false;
      if (msg.type === "CLEAN_NOW") {
        sendResponse({ ok: true, ...runCleanRead() });
      } else if (msg.type === "SET_SPEED") {
        sendResponse(setPageVideoSpeed(msg.rate));
      } else if (msg.type === "TOGGLE_PIP") {
        togglePagePiP().then(sendResponse);
        return true;
      } else if (msg.type === "EXTRACT_MD") {
        sendResponse({ ok: true, markdown: extractArticleMarkdown() });
      } else if (msg.type === "GET_STATE") {
        const v = document.querySelector("video");
        sendResponse({
          ok: true,
          rate: v ? clampRate(v.playbackRate) : currentRate,
          videoCount: document.querySelectorAll("video").length,
          autoClean
        });
      }
      return false;
    });
  }

  if (autoClean) {
    runCleanRead();
  }
})();
