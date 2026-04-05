import React from 'react';

interface StampBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'verified' | 'mythological' | 'composite' | 'count';
  className?: string;
}

export default function StampBadge({
  children,
  variant = 'default',
  className = ''
}: StampBadgeProps) {
  const baseClasses = "inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2";

  const variantClasses = {
    default: "bg-stone-100 border-stone-400 text-stone-700",
    verified: "bg-green-50 border-green-600 text-green-800",
    mythological: "bg-purple-50 border-purple-600 text-purple-800",
    composite: "bg-blue-50 border-blue-600 text-blue-800",
    count: "bg-amber-50 border-amber-600 text-amber-900"
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
