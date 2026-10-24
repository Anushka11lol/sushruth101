import { useEffect, useRef, useState } from "react";
import { Delete, Keyboard, Space, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { VIRTUAL_KEYBOARD_LAYOUTS } from "@/lib/virtualKeyboardLayouts";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

function supportsTextEntry(target: EventTarget | null): target is TextControl {
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  if (!(target instanceof HTMLInputElement) || target.disabled || target.readOnly) return false;
  return !["button", "checkbox", "color", "date", "datetime-local", "file", "hidden", "month", "number", "radio", "range", "reset", "submit", "time", "week"].includes(target.type);
}

function updateReactInput(target: TextControl, value: string, cursor: number) {
  const prototype = target instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(target, value);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: null }));
  target.focus({ preventScroll: true });
  target.setSelectionRange(cursor, cursor);
}

export function VirtualKeyboard() {
  const { language } = useLanguage();
  const layout = VIRTUAL_KEYBOARD_LAYOUTS[language.code];
  const [open, setOpen] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const targetRef = useRef<TextControl | null>(null);

  useEffect(() => {
    if (!layout) {
      setOpen(false);
      targetRef.current = null;
      setHasTarget(false);
      return;
    }
    const onFocus = (event: FocusEvent) => {
      if (!supportsTextEntry(event.target)) return;
      targetRef.current = event.target;
      setHasTarget(true);
      setOpen(true);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [layout]);

  if (!layout) return null;

  const insert = (text: string) => {
    const target = targetRef.current;
    if (!target || !document.contains(target)) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const next = target.value.slice(0, start) + text + target.value.slice(end);
    updateReactInput(target, next, start + text.length);
  };

  const backspace = () => {
    const target = targetRef.current;
    if (!target || !document.contains(target)) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    if (start === 0 && end === 0) return;
    const removeFrom = start === end ? Math.max(0, start - 1) : start;
    updateReactInput(target, target.value.slice(0, removeFrom) + target.value.slice(end), removeFrom);
  };

  return (
    <div className="fixed bottom-3 inset-x-3 z-40 flex flex-col items-end pointer-events-none sm:left-auto sm:w-[min(760px,calc(100vw-2rem))]">
      {open && (
        <section
          role="dialog"
          aria-label={`${language.nativeName} virtual keyboard`}
          className="pointer-events-auto mb-2 w-full rounded-2xl border border-border bg-background/98 p-3 shadow-2xl backdrop-blur"
          dir={["ur", "ks", "sd"].includes(language.code) ? "rtl" : "ltr"}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Keyboard className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="truncate text-sm font-semibold">{language.nativeName}</p>
              {!hasTarget && <p className="truncate text-xs text-muted-foreground">Select a text field</p>}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Close virtual keyboard">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="space-y-1.5 overflow-x-auto pb-1">
            {layout.map((row, rowIndex) => (
              <div key={rowIndex} className="flex min-w-max justify-center gap-1">
                {row.map((character) => (
                  <button
                    key={character}
                    type="button"
                    disabled={!hasTarget}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insert(character)}
                    className="flex h-10 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-lg font-medium shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                    aria-label={character}
                  >
                    {character}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex justify-center gap-1 pt-0.5" dir="ltr">
              <Button type="button" variant="outline" className="h-10 flex-1 max-w-80" disabled={!hasTarget} onMouseDown={(event) => event.preventDefault()} onClick={() => insert(" ")} aria-label="Space">
                <Space className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" className="h-10 px-5" disabled={!hasTarget} onMouseDown={(event) => event.preventDefault()} onClick={backspace} aria-label="Backspace">
                <Delete className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      )}
      <Button
        type="button"
        className="pointer-events-auto gap-2 rounded-full shadow-lg"
        variant={open ? "default" : "outline"}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`${language.nativeName} virtual keyboard`}
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
        {language.nativeName}
      </Button>
    </div>
  );
}