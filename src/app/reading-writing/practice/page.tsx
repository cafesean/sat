"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useState } from "react";

// Mock data for the demo
const mockQuestions = [
  {
    id: 1,
    type: "reading",
    passage: `The concept of "wilderness" in America has evolved significantly over time. In the early days of European settlement, wilderness was viewed as something to be tamed and conquered. It represented danger, chaos, and a barrier to progress. However, by the late 19th century, as industrialization rapidly transformed the landscape, attitudes began to shift. Figures like John Muir began to advocate for the preservation of wild spaces, arguing that wilderness had intrinsic value beyond its utility for human exploitation. This perspective gained traction throughout the 20th century, culminating in the Wilderness Act of 1964, which formally defined wilderness as "an area where the earth and its community of life are untrammeled by man, where man himself is a visitor who does not remain." Today, wilderness areas are protected for their ecological, recreational, and spiritual values, representing a dramatic reversal from earlier perspectives.`,
    question:
      "Based on the passage, which of the following best describes the shift in American attitudes toward wilderness?",
    options: [
      "From viewing wilderness as a resource to be exploited to seeing it as having intrinsic value",
      "From fearing wilderness to using it primarily for recreation",
      "From a scientific understanding to a more spiritual appreciation",
      "From government regulation to private conservation efforts",
    ],
    correctAnswer: 0,
    explanation:
      'The passage describes how wilderness was initially viewed as "something to be tamed and conquered" and "a barrier to progress," but later came to be valued for its "ecological, recreational, and spiritual values" with "intrinsic value beyond its utility for human exploitation." This represents a shift from seeing wilderness as a resource to be used to recognizing its inherent worth.',
  },
  {
    id: 2,
    type: "grammar",
    passage:
      "The researchers, having collected data from over fifty different sites across the continent, was ready to publish their findings.",
    question: "Which correction should be made to the sentence?",
    options: [
      'Change "researchers" to "researcher"',
      'Change "having collected" to "collecting"',
      'Change "was" to "were"',
      'Change "their" to "its"',
    ],
    correctAnswer: 2,
    explanation:
      'The subject of the sentence is "researchers," which is plural. Therefore, the verb should be "were" (plural) rather than "was" (singular) to maintain subject-verb agreement.',
  },
  {
    id: 3,
    type: "vocabulary",
    passage:
      "The politician's equivocal statement on the controversial issue left both supporters and critics unsure of his actual position.",
    question: 'As used in the passage, "equivocal" most nearly means:',
    options: ["Forceful", "Ambiguous", "Thoughtful", "Incorrect"],
    correctAnswer: 1,
    explanation:
      '"Equivocal" means open to more than one interpretation; ambiguous or unclear. The context supports this meaning, as the statement left people "unsure of his actual position."',
  },
  {
    id: 4,
    type: "reading",
    passage: `Recent studies in neuroscience have begun to shed light on the biological basis of decision-making. Contrary to the traditional view that decisions are made through purely rational calculation, research suggests that emotions play a crucial role in the process. When individuals with damage to emotional processing centers of the brain are asked to make decisions, they often struggle despite maintaining normal intellectual abilities. This indicates that emotional responses, which may manifest as subtle physiological signals or "gut feelings," provide essential guidance for navigating choices. Furthermore, neuroimaging studies have revealed that successful decisions activate both emotional and rational brain networks in a complementary fashion. These findings have significant implications for fields ranging from economics to artificial intelligence, challenging models that treat decision-making as a purely logical process.`,
    question: "What is the main point of the passage?",
    options: [
      "Artificial intelligence should be programmed to simulate human emotions",
      "Traditional economic models are fundamentally flawed",
      "Emotions and rational thought both contribute to effective decision-making",
      "People with brain damage cannot make logical decisions",
    ],
    correctAnswer: 2,
    explanation:
      'The passage argues that contrary to traditional views of decision-making as "purely rational calculation," research shows that "emotions play a crucial role" and that "successful decisions activate both emotional and rational brain networks in a complementary fashion." The main point is that both emotional and rational processes contribute to decision-making.',
  },
  {
    id: 5,
    type: "grammar",
    passage: "Neither the principal nor the teachers was informed about the changes to the curriculum.",
    question: "Which correction should be made to the sentence?",
    options: [
      'Change "Neither" to "None"',
      'Change "nor" to "or"',
      'Change "was" to "were"',
      "No correction is necessary",
    ],
    correctAnswer: 3,
    explanation:
      'The sentence is correct as written. When "neither" is used with "nor" to connect singular subjects, the verb should be singular. "Neither the principal nor the teachers was informed" is grammatically correct because "neither" is the subject and takes a singular verb.',
  },
]

type PracticeState = "setup" | "practice" | "complete"

