"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, ArrowRight, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

// Mock data for the demo
const mockWords = [
  {
    id: 1,
    word: "ephemeral",
    definition: "Lasting for a very short time.",
    sampleSentence: "The ephemeral nature of fashion trends makes it hard to keep up.",
    translation: "短暂的",
    difficulty: 0.8,
  },
  {
    id: 2,
    word: "ubiquitous",
    definition: "Present, appearing, or found everywhere.",
    sampleSentence: "Mobile phones have become ubiquitous in modern society.",
    translation: "无所不在的",
    difficulty: 0.7,
  },
  {
    id: 3,
    word: "pernicious",
    definition: "Having a harmful effect, especially in a gradual or subtle way.",
    sampleSentence: "The pernicious effects of smoking are well documented.",
    translation: "有害的",
    difficulty: 0.9,
  },
  {
    id: 4,
    word: "ameliorate",
    definition: "Make something bad or unsatisfactory better.",
    sampleSentence: "The medicine should ameliorate the symptoms.",
    translation: "改善",
    difficulty: 0.85,
  },
  {
    id: 5,
    word: "perfunctory",
    definition: "Carried out with minimal effort or reflection.",
    sampleSentence: "He gave a perfunctory nod and continued on his way.",
    translation: "敷衍的",
    difficulty: 0.75,
  },
]

type WordWithState = (typeof mockWords)[0] & {
  state: "unseen" | "current" | "correct" | "incorrect"
  nextReviewDate?: Date
  reviewCount?: number
}

export default function VocabularyPracticePage() {
  const searchParams = useSearchParams()
  const bankName = searchParams.get("bank") || "SAT Common Words"

  const [words, setWords] = useState<WordWithState[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userSentence, setUserSentence] = useState("")
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, total: 0 })

  useEffect(() => {
    // Initialize words with state
    const wordsWithState = mockWords.map((word) => ({
      ...word,
      state: "unseen",
      reviewCount: 0,
    }))
    wordsWithState[0].state = "current"
    setWords(wordsWithState)
    setStats({ correct: 0, incorrect: 0, total: mockWords.length })
  }, [])

  const checkAnswer = async () => {
    if (!userSentence.trim()) return

    setIsChecking(true)

    // Simulate AI checking the sentence
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simple check - just see if the word is in the sentence
    // In a real app, this would use the Gemini API to evaluate understanding
    const isCorrect = userSentence.toLowerCase().includes(words[currentIndex].word.toLowerCase())

    setFeedback({
      message: isCorrect
        ? "Great job! Your sentence demonstrates understanding of the word."
        : "Your sentence doesn't clearly demonstrate understanding of the word. Try again or see the example.",
      isCorrect,
    })

    // Update word state
    const updatedWords = [...words]
    updatedWords[currentIndex].state = isCorrect ? "correct" : "incorrect"

    // Update spaced repetition data
    updatedWords[currentIndex].reviewCount = (updatedWords[currentIndex].reviewCount || 0) + 1

    // Set next review date based on correctness (simplified spaced repetition)
    const now = new Date()
    if (isCorrect) {
      // If correct, schedule review further in the future based on review count
      const reviewCount = updatedWords[currentIndex].reviewCount || 1
      const daysToAdd = Math.min(reviewCount * 2, 30) // Cap at 30 days
      const nextDate = new Date(now)
      nextDate.setDate(now.getDate() + daysToAdd)
      updatedWords[currentIndex].nextReviewDate = nextDate
    } else {
      // If incorrect, schedule for review soon
      const nextDate = new Date(now)
      nextDate.setHours(now.getHours() + 1) // Review in 1 hour
      updatedWords[currentIndex].nextReviewDate = nextDate
    }

    setWords(updatedWords)
    setStats((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }))

    setIsChecking(false)
  }

  const nextWord = () => {
    if (currentIndex >= words.length - 1) {
      setIsComplete(true)
      return
    }

    const updatedWords = [...words]
    updatedWords[currentIndex + 1].state = "current"
    setWords(updatedWords)

    setCurrentIndex((prev) => prev + 1)
    setUserSentence("")
    setFeedback(null)
  }

  const currentWord = words[currentIndex]

  if (isComplete) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Practice Complete!</CardTitle>
              <CardDescription>You've completed your vocabulary practice session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">{Math.round((stats.correct / stats.total) * 100)}%</div>
                <p className="text-muted-foreground">Accuracy</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Words Practiced</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Correct</span>
                  <span className="font-medium text-green-500">{stats.correct}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Incorrect</span>
                  <span className="font-medium text-red-500">{stats.incorrect}</span>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Based on your performance, we've scheduled your next reviews using spaced repetition.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => (window.location.href = "/vocabulary")}>Return to Vocabulary</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Practice Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vocabulary Practice</h1>
            <p className="text-muted-foreground mt-1">{bankName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {words.length}
            </span>
            <Progress value={((currentIndex + 1) / words.length) * 100} className="w-24" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{currentWord?.word}</CardTitle>
            <CardDescription>Create a sentence using this word to demonstrate your understanding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="font-medium">Definition</p>
              <p className="text-muted-foreground">{currentWord?.definition}</p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Chinese Translation</p>
              <p className="text-muted-foreground">{currentWord?.translation}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="sentence" className="font-medium">
                Your Sentence
              </label>
              <Textarea
                id="sentence"
                placeholder="Write a sentence using this word..."
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                disabled={!!feedback || isChecking}
                className="min-h-[100px]"
              />
            </div>

            {feedback && (
              <div
                className={`p-4 rounded-md ${feedback.isCorrect ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
              >
                <div className="flex items-start gap-2">
                  {feedback.isCorrect ? (
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{feedback.isCorrect ? "Correct!" : "Not quite right"}</p>
                    <p className="text-sm mt-1">{feedback.message}</p>
                    {!feedback.isCorrect && (
                      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <p className="text-sm font-medium">Example:</p>
                        <p className="text-sm mt-1">{currentWord?.sampleSentence}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {!feedback ? (
              <Button onClick={checkAnswer} disabled={!userSentence.trim() || isChecking}>
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : (
                  "Check Answer"
                )}
              </Button>
            ) : (
              <Button onClick={nextWord}>
                Next Word
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
