import { isValidElement, useState, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group/code relative">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto">
        <code className="font-mono text-[12.5px] leading-relaxed text-slate-100">{code}</code>
      </pre>
    </div>
  );
}

function extractCode(children: ReactNode): { code: string; language: string } {
  if (isValidElement(children)) {
    const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
    const className = child.props.className || "";
    const language = /language-([\w-]+)/.exec(className)?.[1] || "";
    const raw = child.props.children;
    const code = Array.isArray(raw)
      ? raw.map((part) => (typeof part === "string" ? part : "")).join("")
      : typeof raw === "string"
        ? raw
        : "";
    return { code: code.replace(/\n$/, ""), language };
  }
  return { code: String(children ?? ""), language: "" };
}

export function MarkdownRenderer({
  content,
  codeWrap = false,
}: {
  content: string;
  codeWrap?: boolean;
}) {
  return (
    <div className={`md-body ${codeWrap ? "md-code-wrap" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            const { code, language } = extractCode(children);
            return <CodeBlock code={code} language={language} />;
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}