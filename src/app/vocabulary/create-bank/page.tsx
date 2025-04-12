import { WordBankForm } from '@/components/features/vocab/WordBankForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateWordBankPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Word Bank</CardTitle>
            <CardDescription>
              Organize your vocabulary by creating a new word bank. Give it a name and an optional description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WordBankForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
