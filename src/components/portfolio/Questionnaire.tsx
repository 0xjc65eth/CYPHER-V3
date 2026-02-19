"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"

interface QuestionnaireProps {
  onComplete: () => void
}

interface Question {
  id: number
  text: string
  options: {
    id: string
    text: string
    value: number
  }[]
  description: string
}

const questions: Question[] = [
  {
    id: 1,
    text: "What is your primary goal for investing in Bitcoin and related assets?",
    options: [
      { id: "1a", text: "Preserve capital with minimal risk (capital preservation)", value: 1 },
      { id: "1b", text: "Generate steady income with moderate growth (balanced approach)", value: 2 },
      { id: "1c", text: "Achieve significant capital appreciation (growth-focused)", value: 3 },
      { id: "1d", text: "Maximize returns regardless of risk (aggressive growth)", value: 4 }
    ],
    description: "Your investment goal helps our neural system tailor recommendations to your specific objectives."
  },
  {
    id: 2,
    text: "How long do you plan to hold your Bitcoin investments?",
    options: [
      { id: "2a", text: "Less than 1 year (short-term trading)", value: 1 },
      { id: "2b", text: "1-3 years (medium-term position)", value: 2 },
      { id: "2c", text: "3-5 years (long-term investment)", value: 3 },
      { id: "2d", text: "More than 5 years (strategic holding)", value: 4 }
    ],
    description: "Your time horizon significantly impacts the types of assets and strategies our neural system will recommend."
  },
  {
    id: 3,
    text: "If your Bitcoin portfolio suddenly dropped 30% in value, what would you do?",
    options: [
      { id: "3a", text: "Sell everything to prevent further losses (risk-averse)", value: 1 },
      { id: "3b", text: "Sell some assets to reduce exposure (cautious)", value: 2 },
      { id: "3c", text: "Hold and wait for recovery (patient)", value: 3 },
      { id: "3d", text: "Buy more to take advantage of lower prices (opportunistic)", value: 4 }
    ],
    description: "Your reaction to market volatility helps us gauge your risk tolerance and emotional approach to investing."
  },
  {
    id: 4,
    text: "What percentage of your total investment portfolio is in Bitcoin and crypto?",
    options: [
      { id: "4a", text: "Less than 5% (minimal exposure)", value: 1 },
      { id: "4b", text: "5-15% (moderate allocation)", value: 2 },
      { id: "4c", text: "15-30% (significant position)", value: 3 },
      { id: "4d", text: "More than 30% (major focus)", value: 4 }
    ],
    description: "Your current allocation helps our neural system understand your commitment level and diversification needs."
  },
  {
    id: 5,
    text: "How much experience do you have with Bitcoin and crypto investments?",
    options: [
      { id: "5a", text: "Beginner (less than 1 year of active involvement)", value: 1 },
      { id: "5b", text: "Intermediate (1-3 years of regular participation)", value: 2 },
      { id: "5c", text: "Advanced (3-5 years of consistent engagement)", value: 3 },
      { id: "5d", text: "Expert (more than 5 years of deep involvement)", value: 4 }
    ],
    description: "Your experience level helps us calibrate the complexity of our neural system's recommendations and explanations."
  },
  {
    id: 6,
    text: "Which Bitcoin-related assets are you most interested in exploring or increasing exposure to?",
    options: [
      { id: "6a", text: "Bitcoin only (BTC maximalist approach)", value: 1 },
      { id: "6b", text: "Bitcoin and Ordinals (digital collectibles)", value: 2 },
      { id: "6c", text: "Bitcoin, Ordinals, and Runes (token ecosystem)", value: 3 },
      { id: "6d", text: "All Bitcoin assets including Rare Sats (comprehensive)", value: 4 }
    ],
    description: "Your asset preferences help our neural system focus on the most relevant opportunities for your portfolio."
  },
  {
    id: 7,
    text: "How actively do you want to manage your Bitcoin portfolio?",
    options: [
      { id: "7a", text: "Passive (minimal adjustments, long-term holding)", value: 1 },
      { id: "7b", text: "Moderately active (quarterly rebalancing)", value: 2 },
      { id: "7c", text: "Active (monthly adjustments based on market conditions)", value: 3 },
      { id: "7d", text: "Highly active (weekly or daily trading and optimization)", value: 4 }
    ],
    description: "Your preferred management style helps our neural system determine the frequency and type of recommendations."
  },
  {
    id: 8,
    text: "What is your primary source of Bitcoin market information?",
    options: [
      { id: "8a", text: "Mainstream financial news (CNBC, Bloomberg, etc.)", value: 1 },
      { id: "8b", text: "Crypto-specific publications (CoinDesk, Cointelegraph)", value: 2 },
      { id: "8c", text: "Social media and community forums (Twitter, Discord)", value: 3 },
      { id: "8d", text: "Technical analysis and on-chain metrics", value: 4 }
    ],
    description: "Your information sources help our neural system align recommendations with your knowledge base and perspective."
  },
  {
    id: 9,
    text: "What is your primary motivation for investing in Bitcoin ecosystem assets?",
    options: [
      { id: "9a", text: "Inflation hedge and store of value", value: 1 },
      { id: "9b", text: "Portfolio diversification away from traditional assets", value: 2 },
      { id: "9c", text: "Technological innovation and future potential", value: 3 },
      { id: "9d", text: "Speculative opportunity for significant returns", value: 4 }
    ],
    description: "Your motivation helps our neural system understand your investment philosophy and value drivers."
  },
  {
    id: 10,
    text: "How do you evaluate the success of your Bitcoin investments?",
    options: [
      { id: "10a", text: "Preservation of purchasing power vs. inflation", value: 1 },
      { id: "10b", text: "Performance relative to traditional markets (S&P 500)", value: 2 },
      { id: "10c", text: "Absolute returns in fiat currency (USD)", value: 3 },
      { id: "10d", text: "Accumulation of more Bitcoin and ecosystem assets", value: 4 }
    ],
    description: "Your success metrics help our neural system optimize recommendations for your specific definition of investment success."
  }
]

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleNext = () => {
    if (selectedOption) {
      setAnswers(prev => ({ ...prev, [questions[currentQuestion].id]: selectedOption }))

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1)
        setSelectedOption(null)
      } else {
        // Submit answers
        submitAnswers()
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      setSelectedOption(answers[questions[currentQuestion - 1].id] || null)
    }
  }

  const submitAnswers = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {

      // Convert answers to the format expected by the API
      const formattedAnswers = Object.entries(answers).map(([questionId, optionId]) => {
        const question = questions.find(q => q.id === parseInt(questionId))
        const option = question?.options.find(o => o.id === optionId)
        return {
          questionId: parseInt(questionId),
          optionId,
          value: option?.value || 0
        }
      })

      // Call API to submit answers
      const response = await fetch('/api/portfolio/questionnaire/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: formattedAnswers }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit questionnaire')
      }


      // Show success toast
      toast({
        title: "Profile Analysis Complete",
        description: "Your investor profile has been analyzed by our neural system.",
        variant: "success",
      })

      // Notify parent component that questionnaire is complete
      onComplete()
    } catch (error) {
      console.error('Error submitting questionnaire:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit questionnaire')

      // Show error toast
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : 'Failed to submit questionnaire. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Neural-Enhanced Investor Profile</CardTitle>
            <CardDescription className="text-gray-200">
              Our neural system will analyze your answers to create a personalized investment strategy.
            </CardDescription>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-sm">
            {currentQuestion + 1} of {questions.length}
          </div>
        </div>
        <Progress value={progress} className="mt-4 h-2 bg-white/20" />
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-5 rounded-xl">
            <h3 className="text-xl font-medium text-blue-800 dark:text-blue-300 mb-2">
              {questions[currentQuestion].text}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {questions[currentQuestion].description}
            </p>
          </div>

          <RadioGroup
            value={selectedOption || ''}
            onValueChange={setSelectedOption}
            className="space-y-4"
          >
            {questions[currentQuestion].options.map((option) => (
              <div
                key={option.id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedOption === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-700/50'
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <div className="flex items-center">
                  <RadioGroupItem value={option.id} id={option.id} className="mr-3" />
                  <Label htmlFor={option.id} className="cursor-pointer flex-1 font-medium">
                    {option.text}
                  </Label>
                  <div className={`ml-2 w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedOption === option.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                  }`}>
                    {option.value}
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 flex items-start">
            <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-lg mr-3 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-400">
              Your answers are analyzed by our neural system to create a personalized investment profile. This helps us provide tailored recommendations for your Bitcoin portfolio.
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between py-4 bg-gray-50 dark:bg-gray-800/20">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m15 18-6-6 6-6"></path></svg>
          Previous
        </Button>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(progress)}% Complete
        </div>

        <Button
          onClick={handleNext}
          disabled={!selectedOption || isSubmitting}
          className={`${
            currentQuestion === questions.length - 1
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          }`}
        >
          {currentQuestion === questions.length - 1 ? (
            isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Submit Profile
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </>
            )
          ) : (
            <>
              Next Question
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </>
          )}
        </Button>

        {submitError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {submitError}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
