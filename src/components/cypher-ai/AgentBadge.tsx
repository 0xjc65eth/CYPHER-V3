'use client';

import React from 'react';

interface AgentBadgeProps {
  name: string;
  icon: string;
  color: string;
  specialty?: string;
  size?: 'sm' | 'md';
}

export function AgentBadge({ name, icon, color, specialty, size = 'sm' }: AgentBadgeProps) {
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span>{icon}</span>
      <span>{name}</span>
      {specialty && specialty !== name && (
        <span className="opacity-60 ml-0.5">· {specialty}</span>
      )}
    </span>
  );
}

export default AgentBadge;
