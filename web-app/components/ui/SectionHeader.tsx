import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  icon: Icon,
  children,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      {Icon && <Icon className="w-5 h-5 text-amber-600" />}
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest">
        {children}
      </h2>
    </div>
  );
}
