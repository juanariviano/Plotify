import { Fragment } from "react";

// **tebal** → <strong>, tanpa dangerouslySetInnerHTML
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part.replace(/\*([^*]+)\*/g, "$1")}</Fragment>
    ),
  );

// markdown sederhana dari gemini: paragraf dan bullet list
const Formatted = ({ text }: { text: string }) => {
  const blocks: { list: boolean; lines: string[] }[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[*-]\s+/.test(line);
    const content = line.replace(/^[*-]\s+/, "");
    const last = blocks[blocks.length - 1];
    if (last && last.list && bullet) last.lines.push(content);
    else blocks.push({ list: bullet, lines: [content] });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((b, i) =>
        b.list ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-4 marker:text-dim">
            {b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}
          </ul>
        ) : (
          <p key={i}>{inline(b.lines[0])}</p>
        ),
      )}
    </div>
  );
};

export default Formatted;
