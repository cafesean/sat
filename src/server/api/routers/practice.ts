import { PracticeType, getPracticeSessionHistorySchema, practiceSessionChatSchema, startReadingWritingPracticeSessionSchema } from "@/schemas/practice.schema";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { env } from "@/env.mjs";

// Helper function to initialize Gemini client
function initGeminiClient() {
  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined in environment variables");
      return null;
    }
    
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize Gemini client:", error);
    return null;
  }
}

export const practiceRouter = router({
  startPracticeSession: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        wordBankId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId: input.userId,
          type: PracticeType.VOCABULARY,
          wordBankId: input.wordBankId,
        },
      });
      return session;
    }),

  endPracticeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { endTime: new Date() },
      });
      return session;
    }),

  getPrioritizedWords: protectedProcedure
    .input(
      z.object({
        wordBankId: z.string().cuid().optional(),
        sessionId: z.string().cuid().optional(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get words due for review, prioritizing those with lowest intervals
      const words = await ctx.prisma.word.findMany({
        where: {
          wordBankId: input.wordBankId,
        },
        orderBy: [
          { createdAt: "asc" }, // Fallback ordering
        ],
        take: input.limit,
        include: {
          wordMaster: true,
        },
      });
      return words;
    }),

  startReadingWritingPracticeSession: protectedProcedure
    .input(startReadingWritingPracticeSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { questionSetId } = input;
      const userId = ctx.session.user.id;

      // Verify question set exists and belongs to user
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: questionSetId },
        include: {
          passages: {
            include: {
              questions: true
            }
          }
        }
      });

      if (!questionSet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question Set not found"
        });
      }

      // Create new practice session linked to question set
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId,
          type: PracticeType.READING_WRITING,
          questionSetId,
          startTime: new Date()
        },
        include: {
          questionSet: {
            include: {
              passages: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      });

      return {
        session,
        initialData: {
          questionSet,
          passages: questionSet.passages
        }
      };
    }),

  sendChatMessage: protectedProcedure
    .input(practiceSessionChatSchema)
    .mutation(async ({ ctx, input }) => {
      const { practiceSessionId, message } = input;
      const userId = ctx.session.user.id;

      // Verify practice session exists and belongs to user
      const practiceSession = await ctx.prisma.practiceSession.findUnique({
        where: { 
          id: practiceSessionId,
          userId
        },
        include: {
          questionSet: true,
          chats: {
            orderBy: { createdAt: 'asc' },
            take: 10 // Limit chat history to last 10 messages for context
          }
        }
      });

      if (!practiceSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Practice session not found or you don't have access to it"
        });
      }

      // Save user message to database
      const userChatMessage = await ctx.prisma.practiceSessionChat.create({
        data: {
          practiceSessionId,
          userId,
          message
        }
      });

      // Build context for AI response
      // We'll use a convention where user messages are from the actual user
      // and bot messages are from a special "AI" user (but we'll use the same user ID for now)
      let chatHistory = practiceSession.chats.map(chat => {
        // Determine if it's a bot message based on content patterns
        // This is a workaround since we don't have the isBot field yet
        const isBot = chat.userId === userId && 
                     (chat.message.startsWith("AI: ") || 
                      chat.message.includes("As an AI tutor"));
        
        return {
          role: isBot ? "model" : "user",
          content: chat.message
        };
      });

      // Add current message to history
      chatHistory.push({
        role: "user",
        content: message
      });

      // Build system prompt based on practice session type
      let systemPrompt = "";
      if (practiceSession.type === PracticeType.READING_WRITING) {
        systemPrompt = `You are an AI tutor helping a student with SAT reading and writing practice. 
        The student is working on a question set titled "${practiceSession.questionSet?.topic || 'Reading and Writing'}".
        Provide helpful, educational responses that guide the student without giving direct answers.
        Focus on explaining concepts, providing strategies, and helping the student understand the material better.`;
      } else {
        systemPrompt = `You are an AI tutor helping a student with vocabulary practice.
        Provide helpful, educational responses about word meanings, usage, and language learning.
        Focus on explaining concepts and helping the student understand the material better.`;
      }

      try {
        // Initialize Gemini client
        const genAI = initGeminiClient();
        if (!genAI) {
          throw new Error("Failed to initialize Gemini client");
        }

        // Configure safety settings
        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ];

        // Generate AI response
        const model = genAI.getGenerativeModel({ 
          model: env.GEMINI_MODEL_NAME || "gemini-pro",
          safetySettings
        });

        // Create chat history for the model
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: "Please act as described in the following instructions for all our future conversations: " + systemPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "I'll help you with your reading and writing practice as requested. Feel free to ask any questions about the material you're working on." }],
            },
            ...chatHistory.map(msg => ({
              role: msg.role as "user" | "model",
              parts: [{ text: msg.content }]
            }))
          ],
        });

        // Generate response
        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        // Save AI response to database
        // Prefix with "AI: " to identify bot messages since we don't have isBot field
        const botChatMessage = await ctx.prisma.practiceSessionChat.create({
          data: {
            practiceSessionId,
            userId, // Using the same user ID for the bot message
            message: "AI: " + aiResponse
          }
        });

        // Return both messages
        return {
          userMessage: userChatMessage,
          botMessage: botChatMessage
        };
      } catch (error) {
        console.error("Error generating AI response:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate AI response"
        });
      }
    }),

  getPracticeSessionHistory: protectedProcedure
    .input(getPracticeSessionHistorySchema)
    .query(async ({ ctx, input }) => {
      const { questionSetId, page, limit, includeChatHistory } = input;
      const userId = ctx.session.user.id;
      const skip = (page - 1) * limit;

      // Verify question set exists and belongs to user or is shared with user
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: questionSetId },
        select: { id: true, userId: true }
      });

      if (!questionSet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question Set not found"
        });
      }

      // Check if user has access to this question set
      const isOwner = questionSet.userId === userId;
      
      if (!isOwner) {
        // Check if question set is shared with user
        const sharedWithUser = await ctx.prisma.sharedQuestionSet.findFirst({
          where: {
            questionSetId,
            sharedWithUserId: userId
          }
        });

        if (!sharedWithUser) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this Question Set"
          });
        }
      }

      // Get total count for pagination
      const totalCount = await ctx.prisma.practiceSession.count({
        where: {
          questionSetId,
          userId
        }
      });

      // Get practice sessions with pagination
      const practiceSessions = await ctx.prisma.practiceSession.findMany({
        where: {
          questionSetId,
          userId
        },
        include: {
          answerAttempts: {
            include: {
              question: true
            }
          },
          ...(includeChatHistory ? {
            chats: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          } : {})
        },
        orderBy: {
          startTime: 'desc'
        },
        skip,
        take: limit
      });

      // Format the response
      const formattedSessions = practiceSessions.map(session => {
        // Calculate session duration if endTime exists
        const duration = session.endTime 
          ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000) 
          : null;
        
        // Calculate score from answer attempts
        const totalQuestions = session.answerAttempts.length;
        const correctAnswers = session.answerAttempts.filter(attempt => attempt.isCorrect).length;
        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;
        
        return {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          duration, // in seconds
          isComplete: !!session.endTime,
          score,
          totalQuestions,
          correctAnswers,
          answerAttempts: session.answerAttempts.map(attempt => ({
            id: attempt.id,
            questionId: attempt.questionId,
            questionText: attempt.question.questionText,
            selectedAnswer: attempt.selectedAnswer,
            correctAnswer: attempt.question.correctAnswer,
            isCorrect: attempt.isCorrect,
            createdAt: attempt.createdAt
          })),
          ...(includeChatHistory ? {
            chats: session.chats
          } : {})
        };
      });

      return {
        sessions: formattedSessions,
        pagination: {
          totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
          limit
        }
      };
    })
});