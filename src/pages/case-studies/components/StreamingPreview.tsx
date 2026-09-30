import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export function StreamingPreview({ text, streaming }: { text: string; streaming: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && streaming) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, streaming]);

  return (
    <div
      ref={ref}
      className="prose prose-sm max-w-none dark:prose-invert border rounded-md bg-card p-6 min-h-[400px] max-h-[70vh] overflow-y-auto"
    >
      {text ? (
        <ReactMarkdown>{text}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground text-sm not-prose">
          {streaming ? "Generating…" : "Configure on the left and click Generate to start streaming your case study."}
        </p>
      )}
      {streaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
    </div>
  );
}
