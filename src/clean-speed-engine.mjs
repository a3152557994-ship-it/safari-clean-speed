/**
 * Safari Clean & Speed — Core Isomorphic Engine
 * Works identically in Node.js (ESM) and modern browsers (<script type="module">).
 * Strictly compliant: operates ONLY on public article fold-masks/app-redirect overlays,
 * standard HTML5 <video> playbackRate / Picture-in-Picture APIs, and DOM-to-Markdown clipping.
 * Never bypasses video paywalls/VIP DRM or tampers with ad streams.
 */

export const PUBLIC_SPKI_BASE64 = "MCowBQYDK2VwAyEAP5NCVP7CT0tgaGLSGMe4r87SjYRWTM6gN6igBZYSXys=";
export const PRODUCT_SLUG = "safari-clean-speed";
export const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0];
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 4.0;

/**
 * Curated site-specific & generic heuristic rules for unfolding collapsed articles
 * and removing "Open in App to read full text" modal/banner masks.
 */
export const CLEAN_READ_SITE_RULES = [
  {
    id: "csdn-blog",
    domainPattern: "csdn.net",
    name: "CSDN 技术专栏展开",
    unfoldSelectors: ["#article_content", ".article_content", ".user-article-hide"],
    removeSelectors: [
      "# operate-guide-box",
      ".hide-article-box",
      ".readall_box",
      ".passport-login-container",
      ".csdn-side-toolbar",
      ".open-app-modal",
      ".wap-shadowbox",
    ],
  },
  {
    id: "zhihu-mobile",
    domainPattern: "zhihu.com",
    name: "知乎移动端免跳 App 展开",
    unfoldSelectors: [".RichContent-inner", ".Post-RichTextContainer", ".CollapsedContent"],
    removeSelectors: [
      ".OpenInAppButton",
      ".MobileAppHeader-downloadLink",
      ".ModalWrap",
      ".ContentItem-expandButton-mask",
      ".OpenInAppModal",
    ],
  },
  {
    id: "jianshu-article",
    domainPattern: "jianshu.com",
    name: "简书移动网页全文展开",
    unfoldSelectors: [".collapse-free-content", "article._2rhmJa", ".show-content-free"],
    removeSelectors: [
      ".collapse-tips",
      ".download-app-guidance",
      ".call-app-btn",
      ".open-app-banner",
    ],
  },
  {
    id: "baijiahao-news",
    domainPattern: "baidu.com",
    name: "百家号/百度资讯折叠展开",
    unfoldSelectors: [".mainContent", ".packup-content", ".article-content"],
    removeSelectors: [
      ".packupButton",
      ".layer-wrap",
      ".open-app-layer",
      ".headDeflectorContainer",
    ],
  },
  {
    id: "netease-sohu-sina",
    domainPattern: "163.com|sohu.com|sina.cn",
    name: "门户资讯移动端展开全文",
    unfoldSelectors: ["article", ".article-body", ".art_content", ".js-article-box"],
    removeSelectors: [
      ".lookall-box",
      ".show_all",
      ".u-btn-openapp",
      ".m-open-app",
      ".j_look_all",
    ],
  },
  {
    id: "reddit-medium-web",
    domainPattern: "reddit.com|medium.com",
    name: "海外社区防强跳 App 弹窗",
    unfoldSelectors: ["article", "[data-test-id='post-content']"],
    removeSelectors: [
      "shreddit-experience-tree",
      ".xpromo-nsfw-blocking-container",
      ".branch-journeys-top",
      "[data-testid='open-in-app-modal']",
    ],
  },
  {
    id: "generic-fold-heuristic",
    domainPattern: "*",
    name: "通用阅读遮罩与强跳弹窗清理",
    unfoldSelectors: [
      "[data-clean-folded]",
      ".folded-article",
      ".article-folded",
      ".read-more-container",
      ".truncated-article",
      "#article_content",
      ".RichContent-inner",
    ],
    removeSelectors: [
      "[data-clean-mask]",
      "[data-open-app-modal]",
      ".read-more-mask",
      ".hide-article-box",
      ".open-app-modal",
      ".open-app-banner",
      ".app-guide-banner",
      ".continue-in-app-sheet",
      ".expand-article-mask",
    ],
  },
];

// ---- Base64 / UTF-8 / Pure-JS Ed25519 Fallback ----

function base64ToBytes(b64) {
  const clean = String(b64).replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function base64UrlToBytes(b64url) {
  const norm = String(b64url).replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (norm.length % 4)) % 4;
  return base64ToBytes(norm + "=".repeat(pad));
}

