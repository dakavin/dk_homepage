import { Head, Html, Main, NextScript } from "next/document";

/**
 * 在 <body> 渲染前同步运行的反闪烁脚本：
 *   - 应用 localStorage 里保存的字体选择 (dk_font_pref) -> html.dk-font-*
 *   - 应用 localStorage 里保存的主题 (theme-mode) 或回退到 prefers-color-scheme,
 *     设置 html 上的 dark / scheme-dark / scheme-light, 与 ThemeContext 保持一致
 *
 * 使用 IIFE + try/catch, 即便 localStorage 不可用也不阻塞页面
 */
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var html = document.documentElement;

    // 字体
    var FONT_CLASSES = ['dk-font-default', 'dk-font-jetbrains', 'dk-font-system'];
    var fontPref = null;
    try { fontPref = localStorage.getItem('dk_font_pref'); } catch (e) {}
    var fontMap = {
      default: 'dk-font-default',
      jetbrains: 'dk-font-jetbrains',
      system: 'dk-font-system'
    };
    var fontClass = fontMap[fontPref] || 'dk-font-default';
    FONT_CLASSES.forEach(function (c) {
      if (c !== fontClass && html.classList.contains(c)) html.classList.remove(c);
    });
    if (!html.classList.contains(fontClass)) html.classList.add(fontClass);

    // 主题 (与 utils/contexts/theme.jsx 的 getInitialTheme 行为对齐)
    var theme = null;
    try { theme = localStorage.getItem('theme-mode'); } catch (e) {}
    if (theme !== 'light' && theme !== 'dark') {
      try {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch (e) { theme = 'dark'; }
    }
    html.classList.remove('dark', 'scheme-dark', 'scheme-light');
    if (theme === 'dark') {
      html.classList.add('dark', 'scheme-dark');
    } else {
      html.classList.add('scheme-light');
    }
  } catch (e) { /* swallow */ }
})();
`;

const LOADING_STYLE = `
body.dk-app-loading {
  overflow: hidden;
}

body.dk-app-loading #__next {
  visibility: hidden;
}

#dk-preload-screen {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: hidden;
  background:
    linear-gradient(rgb(15 23 42 / 0.5), rgb(15 23 42 / 0.5)),
    var(--dk-loader-bg, #111827);
  background-size: cover;
  background-position: center;
  color: #fff;
}

#dk-preload-screen .dk-loader {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

#dk-preload-screen .dk-loader-logo {
  width: 86px;
  height: 86px;
  border-radius: 18px;
  margin-bottom: 34px;
  overflow: hidden;
  filter: drop-shadow(0 12px 26px rgb(0 0 0 / 0.45));
}

#dk-preload-screen .dk-loader-ring {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #fff;
  animation: dk-loader-spin 1.8s linear infinite;
}

#dk-preload-screen .dk-loader-ring::before,
#dk-preload-screen .dk-loader-ring::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 3px solid transparent;
}

#dk-preload-screen .dk-loader-ring::before {
  inset: 6px;
  border-top-color: #a4a4a4;
  animation: dk-loader-spin-reverse 0.7s linear infinite;
}

#dk-preload-screen .dk-loader-ring::after {
  inset: 16px;
  border-top-color: #d3d3d3;
  animation: dk-loader-spin 1.1s linear infinite;
}

#dk-preload-screen .dk-loader-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 34px;
  font-size: 24px;
  line-height: 1.3;
  letter-spacing: 0;
}

#dk-preload-screen .dk-loader-tip {
  margin-top: 8px;
  font-size: 16px;
  opacity: 0.68;
}

#dk-preload-screen.loaded {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.45s ease-out,
    visibility 0.45s ease-out;
}

#dk-preload-screen.loaded .dk-loader-logo,
#dk-preload-screen.loaded .dk-loader-ring,
#dk-preload-screen.loaded .dk-loader-text {
  opacity: 0;
  transition: opacity 0.25s ease-out;
}

