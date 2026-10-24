import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='option']",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const READABLE_SELECTOR = `${INTERACTIVE_SELECTOR}, [data-sr-description], label, h1, h2, h3, h4, p`;

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function getAccessibleName(el: Element): string {
  const explanation = el.getAttribute("data-sr-description");
  if (explanation?.trim()) return oneLine(explanation);

  const containingExplanation = el.closest("[data-sr-description]")?.getAttribute("data-sr-description");
  if (containingExplanation?.trim()) return oneLine(containingExplanation);

  // 1. aria-label wins
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return oneLine(ariaLabel);

  // 2. aria-labelledby — collect text from referenced elements
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const associatedLabels = Array.from(el.labels ?? [])
      .map((label) => label.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    if (associatedLabels) return oneLine(associatedLabels);
    const nearbyLabel = el.closest("div")?.querySelector("label")?.textContent?.trim();
    if (nearbyLabel) return oneLine(nearbyLabel);
  }

  // 3. title attribute
  const title = el.getAttribute("title");
  if (title?.trim()) return oneLine(title);

  // 4. placeholder (inputs)
  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return oneLine(placeholder);

  // 5. inner text (links, buttons, nav items)
  const text = (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim();
  if (text && text.length <= 240) return oneLine(text);

  // 6. alt text for images inside element
  const img = el.querySelector("img[alt]");
  if (img) return img.getAttribute("alt") || "";

  return "";
}

export function useSpeakOnInteraction(
  isEnabled: boolean,
  speak: (text: string) => void,
  speakAi: (text: string) => void,
) {
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenRef = useRef<string>("");

  useEffect(() => {
    if (!isEnabled) return;

    // ── Focus (Tab keyboard navigation) ──────────────────────────────────
    const onFocus = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (!target.matches(INTERACTIVE_SELECTOR)) return;

      const name = getAccessibleName(target);
      if (!name || name === lastSpokenRef.current) return;
      lastSpokenRef.current = name;
      const useAi = /\/pre-consultation(?:\/|$)/.test(window.location.pathname)
        && Boolean(document.getElementById("main-content")?.contains(target));
      (useAi ? speakAi : speak)(name);
    };

    // ── Mouse hover (debounced 350 ms) ────────────────────────────────────
    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(READABLE_SELECTOR);
      if (!target) return;

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        const name = getAccessibleName(target);
        if (!name || name === lastSpokenRef.current) return;
        lastSpokenRef.current = name;
        const useAi = /\/pre-consultation(?:\/|$)/.test(window.location.pathname)
          && Boolean(document.getElementById("main-content")?.contains(target));
        (useAi ? speakAi : speak)(name);
      }, 350);
    };

    // Reset last spoken when user moves away entirely
    const onMouseLeave = () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };

    document.addEventListener("focusin", onFocus);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseleave", onMouseLeave, true);

    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseleave", onMouseLeave, true);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isEnabled, speak, speakAi]);
}
