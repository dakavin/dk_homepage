import { useContext } from "react";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { ThemeContext } from "utils/contexts/theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);

  if (!theme) {
    return null;
  }

  return (
    <div id="theme" className="rounded-full flex self-end">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "切换到白天模式 / Switch to light mode" : "切换到黑夜模式 / Switch to dark mode"}
        aria-label={
          theme === "dark" ? "切换到白天模式 / Switch to light mode" : "切换到黑夜模式 / Switch to dark mode"
        }
        className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
      >
        {theme === "dark" ? <MdDarkMode className="w-5 h-5" /> : <MdLightMode className="w-5 h-5" />}
      </button>
    </div>
  );
}
