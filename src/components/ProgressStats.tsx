'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/utils/trpc';

export function ProgressStats({ userId }: { userId: string }) {
  const { data: stats } = api.vocab.getPracticeStats.useQuery({ userId })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Vocabulary Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.totalWords || 0}</p>
            <p className="text-sm text-muted-foreground">Total Words</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.sessionsCompleted || 0}</p>
            <p className="text-sm text-muted-foreground">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.masteredWords || 0}</p>
            <p className="text-sm text-muted-foreground">Mastered</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
