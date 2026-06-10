import { colors, navigationTheme, radius } from "./theme";

describe("theme radius", () => {
  it("defines the surface and control corner-radius tokens", () => {
    expect(radius.surface).toBe(6);
    expect(radius.control).toBe(2);
  });
});

describe("theme colors", () => {
  it("defines the zinc-based semantic palette", () => {
    expect(colors.page).toBe("#09090b");
    expect(colors.card).toBe("#18181b");
    expect(colors["card-elevated"]).toBe("#27272a");
    expect(colors.subtle).toBe("#27272a");
    expect(colors.primary).toBe("#fafafa");
    expect(colors.secondary).toBe("#d4d4d8");
    expect(colors.muted).toBe("#71717a");
    expect(colors["primary-accent"]).toBe("#2563eb");
    expect(colors.danger).toBe("#dc2626");
    expect(colors.success).toBe("#16a34a");
    expect(colors["primary-accent-text"]).toBe("#60a5fa");
    expect(colors["danger-accent-text"]).toBe("#f87171");
    expect(colors["on-accent"]).toBe("#ffffff");
  });
});

describe("navigationTheme", () => {
  it("is dark and maps navigation surfaces onto our tokens", () => {
    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors.background).toBe(colors.page);
    expect(navigationTheme.colors.card).toBe(colors.card);
    expect(navigationTheme.colors.text).toBe(colors.primary);
    expect(navigationTheme.colors.border).toBe(colors.subtle);
    expect(navigationTheme.colors.primary).toBe(colors["primary-accent"]);
  });

  it("carries the react-navigation fonts so it satisfies the Theme contract", () => {
    expect(navigationTheme.fonts).toBeDefined();
    expect(navigationTheme.fonts.regular).toBeDefined();
  });
});
