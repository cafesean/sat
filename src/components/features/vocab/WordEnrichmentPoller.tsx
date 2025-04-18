'use client'

import { useWordEnrichmentStore } from '@/store/wordEnrichmentStore'
import { useEffect } from 'react'
import { api } from '@/utils/trpc'

interface WordEnrichmentPollerProps {
  bankId: string
}

/**
 * Background component that polls for updates to pending word enrichments
 * This component doesn't render anything visible
 */
export function WordEnrichmentPoller({ bankId }: WordEnrichmentPollerProps) {
  const pollPendingWords = useWordEnrichmentStore(state => state.pollPendingWords)
  // Get utils properly from the React component context
  const utils = api.useUtils()
  
  useEffect(() => {
    // Check immediately on mount - pass utils as parameter
    pollPendingWords(bankId, utils).catch(console.error)
    
    // Then set up a polling interval (every 10 seconds - appropriate for infrequent operations)
    const intervalId = setInterval(() => {
      pollPendingWords(bankId, utils).catch(console.error)
    }, 10000)
    
    return () => clearInterval(intervalId)
  }, [bankId, pollPendingWords, utils]) // Add utils to dependencies
  
  // This component doesn't render anything
  return null
} 