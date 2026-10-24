import { useEffect } from "react";

type NavItem = { href: string; label: string };

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useNavShortcuts(
  navItems: NavItem[],
  navigate: (href: string) => void,
  speak: (text: string) => void,
  isReaderEnabled: boolean,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input / textarea / select
      const active = document.activeElement;
      if (active && INPUT_TAGS.has(active.tagName)) return;
      if (active && (active as HTMLElement).isContentEditable) return;

      // Don't fire if modifier keys are held (avoid clashing with Ctrl+1 etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const digit = parseInt(e.key, 10);
      if (isNaN(digit) || digit < 1 || digit > 9) return;

      const item = navItems[digit - 1];
      if (!item) return;

      e.preventDefault();
      navigate(item.href);
      if (isReaderEnabled) speak(`Navigating to ${item.label}`);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navItems, navigate, speak, isReaderEnabled]);
}
