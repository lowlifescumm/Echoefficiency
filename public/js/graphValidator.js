function validateNavigationGraph(pages) {
    const pageIds = pages.map(p => p.id);
    const adj = new Map();

    // Build adjacency list and check for invalid targets
    for (const page of pages) {
        adj.set(page.id, []);
        if (page.nextRules) {
            for (const rule of page.nextRules.rules) {
                if (!pageIds.includes(rule.goto)) {
                    return { valid: false, error: `Invalid page target '${rule.goto}' in page '${page.name}'` };
                }
                adj.get(page.id).push(rule.goto);
            }
            if (page.nextRules.default) {
                if (!pageIds.includes(page.nextRules.default)) {
                    return { valid: false, error: `Invalid default page target '${page.nextRules.default}' in page '${page.name}'` };
                }
                adj.get(page.id).push(page.nextRules.default);
            }
        }
    }

    // Cycle detection using DFS
    const visited = new Set();
    const recursionStack = new Set();

    function hasCycle(pageId) {
        visited.add(pageId);
        recursionStack.add(pageId);

        const neighbors = adj.get(pageId) || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                if (hasCycle(neighborId)) {
                    return true;
                }
            } else if (recursionStack.has(neighborId)) {
                return true; // Cycle detected
            }
        }

        recursionStack.delete(pageId);
        return false;
    }

    for (const pageId of pageIds) {
        if (!visited.has(pageId)) {
            if (hasCycle(pageId)) {
                return { valid: false, error: 'Cycle detected in navigation graph.' };
            }
        }
    }

    return { valid: true };
}

module.exports = validateNavigationGraph;