export function bytesToBase64Url(bytes) {
  let bin = "";
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += 1) {
    bin += String.fromCharCode(u8[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SHA512_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
];
const MASK64 = 0xffffffffffffffffn;
const ED_P = (1n << 255n) - 19n;
const ED_L = (1n << 252n) + 27742317777372353535851937790883648493n;

function rotr64(x, n) {
  return ((x >> n) | (x << (64n - n))) & MASK64;
}

function sha512(msgBytes) {
  const H = [
    0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
  ];
  const len = msgBytes.length;
  const bitLen = BigInt(len) * 8n;
  const padLen = ((112 - ((len + 1) % 128)) + 128) % 128;
  const total = len + 1 + padLen + 16;
  const buf = new Uint8Array(total);
  buf.set(msgBytes, 0);
  buf[len] = 0x80;
  for (let i = 0; i < 8; i += 1) {
    buf[total - 1 - i] = Number((bitLen >> BigInt(i * 8)) & 0xffn);
  }
  const w = new Array(80);
  for (let offset = 0; offset < total; offset += 128) {
    for (let t = 0; t < 16; t += 1) {
      const idx = offset + t * 8;
      w[t] =
        (BigInt(buf[idx]) << 56n) | (BigInt(buf[idx + 1]) << 48n) |
        (BigInt(buf[idx + 2]) << 40n) | (BigInt(buf[idx + 3]) << 32n) |
        (BigInt(buf[idx + 4]) << 24n) | (BigInt(buf[idx + 5]) << 16n) |
        (BigInt(buf[idx + 6]) << 8n) | BigInt(buf[idx + 7]);
    }
    for (let t = 16; t < 80; t += 1) {
      const s0 = rotr64(w[t - 15], 1n) ^ rotr64(w[t - 15], 8n) ^ (w[t - 15] >> 7n);
      const s1 = rotr64(w[t - 2], 19n) ^ rotr64(w[t - 2], 61n) ^ (w[t - 2] >> 6n);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) & MASK64;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 80; t += 1) {
      const S1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n);
      const ch = (e & f) ^ ((~e & MASK64) & g);
      const temp1 = (h + S1 + ch + SHA512_K[t] + w[t]) & MASK64;
      const S0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) & MASK64;
      h = g; g = f; f = e; e = (d + temp1) & MASK64;
      d = c; c = b; b = a; a = (temp1 + temp2) & MASK64;
    }
    H[0] = (H[0] + a) & MASK64; H[1] = (H[1] + b) & MASK64;
    H[2] = (H[2] + c) & MASK64; H[3] = (H[3] + d) & MASK64;
    H[4] = (H[4] + e) & MASK64; H[5] = (H[5] + f) & MASK64;
    H[6] = (H[6] + g) & MASK64; H[7] = (H[7] + h) & MASK64;
  }
  const out = new Uint8Array(64);
  for (let j = 0; j < 8; j += 1) {
    for (let k = 0; k < 8; k += 1) {
      out[j * 8 + (7 - k)] = Number((H[j] >> BigInt(k * 8)) & 0xffn);
    }
  }
  return out;
}

function modP(a) {
  const r = a % ED_P;
  return r >= 0n ? r : r + ED_P;
}

function modPow(base, exp, mod) {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

const ED_D = modP(-121665n * modPow(121666n, ED_P - 2n, ED_P));

function leBytesToBigInt(bytes) {
  let x = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    x = (x << 8n) | BigInt(bytes[i]);
  }
  return x;
}

function decodeEdPoint(bytes) {
  if (bytes.length !== 32) return null;
  const copy = new Uint8Array(bytes);
  const xSign = (copy[31] >> 7) & 1;
  copy[31] &= 0x7f;
  const y = leBytesToBigInt(copy);
  if (y >= ED_P) return null;
  const y2 = modP(y * y);
  const u = modP(y2 - 1n);
  const v = modP(ED_D * y2 + 1n);
  const v3 = modP(v * v * v);
  const v7 = modP(v3 * v3 * v);
  let x = modP(modP(u * v3) * modPow(modP(u * v7), (ED_P - 5n) / 8n, ED_P));
  const vx2 = modP(v * modP(x * x));
  if (vx2 === u) {
    // ok
  } else if (vx2 === modP(-u)) {
    x = modP(x * modPow(2n, (ED_P - 1n) / 4n, ED_P));
  } else {
    return null;
  }
  if (x === 0n && xSign === 1) return null;
  if (Number(x & 1n) !== xSign) x = ED_P - x;
  return [x, y, 1n, modP(x * y)];
}

function edAdd(P, Q) {
  const [X1, Y1, Z1, T1] = P;
  const [X2, Y2, Z2, T2] = Q;
  const A = modP((Y1 - X1) * (Y2 - X2));
  const B = modP((Y1 + X1) * (Y2 + X2));
  const C = modP(T1 * 2n * ED_D * T2);
  const D = modP(Z1 * 2n * Z2);
  const E = modP(B - A);
  const F = modP(D - C);
  const G = modP(D + C);
  const H = modP(B + A);
  return [modP(E * F), modP(G * H), modP(F * G), modP(E * H)];
}

function edScalarMul(P, scalar) {
  let R = [0n, 1n, 1n, 0n];
  let Q = P;
  let s = scalar;
  while (s > 0n) {
    if (s & 1n) R = edAdd(R, Q);
    Q = edAdd(Q, Q);
    s >>= 1n;
  }
  return R;
}

