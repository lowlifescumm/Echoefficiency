const request = require('supertest');
const app = require('../app');

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

describe('Survey Routes', () => {
  describe('POST /api/surveys/validate', () => {
    it('should return 200 OK for a valid survey', async () => {
      const res = await request(app)
        .post('/api/surveys/validate')
        .send(validSurvey);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('should return 400 Bad Request for an invalid survey', async () => {
      const res = await request(app)
        .post('/api/surveys/validate')
        .send(invalidSurvey);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/surveys/normalize', () => {
    it('should return 200 OK with the normalized survey for a valid survey', async () => {
      const res = await request(app)
        .post('/api/surveys/normalize')
        .send(validSurvey);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(validSurvey);
    });

    it('should return 400 Bad Request for an invalid survey', async () => {
      const res = await request(app)
        .post('/api/surveys/normalize')
        .send(invalidSurvey);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });
});
