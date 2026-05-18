'use client';

import { useRef, useCallback } from 'react';
import katex from 'katex';

/**
 * Render text containing LaTeX formulas ($...$ for inline, $$...$$ for display).
 *
 * - Inline math: $x^2 + 1$ → rendered by KaTeX inline
 * - Display math: $$\sum_{i=1}^n i$$ → rendered by KaTeX display mode
 * - Plain text is passed through unchanged
 *
 * The component uses dangerouslySetInnerHTML because KaTeX produces HTML.
 * All LaTeX is rendered client-side via KaTeX (no server dependency).
 */
export function LatexText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const renderLatex = useCallback((raw: string): string => {
    // Split text into segments: display math ($$...$$), inline math ($...$), and plain text
    const segments: Array<{ type: 'display' | 'inline' | 'text'; content: string }> = [];

    // Process display math first ($$...$$), then inline ($...$)
    const displayRegex = /\$\$([\s\S]*?)\$\$/g;
    const inlineRegex = /\$([^\$]+?)\$/g;

    // Split by display math
    const displayParts = raw.split(displayRegex);

    for (let i = 0; i < displayParts.length; i++) {
      if (i % 2 === 0) {
        // Not display math — split by inline math
        const inlineParts = displayParts[i].split(inlineRegex);
        for (let j = 0; j < inlineParts.length; j++) {
          if (j % 2 === 0) {
            // Plain text
            if (inlineParts[j]) {
              segments.push({ type: 'text', content: inlineParts[j] });
            }
          } else {
            // Inline math
            segments.push({ type: 'inline', content: inlineParts[j] });
          }
        }
      } else {
        // Display math
        segments.push({ type: 'display', content: displayParts[i] });
      }
    }

    // Render each segment
    return segments
      .map((seg) => {
        if (seg.type === 'text') {
          return escapeHtml(seg.content);
        }
        try {
          const html = katex.renderToString(seg.content.trim(), {
            displayMode: seg.type === 'display',
            throwOnError: false,
            strict: false,
            trust: true,
          });
          return html;
        } catch {
          // Fallback: show the raw LaTeX
          return escapeHtml(seg.type === 'display' ? `$$${seg.content}$$` : `$${seg.content}$`);
        }
      })
      .join('');
  }, []);

  const rendered = renderLatex(text);

  return (
    <span
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