@keyframes dk-loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dk-loader-spin-reverse {
  to {
    transform: rotate(-360deg);
  }
}
`;

const LOADING_RELEASE_SCRIPT = `
(function () {
  var MIN_LOADING_MS = 1800;
  var MAX_LOADING_MS = 8000;
  var startAt = Date.now();
  var released = false;

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function waitForWindowLoad() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise(function (resolve) {
      window.addEventListener('load', resolve, { once: true });
    });
  }

  function waitForFonts() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    return document.fonts.ready.catch(function () {});
  }

  function waitForImages() {
    var images = Array.prototype.slice.call(document.images || []);
    if (!images.length) return Promise.resolve();
    return Promise.all(images.map(function (image) {
      if (image.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  function getBackgroundImageUrls() {
    var background = document.querySelector('#background');
    if (!background) return [];
    var value = '';
    try {
      value = getComputedStyle(background).backgroundImage || background.style.backgroundImage || '';
    } catch (e) {
      value = background.style.backgroundImage || '';
    }
    var urls = [];
    var pattern = /url\\(["']?([^"')]+)["']?\\)/g;
    var match;
    while ((match = pattern.exec(value))) {
      urls.push(match[1]);
    }
    return urls;
  }

  function waitForBackgroundImages() {
    var urls = getBackgroundImageUrls();
    if (!urls.length || !window.Image) return Promise.resolve();
    return Promise.all(urls.map(function (url) {
      return new Promise(function (resolve) {
        var image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = url;
      });
    }));
  }

  function release() {
    if (released) return;
    released = true;
    var loader = document.querySelector('#dk-preload-screen');
    document.body.classList.remove('dk-app-loading');
    if (!loader) return;
    loader.classList.add('loaded');
    setTimeout(function () {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
    }, 1400);
  }

  setTimeout(release, MAX_LOADING_MS);

  Promise.all([
    delay(Math.max(0, MIN_LOADING_MS - (Date.now() - startAt))),
    Promise.race([
      waitForWindowLoad().then(function () {
        return Promise.all([waitForFonts(), waitForImages(), waitForBackgroundImages()]);
      }),
      delay(MAX_LOADING_MS)
    ])
  ]).then(release).catch(release);
})();
`;

const LOADING_BACKGROUND_SCRIPT = `
(function () {
  try {
    var wallpapers = [
      '/images/wallpapers/background1.webp',
      '/images/wallpapers/background2.webp',
      '/images/wallpapers/background3.webp',
      '/images/wallpapers/background4.webp',
      '/images/wallpapers/background5.webp',
      '/images/wallpapers/background6.webp',
      '/images/wallpapers/background7.webp',
      '/images/wallpapers/background8.webp',
      '/images/wallpapers/background9.webp',
      '/images/wallpapers/background10.webp',
      '/images/wallpapers/background11.webp',
      '/images/wallpapers/background12.webp',
      '/images/wallpapers/background13.webp',
      '/images/wallpapers/background14.webp',
      '/images/wallpapers/background15.webp'
    ];
    var selected = wallpapers[Math.floor(Math.random() * wallpapers.length)];
    document.documentElement.style.setProperty('--dk-loader-bg', 'url("' + selected + '")');
  } catch (e) { /* swallow */ }
})();
`;

export default function Document() {
  return (
    <Html>
      <Head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/site.webmanifest?v=4" crossOrigin="use-credentials" />
        <link rel="preload" href="/api/config/custom.css" as="style" />
        <link rel="stylesheet" href="/api/config/custom.css" /> {/* eslint-disable-line @next/next/no-css-tags */}
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: LOADING_STYLE }} />
      </Head>
      <body className="dk-app-loading">
        {/* 反闪烁脚本: 必须在 <Main /> 之前执行 */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        {/* 随机加载页背景: 必须在 loader 节点之前执行 */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: LOADING_BACKGROUND_SCRIPT }} />
        <div id="dk-preload-screen" aria-live="polite" aria-label="页面加载中">
          <div className="dk-loader">
            <svg
              className="dk-loader-logo"
              viewBox="0 0 64 64"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="DK"
            >
              <rect width="64" height="64" rx="14" fill="#1e293b" />
              <g fill="white">
                <path
                  fillRule="evenodd"
                  d="M12 16 h6 a14 14 0 0 1 0 28 h-6 z M18 21 v18 a9 9 0 0 0 0 -18 z"
                />
                <rect x="38" y="16" width="5" height="32" />
                <path d="M43 31 L53 16 h5 L48 31 L58 48 h-5 L43 33 z" />
              </g>
              <circle cx="54" cy="12" r="3.2" fill="#22d3ee" />
            </svg>
            <div className="dk-loader-ring" />
            <div className="dk-loader-text">
              <span>Dakkk's Home</span>
              <span className="dk-loader-tip">加速准备中，请耐心等候</span>
            </div>
          </div>
        </div>
        <Main />
        <NextScript />
        {/* 加载层释放脚本: 独立于 React hydration, 避免首屏卡在 loader */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: LOADING_RELEASE_SCRIPT }} />
      </body>
    </Html>
  );
}
