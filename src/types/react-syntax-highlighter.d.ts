declare module 'react-syntax-highlighter' {
  import * as React from 'react';
  type RegisterLanguageFn = (name: string, definition: unknown) => void;
  interface SyntaxHighlighterComponentProps extends React.HTMLAttributes<HTMLElement> {
    language?: string;
    style?: unknown;
    wrapLongLines?: boolean;
    customStyle?: React.CSSProperties;
    codeTagProps?: React.HTMLAttributes<HTMLElement>;
    children?: React.ReactNode;
  }
  export const PrismLight: React.ComponentType<SyntaxHighlighterComponentProps> & {
    registerLanguage?: RegisterLanguageFn;
  };
  export const Prism: React.ComponentType<SyntaxHighlighterComponentProps> & {
    registerLanguage?: RegisterLanguageFn;
  };
  export const Light: React.ComponentType<SyntaxHighlighterComponentProps> & {
    registerLanguage?: RegisterLanguageFn;
  };
  const DefaultExport: React.ComponentType<SyntaxHighlighterComponentProps> & {
    registerLanguage?: RegisterLanguageFn;
  };
  export default DefaultExport;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: any;
  const styles: any;
  export default styles;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/sql' {
  const lang: any;
  export default lang;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/typescript' {
  const lang: any;
  export default lang;
}
