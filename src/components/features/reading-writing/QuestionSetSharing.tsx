import { useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import type { QuestionSet } from '../../../types/session-types';

interface QuestionSetSharingProps {
  questionSet: QuestionSet;
  onShare: (shareData: {
    questionSetId: string;
    shareLink?: string;
    sharedWithGroupId?: string;
    sharedWithUserId?: string;
  }) => Promise<void>;
  groups?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; name: string }>;
}

export function QuestionSetSharing({ 
  questionSet, 
  onShare,
  groups = [],
  users = []
}: QuestionSetSharingProps) {
  const [shareMode, setShareMode] = useState<'link' | 'group' | 'user'>('link');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      setIsLoading(true);
      
      const shareData = {
        questionSetId: questionSet.id,
        ...(shareMode === 'link' && { shareLink: `${window.location.origin}/share/${questionSet.id}` }),
        ...(shareMode === 'group' && { sharedWithGroupId: selectedGroup }),
        ...(shareMode === 'user' && { sharedWithUserId: selectedUser })
      };

      await onShare(shareData);
      
      toast({
        title: 'Success',
        description: `Question set shared successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to share question set',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Share "{questionSet.title}"</h3>
      
      <div className="flex space-x-2">
        <button
          onClick={() => setShareMode('link')}
          className={`px-3 py-1 rounded ${shareMode === 'link' ? 'bg-primary text-primary-foreground' : 'border'}`}
        >
          Share Link
        </button>
        {groups.length > 0 && (
          <button
            onClick={() => setShareMode('group')}
            className={`px-3 py-1 rounded ${shareMode === 'group' ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            Share with Group
          </button>
        )}
        {users.length > 0 && (
          <button
            onClick={() => setShareMode('user')}
            className={`px-3 py-1 rounded ${shareMode === 'user' ? 'bg-primary text-primary-foreground' : 'border'}`}
          >
            Share with User
          </button>
        )}
      </div>

      {shareMode === 'link' && (
        <div className="space-y-2">
          <p className="text-sm">Anyone with this link can access the question set:</p>
          <div className="p-2 bg-muted rounded text-sm break-all">
            {`${window.location.origin}/share/${questionSet.id}`}
          </div>
        </div>
      )}

      {shareMode === 'group' && groups.length > 0 && (
        <div className="space-y-2">
          <label className="block">
            Select Group
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {shareMode === 'user' && users.length > 0 && (
        <div className="space-y-2">
          <label className="block">
            Select User
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        onClick={handleShare}
        disabled={
          isLoading || 
          (shareMode === 'group' && !selectedGroup) ||
          (shareMode === 'user' && !selectedUser)
        }
        className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        {isLoading ? 'Sharing...' : 'Share'}
      </button>
    </div>
  );
}