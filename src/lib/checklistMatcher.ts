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
 * Strips conversational preamble phrases so the core checklist action is isolated
 */
export function stripSpeechActionPrefix(phrase: string): string {
  return phrase
    .replace(/^(hey copilot|copilot|hey overdesk|overdesk|ai|assistant|nexus)[,\s]+/i, '')
    .replace(
      /^(i have completed|i have finished|i have done|i have checked|i have set|i have analyzed|i have marked|i have placed|i have verified|i've completed|i've finished|i've done|i've checked|i've set|i've analyzed|i've marked|i've placed|i've verified|i just completed|i just finished|i just did|i just checked|i just set|i just placed|i completed|i finished|i did|i checked|i set|i analyzed|i marked|i placed|i verified|done with|finished with|concluded)\s+/i,
      ''
    )
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
  currentMode?: string,
  selections?: Record<string, number[]>
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

  // Check if query is explicitly "next", "mark next", "next step", etc. to mark current item and advance
  const isNextMarkCommand =
    /^(next|mark next|check next|next item|next step|next please|next one|go next|advance)$/i.test(cleanQuery);

  if (isNextMarkCommand) {
    // Find the first unchecked / pending item in sequential order:
    // Check in currentMode first, then advance sequentially across modes
    let firstPendingIdx = -1;
    if (currentMode) {
      firstPendingIdx = allItems.findIndex(
        (it) => it.modeKey === currentMode && !(selections?.[it.modeKey] || []).includes(it.itemIndex)
      );
    }
    if (firstPendingIdx === -1) {
      firstPendingIdx = allItems.findIndex(
        (it) => !(selections?.[it.modeKey] || []).includes(it.itemIndex)
      );
    }

    if (firstPendingIdx === -1) {
      // Everything is checked!
      const lastItem = allItems[allItems.length - 1];
      return {
        matchedAction: lastItem.text,
        matchedMode: lastItem.modeTitle,
        matchedItemIndex: lastItem.itemIndex,
        nextAction: 'All checklist steps completed!',
        nextMode: lastItem.modeTitle,
        nextItemIndex: lastItem.itemIndex,
        upcomingActions: [],
        spokenSpeech: 'All items on your checklist are completed! Great discipline.',
        advice: 'All items completed across your 5 trading modes.',
      };
    }

    const targetItem = allItems[firstPendingIdx];
    const upcoming: UpcomingItem[] = [];
    for (let offset = 1; offset <= 3; offset++) {
      const idx = firstPendingIdx + offset;
      if (idx < allItems.length) {
        upcoming.push({
          action: allItems[idx].text,
          mode: allItems[idx].modeTitle,
          itemIndex: allItems[idx].itemIndex,
        });
      }
    }

    const nextItem = upcoming[0];
    const nextAction = nextItem ? nextItem.action : 'All checklist steps completed!';
    const nextMode = nextItem ? nextItem.mode : targetItem.modeTitle;
    const nextItemIndex = nextItem ? nextItem.itemIndex : targetItem.itemIndex;

    let spokenSpeech = '';
    if (upcoming.length >= 3) {
      spokenSpeech = `Marked ${targetItem.text}. Next 3 steps: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}. 3, ${upcoming[2].action}.`;
    } else if (upcoming.length === 2) {
      spokenSpeech = `Marked ${targetItem.text}. Next 2 steps: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}.`;
    } else if (upcoming.length === 1) {
      spokenSpeech = `Marked ${targetItem.text}. Next step: ${upcoming[0].action}.`;
    } else {
      spokenSpeech = `Marked ${targetItem.text}. All checklist steps are now completed!`;
    }

    return {
      matchedAction: targetItem.text,
      matchedMode: targetItem.modeTitle,
      matchedItemIndex: targetItem.itemIndex,
      nextAction,
      nextMode,
      nextItemIndex,
      upcomingActions: upcoming,
      spokenSpeech,
      advice: `Marked "${targetItem.text}". Following: ${upcoming.map((u, i) => `${i + 1}) ${u.action}`).join(', ')}`,
    };
  }

  // Check if query is a generic "What is next?" or "Next 3 items" request
  const isGenericWhatNext =
    /\b(what next|what's next|whats next|what is next|what to do next|next three|next 3|next things|next steps|where am i)\b/i.test(
      cleanQuery
    );

  if (isGenericWhatNext) {
    // Find the first unchecked / pending item in sequential order
    let firstPendingIdx = -1;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      const checkedInMode = selections?.[it.modeKey] || [];
      if (!checkedInMode.includes(it.itemIndex)) {
        firstPendingIdx = i;
        break;
      }
    }

    if (firstPendingIdx === -1) {
      // Everything is checked!
      const lastItem = allItems[allItems.length - 1];
      return {
        matchedAction: lastItem.text,
        matchedMode: lastItem.modeTitle,
        matchedItemIndex: lastItem.itemIndex,
        nextAction: 'All checklist steps completed!',
        nextMode: lastItem.modeTitle,
        nextItemIndex: lastItem.itemIndex,
        upcomingActions: [],
        spokenSpeech: 'All items on your checklist are completed! Great discipline.',
        advice: 'All items completed across your 5 trading modes.',
      };
    }

    const pendingItem = allItems[firstPendingIdx];
    const prevItem = firstPendingIdx > 0 ? allItems[firstPendingIdx - 1] : null;

    const upcoming: UpcomingItem[] = [];
    for (let offset = 0; offset < 3; offset++) {
      const idx = firstPendingIdx + offset;
      if (idx < allItems.length) {
        upcoming.push({
          action: allItems[idx].text,
          mode: allItems[idx].modeTitle,
          itemIndex: allItems[idx].itemIndex,
        });
      }
    }

    const nextStepsSpoken = upcoming.map((u, i) => `${i + 1}, ${u.action}`).join('. ');

    return {
      matchedAction: prevItem ? `Previously: ${prevItem.text}` : 'Checklist Start',
      matchedMode: pendingItem.modeTitle,
      matchedItemIndex: -1,
      nextAction: upcoming[0]?.action || 'All checklist steps completed!',
      nextMode: pendingItem.modeTitle,
      nextItemIndex: pendingItem.itemIndex,
      upcomingActions: upcoming,
      spokenSpeech:
        upcoming.length > 0
          ? `Your next ${upcoming.length} steps are: ${nextStepsSpoken}.`
          : 'All items on your checklist are completed! Great discipline.',
      advice:
        upcoming.length > 0
          ? `Upcoming: ${upcoming.map((u, i) => `${i + 1}) ${u.action}`).join(', ')}`
          : 'All items completed across your 5 trading modes.',
    };
  }

  // Strip conversational prefixes so the specific completed action is isolated
  const strippedQuery = stripSpeechActionPrefix(cleanQuery);
  const normalizedStripped = normalizeSearchPhrase(strippedQuery);

  // Initialize Fuse instance for specific action speech match
  const fuse = createChecklistFuse(allItems);
  let searchResults = fuse.search(strippedQuery.length >= 2 ? strippedQuery : cleanQuery);
  if (searchResults.length === 0 && normalizedStripped.length >= 2) {
    searchResults = fuse.search(normalizedStripped);
  }

  let matchedRecord: ChecklistItemRecord | undefined;

  if (searchResults.length > 0 && searchResults[0].score !== undefined && searchResults[0].score <= 0.65) {
    matchedRecord = searchResults[0].item;
  } else {
    // Secondary fallback: check direct keyword / substring overlap
    const directHit = allItems.find((it) => {
      const itNorm = it.normalizedText;
      return (
        itNorm.includes(normalizedStripped) ||
        normalizedStripped.includes(itNorm) ||
        itNorm.includes(normalizedQuery) ||
        normalizedQuery.includes(itNorm) ||
        normalizedStripped.split(' ').some((word) => word.length >= 4 && itNorm.includes(word))
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

  let spokenSpeech = '';
  if (upcoming.length >= 3) {
    spokenSpeech = `Concluded ${matchedRecord.text}. Your next 3 things are: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}. 3, ${upcoming[2].action}.`;
  } else if (upcoming.length === 2) {
    spokenSpeech = `Concluded ${matchedRecord.text}. Your next 2 things are: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}.`;
  } else if (upcoming.length === 1) {
    spokenSpeech = `Concluded ${matchedRecord.text}. Your next step is: ${upcoming[0].action}.`;
  } else {
    spokenSpeech = `Concluded ${matchedRecord.text}. All sequential steps on your checklist are now finished! Great execution.`;
  }

  const advice =
    upcoming.length >= 3
      ? `Concluded "${matchedRecord.text}". Next 3: 1) ${upcoming[0].action}, 2) ${upcoming[1].action}, 3) ${upcoming[2].action}`
      : upcoming.length > 0
      ? `Concluded "${matchedRecord.text}". Next up: ${upcoming.map((u, i) => `${i + 1}) ${u.action}`).join(', ')}`
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
