'use client';

import { CodeHighlightAdapterProvider, createHighlightJsAdapter } from '@mantine/code-highlight';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('sql', sql);

const adapter = createHighlightJsAdapter(hljs);

export function CodeHighlightSetup({ children }: { children: React.ReactNode }) {
  return (
    <CodeHighlightAdapterProvider adapter={adapter}>
      {children}
    </CodeHighlightAdapterProvider>
  );
}