const ED_BASE_Y = modP(4n * modPow(5n, ED_P - 2n, ED_P));
const ED_BASE = (() => {
  const enc = new Uint8Array(32);
  let y = ED_BASE_Y;
  for (let i = 0; i < 32; i += 1) {
    enc[i] = Number(y & 0xffn);
    y >>= 8n;
  }
  return decodeEdPoint(enc);
})();

function verifyEd25519Pure(sigBytes, msgBytes, rawPub32) {
  if (!sigBytes || sigBytes.length !== 64 || !rawPub32 || rawPub32.length !== 32) return false;
  const RBytes = sigBytes.subarray(0, 32);
  const SBytes = sigBytes.subarray(32, 64);
  const s = leBytesToBigInt(SBytes);
  if (s >= ED_L) return false;
  const R = decodeEdPoint(RBytes);
  const A = decodeEdPoint(rawPub32);
  if (!R || !A) return false;
  const hInput = new Uint8Array(64 + msgBytes.length);
  hInput.set(RBytes, 0);
  hInput.set(rawPub32, 32);
  hInput.set(msgBytes, 64);
  const h = leBytesToBigInt(sha512(hInput)) % ED_L;
  const left = edScalarMul(ED_BASE, s);
  const right = edAdd(R, edScalarMul(A, h));
  return (
    modP(left[0] * right[2] - right[0] * left[2]) === 0n &&
    modP(left[1] * right[2] - right[1] * left[2]) === 0n
  );
}

/**
 * Verify OPC1.<payloadB64>.<sigB64> Ed25519 license token.
 * Signed message is exact ASCII string `OPC1.${payloadB64}`.
 */
