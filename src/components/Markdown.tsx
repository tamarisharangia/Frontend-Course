import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ gfm: true, breaks: false });

/** Превращает Markdown из JSON-контента в HTML. Контент наш собственный, поэтому это безопасно. */
export function Markdown({ text, className = 'prose' }: { text: string | string[]; className?: string }) {
  const html = useMemo(() => marked.parse(Array.isArray(text) ? text.join('\n\n') : text) as string, [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
