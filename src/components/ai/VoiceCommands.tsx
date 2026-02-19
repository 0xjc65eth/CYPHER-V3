'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface VoiceCommand {
  command: string
  description: string
  category: 'trading' | 'wallet' | 'market' | 'system'
  example: string
}

const VOICE_COMMANDS: VoiceCommand[] = [
  // Trading Commands
  {
    command: "Buy Bitcoin",
    description: "Initiate Bitcoin purchase",
    category: "trading",
    example: "Buy 0.1 Bitcoin at market price"
  },
  {
    command: "Sell Bitcoin", 
    description: "Initiate Bitcoin sale",
    category: "trading",
    example: "Sell 0.5 Bitcoin at $45000"
  },
  {
    command: "Check portfolio",
    description: "Display portfolio overview",
    category: "trading", 
    example: "Show my portfolio balance"
  },
  {
    command: "Set stop loss",
    description: "Configure stop loss order",
    category: "trading",
    example: "Set stop loss at $42000"
  },
  
  // Wallet Commands
  {
    command: "Connect wallet",
    description: "Connect Bitcoin wallet",
    category: "wallet",
    example: "Connect Xverse wallet"
  },
  {
    command: "Check balance",
    description: "Show wallet balance",
    category: "wallet", 
    example: "What's my Bitcoin balance?"
  },
  {
    command: "Send Bitcoin",
    description: "Send Bitcoin to address",
    category: "wallet",
    example: "Send 0.01 Bitcoin to bc1q..."
  },
  
  // Market Commands  
  {
    command: "Bitcoin price",
    description: "Get current Bitcoin price",
    category: "market",
    example: "What's the Bitcoin price?"
  },
  {
    command: "Market analysis",
    description: "Generate market insights",
    category: "market", 
    example: "Analyze Bitcoin market trends"
  },
  {
    command: "Price alert",
    description: "Set price notification",
    category: "market",
    example: "Alert me when Bitcoin hits $50000"
  },
  
  // System Commands
  {
    command: "Switch theme",
    description: "Toggle dark/light mode",
    category: "system",
    example: "Switch to dark mode"
  },
  {
    command: "Help",
    description: "Show available commands",
    category: "system",
    example: "What can I say?"
  }
]

export function VoiceCommands() {
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState<string>('')
  const [recognition, setRecognition] = useState<any>(null)
  const [browserSupport, setBrowserSupport] = useState(false)

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      setBrowserSupport(true)
      const recognitionInstance = new SpeechRecognition()
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onresult = (event: any) => {
        const command = event.results[0][0].transcript
        setLastCommand(command)
        processVoiceCommand(command)
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      setRecognition(recognitionInstance)
    }
  }, [])

  const startListening = () => {
    if (recognition && browserSupport) {
      setIsListening(true)
      recognition.start()
    }
  }

  const stopListening = () => {
    if (recognition) {
      recognition.stop()
    }
    setIsListening(false)
  }

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase()
    
    // Find matching command
    const matchedCommand = VOICE_COMMANDS.find(cmd => 
      lowerCommand.includes(cmd.command.toLowerCase())
    )

    if (matchedCommand) {
      // Execute command based on category
      switch (matchedCommand.category) {
        case 'trading':
          handleTradingCommand(lowerCommand)
          break
        case 'wallet':
          handleWalletCommand(lowerCommand)
          break
        case 'market':
          handleMarketCommand(lowerCommand)
          break
        case 'system':
          handleSystemCommand(lowerCommand)
          break
      }
    }
  }

  const handleTradingCommand = (command: string) => {
    if (command.includes('buy')) {
    } else if (command.includes('sell')) {
    } else if (command.includes('portfolio')) {
    }
  }

  const handleWalletCommand = (command: string) => {
    if (command.includes('connect')) {
    } else if (command.includes('balance')) {
    }
  }

  const handleMarketCommand = (command: string) => {
    if (command.includes('price')) {
    } else if (command.includes('analysis')) {
    }
  }

  const handleSystemCommand = (command: string) => {
    if (command.includes('theme')) {
    } else if (command.includes('help')) {
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      trading: 'bg-green-500/20 text-green-400',
      wallet: 'bg-blue-500/20 text-blue-400',
      market: 'bg-orange-500/20 text-orange-400', 
      system: 'bg-purple-500/20 text-purple-400'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          🎤 Voice Commands
          <Badge 
            variant="secondary" 
            className={browserSupport ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
          >
            {browserSupport ? "Supported" : "Not Supported"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Control */}
        <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={!browserSupport}
            className={`${
              isListening 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {isListening ? "🛑 Stop" : "🎤 Start Listening"}
          </Button>
          
          {isListening && (
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Listening...</span>
            </div>
          )}
        </div>

        {/* Last Command */}
        {lastCommand && (
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400">Last Command:</div>
            <div className="text-white font-medium">"{lastCommand}"</div>
          </div>
        )}

        {/* Available Commands */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Available Commands:</h3>
          {Object.entries(
            VOICE_COMMANDS.reduce((acc, cmd) => {
              if (!acc[cmd.category]) acc[cmd.category] = []
              acc[cmd.category].push(cmd)
              return acc
            }, {} as Record<string, VoiceCommand[]>)
          ).map(([category, commands]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-md font-medium text-gray-300 capitalize">
                {category} Commands:
              </h4>
              <div className="grid gap-2">
                {commands.map((cmd, index) => (
                  <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">"{cmd.command}"</span>
                      <Badge className={getCategoryColor(cmd.category)}>
                        {cmd.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{cmd.description}</p>
                    <p className="text-xs text-gray-500 italic">Example: {cmd.example}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!browserSupport && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">
              Voice recognition is not supported in your browser. 
              Please use Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}