export async function verifyLicenseToken(token, options = {}) {
  const {
    expectedProduct = PRODUCT_SLUG,
    publicSpkiBase64 = PUBLIC_SPKI_BASE64,
    nowSec = Math.floor(Date.now() / 1000),
  } = options;

  if (typeof token !== "string" || !token.trim()) {
    return { valid: false, reason: "EMPTY_TOKEN", message: "Activation code is empty" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "OPC1" || !parts[1] || !parts[2]) {
    return { valid: false, reason: "BAD_FORMAT", message: "Expected OPC1.<payload>.<signature>" };
  }

  try {
    const [, payloadB64, sigB64] = parts;
    const spkiBytes = base64ToBytes(publicSpkiBase64);
    const sigBytes = base64UrlToBytes(sigB64);
    const signedBytes = new TextEncoder().encode(`OPC1.${payloadB64}`);

    let verified = false;
    const subtle = globalThis.crypto?.subtle;
    if (subtle && typeof subtle.importKey === "function") {
      try {
        const key = await subtle.importKey("spki", spkiBytes, { name: "Ed25519" }, false, ["verify"]);
        verified = Boolean(await subtle.verify("Ed25519", key, sigBytes, signedBytes));
      } catch {
        const rawPub = spkiBytes.length === 44 ? spkiBytes.subarray(12, 44) : spkiBytes;
        verified = verifyEd25519Pure(sigBytes, signedBytes, rawPub);
      }
    } else {
      const rawPub = spkiBytes.length === 44 ? spkiBytes.subarray(12, 44) : spkiBytes;
      verified = verifyEd25519Pure(sigBytes, signedBytes, rawPub);
    }

    if (!verified) {
      return { valid: false, reason: "BAD_SIGNATURE", message: "Signature verification failed" };
    }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    const prod = payload.p ?? payload.product ?? payload.slug;
    if (expectedProduct && prod !== expectedProduct && prod !== "*") {
      return { valid: false, reason: "PRODUCT_MISMATCH", payload };
    }

    if (typeof payload.exp === "number" && payload.exp > 0 && nowSec > payload.exp) {
      return { valid: false, reason: "EXPIRED", payload };
    }

    return { valid: true, payload, token: token.trim() };
  } catch (err) {
    return { valid: false, reason: "VERIFY_ERROR", message: err?.message || "Malformed token" };
  }
}

// ---- 1. Clean Read Unfolder (Isomorphic HTML & Live DOM) ----

export function matchRulesForHostname(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return CLEAN_READ_SITE_RULES.filter((rule) => {
    if (rule.domainPattern === "*") return true;
    return rule.domainPattern
      .split("|")
      .some((pat) => host === pat || host.endsWith(`.${pat}`) || host.includes(pat));
  });
}

function removeBalancedElementByAttrPattern(html, markerPattern) {
  let result = html;
  let removedCount = 0;
  let safety = 0;

  while (safety < 60) {
    safety += 1;
    const openMatch = markerPattern.exec(result);
    markerPattern.lastIndex = 0;
    if (!openMatch) break;

    const startIdx = openMatch.index;
    const tagName = openMatch[1].toLowerCase();
    const afterOpen = startIdx + openMatch[0].length;

    // Self-closing check
    if (/\/>\s*$/.test(openMatch[0])) {
      result = result.slice(0, startIdx) + result.slice(afterOpen);
      removedCount += 1;
      continue;
    }

    const tagRe = new RegExp(`<(\\/?)${tagName}\\b[^>]*>`, "gi");
    tagRe.lastIndex = afterOpen;
    let depth = 1;
    let endIdx = -1;
    let m;
    while ((m = tagRe.exec(result)) !== null) {
      if (m[1] === "/") {
        depth -= 1;
        if (depth === 0) {
          endIdx = m.index + m[0].length;
          break;
        }
      } else if (!/\/>\s*$/.test(m[0])) {
        depth += 1;
      }
    }

    if (endIdx !== -1) {
      result = result.slice(0, startIdx) + result.slice(endIdx);
    } else {
      result = result.slice(0, startIdx) + result.slice(afterOpen);
    }
    removedCount += 1;
  }

  return { html: result, removedCount };
}

/**
 * Clean folded article HTML string (ideal for SSR/test/preview & offline cleaning).
 * Removes "Open in App" overlays, gradient fold masks, and inline max-height/overflow locks.
 */
export function cleanFoldedHtml(rawHtml, options = {}) {
  const hostname = options.hostname || "";
  const rules = matchRulesForHostname(hostname);
  let html = String(rawHtml || "");
  let removedMasksCount = 0;
  let unfoldedCount = 0;
  let unlockedScroll = false;

  const maskAttrRegex =
    /<(div|section|aside|footer|shreddit-experience-tree)\b[^>]*(?:data-clean-mask|data-open-app-modal|class\s*=\s*["'][^"']*(?:hide-article-box|readall_box|read-more-mask|open-app-modal|open-app-banner|app-guide-banner|continue-in-app-sheet|expand-article-mask|OpenInAppButton|OpenInAppModal|download-app-guidance|lookall-box|u-btn-openapp|m-open-app|passport-login-container|packupButton|open-app-layer)[^"']*["'])[^>]*>/i;

  const stripped = removeBalancedElementByAttrPattern(html, maskAttrRegex);
  html = stripped.html;
  removedMasksCount += stripped.removedCount;

  // Unlock body/html scroll locks
  html = html.replace(
    /(<(?:body|html)\b[^>]*style\s*=\s*["'][^"']*)overflow(?:-y)?\s*:\s*hidden\s*;?/gi,
    (_, prefix) => {
      unlockedScroll = true;
      return `${prefix}overflow-y: auto;`;
    }
  );

  // Unfold truncated containers with max-height + overflow:hidden or folded classes
  html = html.replace(
    /<(article|div|main|section)\b([^>]*)>/gi,
    (fullMatch, tag, attrs) => {
      const isFoldedClass =
        /data-clean-folded|(?:class|id)\s*=\s*["'][^"']*(?:article_content|folded-article|article-folded|read-more-container|truncated-article|RichContent-inner|collapse-free-content|user-article-hide|packup-content)[^"']*["']/i.test(
          attrs
        );
      const hasInlineClamp =
        /style\s*=\s*["'][^"']*max-height\s*:\s*\d+(?:px|rem|vh|%)/i.test(attrs) &&
        !/clean-ignore/i.test(attrs);

      if (!isFoldedClass && !hasInlineClamp) return fullMatch;

      unfoldedCount += 1;
      let nextAttrs = attrs.replace(/\bdata-clean-folded(?:=["'][^"']*["'])?/gi, 'data-clean-unfolded="true"');
      if (/style\s*=\s*["']/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/style\s*=\s*(["'])([^"']*)\1/i, (_, q, styleBody) => {
          const cleanedStyle = styleBody
            .replace(/max-height\s*:\s*[^;]+;?/gi, "")
            .replace(/height\s*:\s*\d+(?:px|rem|vh)\s*;?/gi, "")
            .replace(/overflow(?:-y)?\s*:\s*hidden\s*;?/gi, "")
            .trim();
          const sep = cleanedStyle && !cleanedStyle.endsWith(";") ? "; " : "";
          return `style=${q}${cleanedStyle}${sep}max-height: none !important; height: auto !important; overflow: visible !important;${q}`;
        });
      } else {
        nextAttrs += ' style="max-height: none !important; height: auto !important; overflow: visible !important;"';
      }
      return `<${tag}${nextAttrs}>`;
    }
  );

  return {
    html,
    unfoldedCount,
    removedMasksCount,
    unlockedScroll,
    matchedRules: rules.map((r) => r.id),
  };
}

/**
 * Apply Clean Read rules directly to a live browser DOM root (Document or Element).
 */
export function applyCleanReadToDom(root, hostname = "") {
  if (!root || typeof root.querySelectorAll !== "function") {
    return { unfoldedCount: 0, removedMasksCount: 0, unlockedScroll: false, matchedRules: [] };
  }

  const rules = matchRulesForHostname(hostname);
  let unfoldedCount = 0;
  let removedMasksCount = 0;
  let unlockedScroll = false;

  const removeSet = new Set();
  const unfoldSet = new Set();
  for (const rule of rules) {
    for (const sel of rule.removeSelectors) removeSet.add(sel);
    for (const sel of rule.unfoldSelectors) unfoldSet.add(sel);
  }

  for (const sel of removeSet) {
    try {
      const nodes = root.querySelectorAll(sel);
      nodes.forEach((node) => {
        node.remove();
        removedMasksCount += 1;
      });
    } catch {
      // Ignore unsupported pseudo-selectors in older engines
    }
  }

  for (const sel of unfoldSet) {
    try {
      const nodes = root.querySelectorAll(sel);
      nodes.forEach((el) => {
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("-webkit-line-clamp", "unset", "important");
        el.removeAttribute("data-clean-folded");
        el.setAttribute("data-clean-unfolded", "true");
        unfoldedCount += 1;
      });
    } catch {
      // Ignore
    }
  }

  // Heuristic scan for inline max-height clamped article blocks inside root
  const candidates = root.querySelectorAll("article, main, [class*='article'], [class*='content']");
  candidates.forEach((el) => {
    const inlineMax = el.style?.maxHeight;
    if (inlineMax && inlineMax !== "none" && /^\d+/.test(inlineMax)) {
      el.style.setProperty("max-height", "none", "important");
      el.style.setProperty("height", "auto", "important");
      el.style.setProperty("overflow", "visible", "important");
      unfoldedCount += 1;
    }
  });

  const doc = root.ownerDocument || (root.documentElement ? root : null);
  if (doc) {
    for (const scrollEl of [doc.documentElement, doc.body]) {
      if (scrollEl && scrollEl.style && scrollEl.style.overflow === "hidden") {
        scrollEl.style.setProperty("overflow", "auto", "important");
        unlockedScroll = true;
      }
    }
  }

  return {
    unfoldedCount,
    removedMasksCount,
    unlockedScroll,
    matchedRules: rules.map((r) => r.id),
  };
}

// ---- 2. Native HTML5 Video 0.5x-4.0x Speed & Picture-in-Picture Controller ----

export function clampPlaybackRate(rate) {
  const num = Number(rate);
  if (!Number.isFinite(num)) return 1.0;
  const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, num));
  return Math.round(clamped * 100) / 100;
}

export function stepPlaybackRate(currentRate, delta = 0.25) {
  return clampPlaybackRate(clampPlaybackRate(currentRate) + Number(delta || 0));
}

export function formatSpeedLabel(rate) {
  const r = clampPlaybackRate(rate);
  return Number.isInteger(r) ? `${r.toFixed(1)}x` : `${r}x`;
}

/**
 * Toggle Picture-in-Picture on a native HTML5 <video> element using Safari WebKit API
 * (`webkitSetPresentationMode`) or standard W3C Picture-in-Picture API.
 */
export async function toggleVideoPictureInPicture(video, doc = globalThis.document) {
  if (!video) {
    return { ok: false, active: false, reason: "NO_VIDEO" };
  }

  // 1. iOS / macOS Safari native WebKit presentation mode API
  if (
    typeof video.webkitSupportsPresentationMode === "function" &&
    video.webkitSupportsPresentationMode("picture-in-picture") &&
    typeof video.webkitSetPresentationMode === "function"
  ) {
    const nextMode =
      video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture";
    video.webkitSetPresentationMode(nextMode);
    return { ok: true, active: nextMode === "picture-in-picture", api: "webkit" };
  }

  // 2. Standard W3C Picture-in-Picture API
  if (doc && doc.pictureInPictureElement === video && typeof doc.exitPictureInPicture === "function") {
    await doc.exitPictureInPicture();
    return { ok: true, active: false, api: "standard" };
  }

  if (typeof video.requestPictureInPicture === "function") {
    await video.requestPictureInPicture();
    return { ok: true, active: true, api: "standard" };
  }

  return { ok: false, active: false, reason: "PIP_UNSUPPORTED" };
}

export class VideoSpeedController {
  constructor(options = {}) {
    this.defaultRate = clampPlaybackRate(options.defaultRate ?? 1.0);
    this.currentRate = this.defaultRate;
    this.lastNonNormalRate = 2.0;
    this.domainMemory = { ...(options.domainMemory || {}) };
    this.shortcuts = {
      slower: "[",
      faster: "]",
      reset: "\\",
      toggleFast: "x",
      pip: "p",
      ...(options.shortcuts || {}),
    };
  }

  applyRateToVideo(video, rate, hostname = "") {
    const nextRate = clampPlaybackRate(rate);
    this.currentRate = nextRate;
    if (nextRate !== 1.0) {
      this.lastNonNormalRate = nextRate;
    }
    if (video && typeof video === "object") {
      video.playbackRate = nextRate;
    }
    if (hostname) {
      this.domainMemory[String(hostname).toLowerCase()] = nextRate;
    }
    return {
      rate: nextRate,
      label: formatSpeedLabel(nextRate),
      rememberedFor: hostname ? String(hostname).toLowerCase() : null,
    };
  }

  getPreferredRateForDomain(hostname = "") {
    const key = String(hostname).toLowerCase();
    if (key && this.domainMemory[key] !== undefined) {
      return clampPlaybackRate(this.domainMemory[key]);
    }
    return this.defaultRate;
  }

  handleShortcutKey(key, video, options = {}) {
    const k = String(key || "").toLowerCase();
    const hostname = options.hostname || "";
    const activeRate = video?.playbackRate ? clampPlaybackRate(video.playbackRate) : this.currentRate;

    if (k === this.shortcuts.slower.toLowerCase()) {
      const res = this.applyRateToVideo(video, stepPlaybackRate(activeRate, -0.25), hostname);
      return { handled: true, action: "slower", ...res };
    }
    if (k === this.shortcuts.faster.toLowerCase()) {
      const res = this.applyRateToVideo(video, stepPlaybackRate(activeRate, +0.25), hostname);
      return { handled: true, action: "faster", ...res };
    }
    if (k === this.shortcuts.reset.toLowerCase()) {
      const res = this.applyRateToVideo(video, 1.0, hostname);
      return { handled: true, action: "reset", ...res };
    }
    if (k === this.shortcuts.toggleFast.toLowerCase()) {
      const target = Math.abs(activeRate - 1.0) < 0.01 ? this.lastNonNormalRate : 1.0;
      const res = this.applyRateToVideo(video, target, hostname);
      return { handled: true, action: "toggleFast", ...res };
    }
    if (k === this.shortcuts.pip.toLowerCase()) {
      return {
        handled: true,
        action: "pip",
        promise: toggleVideoPictureInPicture(video, options.document),
      };
    }
    return { handled: false };
  }
}

// ---- 3. Clean HTML -> GFM Markdown Converter & Clipper ----

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&middot;": "·",
  "&copy;": "©",
  "&yen;": "¥",
};

function decodeHtmlEntities(input) {
  return String(input || "")
    .replace(/&(amp|lt|gt|quot|apos|nbsp|mdash|ndash|middot|copy|yen|#39);/gi, (m) => {
      return ENTITIES[m.toLowerCase()] ?? m;
    })
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function stripTagsInline(html) {
  return decodeHtmlEntities(String(html || "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function convertInlineHtml(fragment) {
  let s = String(fragment || "");
  // Inline code first
  const codeTokens = [];
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => {
    const clean = decodeHtmlEntities(inner.replace(/<[^>]+>/g, "")).trim();
    const idx = codeTokens.push(`\`${clean}\``) - 1;
    return `@@INLINE_CODE_${idx}@@`;
  });

  // Images
  s = s.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const altMatch = /alt\s*=\s*["']([^"']*)["']/i.exec(attrs);
    if (!srcMatch) return "";
    const alt = decodeHtmlEntities(altMatch ? altMatch[1] : "").trim();
    return `![${alt}](${srcMatch[1].trim()})`;
  });

  // Links
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, inner) => {
    const hrefMatch = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const label = stripTagsInline(inner);
    if (!hrefMatch || /^javascript:/i.test(hrefMatch[1].trim())) return label;
    return `[${label || hrefMatch[1].trim()}](${hrefMatch[1].trim()})`;
  });

  // Bold & italic & strikethrough
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => {
    const txt = convertInlineHtml(inner).trim();
    return txt ? `**${txt}**` : "";
  });
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => {
    const txt = convertInlineHtml(inner).trim();
    return txt ? `*${txt}*` : "";
  });
  s = s.replace(/<(del|s)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => {
    const txt = convertInlineHtml(inner).trim();
    return txt ? `~~${txt}~~` : "";
  });
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);

  s = s.replace(/@@INLINE_CODE_(\d+)@@/g, (_, idx) => codeTokens[Number(idx)] || "");
  return s;
}

