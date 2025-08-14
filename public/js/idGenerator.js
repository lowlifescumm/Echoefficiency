function generateUniqueId(baseId, existingIds) {
    const slug = baseId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    let id = slug;
    let counter = 1;
    while (existingIds.includes(id)) {
        id = `${slug}-${counter}`;
        counter++;
    }
    return id;
}

module.exports = generateUniqueId;
