import React from 'react';

/**
 * Helper to render italicized text inside any block
 */
const renderItalicAndText = (subText: string, keyPrefix: string): React.ReactNode => {
  if (!subText) return '';
  if (!subText.includes('~~') && !subText.includes('*') && !subText.includes('_')) {
    return subText;
  }

  // Split by ~~italic~~ syntax or single *italic* / _italic_
  const parts = subText.split(/(~~[^~]+?~~|\*[^*]+?\*|_[^_]+?_)/g);

  return parts.map((part, index) => {
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <em key={`${keyPrefix}-it-${index}`} className="formatted-italic">
          {inner}
        </em>
      );
    }
    if (part.startsWith('~~') && !part.endsWith('~~')) {
      return (
        <em key={`${keyPrefix}-it-${index}`} className="formatted-italic">
          {part.slice(2)}
        </em>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      const inner = part.slice(1, -1);
      return (
        <em key={`${keyPrefix}-it-${index}`} className="formatted-italic">
          {inner}
        </em>
      );
    }
    return <React.Fragment key={`${keyPrefix}-tx-${index}`}>{part}</React.Fragment>;
  });
};

/**
 * Parses markdown-style syntax:
 * - `**bold text**` -> <strong> with font-weight: 900
 * - `~~italic text~~` (or *italic* / _italic_) -> <em> with italic styling
 */
export const renderFormattedMarkdown = (text: string, boldWeight: number | string = 900): React.ReactNode => {
  if (!text) return '';
  if (!text.includes('**') && !text.includes('~~') && !text.includes('*') && !text.includes('_')) {
    return text;
  }

  // Split by bold markdown syntax: **bold text**
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const innerText = part.slice(2, -2);
      return (
        <strong
          key={index}
          style={{
            fontWeight: boldWeight,
            letterSpacing: 'inherit',
          }}
          className="formatted-bold"
        >
          {renderItalicAndText(innerText, `b-${index}`)}
        </strong>
      );
    }
    // Also handle incomplete trailing ** during typing/animation without showing raw asterisks
    if (part.startsWith('**') && !part.endsWith('**')) {
      return (
        <strong
          key={index}
          style={{
            fontWeight: boldWeight,
            letterSpacing: 'inherit',
          }}
          className="formatted-bold"
        >
          {renderItalicAndText(part.slice(2), `b-${index}`)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{renderItalicAndText(part, `p-${index}`)}</React.Fragment>;
  });
};

/**
 * Strip markdown markers for pure string manipulation (e.g. word count, length calculation)
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/~~/g, '')
    .replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, '$1$2$3')
    .replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, '$1$2$3');
};

/**
 * Helper to slice formatted string keeping markdown bolding and italic intact during typewriter animation
 */
export const sliceFormattedMarkdown = (text: string, visiblePlainCharCount: number): string => {
  if (!text) return '';
  let plainIndex = 0;
  let inBold = false;
  let inTildeItalic = false;
  let result = '';

  let i = 0;
  while (i < text.length && plainIndex < visiblePlainCharCount) {
    if (text.startsWith('**', i)) {
      inBold = !inBold;
      result += '**';
      i += 2;
    } else if (text.startsWith('~~', i)) {
      inTildeItalic = !inTildeItalic;
      result += '~~';
      i += 2;
    } else {
      result += text[i];
      plainIndex++;
      i++;
    }
  }

  // If we ended inside an italic or bold section, close it for rendering
  if (inTildeItalic && !result.endsWith('~~')) {
    result += '~~';
  }
  if (inBold && !result.endsWith('**')) {
    result += '**';
  }

  return result;
};