function convertHtmlTableToGfm(tableHtml) {
  const rows = [];
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRegex = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      const cellText = convertInlineHtml(cellMatch[2]).replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
      cells.push(cellText);
    }
    if (cells.length > 0) rows.push(cells);
  }
  if (rows.length === 0) return "";
  const colCount = Math.max(...rows.map((r) => r.length));
  const padRow = (r) => {
    const copy = r.slice();
    while (copy.length < colCount) copy.push("");
    return `| ${copy.join(" | ")} |`;
  };
  const headerLine = padRow(rows[0]);
  const dividerLine = `| ${Array(colCount).fill("---").join(" | ")} |`;
  const bodyLines = rows.slice(1).map(padRow);
  return [headerLine, dividerLine, ...bodyLines].join("\n");
}

/**
 * Convert noisy/folded article HTML into clean GitHub-Flavored Markdown (GFM).
 */
export function htmlToCleanMarkdown(rawHtml, meta = {}) {
  // Step 1: Run Clean Read unfolder & mask stripper first
  let html = cleanFoldedHtml(rawHtml).html;

  // Step 2: Strip non-content tags (scripts, styles, nav, footer, ads, share widgets)
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<(script|style|noscript|iframe|svg|canvas|nav|footer|form)\b[\s\S]*?<\/\1>/gi, "");

  const noiseAttrRegex =
    /<(div|aside|section)\b[^>]*class\s*=\s*["'][^"']*(?:ad-banner|share-bar|recommend-box|related-posts|comment-area|sidebar|app-download)[^"']*["'][^>]*>/i;
  html = removeBalancedElementByAttrPattern(html, noiseAttrRegex).html;

  // Step 3: Preserve fenced code blocks first so inner HTML/newlines aren't mangled
  const fencedBlocks = [];
  html = html.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (_, preAttrs, inner) => {
    let lang = "";
    const langAttr = /language-([a-z0-9_+-]+)/i.exec(preAttrs) || /language-([a-z0-9_+-]+)/i.exec(inner);
    if (langAttr) lang = langAttr[1].toLowerCase();
    const codeBody = inner
      .replace(/^<code\b[^>]*>/i, "")
      .replace(/<\/code>\s*$/i, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");
    const decoded = decodeHtmlEntities(codeBody).replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
    const block = `\n\n\`\`\`${lang}\n${decoded}\n\`\`\`\n\n`;
    const idx = fencedBlocks.push(block) - 1;
    return `@@FENCED_BLOCK_${idx}@@`;
  });

  // Step 4: Tables
  html = html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner) => {
    const gfm = convertHtmlTableToGfm(tableInner);
    return gfm ? `\n\n${gfm}\n\n` : "";
  });

  // Step 5: Blockquotes
  html = html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, quoteInner) => {
    const cleanQuote = convertInlineHtml(quoteInner.replace(/<\/?p\b[^>]*>/gi, "\n")).trim();
    const lines = cleanQuote
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `> ${l}`);
    return lines.length ? `\n\n${lines.join("\n")}\n\n` : "";
  });

  // Step 6: Ordered & Unordered lists
  html = html.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, listInner) => {
    let counter = 0;
    const items = [];
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRe.exec(listInner)) !== null) {
      counter += 1;
      items.push(`${counter}. ${convertInlineHtml(m[1]).replace(/\s+/g, " ").trim()}`);
    }
    return items.length ? `\n\n${items.join("\n")}\n\n` : "";
  });

  html = html.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, listInner) => {
    const items = [];
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRe.exec(listInner)) !== null) {
      items.push(`- ${convertInlineHtml(m[1]).replace(/\s+/g, " ").trim()}`);
    }
    return items.length ? `\n\n${items.join("\n")}\n\n` : "";
  });

  // Step 7: Headings & Horizontal rules & Paragraphs
  html = html.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const hashes = "#".repeat(Number(level));
    const text = convertInlineHtml(inner).replace(/\s+/g, " ").trim();
    return text ? `\n\n${hashes} ${text}\n\n` : "";
  });

  html = html.replace(/<hr\b[^>]*\/?>/gi, "\n\n---\n\n");

  html = html.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const text = convertInlineHtml(inner)
      .split("\n")
      .map((l) => l.trim())
      .join("\n")
      .trim();
    return text ? `\n\n${text}\n\n` : "";
  });

  // Remaining inline/wrapper elements
  html = html.replace(/<\/?(?:article|section|main|header|div|figure|figcaption)\b[^>]*>/gi, "\n");
  let md = convertInlineHtml(html);

  // Restore fenced code blocks
  md = md.replace(/@@FENCED_BLOCK_(\d+)@@/g, (_, idx) => fencedBlocks[Number(idx)] || "");

  // Normalize blank lines
  md = md
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (meta.includeFrontmatter) {
    const title = String(meta.title || "Untitled Article").replace(/"/g, '\\"');
    const url = String(meta.url || "");
    const clippedAt = String(meta.clippedAt || new Date().toISOString().slice(0, 10));
    const tags = Array.isArray(meta.tags) && meta.tags.length ? meta.tags : ["safari-clip"];
    const fm = [
      "---",
      `title: "${title}"`,
      ...(url ? [`source: "${url}"`] : []),
      `clipped_at: "${clippedAt}"`,
      `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
      "---",
      "",
    ].join("\n");
    return fm + md;
  }

  return md;
}

export function formatMarkdownWithTemplate(markdownBody, meta = {}, templateId = "obsidian") {
  const title = meta.title || "Clean Clipped Note";
  const url = meta.url || "https://safari.local/article";
  const date = meta.clippedAt || new Date().toISOString().slice(0, 10);

  if (templateId === "notion") {
    return [
      `# ${title}`,
      `> 🔗 Source: ${url}  `,
      `> 📅 Clipped: ${date} · Extracted via Safari Clean & Speed`,
      "",
      markdownBody,
    ].join("\n");
  }

  if (templateId === "logseq") {
    return [
      `- **${title}** #safari-clip`,
      `  source:: ${url}`,
      `  clipped:: [[${date}]]`,
      "",
      markdownBody,
    ].join("\n");
  }

  // Default Obsidian YAML Vault format
  return [
    "---",
    `title: "${String(title).replace(/"/g, '\\"')}"`,
    `source: "${url}"`,
    `clipped_at: "${date}"`,
    `tags: ["safari-clean-speed", "reading-inbox"]`,
    "---",
    "",
    markdownBody,
  ].join("\n");
}

