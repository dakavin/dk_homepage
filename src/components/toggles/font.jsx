/**
 * FontToggle - 全局字体切换按钮
 *
 * 在三种字体之间循环切换：默认 (Manrope) / JetBrains Mono / 系统字体
 * - 通过给 <html> 添加 class (dk-font-default / dk-font-jetbrains / dk-font-system)
 *   实现全局生效
 * - 实际 @font-face 与 .dk-font-* 规则定义在 config/custom.css
 * - 选择持久化到 localStorage.dk_font_pref
 */
import { useEffect, useState } from "react";
import { TbTypography } from "react-icons/tb";

const STORAGE_KEY = "dk_font_pref";
const FONT_CLASSES = ["dk-font-default", "dk-font-jetbrains", "dk-font-system"];

const ORDER = [
  { key: "default", className: "dk-font-default", label: "默认" },
  { key: "jetbrains", className: "dk-font-jetbrains", label: "JetBrains Mono" },
  { key: "system", className: "dk-font-system", label: "系统" },
];

const findOption = (key) => ORDER.find((opt) => opt.key === key) || ORDER[0];

const applyFontClass = (className) => {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  FONT_CLASSES.forEach((cls) => {
    if (cls !== className) html.classList.remove(cls);
  });
  if (!html.classList.contains(className)) {
    html.classList.add(className);
  }
};

export default function FontToggle() {
  const [activeKey, setActiveKey] = useState("default");

  useEffect(() => {
    let saved = "default";
    try {
      saved = window.localStorage.getItem(STORAGE_KEY) || "default";
    } catch (_) {
      /* ignore */
    }
    const opt = findOption(saved);
    setActiveKey(opt.key);
    applyFontClass(opt.className);
  }, []);

  const cycle = () => {
    const idx = ORDER.findIndex((o) => o.key === activeKey);
    const next = ORDER[(idx + 1) % ORDER.length];
    setActiveKey(next.key);
    applyFontClass(next.className);
    try {
      window.localStorage.setItem(STORAGE_KEY, next.key);
    } catch (_) {
      /* ignore */
    }
  };

  const current = findOption(activeKey);

  return (
    <div id="font" className="rounded-full flex items-center justify-center">
      <button
        type="button"
        onClick={cycle}
        title={`切换字体 / Switch font (${current.label})`}
        aria-label={`切换字体 / Switch font (${current.label})`}
        className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
      >
        <TbTypography className="w-5 h-5" />
      </button>
    </div>
  );
}
