import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export const threadChatRemarkPlugins = [remarkGfm];
export const threadChatRehypePlugins = [rehypeHighlight, rehypeRaw];
export const threadChatRemarkPluginsWithMath = [remarkGfm, remarkMath];
export const threadChatRehypePluginsWithMath = [
  rehypeHighlight,
  rehypeRaw,
  rehypeKatex,
];

export const threadChatMarkdownComponents: Components = {
  code({ className, children, ...props }) {
    const isBlock = typeof className === "string" && className.includes("language-");

    if (!isBlock) {
      return (
        <code
          className="mx-0.5 inline break-words rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.84em] font-medium leading-none text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="block overflow-x-auto rounded-lg border border-border/70 bg-muted/60 p-3 font-mono text-[12px] leading-6 text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children, ...props }) {
    return (
      <pre
        className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-0"
        {...props}
      >
        {children}
      </pre>
    );
  },
};
