import Fuse from 'fuse.js';
import { WhatNextResultData, UpcomingItem } from '../components/WhatNextView';

export interface ChecklistItemRecord {
  modeKey: string;
  modeTitle: string;
  itemIndex: number;
  globalIndex: number;
  text: string;
  normalizedText: string;
}

/**
 * Normalizes text for better fuzzy token matching (removes symbols, acronym expansions)
 */
export function normalizeSearchPhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Flattens all modes/categories and checklist items in sequential order
 */
export function extractOrderedChecklistItems(
  modes: Record<string, { title?: string; options?: string[] }>
): ChecklistItemRecord[] {
  const items: ChecklistItemRecord[] = [];
  let globalIndex = 0;

  const modeKeys = Object.keys(modes || {});
  for (const mKey of modeKeys) {
    const m = modes[mKey];
    const title = m?.title || mKey;
    const options: string[] = Array.isArray(m?.options) ? m.options : [];

    options.forEach((optText, itemIndex) => {
      items.push({
        modeKey: mKey,
        modeTitle: title,
        itemIndex,
        globalIndex: globalIndex++,
        text: optText,
        normalizedText: normalizeSearchPhrase(optText),
      });
    });
  }

  return items;
}

/**
 * Initializes a Fuse instance for the given checklist items with optimized fuzzy parameters
 */
export function createChecklistFuse(items: ChecklistItemRecord[]): Fuse<ChecklistItemRecord> {
  return new Fuse(items, {
    keys: [
      { name: 'text', weight: 0.7 },
      { name: 'normalizedText', weight: 0.5 },
      { name: 'modeTitle', weight: 0.2 },
    ],
    threshold: 0.4, // 0.4 tolerates partial/fuzzy speech without requiring exact matches
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    ignoreLocation: true,
    findAllMatches: true,
  });
}

/**
 * Resolves the matching checklist item using Fuse.js and returns the matched item + next 3 in sequence.
 * - Works 100% offline and instantly in-browser / Electron without API latency or quotas.
 * - Traverses category boundaries sequentially (N+1, N+2, N+3).
 */
export function matchChecklistWithFuse(
  query: string,
  modes: Record<string, { title?: string; options?: string[] }>,
  currentMode?: string
): WhatNextResultData {
  const allItems = extractOrderedChecklistItems(modes);

  if (allItems.length === 0) {
    return {
      matchedAction: query,
      matchedMode: 'Trading Plan',
      nextAction: 'Add items to your checklist to begin',
      nextMode: 'Trading Plan',
      upcomingActions: [],
      spokenSpeech: 'Checklist is currently empty. Add items to your checklist to begin.',
    };
  }

  const cleanQuery = query.trim();
  const normalizedQuery = normalizeSearchPhrase(cleanQuery);

  // Initialize Fuse instance
  const fuse = createChecklistFuse(allItems);
  const searchResults = fuse.search(cleanQuery.length > 2 ? cleanQuery : normalizedQuery);

  let matchedRecord: ChecklistItemRecord | undefined;

  if (searchResults.length > 0 && searchResults[0].score !== undefined && searchResults[0].score <= 0.65) {
    matchedRecord = searchResults[0].item;
  } else {
    // Secondary fallback: check direct keyword / substring overlap
    const directHit = allItems.find((it) => {
      const itNorm = it.normalizedText;
      return (
        itNorm.includes(normalizedQuery) ||
        normalizedQuery.includes(itNorm) ||
        normalizedQuery.split(' ').some((word) => word.length >= 4 && itNorm.includes(word))
      );
    });

    matchedRecord = directHit || (searchResults[0] ? searchResults[0].item : allItems[0]);
  }

  const matchedIndex = matchedRecord.globalIndex;

  // Build the next up to 3 sequential items crossing category boundaries
  const upcoming: UpcomingItem[] = [];
  for (let offset = 1; offset <= 3; offset++) {
    const nextIdx = matchedIndex + offset;
    if (nextIdx < allItems.length) {
      upcoming.push({
        action: allItems[nextIdx].text,
        mode: allItems[nextIdx].modeTitle,
        itemIndex: allItems[nextIdx].itemIndex,
      });
    }
  }

  const nextItem = upcoming[0];
  const nextAction = nextItem ? nextItem.action : 'All checklist steps completed!';
  const nextMode = nextItem ? nextItem.mode : matchedRecord.modeTitle;
  const nextItemIndex = nextItem ? nextItem.itemIndex : matchedRecord.itemIndex;

  const spokenSpeech = nextItem
    ? `Next step: ${nextItem.action}`
    : `All actions concluded in your trading plan!`;

  const advice = nextItem
    ? `Concluded "${matchedRecord.text}". Next up: ${nextItem.action}`
    : `Great work! All sequential checklist items have been finished.`;

  return {
    matchedAction: matchedRecord.text,
    matchedMode: matchedRecord.modeTitle,
    matchedItemIndex: matchedRecord.itemIndex,
    nextAction,
    nextMode,
    nextItemIndex,
    upcomingActions: upcoming,
    spokenSpeech,
    advice,
  };
}
