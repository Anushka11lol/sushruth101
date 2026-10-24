import { useLayoutEffect } from "react";
import {
  resolveManipuriSource,
  translateManipuri,
} from "@/lib/manipuriTranslations";

const textSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = [
  "placeholder",
  "aria-label",
  "title",
  "data-sr-description",
  "alt",
] as const;

function localizeText(node: Text, enabled: boolean) {
  const current = node.textContent ?? "";
  const trimmed = current.trim();
  if (!trimmed) return;

  const remembered = textSources.get(node);
  const source = remembered
    ? (trimmed === remembered || trimmed === translateManipuri(remembered) ? remembered : undefined)
    : resolveManipuriSource(trimmed);
  const resolvedSource = source ?? resolveManipuriSource(trimmed);
  if (!resolvedSource) return;

  textSources.set(node, resolvedSource);
  const next = enabled ? translateManipuri(resolvedSource) : resolvedSource;
  if (trimmed !== next) node.textContent = current.replace(trimmed, next);
}

function localizeAttributes(element: Element, enabled: boolean) {
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }

  translatedAttributes.forEach((attribute) => {
    const current = element.getAttribute(attribute)?.trim();
    if (!current) return;
    const remembered = sources?.get(attribute);
    const source = remembered
      ? (current === remembered || current === translateManipuri(remembered) ? remembered : undefined)
      : resolveManipuriSource(current);
    const resolvedSource = source ?? resolveManipuriSource(current);
    if (!resolvedSource) return;
    sources?.set(attribute, resolvedSource);
    const next = enabled ? translateManipuri(resolvedSource) : resolvedSource;
    if (current !== next) element.setAttribute(attribute, next);
  });
}

function localizeDocument(enabled: boolean) {
  localizeAttributes(document.documentElement, enabled);
  document.querySelectorAll("*").forEach((element) => localizeAttributes(element, enabled));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
      localizeText(node as Text, enabled);
    }
    node = walker.nextNode();
  }
}

export function useManipuriLocalization(languageCode: string) {
  useLayoutEffect(() => {
    const enabled = languageCode === "mni";
    const run = () => localizeDocument(enabled);
    run();

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        run();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    });
    return () => {
      observer.disconnect();
      if (enabled) localizeDocument(false);
    };
  }, [languageCode]);
}