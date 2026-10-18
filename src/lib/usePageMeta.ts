import { useEffect } from 'react';

/** Sets the tab title and, for fill pages, asks search engines not to index the page. */
export function usePageMeta(title: string, options: { noindex?: boolean } = {}): void {
  const { noindex = false } = options;
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    let meta: HTMLMetaElement | null = null;
    if (noindex) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex';
      document.head.appendChild(meta);
    }
    return () => {
      document.title = previous;
      meta?.remove();
    };
  }, [title, noindex]);
}
