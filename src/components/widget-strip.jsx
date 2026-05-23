import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import useSWR from "swr";

// WMO 天气码 → glyph
function wmoGlyph(code) {
  if (code === 0) return "☀";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "❄";
  if (code <= 82) return "🌦";
  if (code <= 86) return "🌨";
  return "⛈";
}

// 每日一句 — 从 hitokoto.cn 实时拉取，点击换一句
function InlineHitokoto() {
  const [text, setText] = useState("正在获取…");
  const [from, setFrom] = useState("");

  const fetchQuote = () => {
    fetch("https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=i&c=j&c=k&encode=json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setText(d.hitokoto || "");
        setFrom(d.from_who || d.from || "佚名");
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <button
      type="button"
      className="dk-ws-hitokoto"
      onClick={fetchQuote}
      title="点击换一句 / Click for next"
    >
      <span className="dk-ws-hitokoto-track">
        <span className="dk-ws-hitokoto-quote">{text}</span>
        {from && <span className="dk-ws-hitokoto-from">— {from}</span>}
      </span>
    </button>
  );
}

export default function WidgetStrip({ widgets, onSearch }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState("广州");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // IP 地理定位 — best-effort，失败保留默认值
  useEffect(() => {
    let cancelled = false;
    fetch("https://ipapi.co/json/")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const city = d.city || d.region || d.country_name;
        if (city) setLocation(city);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ds = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];

  // 获取天气配置
  const omWidget = widgets?.find((w) => w.type === "openmeteo");
  const omParams = omWidget?.options
    ? new URLSearchParams({
        latitude: omWidget.options.latitude,
        longitude: omWidget.options.longitude,
        timezone: omWidget.options.timezone || "auto",
        units: omWidget.options.units || "metric",
        cache: omWidget.options.cache || 10,
      }).toString()
    : null;
  const { data: weatherData } = useSWR(omParams ? `/api/widgets/openmeteo?${omParams}` : null, {
    refreshInterval: 600000,
  });

  const tempVal = weatherData?.current_weather?.temperature;
  const weatherCode = weatherData?.current_weather?.weathercode;
  const weatherText = tempVal != null ? `${tempVal.toFixed(1)}°C ${wmoGlyph(weatherCode)}` : "…";

  return (
    <div id="dk-widget-strip" className="dk-widget-strip">
      {/* DK 内联 SVG Logo — 透明背景，继承文字色 */}
      <span className="dk-ws-logo" aria-label="DK">
        <svg
          className="dk-ws-logo-svg"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12 16 h6 a14 14 0 0 1 0 28 h-6 z M18 21 v18 a9 9 0 0 0 0 -18 z"
            />
            <rect x="38" y="16" width="5" height="32" />
            <path d="M43 31 L53 16 h5 L48 31 L58 48 h-5 L43 33 z" />
          </g>
          <circle cx="54" cy="12" r="2.4" fill="#22d3ee" />
        </svg>
      </span>

      {/* 品牌名 */}
      <div className="dk-ws-cell dk-ws-cell-brand">
        <span className="dk-ws-main">HOME</span>
      </div>

      <span className="dk-ws-divider" aria-hidden="true" />

      {/* 日期 / 时间 — 两行等大 */}
      <div className="dk-ws-cell dk-ws-cell-stack">
        <span className="dk-ws-line dk-ws-line-mono">{ds}</span>
        <span className="dk-ws-line dk-ws-line-mono">
          周{weekday} {hh}:{mm}
        </span>
      </div>

      {/* 位置 — 仅城市，无标签 */}
      <div className="dk-ws-cell dk-ws-cell-solo">
        <span className="dk-ws-main">{location}</span>
      </div>

      {/* 天气 — 仅温度+图标，无标签 */}
      <div className="dk-ws-cell dk-ws-cell-solo">
        <span className="dk-ws-main">{weatherText}</span>
      </div>

      <span className="dk-ws-divider" aria-hidden="true" />

      {/* 每日一句 — 替换原 VPS + stats 区块 */}
      <InlineHitokoto />

      {/* 搜索框 */}
      <button
        type="button"
        className="dk-ws-search"
        onClick={onSearch}
        title="按 ⌘K / Ctrl+K 开始搜索"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <span className="dk-ws-search-text">{t("search.placeholder")}</span>
        <span className="dk-ws-search-kbd">⌘ K</span>
      </button>
    </div>
  );
}
