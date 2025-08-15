function resolvePlaceholders(text, answers) {
    if (!text) {
        return '';
    }
    return text.replace(/{{\s*answers\.(\w+)\s*}}/g, (match, qid) => {
        const answer = answers[qid];
        return answer || '…';
    });
}

module.exports = resolvePlaceholders;
