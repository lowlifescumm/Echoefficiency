const { z } = require('zod');

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'multipleChoice', 'checkbox', 'rating', 'matrix-single', 'matrix-multi', 'ranking', 'file-upload', 'consent-checkbox']),
  text: z.string(),
  options: z.array(z.string()).optional(),
  rows: z.array(z.string()).optional(),
  cols: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  consentText: z.string().optional(),
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

function validateSchema(survey) {
  const result = surveySchema.safeParse(survey);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error.issues.map(issue => ({ path: issue.path, message: issue.message })) };
  }
}

function checkBranchingDAG(survey) {
  const graph = {};
  const pageIds = survey.pages.map(p => p.id);

  // Build the graph
  survey.pages.forEach(page => {
    graph[page.id] = new Set();
    if (page.nextPage) {
        graph[page.id].add(page.nextPage);
    }
  });

  const visiting = new Set();
  const visited = new Set();

  function hasCycle(pageId) {
    visiting.add(pageId);

    for (const neighbor of graph[pageId] || []) {
      if (visiting.has(neighbor)) {
        return true; // Cycle detected
      }
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }
    }

    visiting.delete(pageId);
    visited.add(pageId);
    return false;
  }

  for (const pageId of pageIds) {
    if (!visited.has(pageId)) {
      if (hasCycle(pageId)) {
        return { success: false, errors: [{ message: 'Circular dependency detected in page logic.' }] };
      }
    }
  }

  return { success: true };
}

function checkDanglingReferences(survey) {
    const allQuestionIds = new Set(survey.pages.flatMap(p => p.blocks.flatMap(b => b.questions.map(q => q.id))));
    const errors = [];

    survey.pages.forEach((page, pageIndex) => {
        page.blocks.forEach((block, blockIndex) => {
            if (block.displayLogic) {
                block.displayLogic.forEach((rule, ruleIndex) => {
                    if (!allQuestionIds.has(rule.questionId)) {
                        errors.push({
                            path: ['pages', pageIndex, 'blocks', blockIndex, 'displayLogic', ruleIndex, 'questionId'],
                            message: `Dangling reference: question with id '${rule.questionId}' not found.`
                        });
                    }
                });
            }
        });
    });

    return errors.length > 0 ? { success: false, errors } : { success: true };
}

function checkRequiredButHidden(survey) {
    const warnings = [];

    survey.pages.forEach((page, pageIndex) => {
        page.blocks.forEach((block, blockIndex) => {
            if (block.displayLogic && block.displayLogic.length > 0) {
                block.questions.forEach((question, questionIndex) => {
                    if (question.required) {
                        warnings.push({
                            path: ['pages', pageIndex, 'blocks', blockIndex, 'questions', questionIndex],
                            message: `Question '${question.text}' is required but may be hidden by page logic.`
                        });
                    }
                });
            }
        });
    });

    return { warnings };
}

function validateSurvey(survey) {
  const schemaResult = validateSchema(survey);
  if (!schemaResult.success) {
    return schemaResult;
  }

  const dagResult = checkBranchingDAG(survey);
  if (!dagResult.success) {
    return dagResult;
  }

  const danglingRefResult = checkDanglingReferences(survey);
  if (!danglingRefResult.success) {
    return danglingRefResult;
  }

  const requiredHiddenResult = checkRequiredButHidden(survey);

  return { success: true, warnings: requiredHiddenResult.warnings };
}

module.exports = {
  validateSurvey,
};
