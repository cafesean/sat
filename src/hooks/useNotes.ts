import { addNote, deleteNote, getNotesByWord, Note, updateNote } from '@/lib/storage';
import { useEffect, useState } from 'react';

export function useNotes(wordId: string) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchLocal() {
      setIsLoading(true);
      try {
        const localNotes = await getNotesByWord(wordId);
        if (!cancelled) {
          setNotes(localNotes);
          setIsLoading(false);
        }
      } catch (e) {
        setError('Failed to load local notes');
        setIsLoading(false);
      }
    }
    if (wordId) fetchLocal();
    return () => { cancelled = true; };
  }, [wordId]);

  // Mutations (write to IndexedDB first)
  const add = async (note: Note) => {
    await addNote(note);
    setNotes((prev) => prev ? [...prev, note] : [note]);
  };
  const update = async (note: Note) => {
    await updateNote(note);
    setNotes((prev) => prev ? prev.map(n => n.id === note.id ? note : n) : [note]);
  };
  const remove = async (noteId: string) => {
    await deleteNote(noteId);
    setNotes((prev) => prev ? prev.filter(n => n.id !== noteId) : null);
  };

  return { notes, isLoading, error, add, update, remove };
}
