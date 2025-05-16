import {
  AnswerOptionSchema,
  ContentSetSchema,
  PassageSchema,
  QuestionSchema,
} from '@/schemas/readingWriting.schema';
import { describe, expect, it } from 'vitest';

describe('Reading/Writing Schemas', () => {
  describe('AnswerOptionSchema', () => {
    it('should validate a valid answer option', () => {
      const validOption = { text: 'Option A' };
      expect(() => AnswerOptionSchema.parse(validOption)).not.toThrow();
    });

    it('should invalidate an invalid answer option (missing text)', () => {
      const invalidOption = {};
      expect(() => AnswerOptionSchema.parse(invalidOption)).toThrow();
    });

    it('should invalidate an invalid answer option (text is not a string)', () => {
      const invalidOption = { text: 123 };
      expect(() => AnswerOptionSchema.parse(invalidOption)).toThrow();
    });
  });

  describe('QuestionSchema', () => {
    const validQuestion = {
      questionText: 'What is the main idea?',
      type: 'MULTIPLE_CHOICE',
      options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
      correctAnswer: 'A',
      explanation: 'Because...',
      strategyTip: 'Look for keywords.',
    };

    it('should validate a valid question', () => {
      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
    });

    it('should invalidate a question with missing required fields', () => {
      const invalidQuestion = {
        type: 'MULTIPLE_CHOICE',
        options: [{ text: 'A' }],
        correctAnswer: 'A',
      };
      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it('should invalidate a question with invalid option structure', () => {
      const invalidQuestion = {
        ...validQuestion,
        options: [{ text: 'A' }, { value: 'B' }], // Invalid option structure
      };
      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it('should validate a question without optional fields', () => {
      const questionWithoutOptional = {
        questionText: 'What is the main idea?',
        type: 'MULTIPLE_CHOICE',
        options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
        correctAnswer: 'A',
      };
      expect(() => QuestionSchema.parse(questionWithoutOptional)).not.toThrow();
    });
  });

  describe('PassageSchema', () => {
    it('should validate a valid passage', () => {
      const validPassage = { content: 'Passage text.', difficulty: 3 };
      expect(() => PassageSchema.parse(validPassage)).not.toThrow();
    });

    it('should invalidate a passage with missing required fields', () => {
      const invalidPassage = { difficulty: 3 };
      expect(() => PassageSchema.parse(invalidPassage)).toThrow();
    });

    it('should invalidate a passage with invalid difficulty (not an integer)', () => {
      const invalidPassage = { content: 'Passage text.', difficulty: 3.5 };
      expect(() => PassageSchema.parse(invalidPassage)).toThrow();
    });

    it('should invalidate a passage with invalid difficulty (less than 1)', () => {
      const invalidPassage = { content: 'Passage text.', difficulty: 0 };
      expect(() => PassageSchema.parse(invalidPassage)).toThrow();
    });
  });

  describe('ContentSetSchema', () => {
    const validContentSet = {
      passage: { content: 'Passage text.', difficulty: 3 },
      questions: [
        {
          questionText: 'Q1',
          type: 'MULTIPLE_CHOICE',
          options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
          correctAnswer: 'A',
        },
        {
          questionText: 'Q2',
          type: 'MULTIPLE_CHOICE',
          options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
          correctAnswer: 'B',
        },
        {
          questionText: 'Q3',
          type: 'MULTIPLE_CHOICE',
          options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
          correctAnswer: 'C',
        },
        {
          questionText: 'Q4',
          type: 'MULTIPLE_CHOICE',
          options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
          correctAnswer: 'D',
        },
        {
          questionText: 'Q5',
          type: 'MULTIPLE_CHOICE',
          options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
          correctAnswer: 'A',
        },
      ],
    };

    it('should validate a valid content set', () => {
      expect(() => ContentSetSchema.parse(validContentSet)).not.toThrow();
    });

    it('should invalidate a content set with missing passage', () => {
      const invalidSet = { questions: validContentSet.questions };
      expect(() => ContentSetSchema.parse(invalidSet)).toThrow();
    });

    it('should invalidate a content set with too few questions', () => {
      const invalidSet = {
        passage: validContentSet.passage,
        questions: validContentSet.questions.slice(0, 4), // Less than 5 questions
      };
      expect(() => ContentSetSchema.parse(invalidSet)).toThrow();
    });

    it('should invalidate a content set with too many questions', () => {
      const invalidSet = {
        passage: validContentSet.passage,
        questions: [...Array(11)].map(() => validContentSet.questions[0]), // Create 11 questions
      };
      expect(() => ContentSetSchema.parse(invalidSet)).toThrow("Content set cannot have more than 10 questions");
    });

    it('should invalidate a content set with invalid question structure', () => {
      const invalidSet = {
        passage: validContentSet.passage,
        questions: [
          ...validContentSet.questions,
          { questionText: 'Invalid Q', type: 'INVALID' }, // Invalid question
        ],
      };
      expect(() => ContentSetSchema.parse(invalidSet)).toThrow();
    });
  });
});