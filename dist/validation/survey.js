"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSurvey = void 0;
const zod_1 = require("zod");
const questionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['text', 'multipleChoice', 'checkbox', 'rating']),
    text: zod_1.z.string(),
    options: zod_1.z.array(zod_1.z.string()).optional(),
});
const logicPredicateSchema = zod_1.z.object({
    questionId: zod_1.z.string(),
    operator: zod_1.z.enum(['equals', 'not_equals', 'contains']),
    value: zod_1.z.string(),
});
const blockSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string().optional(),
    questions: zod_1.z.array(questionSchema),
    displayLogic: zod_1.z.array(logicPredicateSchema).optional(),
});
const pageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string().optional(),
    blocks: zod_1.z.array(blockSchema),
});
const surveySchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    pages: zod_1.z.array(pageSchema),
});
const validateSurvey = (survey) => {
    const result = surveySchema.safeParse(survey);
    if (result.success) {
        return { success: true, data: result.data };
    }
    else {
        return { success: false, errors: result.error };
    }
};
exports.validateSurvey = validateSurvey;
