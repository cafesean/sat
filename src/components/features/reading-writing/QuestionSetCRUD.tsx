import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import type { Question, QuestionSet } from '../../../types/session-types';

interface QuestionSetCRUDProps {
  initialQuestionSets: QuestionSet[];
  onCreate: (questionSet: Omit<QuestionSet, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (questionSet: QuestionSet) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function QuestionSetCRUD({ 
  initialQuestionSets, 
  onCreate, 
  onUpdate, 
  onDelete 
}: QuestionSetCRUDProps) {
  const [questionSets, setQuestionSets] = useState(initialQuestionSets);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newSet = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      difficultyId: formData.get('difficultyId') as string,
      isPublic: formData.get('isPublic') === 'on',
      creatorId: '', // Will be filled by parent
      questions: [] as Question[]
    };

    try {
      setIsLoading(true);
      await onCreate(newSet);
      toast({ title: 'Success', description: 'Question set created' });
      setIsCreating(false);
      form.reset();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create question set',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updatedSet = {
      ...editingSet,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      difficultyId: formData.get('difficultyId') as string,
      isPublic: formData.get('isPublic') === 'on'
    };

    try {
      setIsLoading(true);
      await onUpdate(updatedSet);
      toast({ title: 'Success', description: 'Question set updated' });
      setEditingSet(null);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update question set',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      await onDelete(id);
      toast({ title: 'Success', description: 'Question set deleted' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to delete question set',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Question Sets</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Create New
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">Create Question Set</h3>
          <div className="space-y-2">
            <label className="block">
              Title*
              <input
                name="title"
                type="text"
                required
                className="w-full p-2 border rounded"
              />
            </label>
            <label className="block">
              Description
              <textarea
                name="description"
                className="w-full p-2 border rounded"
                rows={3}
              />
            </label>
            <label className="block">
              Difficulty ID*
              <input
                name="difficultyId"
                type="text"
                required
                className="w-full p-2 border rounded"
              />
            </label>
            <label className="flex items-center space-x-2">
              <input
                name="isPublic"
                type="checkbox"
                className="rounded"
              />
              <span>Public</span>
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {editingSet && (
        <form onSubmit={handleUpdate} className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">Edit Question Set</h3>
          <div className="space-y-2">
            <label className="block">
              Title*
              <input
                name="title"
                type="text"
                defaultValue={editingSet.title}
                required
                className="w-full p-2 border rounded"
              />
            </label>
            <label className="block">
              Description
              <textarea
                name="description"
                defaultValue={editingSet.description || ''}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </label>
            <label className="block">
              Difficulty ID*
              <input
                name="difficultyId"
                type="text"
                defaultValue={editingSet.difficultyId}
                required
                className="w-full p-2 border rounded"
              />
            </label>
            <label className="flex items-center space-x-2">
              <input
                name="isPublic"
                type="checkbox"
                defaultChecked={editingSet.isPublic}
                className="rounded"
              />
              <span>Public</span>
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setEditingSet(null)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {questionSets.map((set) => (
          <div key={set.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{set.title}</h3>
                {set.description && <p className="text-sm text-muted-foreground">{set.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(set.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingSet(set)}
                  className="px-3 py-1 text-sm border rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(set.id)}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}