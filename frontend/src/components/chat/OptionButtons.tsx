"use client";

import React from 'react';

interface Option {
  id: string;
  label: string;
  value: string;
}

interface OptionButtonsProps {
  options: Option[];
  onSelect: (value: string) => void;
}

export function OptionButtons({ options, onSelect }: OptionButtonsProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 w-full mt-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.value)}
          className="px-4 py-2 journey-widget-button type-label-sm border border-transparent transition-colors shadow-sm"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