export default function ReadingWritingPracticePage() {
  const [state, setState] = useState<PracticeState>("setup")
  const [difficulty, setDifficulty] = useState(3)
  const [questionCount, setQuestionCount] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState<typeof mockQuestions>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showExplanation, setShowExplanation] = useState(false)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, total: 0 })

  const startPractice = async () => {
    setIsGenerating(true)

    // Simulate generating questions with AI
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real app, this would call an API to generate questions based on difficulty
    setQuestions(mockQuestions)
    setSelectedAnswers(new Array(mockQuestions.length).fill(-1))
    setStats({ correct: 0, incorrect: 0, total: mockQuestions.length })

    setIsGenerating(false)
    setState("practice")
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return

    const newAnswers = [...selectedAnswers]
    newAnswers[currentIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const checkAnswer = () => {
    if (selectedAnswers[currentIndex] === -1) return

    setShowExplanation(true)

    // Update stats
    const isCorrect = selectedAnswers[currentIndex] === questions[currentIndex].correctAnswer
    setStats((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }))
  }

  const nextQuestion = () => {
    if (currentIndex >= questions.length - 1) {
      setState("complete")
      return
    }

    setCurrentIndex((prev) => prev + 1)
    setShowExplanation(false)
  }

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setShowExplanation(false)
    }
  }

  const currentQuestion = questions[currentIndex]

  if (state === "setup") {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-8">Start Reading & Writing Practice</h1>

          <Card>
            <CardHeader>
              <CardTitle>Practice Settings</CardTitle>
              <CardDescription>
                Configure your practice session. Our AI will generate SAT-style questions based on your settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Difficulty Level: {difficulty}</h3>
                  <Slider
                    value={[difficulty]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={(value: number[]) => setDifficulty(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Easier</span>
                    <span>Harder</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Number of Questions: {questionCount}</h3>
                  <Slider
                    value={[questionCount]}
                    min={5}
                    max={20}
                    step={5}
                    onValueChange={(value: number[]) => setQuestionCount(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5</span>
                    <span>20</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Question Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="reading" className="rounded" defaultChecked />
                    <Label htmlFor="reading">Reading Comprehension</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="grammar" className="rounded" defaultChecked />
                    <Label htmlFor="grammar">Grammar & Usage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="vocabulary" className="rounded" defaultChecked />
                    <Label htmlFor="vocabulary">Vocabulary in Context</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="evidence" className="rounded" defaultChecked />
                    <Label htmlFor="evidence">Evidence-Based Reading</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={startPractice} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions
                  </>
                ) : (
                  "Start Practice Session"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  if (state === "complete") {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Practice Complete!</CardTitle>
              <CardDescription>You've completed your reading and writing practice session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">{Math.round((stats.correct / stats.total) * 100)}%</div>
                <p className="text-muted-foreground">Score</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Questions</span>
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
                  Your practice session has been saved. You can review your answers and explanations anytime.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => (window.location.href = "/reading-writing")}>Return to Reading & Writing</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setState("setup")
                  setCurrentIndex(0)
                  setShowExplanation(false)
                }}
              >
                New Practice Session
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <Progress value={((currentIndex + 1) / questions.length) * 100} className="w-24" />
          </div>
          <div className="text-sm font-medium">
            Score: {stats.correct}/{currentIndex + (showExplanation ? 1 : 0)}
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground uppercase tracking-wider">
                {currentQuestion?.type === "reading"
                  ? "Reading Comprehension"
                  : currentQuestion?.type === "grammar"
                    ? "Grammar & Usage"
                    : "Vocabulary in Context"}
              </div>

              <div className="bg-secondary/50 p-4 rounded-md">
                <p className="text-sm">{currentQuestion?.passage}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">{currentQuestion?.question}</h3>

                <RadioGroup
                  value={selectedAnswers[currentIndex].toString()}
                  onValueChange={(value: string) => handleAnswerSelect(Number.parseInt(value))}
                >
                  <div className="space-y-2">
                    {currentQuestion?.options.map((option, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-2 p-2 rounded-md ${
                          showExplanation && index === currentQuestion.correctAnswer
                            ? "bg-green-50 dark:bg-green-950"
                            : showExplanation &&
                                index === selectedAnswers[currentIndex] &&
                                index !== currentQuestion.correctAnswer
                              ? "bg-red-50 dark:bg-red-950"
                              : ""
                        }`}
                      >
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={showExplanation} />
                        <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                          {option}
                        </Label>
                        {showExplanation && index === currentQuestion.correctAnswer && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {showExplanation &&
                          index === selectedAnswers[currentIndex] &&
                          index !== currentQuestion.correctAnswer && <X className="h-4 w-4 text-red-500" />}
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {showExplanation && (
                <Alert className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  <AlertTitle>Explanation</AlertTitle>
                  <AlertDescription>{currentQuestion?.explanation}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevQuestion} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {!showExplanation ? (
            <Button onClick={checkAnswer} disabled={selectedAnswers[currentIndex] === -1}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion}>
              {currentIndex >= questions.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
