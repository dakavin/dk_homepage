/* eslint-disable react/no-array-index-key */
import classNames from "classnames";
import BookmarksGroup from "components/bookmarks/group";
import ErrorBoundary from "components/errorboundry";
import QuickLaunch from "components/quicklaunch";
import ServicesGroup from "components/services/group";
import Tab, { slugifyAndEncode } from "components/tab";
import ColorToggle from "components/toggles/color";
import FontToggle from "components/toggles/font";
import LanguageToggle from "components/toggles/language";
import Revalidate from "components/toggles/revalidate";
import ThemeToggle from "components/toggles/theme";
import WidgetStrip from "components/widget-strip";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BiError } from "react-icons/bi";
import {
  MdImage,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdKeyboardArrowUp,
  MdUnfoldMore,
} from "react-icons/md";
import useSWR, { SWRConfig } from "swr";
import { ColorContext } from "utils/contexts/color";
import { SettingsContext } from "utils/contexts/settings";
import { TabContext } from "utils/contexts/tab";
import { ThemeContext } from "utils/contexts/theme";

import { bookmarksResponse, servicesResponse, widgetsResponse } from "utils/config/api-response";
import { getSettings } from "utils/config/config";
import useWindowFocus from "utils/hooks/window-focus";
import createLogger from "utils/logger";
import themes from "utils/styles/themes";

const Version = dynamic(() => import("components/version"), {
  ssr: false,
});

// Normalize language codes so older config values like zh-CN still point to Crowdin-provided ones
const LANGUAGE_ALIASES = {
  "zh-cn": "zh-Hans",
};

const normalizeLanguage = (language) => {
  if (!language) return "en";
  const alias = LANGUAGE_ALIASES[language.toLowerCase()];
  return alias || language;
};

export async function getStaticProps() {
  let logger;
  try {
    logger = createLogger("index");
    const { providers, ...settings } = getSettings();

    const services = await servicesResponse();
    const bookmarks = await bookmarksResponse();
    const widgets = await widgetsResponse();
    const language = normalizeLanguage(settings.language);

    return {
      props: {
        initialSettings: settings,
        fallback: {
          "/api/services": services,
          "/api/bookmarks": bookmarks,
          "/api/widgets": widgets,
          "/api/hash": false,
        },
        // Preload zh-Hans + en so the LanguageToggle can switch without
        // a full reload + SSR roundtrip.
        ...(await serverSideTranslations(language, ["common"], null, ["zh-Hans", "en"])),
      },
    };
  } catch (e) {
    if (logger && e) {
      logger.error(e);
    }
    return {
      props: {
        initialSettings: {},
        fallback: {
          "/api/services": [],
          "/api/bookmarks": [],
          "/api/widgets": [],
          "/api/hash": false,
        },
        ...(await serverSideTranslations("en", ["common"], null, ["zh-Hans"])),
      },
    };
  }
}

