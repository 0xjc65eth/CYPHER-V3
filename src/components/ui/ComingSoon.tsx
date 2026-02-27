'use client';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="border border-orange-500/30 bg-black/50 rounded-lg p-8 max-w-md text-center">
        <div className="text-orange-500 text-4xl mb-4">&#9881;</div>
        <h2 className="text-orange-500 font-mono text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-400 font-mono text-sm mb-4">
          {description || 'This feature is under development and will be available in a future release.'}
        </p>
        <div className="inline-block border border-orange-500/50 rounded px-3 py-1">
          <span className="text-orange-500/70 font-mono text-xs">COMING SOON — BETA</span>
        </div>
      </div>
    </div>
  );
}
