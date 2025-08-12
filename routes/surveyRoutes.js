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

module.exports = router;