function Index({ initialSettings, fallback }) {
  const windowFocused = useWindowFocus();
  const [stale, setStale] = useState(false);
  const { data: errorsData } = useSWR("/api/validate");
  const { error: validateError } = errorsData || {};
  const { data: hashData, mutate: mutateHash } = useSWR("/api/hash");

  useEffect(() => {
    if (windowFocused) {
      mutateHash();
    }
  }, [windowFocused, mutateHash]);

  useEffect(() => {
    if (hashData) {
      if (typeof window !== "undefined") {
        const previousHash = localStorage.getItem("hash");

        if (!previousHash) {
          localStorage.setItem("hash", hashData.hash);
        }

        if (previousHash && previousHash !== hashData.hash) {
          setStale(true);
          localStorage.setItem("hash", hashData.hash);

          fetch("/api/revalidate").then((res) => {
            if (res.ok) {
              window.location.reload();
            }
          });
        }
      }
    }
  }, [hashData]);

  if (validateError) {
    return (
      <div className="w-full h-screen container m-auto justify-center p-10 pointer-events-none">
        <div className="flex flex-col">
          <div className="basis-1/2 bg-theme-500 dark:bg-theme-600 text-theme-600 dark:text-theme-300 m-2 rounded-md font-mono shadow-md border-4 border-transparent">
            <div className="bg-rose-200 text-rose-800 dark:text-rose-200 dark:bg-rose-800 p-2 rounded-md font-bold">
              <BiError className="float-right w-6 h-6" />
              Error
            </div>
            <div className="p-2 text-theme-100 dark:text-theme-200">
              <pre className="opacity-50 font-bold pb-2">{validateError}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stale) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-24 h-24 border-2 border-theme-400 border-solid rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  if (errorsData && errorsData.length > 0) {
    return (
      <div className="w-full h-screen container m-auto justify-center p-10 pointer-events-none">
        <div className="flex flex-col">
          {errorsData.map((error, i) => (
            <div
              className="basis-1/2 bg-theme-500 dark:bg-theme-600 text-theme-600 dark:text-theme-300 m-2 rounded-md font-mono shadow-md border-4 border-transparent"
              key={i}
            >
              <div className="bg-amber-200 text-amber-800 dark:text-amber-200 dark:bg-amber-800 p-2 rounded-md font-bold">
                <BiError className="float-right w-6 h-6" />
                {error.config}
              </div>
              <div className="p-2 text-theme-100 dark:text-theme-200">
                <pre className="opacity-50 font-bold pb-2">{error.reason}</pre>
                <pre className="text-sm">{error.mark.snippet}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SWRConfig value={{ fallback, fetcher: (resource, init) => fetch(resource, init).then((res) => res.json()) }}>
      <ErrorBoundary>
        <Home initialSettings={initialSettings} />
      </ErrorBoundary>
    </SWRConfig>
  );
}

function getAllServices(services) {
  function getServices(group) {
    let nestedServices = [...group.services];
    if (group.groups.length > 0) {
      nestedServices = [...nestedServices, ...group.groups.map(getServices).flat()];
    }
    return nestedServices;
  }

  return [...services.map(getServices).flat()];
}

function SideRail({ settings }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const scrollToTop = () => {
    const scrollTarget = document.querySelector("#inner_wrapper");
    if (scrollTarget) {
      scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeWallpaper = () => {
    if (typeof window.dkNextWallpaper === "function") {
      window.dkNextWallpaper();
      return;
    }
    window.dispatchEvent(new Event("dk:next-wallpaper"));
  };

  return createPortal(
    collapsed ? (
      <button
        id="dk-side-rail-handle"
        type="button"
        onClick={() => setCollapsed(false)}
        title="展开工具栏 / Show toolbar"
        aria-label="展开工具栏 / Show toolbar"
        className="dk-side-rail-handle fixed z-50 flex items-center justify-center rounded-full bg-white/20 dark:bg-black/35 backdrop-blur-md border border-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.2)] text-theme-800 dark:text-theme-200"
      >
        <MdUnfoldMore className="h-5 w-5" />
      </button>
    ) : (
      <div
        id="dk-side-rail"
        className="dk-side-rail fixed right-3 top-1/2 z-50 flex flex-col items-center gap-2 p-2 rounded-2xl bg-white/15 dark:bg-black/35 backdrop-blur-md border border-white/10 shadow-[0_4px_18px_rgba(0,0,0,0.18)]"
      >
        {!settings?.color && <ColorToggle />}
        <FontToggle />
        <LanguageToggle />
        {!settings.theme && <ThemeToggle />}
        <button
          id="dk-next-wallpaper"
          type="button"
          onClick={changeWallpaper}
          title="更换壁纸 / Change wallpaper"
          aria-label="更换壁纸 / Change wallpaper"
          className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
        >
          <MdImage className="h-5 w-5" />
        </button>
        <Revalidate />
        <button
          id="dk-scroll-top"
          type="button"
          onClick={scrollToTop}
          title="返回顶部 / Back to top"
          aria-label="返回顶部 / Back to top"
          className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
        >
          <MdKeyboardArrowUp className="h-6 w-6" />
        </button>
        <button
          id="dk-collapse-rail"
          type="button"
          onClick={() => setCollapsed(true)}
          title="收起工具栏 / Hide toolbar"
          aria-label="收起工具栏 / Hide toolbar"
          className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
        >
          <MdKeyboardArrowRight className="hidden h-6 w-6 sm:block" />
          <MdKeyboardArrowDown className="h-6 w-6 sm:hidden" />
        </button>
      </div>
    ),
    document.body,
  );
}

function Home({ initialSettings }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useContext(ThemeContext);
  const { color, setColor } = useContext(ColorContext);
  const { settings, setSettings } = useContext(SettingsContext);
  const { activeTab, setActiveTab } = useContext(TabContext);
  const { asPath } = useRouter();

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, setSettings]);

  const { data: services } = useSWR("/api/services");
  const { data: bookmarks } = useSWR("/api/bookmarks");
  const { data: widgets } = useSWR("/api/widgets");

  const servicesAndBookmarks = [...bookmarks.map((bg) => bg.bookmarks).flat(), ...getAllServices(services)].filter(
    (i) => i?.href,
  );

  useEffect(() => {
    // Allow client-side override of language via localStorage (set by
    // src/components/toggles/language.jsx and config/custom.js). Falls back
    // to settings.language from settings.yaml when no override is stored.
    let storedLang = null;
    if (typeof window !== "undefined") {
      try {
        storedLang = window.localStorage.getItem("dk_lang_pref");
      } catch (_) {
        /* ignore */
      }
    }
    const language = normalizeLanguage(storedLang || settings.language);
    if (language) {
      i18n.changeLanguage(language);
    }

    if (settings.theme && theme !== settings.theme) {
      setTheme(settings.theme);
    }

    if (settings.color && color !== settings.color) {
      setColor(settings.color);
    }
  }, [i18n, settings, color, setColor, theme, setTheme]);

  const [searching, setSearching] = useState(false);
  const [searchString, setSearchString] = useState("");

  useEffect(() => {
    function handleKeyDown(e) {
      // ⌘K / Ctrl+K — 全局快捷键打开搜索
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearching(true);
        return;
      }
      if (e.target.tagName === "BODY" || e.target.id === "inner_wrapper") {
        if (
          (e.key.length === 1 &&
            e.key.match(/(w|s|[à-ü]|[À-Ü]|[wа-я])/gi) &&
            !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)) ||
          // accented characters and the bang may require modifier keys
          e.key.match(/([à-ü]|[À-Ü]|!)/g) ||
          (e.key === "v" && (e.ctrlKey || e.metaKey))
        ) {
          setSearching(true);
        } else if (e.key === "Escape") {
          setSearchString("");
          setSearching(false);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return function cleanup() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  const tabs = useMemo(
    () => [
      ...new Set(
        Object.keys(settings.layout ?? {})
          .map((groupName) => settings.layout[groupName]?.tab?.toString())
          .filter((group) => group),
      ),
    ],
    [settings.layout],
  );

  useEffect(() => {
    if (!activeTab) {
      const initialTab = asPath.substring(asPath.indexOf("#") + 1);
      setActiveTab(initialTab === "/" ? slugifyAndEncode(tabs["0"]) : initialTab);
    }
  });

  const servicesAndBookmarksGroups = useMemo(() => {
    const tabGroupFilter = (g) => g && [activeTab, ""].includes(slugifyAndEncode(settings.layout?.[g.name]?.tab));
    const undefinedGroupFilter = (g) => settings.layout?.[g.name] === undefined;

    const layoutGroups = Object.keys(settings.layout ?? {})
      .map((groupName) => services?.find((g) => g.name === groupName) ?? bookmarks?.find((b) => b.name === groupName))
      .filter(tabGroupFilter);

    if (!settings.layout && JSON.stringify(settings.layout) !== JSON.stringify(initialSettings.layout)) {
      // wait for settings to populate (if different from initial settings), otherwise all the widgets will be requested initially even if we are on a single tab
      return <div />;
    }

    const serviceGroups = services?.filter(tabGroupFilter).filter(undefinedGroupFilter);
    const bookmarkGroups = bookmarks.filter(tabGroupFilter).filter(undefinedGroupFilter);

    return (
      <>
        {tabs.length > 0 && (
          <div key="tabs" id="tabs" className="m-5 sm:m-9 sm:mt-4 sm:mb-0">
            <ul
              className={classNames(
                "sm:flex rounded-md bg-theme-100/20 dark:bg-white/5",
                settings.cardBlur !== undefined &&
                  `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
              )}
              id="myTab"
              data-tabs-toggle="#myTabContent"
              role="tablist"
            >
              {tabs.map((tab) => (
                <Tab key={tab} tab={tab} />
              ))}
            </ul>
          </div>
        )}
        {layoutGroups.length > 0 && (
          <div key="layoutGroups" id="layout-groups" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {layoutGroups.map((group) =>
              group.services ? (
                <ServicesGroup
                  key={group.name}
                  group={group}
                  layout={settings.layout?.[group.name]}
                  maxGroupColumns={settings.fiveColumns ? 5 : settings.maxGroupColumns}
                  disableCollapse={settings.disableCollapse}
                  useEqualHeights={settings.useEqualHeights}
                  groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                />
              ) : (
                <BookmarksGroup
                  key={group.name}
                  bookmarks={group}
                  layout={settings.layout?.[group.name]}
                  disableCollapse={settings.disableCollapse}
                  maxGroupColumns={settings.maxBookmarkGroupColumns ?? settings.maxGroupColumns}
                  groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                />
              ),
            )}
          </div>
        )}
        {serviceGroups?.length > 0 && (
          <div key="services" id="services" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {serviceGroups.map((group) => (
              <ServicesGroup
                key={group.name}
                group={group}
                layout={settings.layout?.[group.name]}
                maxGroupColumns={settings.fiveColumns ? 5 : settings.maxGroupColumns}
                disableCollapse={settings.disableCollapse}
                groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
              />
            ))}
          </div>
        )}
        {bookmarkGroups?.length > 0 && (
          <div key="bookmarks" id="bookmarks" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {bookmarkGroups.map((group) => (
              <BookmarksGroup
                key={group.name}
                bookmarks={group}
                layout={settings.layout?.[group.name]}
                disableCollapse={settings.disableCollapse}
                maxGroupColumns={settings.maxBookmarkGroupColumns ?? settings.maxGroupColumns}
                groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                bookmarksStyle={settings.bookmarksStyle}
              />
            ))}
          </div>
        )}
      </>
    );
  }, [
    tabs,
    activeTab,
    services,
    bookmarks,
    settings.layout,
    settings.fiveColumns,
    settings.maxGroupColumns,
    settings.maxBookmarkGroupColumns,
    settings.disableCollapse,
    settings.useEqualHeights,
    settings.cardBlur,
    settings.groupsInitiallyCollapsed,
    settings.bookmarksStyle,
    initialSettings.layout,
  ]);

  return (
    <>
      <Head>
        <title>{initialSettings.title || "Homepage"}</title>
        <meta
          name="description"
          content={
            initialSettings.description ||
            "A highly customizable homepage (or startpage / application dashboard) with Docker and service API integrations."
          }
        />
        {settings.disableIndexing && <meta name="robots" content="noindex, nofollow" />}
        {settings.base && <base href={settings.base} />}
        {settings.favicon ? (
          <>
            <link rel="icon" href={settings.favicon} />
            <link rel="apple-touch-icon" sizes="180x180" href={settings.favicon} />
          </>
        ) : (
          <>
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
            <link rel="shortcut icon" href="/homepage.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=4" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=4" />
            <link rel="mask-icon" href="/safari-pinned-tab.svg?v=4" color="#1e9cd7" />
          </>
        )}
        <meta name="msapplication-TileColor" content={themes[settings.color || "slate"][settings.theme || "dark"]} />
        <meta name="theme-color" content={themes[settings.color || "slate"][settings.theme || "dark"]} />
        <meta name="color-scheme" content="dark light"></meta>
      </Head>

      <Script src="/api/config/custom.js" />

      <div
        className={classNames(
          settings.fullWidth ? "" : "container",
          "relative m-auto flex flex-col justify-start z-10 h-full min-h-screen",
        )}
      >
        <QuickLaunch
          servicesAndBookmarks={servicesAndBookmarks}
          searchString={searchString}
          setSearchString={setSearchString}
          isOpen={searching}
          setSearching={setSearching}
        />
        <WidgetStrip widgets={widgets} onSearch={() => setSearching(true)} />

        {servicesAndBookmarksGroups}

        <SideRail settings={settings} />

        <div id="footer" className="flex flex-col mt-auto p-8 w-full">
          <div id="version" className="flex w-full justify-end">
            {!settings.hideVersion && <Version disableUpdateCheck={settings.disableUpdateCheck} />}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Wrapper({ initialSettings, fallback }) {
  const { theme } = useContext(ThemeContext);
  const { color } = useContext(ColorContext);
  let backgroundImage = "";
  let opacity = initialSettings?.backgroundOpacity ?? 0;
  let backgroundBlur = false;
  let backgroundSaturate = false;
  let backgroundBrightness = false;
  if (initialSettings?.background) {
    const bg = initialSettings.background;
    if (typeof bg === "object") {
      backgroundImage = bg.image || "";
      if (bg.opacity !== undefined) {
        opacity = 1 - bg.opacity / 100;
      }
      backgroundBlur = bg.blur !== undefined;
      backgroundSaturate = bg.saturate !== undefined;
      backgroundBrightness = bg.brightness !== undefined;
    } else {
      backgroundImage = bg;
    }
  }

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove("dark", "scheme-dark", "scheme-light");
    html.classList.toggle("dark", theme === "dark");
    html.classList.add(theme === "dark" ? "scheme-dark" : "scheme-light");

    const desiredThemeClass = `theme-${color || initialSettings.color || "slate"}`;
    const themeClassesToRemove = Array.from(html.classList).filter(
      (cls) => cls.startsWith("theme-") && cls !== desiredThemeClass,
    );
    if (themeClassesToRemove.length) {
      html.classList.remove(...themeClassesToRemove);
    }
    if (!html.classList.contains(desiredThemeClass)) {
      html.classList.add(desiredThemeClass);
    }

    // Remove any previously applied inline styles
    body.style.backgroundImage = "";
    body.style.backgroundColor = "";
    body.style.backgroundAttachment = "";
  }, [backgroundImage, opacity, theme, color, initialSettings.color]);

  return (
    <>
      {backgroundImage && (
        <div
          id="background"
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--bg-color) / ${opacity}), rgb(var(--bg-color) / ${opacity})), url('${backgroundImage}')`,
          }}
        />
      )}
      <div id="page_wrapper" className="relative h-full">
        <div
          id="inner_wrapper"
          tabIndex="-1"
          className={classNames(
            "w-full h-full overflow-auto",
            backgroundBlur &&
              `backdrop-blur${initialSettings.background.blur?.length ? `-${initialSettings.background.blur}` : ""}`,
            backgroundSaturate && `backdrop-saturate-${initialSettings.background.saturate}`,
            backgroundBrightness && `backdrop-brightness-${initialSettings.background.brightness}`,
          )}
        >
          <Index initialSettings={initialSettings} fallback={fallback} />
        </div>
      </div>
    </>
  );
}
