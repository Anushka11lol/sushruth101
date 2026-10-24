import { useEffect } from "react";

export function useKeyboardNav(onOpenNav: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Escape") {
        e.preventDefault();
        onOpenNav();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenNav]);
}
