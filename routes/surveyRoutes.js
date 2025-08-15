const express = require('express');
const router = express.Router();
const { validateSurvey } = require('../dist/validation/survey');

router.post('/api/surveys/validate', (req, res) => {
  const result = validateSurvey(req.body);
  if (result.success) {
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(400).json({ errors: result.errors });
  }
});

router.post('/api/surveys/normalize', (req, res) => {
  const result = validateSurvey(req.body);
  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ errors: result.errors });
  }
});

router.post('/api/surveys/:id/diff', (req, res) => {
    console.log(`Received diff for survey ${req.params.id}`);
    console.log('Idempotency Key:', req.get('idempotency_key'));
    console.log('Base Version:', req.body.base_version);
    console.log('Ops:', req.body.ops);
    res.status(200).json({ status: 'ok' });
});

module.exports = router;
