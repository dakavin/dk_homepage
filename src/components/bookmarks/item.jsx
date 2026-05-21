import classNames from "classnames";
import ResolvedIcon from "components/resolvedicon";
import { useContext } from "react";
import { SettingsContext } from "utils/contexts/settings";
import { useDkTranslate } from "utils/i18n/dk-translate";

export default function Item({ bookmark, iconOnly = false }) {
  const description = bookmark.description ?? new URL(bookmark.href).hostname;
  const { settings } = useContext(SettingsContext);
  const tr = useDkTranslate();

  return (
    <li
      key={bookmark.name}
      id={bookmark.id}
      className={classNames("bookmark", iconOnly && "grid")}
      data-name={bookmark.name}
    >
      <a
        href={bookmark.href}
        title={tr(bookmark.name)}
        rel="noreferrer"
        target={bookmark.target ?? settings.target ?? "_blank"}
        className={classNames(
          settings.cardBlur !== undefined && `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
          "text-left cursor-pointer transition-all rounded-md font-medium text-theme-700 dark:text-theme-200 dark:hover:text-theme-300 shadow-md shadow-theme-900/10 dark:shadow-theme-900/20 bg-theme-100/20 hover:bg-theme-300/20 dark:bg-white/5 dark:hover:bg-white/10",
          iconOnly ? "h-[60px] w-[60px] grid" : "block w-full mb-3",
        )}
      >
        {iconOnly ? (
          <div className="flex items-center justify-center text-theme-700 hover:text-theme-700 dark:text-theme-200 text-xl font-medium rounded-md bookmark-icon py-0.5">
            {bookmark.icon && (
              <div className="w-7 h-7">
                <ResolvedIcon icon={bookmark.icon} alt={bookmark.abbr} />
              </div>
            )}
            {!bookmark.icon && bookmark.abbr}
          </div>
          ) : (
            <div className="flex min-h-[64px] items-center gap-3 px-3 py-2">
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-md bg-theme-500/10 dark:bg-theme-900/50 text-theme-700 hover:text-theme-700 dark:text-theme-200 text-sm font-medium bookmark-icon">
                {bookmark.icon && (
                  <div className="shrink-0 w-6 h-6">
                    <ResolvedIcon icon={bookmark.icon} alt={bookmark.abbr} />
                  </div>
                )}
                {!bookmark.icon && bookmark.abbr}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden text-left bookmark-text">
                <div className="truncate text-sm bookmark-name">{tr(bookmark.name)}</div>
                <div className="truncate text-theme-500 dark:text-theme-300 text-xs font-light bookmark-description">
                  {tr(description)}
                </div>
              </div>
            </div>
          )}
      </a>
    </li>
  );
}
