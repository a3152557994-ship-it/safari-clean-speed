/**
 * Safari Clean & Speed — Clean Read Ruleset for Safari Web Extension (iOS & macOS)
 * Strictly compliant: cleans article fold-masks & "Open in App" redirect modals only.
 */
(function () {
  "use strict";

  const RULES = [
    {
      id: "csdn",
      match: "csdn.net",
      unfold: ["#article_content", ".article_content", ".user-article-hide"],
      remove: [".hide-article-box", ".readall_box", ".passport-login-container", ".open-app-modal", ".wap-shadowbox"]
    },
    {
      id: "zhihu",
      match: "zhihu.com",
      unfold: [".RichContent-inner", ".Post-RichTextContainer", ".CollapsedContent"],
      remove: [".OpenInAppButton", ".MobileAppHeader-downloadLink", ".ModalWrap", ".OpenInAppModal"]
    },
    {
      id: "jianshu",
      match: "jianshu.com",
      unfold: [".collapse-free-content", "article._2rhmJa", ".show-content-free"],
      remove: [".collapse-tips", ".download-app-guidance", ".call-app-btn", ".open-app-banner"]
    },
    {
      id: "baidu",
      match: "baidu.com",
      unfold: [".mainContent", ".packup-content", ".article-content"],
      remove: [".packupButton", ".layer-wrap", ".open-app-layer", ".headDeflectorContainer"]
    },
    {
      id: "portal",
      match: "163.com|sohu.com|sina.cn",
      unfold: ["article", ".article-body", ".art_content", ".js-article-box"],
      remove: [".lookall-box", ".show_all", ".u-btn-openapp", ".m-open-app", ".j_look_all"]
    },
    {
      id: "generic",
      match: "*",
      unfold: ["[data-clean-folded]", ".folded-article", ".article-folded", ".read-more-container", ".truncated-article"],
      remove: [
        "[data-clean-mask]", "[data-open-app-modal]", ".read-more-mask", ".hide-article-box",
        ".open-app-modal", ".open-app-banner", ".app-guide-banner", ".continue-in-app-sheet",
        ".expand-article-mask"
      ]
    }
  ];

  function applyRules(rootDoc) {
    const host = (location.hostname || "").toLowerCase();
    let unfolded = 0;
    let removed = 0;

    RULES.forEach((rule) => {
      const hit = rule.match === "*" || rule.match.split("|").some((m) => host.includes(m));
      if (!hit) return;

      rule.remove.forEach((sel) => {
        rootDoc.querySelectorAll(sel).forEach((el) => {
          el.remove();
          removed += 1;
        });
      });

      rule.unfold.forEach((sel) => {
        rootDoc.querySelectorAll(sel).forEach((el) => {
          el.style.setProperty("max-height", "none", "important");
          el.style.setProperty("height", "auto", "important");
          el.style.setProperty("overflow", "visible", "important");
          unfolded += 1;
        });
      });
    });

    if (document.body && getComputedStyle(document.body).overflow === "hidden") {
      document.body.style.setProperty("overflow", "auto", "important");
    }
    return { unfolded, removed };
  }

  window.__SafariCleanReadRules = { RULES, applyRules };
})();
