// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThemeContext } from "utils/contexts/theme";

import ThemeToggle from "./theme";

describe("components/toggles/theme", () => {
  it("renders nothing when theme is missing", () => {
    const { container } = render(
      <ThemeContext.Provider value={{ theme: null, setTheme: vi.fn() }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("toggles from dark to light when clicked", () => {
    const setTheme = vi.fn();
    render(
      <ThemeContext.Provider value={{ theme: "dark", setTheme }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "切换到白天模式 / Switch to light mode" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("toggles from light to dark when clicked", () => {
    const setTheme = vi.fn();
    render(
      <ThemeContext.Provider value={{ theme: "light", setTheme }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "切换到黑夜模式 / Switch to dark mode" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
