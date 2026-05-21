import { Popover, Transition } from "@headlessui/react";
import classNames from "classnames";
import { Fragment, useContext } from "react";
import { IoColorPalette } from "react-icons/io5";
import { ColorContext } from "utils/contexts/color";
import themes from "utils/styles/themes";

const colors = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "amber",
  "orange",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "red",
  "white",
];

const colorNames = {
  slate: "Slate",
  gray: "Gray",
  zinc: "Zinc",
  neutral: "Neutral",
  stone: "Stone",
  amber: "Amber",
  orange: "Orange",
  yellow: "Yellow",
  lime: "Lime",
  green: "Green",
  emerald: "Emerald",
  teal: "Teal",
  cyan: "Cyan",
  sky: "Sky",
  blue: "Blue",
  indigo: "Indigo",
  violet: "Violet",
  purple: "Purple",
  fuchsia: "Fuchsia",
  pink: "Pink",
  rose: "Rose",
  red: "Red",
  white: "White",
};

const sliderGradient = `linear-gradient(90deg, ${colors
  .filter((color) => color !== "white")
  .map((color) => themes[color]?.iconStart ?? themes[color]?.dark)
  .join(", ")})`;

export default function ColorToggle() {
  const { color: active, setColor } = useContext(ColorContext);
  const activeIndex = Math.max(0, colors.indexOf(active));

  if (!active) {
    return null;
  }

  return (
    <div id="color" className="w-full self-center">
      <Popover className="relative flex items-center">
        <Popover.Button className="outline-hidden" title="切换配色 / Change color" aria-label="切换配色 / Change color">
          <IoColorPalette
            className="h-5 w-5 text-theme-800 dark:text-theme-200 transition duration-150 ease-in-out"
            aria-hidden="true"
          />
          <span className="sr-only">Change color</span>
        </Popover.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <Popover.Panel className="dk-color-panel fixed z-[90]">
            <div className="max-h-[calc(100vh-32px)] w-[min(88vw,360px)] overflow-y-auto rounded-2xl border border-white/15 bg-white/70 p-3 text-theme-800 shadow-xl shadow-black/15 backdrop-blur-xl dark:bg-black/45 dark:text-theme-100 dark:shadow-black/30">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold leading-none">主题色</div>
                  <div className="mt-1 text-xs text-theme-500 dark:text-theme-300">{colorNames[active] ?? active}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setColor("slate")}
                  className="rounded-full border border-theme-500/15 bg-theme-500/10 px-3 py-1.5 text-xs font-medium text-theme-700 transition hover:bg-theme-500/20 dark:text-theme-200"
                >
                  Reset
                </button>
              </div>

              <label className="sr-only" htmlFor="dk-color-slider">
                主题色
              </label>
              <input
                id="dk-color-slider"
                type="range"
                min="0"
                max={colors.length - 1}
                value={activeIndex}
                onChange={(event) => setColor(colors[Number(event.target.value)])}
                className="dk-color-slider mb-4 w-full"
                style={{ background: sliderGradient }}
                aria-label="主题色"
              />

              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {colors.map((color) => (
                  <button
                    type="button"
                    onClick={() => setColor(color)}
                    key={color}
                    className={classNames(
                      "group flex h-9 items-center justify-center rounded-xl border transition hover:bg-theme-500/10",
                      active === color
                        ? "border-theme-700/50 bg-theme-500/15 dark:border-theme-200/50"
                        : "border-white/10 bg-white/10 dark:bg-white/5",
                    )}
                    title={colorNames[color] ?? color}
                    aria-pressed={active === color}
                  >
                    <span
                      className={classNames(
                        "block h-5 w-5 rounded-full border border-black/10 shadow-sm shadow-black/15 ring-offset-2 ring-offset-white dark:border-white/20 dark:ring-offset-theme-900",
                        active === color && "ring-2 ring-theme-600 dark:ring-theme-300",
                        `theme-${color} bg-theme-400`,
                      )}
                    />
                    <span className="sr-only">{color}</span>
                  </button>
                ))}
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
}
