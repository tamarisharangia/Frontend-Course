import { buildDoc } from '../lib/checks';

/** Маленькое изолированное превью: стили внутри iframe не смешиваются со стилями сайта. */
export function MiniFrame({ html, css = '', height = 220, title = 'Превью', extraCss = '' }: { html: string; css?: string; height?: number | string; title?: string; extraCss?: string }) {
  return <iframe title={title} srcDoc={buildDoc({ html, css }, extraCss)} style={{ width: '100%', height, border: 0, display: 'block', background: '#fff' }} />;
}
