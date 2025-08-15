function compareSnapshots(snapshotA, snapshotB) {
    const aBlocks = snapshotA.pages[0].blocks[0].questions;
    const bBlocks = snapshotB.pages[0].blocks[0].questions;

    const aIds = new Set(aBlocks.map(b => b.id));
    const bIds = new Set(bBlocks.map(b => b.id));

    const added = [...bIds].filter(id => !aIds.has(id)).length;
    const removed = [...aIds].filter(id => !bIds.has(id)).length;

    let changed = 0;
    aBlocks.forEach(aBlock => {
        if (bIds.has(aBlock.id)) {
            const bBlock = bBlocks.find(b => b.id === aBlock.id);
            if (JSON.stringify(aBlock) !== JSON.stringify(bBlock)) {
                changed++;
            }
        }
    });

    return { added, removed, changed };
}

module.exports = compareSnapshots;
