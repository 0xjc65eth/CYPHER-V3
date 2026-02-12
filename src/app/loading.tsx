import { CypherLogo } from '@/components/ui/CypherLogo'

export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-cypher-surface-0 flex flex-col items-center justify-center gap-6">
      <CypherLogo size="xl" animated showWordmark />
      <p className="font-mono text-sm text-cypher-accent/50 tracking-widest uppercase animate-pulse">
        Loading...
      </p>
    </main>
  )
}
