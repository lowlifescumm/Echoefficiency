function evaluatePredicate(rule, answers) {
    const { questionId, operator, value } = rule;
    const answer = answers[questionId];

    if (answer === undefined) {
        return false;
    }

    switch (operator) {
        case 'equals':
            return answer === value;
        case 'not_equals':
            return answer !== value;
        case 'contains':
            return answer.includes(value);
        default:
            return false;
    }
}

module.exports = evaluatePredicate;
