const { validateSurvey } = require('../public/js/compositeValidator');

describe('Composite Validator', () => {
    let survey;

    beforeEach(() => {
        survey = {
            id: 'survey-1',
            title: 'Test Survey',
            pages: [
                {
                    id: 'page-1',
                    title: 'Page 1',
                    blocks: [
                        {
                            id: 'block-1',
                            questions: [
                                { id: 'q1', type: 'text', text: 'Question 1' }
                            ]
                        }
                    ]
                }
            ]
        };
    });

    test('should pass a valid survey', () => {
        const result = validateSurvey(survey);
        expect(result.success).toBe(true);
    });

    test('should fail a survey with a schema error', () => {
        survey.pages[0].blocks[0].questions[0].type = 'invalid-type';
        const result = validateSurvey(survey);
        expect(result.success).toBe(false);
        expect(result.errors[0].message).toBe("Invalid option: expected one of \"text\"|\"multipleChoice\"|\"checkbox\"|\"rating\"|\"matrix-single\"|\"matrix-multi\"|\"ranking\"|\"file-upload\"|\"consent-checkbox\"");
    });

    test('should fail a survey with a circular dependency', () => {
        survey.pages.push({
            id: 'page-2',
            title: 'Page 2',
            blocks: [],
            nextPage: 'page-1'
        });
        survey.pages[0].nextPage = 'page-2';
        const result = validateSurvey(survey);
        expect(result.success).toBe(false);
        expect(result.errors[0].message).toBe('Circular dependency detected in page logic.');
    });

    test('should fail a survey with a dangling reference', () => {
        survey.pages[0].blocks[0].displayLogic = [{ questionId: 'q2', operator: 'equals', value: 'a' }];
        const result = validateSurvey(survey);
        expect(result.success).toBe(false);
        expect(result.errors[0].message).toBe("Dangling reference: question with id 'q2' not found.");
    });

    test('should return a warning for a required but hidden question', () => {
        survey.pages[0].blocks[0].displayLogic = [{ questionId: 'q1', operator: 'equals', value: 'a' }];
        survey.pages[0].blocks[0].questions[0].required = true;
        const result = validateSurvey(survey);
        expect(result.success).toBe(true);
        expect(result.warnings[0].message).toBe("Question 'Question 1' is required but may be hidden by page logic.");
    });
});
