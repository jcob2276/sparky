import React, { FC, useMemo } from 'react';
import { AnalystTable } from './AnalystTable';
import { AnalystTradeCard } from './AnalystTradeCard';
import { AnalystChart } from './AnalystChart';
import { parseBlocks } from './analystParse';
import { Landmark, BarChart3, Sparkles, ShieldCheck, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface Props {
  content: string;
}

function renderFormattedLine(text: string): React.ReactNode {
  // Replace [label](url) with link, **bold** with styled strong and $TICKER with badge
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\$[A-Z0-9.]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (match) {
            const [, label, url] = match;
            const isExternal = url.startsWith('http://') || url.startsWith('https://');
            return (
              <a
                key={idx}
                href={url}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5 mx-0.5"
              >
                <span>{label}</span>
                {isExternal && <ExternalLink size={10} className="inline ml-0.5 shrink-0" />}
              </a>
            );
          }
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('$') && part.length > 1) {
          return (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.2 rounded-md font-mono font-bold text-xs bg-surface border border-border-custom text-text-primary shadow-2xs mx-0.5"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

function HeadingIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  if (t.includes('pelosi') || t.includes('stock act') || t.includes('kongres')) {
    return <Landmark size={15} className="text-info shrink-0" />;
  }
  if (t.includes('wskaźnik') || t.includes('porównanie') || t.includes('wycen')) {
    return <BarChart3 size={15} className="text-primary shrink-0" />;
  }
  if (t.includes('szort') || t.includes('knf')) {
    return <ShieldAlert size={15} className="text-danger shrink-0" />;
  }
  return <Sparkles size={15} className="text-primary shrink-0" />;
}

export const AnalystMessageRenderer: FC<Props> = ({ content }) => {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-border-custom/50 flex items-center gap-2">
              <HeadingIcon text={block.text} />
              <h4 className="font-extrabold text-sm sm:text-base text-text-primary tracking-tight">
                {block.text}
              </h4>
            </div>
          );
        }

        if (block.type === 'table') {
          return <AnalystTable key={idx} headers={block.headers} rows={block.rows} />;
        }

        if (block.type === 'chart') {
          return <AnalystChart key={idx} spec={block.chart} />;
        }

        if (block.type === 'source') {
          return (
            <p key={idx} className="text-2xs font-mono text-text-muted">
              {block.text}
            </p>
          );
        }

        if (block.type === 'trade') {
          return <AnalystTradeCard key={idx} {...block.data} />;
        }

        if (block.type === 'disclaimer') {
          return (
            <div
              key={idx}
              className="mt-4 p-3 rounded-xl bg-surface-2/60 border border-border-custom text-2xs text-text-muted flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-text-muted shrink-0" />
              <span>{block.text}</span>
            </div>
          );
        }

        // Regular text line
        const isBullet = block.text.startsWith('* ') || block.text.startsWith('- ') || block.text.startsWith('• ');
        const cleanText = isBullet ? block.text.slice(2).trim() : block.text;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
              <ArrowRight size={12} className="text-primary/70 shrink-0 mt-1" />
              <div className="flex-1 text-text-secondary">{renderFormattedLine(cleanText)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-text-secondary">
            {renderFormattedLine(block.text)}
          </p>
        );
      })}
    </div>
  );
};
