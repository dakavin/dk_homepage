/* ===================================================================
 * Homepage 自定义 JS
 * 功能列表 (整合自 homepage-master 参考项目 + dakavin/Home):
 *   1. 本地壁纸轮换 (随机, 每 45s 自动)
 *   2. URL 悬浮提示
 *   3. Hitokoto 一言 (https://hitokoto.cn) 点击换一句
 *   4. 时光进度条 (今日 / 本周 / 本月 / 今年)
 *
 * 已移除:
 *   - 加载遮罩 (会出现 "主页先出来再闪一下" 的反向闪烁体验)
 *   - 浮动按钮组 (现在所有控件都集中在 index.jsx 的 #dk-side-rail 右侧轨道)
 *   - 主题切换逻辑 (homepage 自带 ThemeContext + ThemeToggle 已处理)
 *   - 字体/主题反闪烁逻辑 (在 _document.jsx 的 NO_FLASH_SCRIPT 提前同步执行)
 *
 * 通过 /api/config/custom.js 加载 (afterInteractive)
 * =================================================================== */
(function () {
  "use strict";

  // ============= 配置 ===============================================
  const CFG = {
    // 本地壁纸列表 (与 public/images/wallpapers/ 对应)
    // 文件来源: 用户桌面 C:\Users\mikey\Desktop\壁纸\background{1..15}.{jpg,png,bmp}
    // 已用 scripts/optimize-wallpapers.mjs 统一压缩为 webp (76.8 MB -> 3.5 MB)
    wallpapers: [
      "/images/wallpapers/background1.webp",
      "/images/wallpapers/background2.webp",
      "/images/wallpapers/background3.webp",
      "/images/wallpapers/background4.webp",
      "/images/wallpapers/background5.webp",
      "/images/wallpapers/background6.webp",
      "/images/wallpapers/background7.webp",
      "/images/wallpapers/background8.webp",
      "/images/wallpapers/background9.webp",
      "/images/wallpapers/background10.webp",
      "/images/wallpapers/background11.webp",
      "/images/wallpapers/background12.webp",
      "/images/wallpapers/background13.webp",
      "/images/wallpapers/background14.webp",
      "/images/wallpapers/background15.webp",
    ],
    rotationInterval: 45000, // 自动轮换间隔 (ms), 0 = 关闭
    randomOrder: true,

    overlayOpacity: 0.36, // 背景遮罩 0-1
    showHitokoto: false,  // 已移入顶部 widget strip，不再显示底部浮动版
    showTimeProgress: true,
    showUrlTooltip: true,
    hitokotoTypes: ["a", "b", "c", "d", "i", "j", "k"],
    storageKeys: {
      wallpaperIdx: "dk_wallpaper_idx",
    },
  };

  // ============= 工具函数 ============================================
  const $ = (sel) => document.querySelector(sel);

  function preload(src) {
    const img = new Image();
    img.src = src;
  }

  // ============= 1. 壁纸轮换 =========================================
  let wallpaperIdx = 0;
  let wallpaperTimer = null;

  function ensureBackground() {
    let bg = $("#background");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "background";
      bg.setAttribute("aria-hidden", "true");
      document.body.prepend(bg);
    }
    return bg;
  }

  function backgroundImageValue(src) {
    return (
      `linear-gradient(rgb(var(--bg-color, 15 15 17) / ${CFG.overlayOpacity}), ` +
      `rgb(var(--bg-color, 15 15 17) / ${CFG.overlayOpacity})), url('${src}')`
    );
  }

  function ensureBackgroundLayers() {
    const bg = ensureBackground();
    let layers = bg.querySelectorAll(".dk-bg-layer");
    if (layers.length < 2) {
      bg.innerHTML = "";
      for (let i = 0; i < 2; i += 1) {
        const layer = document.createElement("div");
        layer.className = "dk-bg-layer";
        layer.dataset.layer = String(i);
        bg.appendChild(layer);
      }
      bg.dataset.activeLayer = "0";
      layers = bg.querySelectorAll(".dk-bg-layer");
    }
    return { bg, layers: Array.from(layers) };
  }

  function renderBackground(src, immediate = false) {
    const { bg, layers } = ensureBackgroundLayers();
    const activeIndex = parseInt(bg.dataset.activeLayer || "0", 10);
    const nextIndex = activeIndex === 0 ? 1 : 0;
    const active = layers[activeIndex];
    const next = layers[nextIndex];
    const value = backgroundImageValue(src);

    if (immediate || !active.style.backgroundImage) {
      active.style.backgroundImage = value;
      active.style.opacity = "1";
      next.style.opacity = "0";
      bg.dataset.activeLayer = String(activeIndex);
      return;
    }

    const img = new Image();
    img.onload = () => {
      next.style.backgroundImage = value;
      next.style.opacity = "0";
      window.requestAnimationFrame(() => {
        next.style.opacity = "1";
        active.style.opacity = "0";
        bg.dataset.activeLayer = String(nextIndex);
      });
    };
    img.src = src;
  }

  function pickNextWallpaperIndex() {
    if (CFG.randomOrder && CFG.wallpapers.length > 1) {
      let next = wallpaperIdx;
      while (next === wallpaperIdx) {
        next = Math.floor(Math.random() * CFG.wallpapers.length);
      }
      return next;
    }
    return (wallpaperIdx + 1) % CFG.wallpapers.length;
  }

  function rotateWallpaper() {
    if (CFG.wallpapers.length <= 1) return;
    wallpaperIdx = pickNextWallpaperIndex();
    const src = CFG.wallpapers[wallpaperIdx];
    renderBackground(src);
    try {
      localStorage.setItem(CFG.storageKeys.wallpaperIdx, String(wallpaperIdx));
    } catch (_) {
      /* ignore */
    }
    preload(CFG.wallpapers[(wallpaperIdx + 1) % CFG.wallpapers.length]);
  }

  window.dkNextWallpaper = rotateWallpaper;
  window.addEventListener("dk:next-wallpaper", rotateWallpaper);

  function startWallpaperRotation() {
    if (!CFG.wallpapers.length) return;

    try {
      const saved = parseInt(localStorage.getItem(CFG.storageKeys.wallpaperIdx) || "0", 10);
      if (!Number.isNaN(saved) && saved >= 0 && saved < CFG.wallpapers.length) {
        wallpaperIdx = saved;
      }
    } catch (_) {
      /* ignore */
    }

    CFG.wallpapers.forEach(preload);
    renderBackground(CFG.wallpapers[wallpaperIdx], true);

    if (CFG.rotationInterval > 0 && CFG.wallpapers.length > 1) {
      if (wallpaperTimer) window.clearInterval(wallpaperTimer);
      wallpaperTimer = window.setInterval(rotateWallpaper, CFG.rotationInterval);
    }
  }

  // ============= 2. URL 悬浮提示 =====================================
  function initUrlTooltip() {
    if (!CFG.showUrlTooltip) return;

    document.addEventListener(
      "mouseover",
      (e) => {
        const target = e.target.closest(".service, .bookmark, .service-card, .bookmark a");
        if (!target || target.dataset.dkTip === "1") return;

        const link = target.querySelector("a") || (target.tagName === "A" ? target : null);
        if (!link || !link.href) return;

        target.dataset.dkTip = "1";
        const tip = document.createElement("div");
        tip.className = "dk-url-tooltip";
        tip.innerText = link.href;
        document.body.appendChild(tip);

        const move = (ev) => {
          tip.style.left = ev.clientX + 16 + "px";
          tip.style.top = ev.clientY + 16 + "px";
        };
        target.addEventListener("mousemove", move);
        target.addEventListener(
          "mouseleave",
          () => {
            tip.remove();
            delete target.dataset.dkTip;
            target.removeEventListener("mousemove", move);
          },
          { once: true },
        );
      },
      true,
    );
  }

  // ============= 3. Hitokoto 一言 ====================================
  let hitokotoEl = null;

  async function fetchHitokoto() {
    try {
      const params = CFG.hitokotoTypes.map((t) => `c=${t}`).join("&");
      const res = await fetch(`https://v1.hitokoto.cn/?${params}&encode=json`);
      const data = await res.json();
      return data && data.hitokoto ? data : null;
    } catch (_) {
      return null;
    }
  }

  async function refreshHitokoto() {
    if (!hitokotoEl) return;
    const data = await fetchHitokoto();
    if (data) {
      hitokotoEl.textContent = `${data.hitokoto}  —  ${data.from || data.from_who || "佚名"}`;
      hitokotoEl.title = `点击换一句 · ${data.from_who || ""} «${data.from || ""}»`;
    } else {
      hitokotoEl.textContent = "保持热爱，奔赴山海。";
    }
  }

  function initHitokoto() {
    if (!CFG.showHitokoto) return;
    if ($("#dk-hitokoto")) return;

    hitokotoEl = document.createElement("div");
    hitokotoEl.id = "dk-hitokoto";
    hitokotoEl.textContent = "正在获取一言…";
    hitokotoEl.addEventListener("click", refreshHitokoto);
    document.body.appendChild(hitokotoEl);
    refreshHitokoto();
  }

  // ============= 4. 时光进度条 =======================================
  // 时光进度条标签 — 根据当前语言偏好自动切换中/英
  const TIME_LABELS = {
    zh: { day: "今日", week: "本周", month: "本月", year: "今年" },
    en: { day: "Today", week: "Week", month: "Month", year: "Year" },
  };

  function getCurrentLanguage() {
    try {
      const stored = localStorage.getItem("dk_lang_pref");
      if (stored) return stored;
    } catch (_) {
      /* ignore */
    }
    return document.documentElement.lang || "zh";
  }

  function getTimeLabels(language = getCurrentLanguage()) {
    const lang = String(language || "zh").toLowerCase();
    return lang.startsWith("zh") ? TIME_LABELS.zh : TIME_LABELS.en;
  }

  function updateTimeProgressLabels(language) {
    const wrap = $("#dk-time-progress");
    if (!wrap) return;

    const labels = getTimeLabels(language);
    wrap.querySelectorAll(".dk-bar-row").forEach((row) => {
      const key = row.getAttribute("data-key");
      const label = row.querySelector(".dk-bar-label span:first-child");
      if (label && labels[key]) label.textContent = labels[key];
    });
  }

  function initTimeProgress() {
    if (!CFG.showTimeProgress) return;
    if ($("#dk-time-progress")) return;

    const L = getTimeLabels();
    const wrap = document.createElement("div");
    wrap.id = "dk-time-progress";
    wrap.innerHTML = `
      <div class="dk-bar-row" data-key="day">
        <div class="dk-bar-label"><span>${L.day}</span><span class="dk-bar-pct"></span></div>
        <div class="dk-bar"><div class="dk-bar-fill"></div></div>
      </div>
      <div class="dk-bar-row" data-key="week">
        <div class="dk-bar-label"><span>${L.week}</span><span class="dk-bar-pct"></span></div>
        <div class="dk-bar"><div class="dk-bar-fill"></div></div>
      </div>
      <div class="dk-bar-row" data-key="month">
        <div class="dk-bar-label"><span>${L.month}</span><span class="dk-bar-pct"></span></div>
        <div class="dk-bar"><div class="dk-bar-fill"></div></div>
      </div>
      <div class="dk-bar-row" data-key="year">
        <div class="dk-bar-label"><span>${L.year}</span><span class="dk-bar-pct"></span></div>
        <div class="dk-bar"><div class="dk-bar-fill"></div></div>
      </div>
    `;
    const footer = $("#footer");
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(wrap, footer);
    } else {
      document.body.appendChild(wrap);
    }

    const update = () => {
      const now = new Date();
      const dayMs = now - new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayPct = (dayMs / 86400000) * 100;
      const dow = (now.getDay() + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dow);
      weekStart.setHours(0, 0, 0, 0);
      const weekPct = ((now - weekStart) / (7 * 86400000)) * 100;
      const monStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      const monPct = ((now - monStart) / (monEnd - monStart)) * 100;
      const yStart = new Date(now.getFullYear(), 0, 1).getTime();
      const yEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
      const yPct = ((now - yStart) / (yEnd - yStart)) * 100;

      const pcts = { day: dayPct, week: weekPct, month: monPct, year: yPct };
      wrap.querySelectorAll(".dk-bar-row").forEach((row) => {
        const key = row.getAttribute("data-key");
        const v = Math.min(100, Math.max(0, pcts[key]));
        row.querySelector(".dk-bar-fill").style.width = v.toFixed(2) + "%";
        row.querySelector(".dk-bar-pct").textContent = v.toFixed(1) + "%";
      });
    };
    update();
    window.setInterval(update, 60_000);
    window.addEventListener("dk:language-change", (event) => {
      updateTimeProgressLabels(event.detail?.language);
    });
  }

  // ============= 启动 =================================================
  function start() {
    startWallpaperRotation();
    initUrlTooltip();
    initHitokoto();
    initTimeProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
