"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RouterOutputs } from "@/utils/trpc";
import { api } from "@/utils/trpc";
import { Loader2 } from "lucide-react";

type SharedWordBank = RouterOutputs["wordBank"]["getSharedWordBank"];

interface SharedWordBankViewProps {
  sharedWordBankId: string;
  onBack?: () => void;
}

export function SharedWordBankView({ sharedWordBankId, onBack }: SharedWordBankViewProps) {
  const {
    data: sharedWordBank,
    isLoading,
    error,
  } = api.wordBank.getSharedWordBank.useQuery({ sharedWordBankId });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Error loading word bank: {error.message}
        </p>
      </div>
    );
  }

  if (!sharedWordBank) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500">Word bank not found</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4">
            Back to group
          </Button>
        )}
        <h2 className="text-xl font-semibold">{sharedWordBank.wordBank.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {sharedWordBank.wordBank.words.length} words
        </p>
      </div>

      <div>
        <h3 className="font-medium mb-2">Words</h3>
        {sharedWordBank.wordBank.words.length ? (
          <div className="space-y-2">
            {sharedWordBank.wordBank.words.map((word) => (
              <div key={word.id} className="p-2 hover:bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span>{word.text}</span>
                  <span className="text-sm text-gray-500">{word.wordMaster?.wordType}</span>
                </div>
                {word.wordMaster?.definition && (
                  <p className="text-sm text-gray-600 mt-1">{word.wordMaster.definition}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No words in this word bank yet</p>
        )}
      </div>
    </Card>
  );
}