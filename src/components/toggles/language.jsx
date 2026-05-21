/**
 * LanguageToggle - 中英文语言切换按钮
 *
 * 状态直接从 i18n.language 派生，不缓存 useState，避免初始化竞态：
 *   - next-i18next 默认 locale 是 "en"，而 settings.yaml 里写了 zh-CN；
 *     Home 组件的 useEffect 会在 mount 后调 changeLanguage("zh-Hans")，
 *     若用 useState 缓存就会出现 showChinese 与实际语言不一致的情况，
 *     导致第一次点击实际上切换到相同语言（无效果）。
 *   - 直接读 i18n.language，useTranslation 本身已订阅语言变更并触发重渲染。
 *
 * 切换时：
 *   1. 写 localStorage (dk_lang_pref)      — Home 组件 useEffect 读取
 *   2. 写 NEXT_LOCALE cookie               — Next.js 路由 locale
 *   3. 调 i18n.changeLanguage              — 立即更新所有 useTranslation 消费者
 *   4. 派发 dk:language-change             — 通知 config/custom.js 这类非 React 脚本同步文案
 */
import { useTranslation } from "next-i18next";
import { MdLanguage } from "react-icons/md";

const LANG_STORAGE_KEY = "dk_lang_pref";
const COOKIE_KEY = "NEXT_LOCALE";

const setCookie = (name, value, days = 365) => {
  if (typeof document === "undefined") return;
  const exp = new Date();
  exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${exp.toUTCString()};path=/;SameSite=Lax`;
};

const isChinese = (lang) => {
  if (!lang) return false;
  return lang.toLowerCase().startsWith("zh");
};

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  // 直接从 i18n.language 派生，无需 useState — useTranslation 会在语言变更时触发重渲染
  const showChinese = isChinese(i18n.language);

  const toggle = async () => {
    const next = showChinese ? "en" : "zh-Hans";
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch (_) {
      /* ignore */
    }
    setCookie(COOKIE_KEY, next);
    await i18n.changeLanguage(next);
    window.dispatchEvent(new CustomEvent("dk:language-change", { detail: { language: next } }));
  };

  return (
    <div id="language" className="rounded-full flex self-end items-center mr-3">
      <button
        type="button"
        onClick={toggle}
        title={showChinese ? "Switch to English" : "切换为中文"}
        aria-label={showChinese ? "Switch to English" : "切换为中文"}
        className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
      >
        <MdLanguage className="w-5 h-5" />
      </button>
    </div>
  );
}
