'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/primitives/Button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/primitives/Card'
import { Badge } from '@/components/ui/primitives/Badge'
import { Input, Textarea } from '@/components/ui/primitives/Input'
import { Label } from '@/components/ui/primitives/Label'

export default function DesignSystemPage() {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">CYPHER Design System</h1>
          <p className="text-gray-400">
            Bloomberg Terminal inspired components for professional Bitcoin trading
          </p>
        </div>

        {/* Color Palette */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Color Palette</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Primary */}
            <Card>
              <CardHeader>
                <CardTitle>Primary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-12 bg-[#f59e0b] rounded flex items-center justify-center text-black font-mono text-sm">
                    #F59E0B
                  </div>
                  <div className="text-xs text-gray-400">Accent Color</div>
                </div>
              </CardContent>
            </Card>

            {/* Success */}
            <Card>
              <CardHeader>
                <CardTitle>Success</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-12 bg-green-500 rounded flex items-center justify-center text-white font-mono text-sm">
                    #10B981
                  </div>
                  <div className="text-xs text-gray-400">Positive Values</div>
                </div>
              </CardContent>
            </Card>

            {/* Danger */}
            <Card>
              <CardHeader>
                <CardTitle>Danger</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-12 bg-red-500 rounded flex items-center justify-center text-white font-mono text-sm">
                    #EF4444
                  </div>
                  <div className="text-xs text-gray-400">Negative Values</div>
                </div>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card>
              <CardHeader>
                <CardTitle>Warning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-12 bg-yellow-500 rounded flex items-center justify-center text-black font-mono text-sm">
                    #F59E0B
                  </div>
                  <div className="text-xs text-gray-400">Warnings</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Buttons</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="primary" fullWidth>Primary Button</Button>
                  <Button variant="secondary" fullWidth>Secondary Button</Button>
                  <Button variant="ghost" fullWidth>Ghost Button</Button>
                  <Button variant="danger" fullWidth>Danger Button</Button>
                  <Button variant="success" fullWidth>Success Button</Button>
                </div>
              </CardContent>
            </Card>

            {/* Sizes & States */}
            <Card>
              <CardHeader>
                <CardTitle>Sizes & States</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button size="sm" fullWidth>Small Button</Button>
                  <Button size="md" fullWidth>Medium Button</Button>
                  <Button size="lg" fullWidth>Large Button</Button>
                  <Button loading={loading} onClick={handleClick} fullWidth>
                    {loading ? 'Loading...' : 'Click to Load'}
                  </Button>
                  <Button disabled fullWidth>Disabled Button</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Badges</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="new" pulse>New</Badge>
                <Badge variant="success" size="sm">Small</Badge>
                <Badge variant="danger" size="md">Medium</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Cards</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  This is a default card with standard styling.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" fullWidth>Action</Button>
              </CardFooter>
            </Card>

            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Bordered Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  This card has a highlighted border with hover effect.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="secondary" fullWidth>Action</Button>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  This card has elevation with shadow effect.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="success" fullWidth>Action</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Form Elements */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Form Elements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Input Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" required>Email Address</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="you@example.com"
                      fullWidth
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="Enter password"
                      fullWidth
                    />
                  </div>

                  <div>
                    <Label htmlFor="error">Error State</Label>
                    <Input 
                      id="error"
                      error
                      placeholder="Invalid input"
                      fullWidth
                    />
                    <p className="mt-1 text-xs text-red-400">This field has an error</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Textarea</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      placeholder="Enter description..."
                      rows={6}
                      fullWidth
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Typography</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Type Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Terminal XS (10px)</div>
                  <div className="text-terminal-xs font-mono text-white">
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Terminal SM (11px)</div>
                  <div className="text-terminal-sm font-mono text-white">
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Terminal Base (12px)</div>
                  <div className="text-terminal-base font-mono text-white">
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Terminal LG (14px)</div>
                  <div className="text-terminal-lg font-mono text-white">
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Terminal XL (16px)</div>
                  <div className="text-terminal-xl font-mono text-white">
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Spacing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Spacing</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Terminal Spacing Scale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'XS', size: 'terminal-xs', px: '2px' },
                  { name: 'SM', size: 'terminal-sm', px: '4px' },
                  { name: 'MD', size: 'terminal-md', px: '8px' },
                  { name: 'LG', size: 'terminal-lg', px: '12px' },
                  { name: 'XL', size: 'terminal-xl', px: '16px' },
                  { name: '2XL', size: 'terminal-2xl', px: '24px' },
                  { name: '3XL', size: 'terminal-3xl', px: '32px' },
                  { name: '4XL', size: 'terminal-4xl', px: '48px' },
                ].map((space) => (
                  <div key={space.name} className="flex items-center gap-4">
                    <div className="w-16 text-xs text-gray-500">{space.name}</div>
                    <div className={`h-6 bg-[#f59e0b] w-${space.size}`}></div>
                    <div className="text-xs text-gray-400 font-mono">{space.px}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <section className="mt-12 pt-12 border-t border-[#2a2a3e]">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              CYPHER Design System v1.0.0 • Built with Tailwind CSS
            </p>
            <p className="text-xs text-gray-600 mt-2">
              See <code className="px-2 py-1 bg-[#1a1a2e] rounded">DESIGN_SYSTEM.md</code> for full documentation
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
