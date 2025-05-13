import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateRwContentSets } from "./gemini";
// Import the mocked module to access its exported mocks
import * as GoogleAI from '@google/generative-ai';

// Mock the GoogleGenerativeAI module
vi.mock('@google/generative-ai', async (importOriginal) => {
  const actual = await importOriginal() as any;
  // Define mocks inside the factory
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  const mockGoogleGenerativeAIConstructor = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

  return {
    ...actual,
    GoogleGenerativeAI: mockGoogleGenerativeAIConstructor,
    // Export the mock functions so they can be imported by the test file
    // These names are prefixed to avoid collision if the original module had similar exports.
    _mockGenerateContentInternal: mockGenerateContent,
    _mockGetGenerativeModelInternal: mockGetGenerativeModel,
    _mockGoogleGenerativeAIConstructorInternal: mockGoogleGenerativeAIConstructor,
    __esModule: true,
  };
});


// Mock the env module
vi.mock('@/env.mjs', () => ({
  env: {
    GEMINI_API_KEY: 'mock-api-key', // Default mock value
    GEMINI_MODEL_NAME: 'mock-model',
  },
  __esModule: true, // If env.mjs uses ES modules
}));

// Mock the schema file
vi.mock('@/schemas/readingWriting.schema', async () => {
  const { z: zodAlias } = await import("zod"); // Use an alias for z to avoid potential conflicts
  const MockContentSetSchemaInternal = zodAlias.object({
    passage: zodAlias.object({ content: zodAlias.string(), difficulty: zodAlias.number() }),
    questions: zodAlias.array(zodAlias.object({
      questionText: zodAlias.string(),
      type: zodAlias.enum(["MULTIPLE_CHOICE"]),
      options: zodAlias.array(zodAlias.object({ text: zodAlias.string() })),
      correctAnswer: zodAlias.string(),
      explanation: zodAlias.string().optional(),
      strategyTip: zodAlias.string().optional(),
    })),
  });
  return {
    ContentSetSchema: MockContentSetSchemaInternal,
    __esModule: true,
  };
});


describe("Gemini API Client", () => {
  // Destructure the exported mocks from the mocked GoogleAI module
  // These are the same functions as topLevelMock... but accessed via the module interface
  const {
    _mockGenerateContentInternal: mockGenerateContent,
    _mockGetGenerativeModelInternal: mockGetGenerativeModel,
    _mockGoogleGenerativeAIConstructorInternal: mockGoogleGenerativeAIConstructor
  } = GoogleAI as any;

  describe("generateRwContentSets", () => {
    beforeEach(async () => {
      mockGenerateContent.mockClear();
      mockGetGenerativeModel.mockClear();
      mockGoogleGenerativeAIConstructor.mockClear();

      const envModule = await import('@/env.mjs');
      (envModule.env as { GEMINI_API_KEY?: string; GEMINI_MODEL_NAME: string }).GEMINI_API_KEY = 'mock-api-key';
    });


    it("should call Gemini API with correct prompt and return validated content sets", async () => {
      const mockResponseText = `
        [{
          "passage": {
            "content": "Mock passage content.",
            "difficulty": 3
          },
          "questions": [{
            "questionText": "Mock question 1?",
            "type": "MULTIPLE_CHOICE",
            "options": [{"text": "A"}, {"text": "B"}],
            "correctAnswer": "A",
            "explanation": "Explanation 1",
            "strategyTip": "Tip 1"
          }]
        }]
      `;
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponseText,
        },
      });

      const difficultyLevel = 3;
      const numberOfSets = 1;

      const result = await generateRwContentSets(difficultyLevel, numberOfSets);

      expect(mockGoogleGenerativeAIConstructor).toHaveBeenCalledWith('mock-api-key');
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'mock-model' });
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining(`Generate ${numberOfSets} SAT-style Reading & Writing content sets at difficulty level ${difficultyLevel}.`)
              })
            ])
          })
        ]),
      }));

      expect(result).toEqual([{
        passage: {
          content: "Mock passage content.",
          difficulty: 3
        },
        questions: [{
          questionText: "Mock question 1?",
          type: "MULTIPLE_CHOICE",
          options: [{ text: "A" }, { text: "B" }],
          correctAnswer: "A",
          explanation: "Explanation 1",
          strategyTip: "Tip 1"
        }]
      }]);
    });

    it("should return null if API key is missing", async () => {
      const envModule = await import('@/env.mjs');
      (envModule.env as { GEMINI_API_KEY?: string }).GEMINI_API_KEY = undefined;

      const result = await generateRwContentSets(3, 1);

      expect(result).toBeNull();
      expect(mockGoogleGenerativeAIConstructor).not.toHaveBeenCalled();
    });

    it("should return null if API call fails", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API Error"));
      const result = await generateRwContentSets(3, 1);
      expect(result).toBeNull();
    });

    it("should return null if response is not valid JSON", async () => {
      const mockResponseText = "invalid json";
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponseText,
        },
      });
      const result = await generateRwContentSets(3, 1);
      expect(result).toBeNull();
    });

    it("should return null if response does not match schema", async () => {
      const mockResponseText = `
        [{
          "invalid_field": "..."
        }]
      `;
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponseText,
        },
      });
      const result = await generateRwContentSets(3, 1);
      expect(result).toBeNull();
    });
  });
});
