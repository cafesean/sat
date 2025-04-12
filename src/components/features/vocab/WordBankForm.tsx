'use client'

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Re-import Textarea
import { useToast } from '@/hooks/use-toast'; // Use Shadcn toast
import { api } from '@/utils/trpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Define Zod schema for validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Word bank name must be at least 2 characters.',
  }),
  description: z.string().optional(),
})

type WordBankFormValues = z.infer<typeof formSchema>

// Define props, including optional initial data for editing
interface WordBankFormProps {
  initialData?: {
    id: string
    name: string
    description?: string | null
  }
  onSuccess?: () => void // Callback on successful submission
}

export const WordBankForm: React.FC<WordBankFormProps> = ({ initialData, onSuccess }) => {
  const router = useRouter()
  const { toast } = useToast()
  const utils = api.useUtils() // For invalidating queries

  // Initialize react-hook-form
  const form = useForm<WordBankFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
    },
  })

  // tRPC mutation for creating a word bank
  const createMutation = api.vocab.createWordBank.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success!',
        description: `Word bank "${data.name}" created successfully.`,
      })
      utils.vocab.listWordBanks.invalidate() // Invalidate list query to refresh
      form.reset() // Reset form fields
      onSuccess?.() // Call success callback if provided
      router.push('/vocabulary') // Redirect back to the main vocab page
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create word bank: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // tRPC mutation for updating a word bank
  const updateMutation = api.vocab.update.useMutation({
     onSuccess: (data) => {
       toast({
         title: 'Success!',
         description: `Word bank "${data.name}" updated successfully.`,
       })
       utils.vocab.listWordBanks.invalidate() // Invalidate list query to refresh
       // Optionally invalidate getById if needed elsewhere: utils.vocab.getById.invalidate({ id: data.id })
       onSuccess?.() // Call success callback if provided
       router.push('/vocabulary') // Redirect back to the main vocab page
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: `Failed to update word bank: ${error.message}`,
         variant: 'destructive',
       })
     },
   })


  const onSubmit = (values: WordBankFormValues) => {
    // If editing, call update mutation, otherwise call create
    if (initialData) {
      // Call update mutation here (to be implemented)
      // Call update mutation here
      updateMutation.mutate({
        id: initialData.id, // Include the ID for update
        ...values, // Spread the form values (name, description)
      })
    } else {
      console.log('Submitting createWordBank with values:', values); // Log values before mutation
      createMutation.mutate(values)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending; // Check both mutations

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Word Bank Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., SAT High Frequency" {...field} disabled={isPending} />
              </FormControl>
              <FormDescription>A descriptive name for your word bank.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Words commonly found in the SAT reading section" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Button Row */}
        <div className="flex justify-end gap-2">
          {/* Cancel Button */}
          <Button
            type="button" // Important: type="button" to prevent form submission
            variant="outline"
            onClick={() => router.back()} // Go back to previous page
            disabled={isPending}
          >
            Cancel
          </Button>
          {/* Submit Button (Existing) */}
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialData ? 'Saving...' : 'Creating...'}
            </>
          ) : initialData ? (
            'Save Changes'
          ) : (
              'Create Word Bank'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
