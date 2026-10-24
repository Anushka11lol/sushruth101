import { useLayoutEffect } from "react";
import {
  resolvePreConsultationSource,
  translatePreConsultation,
} from "@/lib/preConsultationTranslations";

const textSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["placeholder", "aria-label", "title", "data-sr-description"] as const;

function translateTextNode(node: Text, languageCode: string) {
  const current = node.textContent ?? "";
  const trimmed = current.trim();
  if (!trimmed) return;

  const remembered = textSources.get(node);
  const rememberedRendered = remembered
    ? translatePreConsultation(languageCode, remembered)
    : undefined;
  const source =
    remembered && (trimmed === remembered || trimmed === rememberedRendered)
      ? remembered
      : resolvePreConsultationSource(trimmed);

  if (!source) return;
  textSources.set(node, source);
  const translated = translatePreConsultation(languageCode, source);
  if (translated !== trimmed) node.textContent = current.replace(trimmed, translated);
}

function translateElementAttributes(element: Element, languageCode: string) {
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }

  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute)?.trim();
    if (!current) continue;
    const remembered = sources.get(attribute);
    const rememberedRendered = remembered
      ? translatePreConsultation(languageCode, remembered)
      : undefined;
    const source =
      remembered && (current === remembered || current === rememberedRendered)
        ? remembered
        : resolvePreConsultationSource(current);
    if (!source) continue;
    sources.set(attribute, source);
    const translated = translatePreConsultation(languageCode, source);
    if (translated !== current) element.setAttribute(attribute, translated);
  }
}

function translateSubtree(root: ParentNode, languageCode: string) {
  if (root instanceof Element) translateElementAttributes(root, languageCode);
  const elements = root.querySelectorAll?.("*") ?? [];
  elements.forEach((element) => translateElementAttributes(element, languageCode));

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
      translateTextNode(node as Text, languageCode);
    }
    node = walker.nextNode();
  }
}

export function usePreConsultationLocalization(languageCode: string) {
  useLayoutEffect(() => {
    const run = () => translateSubtree(document.body, languageCode);
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
    return () => observer.disconnect();
  }, [languageCode]);
}