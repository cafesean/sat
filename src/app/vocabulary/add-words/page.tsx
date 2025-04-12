"use client"

import type React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, type RouterOutputs } from "@/utils/trpc"; // Correct import and add types
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useState } from "react";

// Infer types for better type safety - Use correct procedure names from vocabRouter
type WordBankListOutput = RouterOutputs['vocab']['listWordBanks']
type WordAddBatchOutput = RouterOutputs['vocab']['addBatch']

export default function AddWordsPage() {
  const [wordBank, setWordBank] = useState("")
  const [wordText, setWordText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState("")

  // Fetch word banks - Use correct procedure name
  const { data: wordBanks, isLoading: isLoadingBanks } = api.vocab.listWordBanks.useQuery()

  // tRPC mutation for adding words - Use correct procedure name
  const addWordsMutation = api.vocab.addBatch.useMutation({
    onSuccess: (data: WordAddBatchOutput) => { // Add type annotation for data
      // Assuming the mutation returns the count of processed words
      setProcessedCount(data?.count ?? totalCount) // Use returned count or fallback
      setIsProcessing(false)
      setIsComplete(true)
    },
    onError: (error) => { // Type for error is inferred by tRPC
      setError(`Failed to add words: ${error.message}`)
      setIsProcessing(false)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wordBank) {
      setError("Please select a word bank")
      return
    }

    if (!wordText.trim()) {
      setError("Please enter some words")
      return
    }

    setError("")
    setIsProcessing(true)
    // Backend now handles parsing, just send the raw text
    // setTotalCount(wordText.split(/[\n,]/).filter(w => w.trim().length > 0).length); // Estimate count for UI if needed

    // Call the actual tRPC mutation with wordsText
    addWordsMutation.mutate({
      wordBankId: wordBank,
      wordsText: wordText, // Send raw text
    })
  }

  const resetForm = () => {
    setWordText("")
    setIsProcessing(false)
    setProcessedCount(0)
    setTotalCount(0)
    setIsComplete(false)
    setError("")
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Add Words to Your Word Bank</h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isComplete ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Processing Complete
              </CardTitle>
              <CardDescription>Successfully added {processedCount} words to your word bank</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                All words have been processed and added to your word bank. Each word has been enriched with definitions,
                sample sentences, and Chinese translations using AI.
              </p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={resetForm}>Add More Words</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/vocabulary")}>
                Return to Vocabulary
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Add Words</CardTitle>
                <CardDescription>
                  Paste a list of words to add to your word bank. Each word will be processed with AI to generate
                  definitions, sample sentences, and Chinese translations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word-bank">Select Word Bank</Label>
                  <Select value={wordBank} onValueChange={setWordBank}>
                    <SelectTrigger id="word-bank" disabled={isLoadingBanks || isProcessing}>
                      <SelectValue placeholder={isLoadingBanks ? "Loading banks..." : "Select a word bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {wordBanks && wordBanks.length > 0 ? (
                        wordBanks.map((bank: WordBankListOutput[number]) => ( // Add type annotation for bank
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-banks" disabled>
                          No word banks found. Create one first.
                        </SelectItem>
                      )}
                      {/* Consider adding a "Create New" item that triggers a modal */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="words">Words</Label>
                  <Textarea
                    id="words"
                    placeholder="Enter words separated by commas or new lines..."
                    className="min-h-[200px]"
                    value={wordText}
                    onChange={(e) => setWordText(e.target.value)}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">Example: ephemeral, ubiquitous, pernicious, etc.</p>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing words with AI...</span>
                      <span>
                        {processedCount} of {totalCount}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(processedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    "Process Words"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </div>
    </main>
  )
}
