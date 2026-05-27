import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
          {title.split(' ').map((word, i, arr) => (
            <React.Fragment key={i}>
              <span className={i === arr.length - 1 ? 'text-brand-500' : ''}>
                {word}
              </span>
              {i < arr.length - 1 && ' '}
            </React.Fragment>
          ))}
        </h1>
      </div>
      {extra && (
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
          {extra}
        </div>
      )}
    </div>
  );
};
