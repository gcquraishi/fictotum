import React from 'react';

interface DossierCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlighted' | 'manila';
}

export default function DossierCard({
  children,
  className = '',
  variant = 'default'
}: DossierCardProps) {
  const baseClasses = "bg-white shadow-sm overflow-hidden";

  const variantClasses = {
    default: "border border-stone-300",
    highlighted: "border-t-4 border-amber-600 shadow-xl",
    manila: "bg-manila border-2 border-stone-400"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
