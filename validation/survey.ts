import { z } from 'zod';
import { Survey } from '../types/survey';

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'multipleChoice', 'checkbox', 'rating']),
  text: z.string(),
  options: z.array(z.string()).optional(),
});

const logicPredicateSchema = z.object({
  questionId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains']),
  value: z.string(),
});

const blockSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  questions: z.array(questionSchema),
  displayLogic: z.array(logicPredicateSchema).optional(),
});

const pageSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  blocks: z.array(blockSchema),
});

const surveySchema = z.object({
  id: z.string(),
  title: z.string(),
  pages: z.array(pageSchema),
});

export const CreateSurveySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
});

export const validateSurvey = (survey: unknown): { success: true; data: Survey } | { success: false; errors: z.ZodError } => {
  const result = surveySchema.safeParse(survey);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
};