// ---- 4. Free Bookmarklet & Pro Userscript Generators ----

export function generateFreeBookmarklet() {
  const snippet = `(function(){var r=['.hide-article-box','.readall_box','.read-more-mask','.open-app-modal','.open-app-banner','.OpenInAppButton','.download-app-guidance','.lookall-box','[data-clean-mask]','[data-open-app-modal]'];r.forEach(function(s){document.querySelectorAll(s).forEach(function(e){e.remove()})});['#article_content','.RichContent-inner','.collapse-free-content','article','[data-clean-folded]'].forEach(function(s){document.querySelectorAll(s).forEach(function(e){e.style.setProperty('max-height','none','important');e.style.setProperty('height','auto','important');e.style.setProperty('overflow','visible','important')})});document.documentElement.style.overflow='auto';document.body.style.overflow='auto';var v=document.querySelector('video');if(v){var n=v.playbackRate>=2?1:2;v.playbackRate=n;alert('Safari Clean & Speed Free: 全文已展开 · 视频倍速 '+n+'x')}else{alert('Safari Clean & Speed Free: 折叠遮罩已清理，全文已展开！')}})();`;
  return `javascript:${encodeURIComponent(snippet)}`;
}

export function generateProUserscript(config = {}) {
  const defaultSpeed = clampPlaybackRate(config.defaultSpeed ?? 1.5);
  const fasterKey = String(config.fasterKey || "]");
  const slowerKey = String(config.slowerKey || "[");
  const pipKey = String(config.pipKey || "p");
  return `// ==UserScript==
// @name         Safari Clean & Speed Pro (净阅展开 + 0.5-4x 倍速画中画 + Markdown 剪藏)
// @namespace    https://a3152557994-ship-it.github.io/safari-clean-speed/
// @version      1.0.0
// @description  自动展开移动端/桌面端折叠全文遮罩、拦截强跳 App 弹窗、原生 HTML5 视频 0.5x-4x 倍速记忆与画中画、一键复制干净 Markdown（兼容 iOS/macOS Safari Stay / Userscripts）
// @author       Safari Clean & Speed
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const STORAGE_PREFIX = 'scs_pro_rate_';
  const DEFAULT_RATE = ${defaultSpeed};
  const REMOVE_SELECTORS = [
    '.hide-article-box', '.readall_box', '.read-more-mask', '.open-app-modal',
    '.open-app-banner', '.app-guide-banner', '.continue-in-app-sheet',
    '.OpenInAppButton', '.OpenInAppModal', '.download-app-guidance',
    '.lookall-box', '.u-btn-openapp', '.m-open-app', '.packupButton',
    '[data-clean-mask]', '[data-open-app-modal]'
  ];
  const UNFOLD_SELECTORS = [
    '#article_content', '.article_content', '.RichContent-inner',
    '.collapse-free-content', '.packup-content', '.folded-article',
    '[data-clean-folded]'
  ];

  function cleanRead() {
    REMOVE_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    });
    UNFOLD_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('overflow', 'visible', 'important');
      });
    });
    if (document.body && getComputedStyle(document.body).overflow === 'hidden') {
      document.body.style.setProperty('overflow', 'auto', 'important');
    }
  }

  function applySavedSpeed() {
    const hostKey = STORAGE_PREFIX + location.hostname;
    const saved = parseFloat(localStorage.getItem(hostKey) || String(DEFAULT_RATE));
    const rate = Math.min(4.0, Math.max(0.5, isFinite(saved) ? saved : DEFAULT_RATE));
    document.querySelectorAll('video').forEach((v) => {
      if (Math.abs(v.playbackRate - rate) > 0.01 && rate !== 1.0) {
        v.playbackRate = rate;
      }
    });
  }

  function setVideoRate(deltaOrExact, isExact) {
    const v = document.querySelector('video');
    if (!v) return;
    const next = isExact
      ? deltaOrExact
      : Math.round(Math.min(4.0, Math.max(0.5, v.playbackRate + deltaOrExact)) * 100) / 100;
    v.playbackRate = next;
    try { localStorage.setItem(STORAGE_PREFIX + location.hostname, String(next)); } catch (_) {}
    showToast('倍速 ' + next + 'x · 已记忆当前站点');
  }

  function togglePiP() {
    const v = document.querySelector('video');
    if (!v) return;
    if (v.webkitSupportsPresentationMode && v.webkitSupportsPresentationMode('picture-in-picture')) {
      v.webkitSetPresentationMode(v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    } else if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (v.requestPictureInPicture) {
      v.requestPictureInPicture();
    }
  }

  function showToast(msg) {
    let t = document.getElementById('__scs_pro_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '__scs_pro_toast';
      t.style.cssText = 'position:fixed;top:18px;right:18px;z-index:2147483647;background:rgba(15,23,42,0.9);color:#fff;padding:8px 14px;border-radius:999px;font:600 13px/-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.22);pointer-events:none;transition:opacity .25s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 1400);
  }

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
    if (e.key === ${JSON.stringify(slowerKey)}) setVideoRate(-0.25, false);
    else if (e.key === ${JSON.stringify(fasterKey)}) setVideoRate(0.25, false);
    else if (e.key === '\\\\') setVideoRate(1.0, true);
    else if (e.key.toLowerCase() === ${JSON.stringify(pipKey.toLowerCase())}) togglePiP();
  });

  cleanRead();
  applySavedSpeed();
  const obs = new MutationObserver(() => { cleanRead(); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
`;
}
