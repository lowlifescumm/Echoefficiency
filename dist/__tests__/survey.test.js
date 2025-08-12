"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const survey_1 = require("../validation/survey");
const validSurvey = {
    id: 'survey1',
    title: 'Customer Feedback Survey',
    pages: [
        {
            id: 'page1',
            title: 'Page 1',
            blocks: [
                {
                    id: 'block1',
                    title: 'Block 1',
                    questions: [
                        {
                            id: 'q1',
                            type: 'text',
                            text: 'What is your name?',
                        },
                        {
                            id: 'q2',
                            type: 'rating',
                            text: 'How would you rate our service?',
                        },
                    ],
                },
            ],
        },
    ],
};
const invalidSurvey = {
    id: 'survey2',
    title: 'Invalid Survey',
    pages: [
        {
            id: 'page1',
            blocks: [
                {
                    id: 'block1',
                    questions: [
                        {
                            id: 'q1',
                            type: 'invalidType', // Invalid type
                            text: 'This question has an invalid type.',
                        },
                    ],
                },
            ],
        },
    ],
};
describe('validateSurvey', () => {
    it('should return success for a valid survey', () => {
        const result = (0, survey_1.validateSurvey)(validSurvey);
        expect(result.success).toBe(true);
    });
    it('should return errors for an invalid survey', () => {
        const result = (0, survey_1.validateSurvey)(invalidSurvey);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors.issues).toHaveLength(1);
            expect(result.errors.issues[0].path).toEqual(['pages', 0, 'blocks', 0, 'questions', 0, 'type']);
        }
    });
});
