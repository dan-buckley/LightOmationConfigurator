import { type ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
