(function () {
  "use strict";
  const extApi = typeof browser !== "undefined" ? browser : chrome;

  async function sendToActiveTab(payload) {
    if (!extApi || !extApi.tabs) return null;
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) return null;
    return extApi.tabs.sendMessage(tabs[0].id, payload);
  }

  function highlightRate(rate) {
    document.getElementById("rateValue").textContent = Number(rate).toFixed(rate % 1 === 0 ? 1 : 2) + "x";
    document.querySelectorAll("#speedGrid button[data-rate]").forEach((btn) => {
      btn.classList.toggle("active", Math.abs(Number(btn.dataset.rate) - Number(rate)) < 0.01);
    });
  }

  document.getElementById("cleanBtn").addEventListener("click", async () => {
    const res = await sendToActiveTab({ type: "CLEAN_NOW" });
    const el = document.getElementById("cleanStatus");
    if (res && res.ok) {
      el.textContent = `已展开 ${res.unfolded} 处折叠，移除 ${res.removed} 个遮罩弹窗`;
    } else {
      el.textContent = "已在当前标签页执行净阅清理";
    }
  });

  document.querySelectorAll("#speedGrid button[data-rate]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const rate = Number(btn.dataset.rate);
      highlightRate(rate);
      await sendToActiveTab({ type: "SET_SPEED", rate });
    });
  });

  document.getElementById("pipBtn").addEventListener("click", async () => {
    await sendToActiveTab({ type: "TOGGLE_PIP" });
  });

  document.getElementById("clipMdBtn").addEventListener("click", async () => {
    const res = await sendToActiveTab({ type: "EXTRACT_MD" });
    const status = document.getElementById("mdStatus");
    if (res && res.markdown) {
      await navigator.clipboard.writeText(res.markdown);
      status.textContent = "✅ 已复制干净 Markdown 到剪贴板！";
    } else {
      status.textContent = "未能读取当前页面正文";
    }
  });

  sendToActiveTab({ type: "GET_STATE" }).then((res) => {
    if (res && res.ok) highlightRate(res.rate || 1.0);
  }).catch(() => {});
})();
