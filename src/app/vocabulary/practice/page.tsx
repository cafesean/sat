"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AppRouter } from "@/server/api/root"; // Import AppRouter type
import { api, type RouterOutputs } from "@/utils/trpc"; // Import correct tRPC hook and types
import type { TRPCClientErrorLike } from "@trpc/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Mock data for word bank selection (replace with actual data fetching)
const mockWordBanks = [
  { id: "bank1", name: "SAT Common Words" },
  { id: "bank2", name: "Advanced Vocab" },
  // Add more banks as needed
];

export default function VocabularyPracticeSetupPage() {
  const router = useRouter();
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Define types for mutation callbacks
  type StartSessionOutput = RouterOutputs["vocab"]["startVocabSession"];
  type StartSessionError = TRPCClientErrorLike<AppRouter>;

  // tRPC mutation hook for starting a session
  const startSessionMutation = api.vocab.startVocabSession.useMutation({
    onSuccess: (data: StartSessionOutput) => {
      // Redirect to the dynamic practice session page
      router.push(`/vocabulary/practice/${data.practiceSessionId}`);
    },
    onError: (error: StartSessionError) => {
      console.error("Failed to start practice session:", error);
      setError(error.message || "Failed to start practice session. Please try again.");
    },
  });

  const handleCheckboxChange = (bankId: string, checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedBankIds((prev) => [...prev, bankId]);
    } else {
      setSelectedBankIds((prev) => prev.filter((id) => id !== bankId));
    }
  };

  const handleStartPractice = () => {
    setError(null); // Clear previous errors
    if (selectedBankIds.length === 0) {
      setError("Please select at least one word bank to practice.");
      return;
    }
    startSessionMutation.mutate({ wordBankIds: selectedBankIds });
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Practice Setup</CardTitle>
            <CardDescription>Select the word banks you want to include in your practice session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label className="font-medium">Select Word Banks:</Label>
              {/* TODO: Replace mockWordBanks with data fetched using trpc.vocab.listWordBanks.useQuery */}
              {mockWordBanks.map((bank) => (
                <div key={bank.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bank-${bank.id}`}
                    checked={selectedBankIds.includes(bank.id)}
                    onCheckedChange={(checked) => handleCheckboxChange(bank.id, checked)}
                    disabled={startSessionMutation.isPending}
                  />
                  <Label htmlFor={`bank-${bank.id}`} className="cursor-pointer">
                    {bank.name}
                  </Label>
                </div>
              ))}
              {mockWordBanks.length === 0 && (
                 <p className="text-sm text-muted-foreground">You haven't created any word banks yet.</p>
                 // TODO: Add link to create word bank page
              )}
            </div>

            <Button
              onClick={handleStartPractice}
              disabled={selectedBankIds.length === 0 || startSessionMutation.isPending}
              className="w-full"
            >
              {startSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Session...
                </>
              ) : (
                "Start Practice"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
