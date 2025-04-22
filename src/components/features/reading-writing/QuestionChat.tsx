import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import { type QuestionChat } from '../../../types/session-types';

interface QuestionChatProps {
  questionId: string;
  userId: string;
  initialMessages?: QuestionChat[];
  onSendMessage: (message: string) => Promise<void>;
  onAiResponse?: (question: string) => Promise<string>;
}

export function QuestionChat({ 
  questionId,
  userId,
  initialMessages = [],
  onSendMessage,
  onAiResponse
}: QuestionChatProps) {
  const [messages, setMessages] = useState<QuestionChat[]>(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      
      // Add user message immediately
      const userMessage: QuestionChat = {
        id: Date.now().toString(),
        questionId,
        userId,
        message: newMessage,
        isAi: false,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      
      // Send to server
      await onSendMessage(newMessage);

      // If AI response is enabled, get and display it
      if (onAiResponse) {
        const aiResponse = await onAiResponse(newMessage);
        const aiMessage: QuestionChat = {
          id: Date.now().toString(),
          questionId,
          userId: 'ai',
          message: aiResponse,
          isAi: true,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg h-96 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Question Discussion</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No messages yet. Start the discussion!
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                  message.userId === userId
                    ? 'bg-primary text-primary-foreground'
                    : message.isAi
                    ? 'bg-muted'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <p>{message.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.isAi ? 'AI' : 'You'} •{' '}
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}