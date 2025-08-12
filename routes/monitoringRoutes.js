const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { hasPermission } = require('./middleware/rbacMiddleware');
const { getQueue } = require('../services/queueService');

// Known queues in the system
const KNOWN_QUEUES = ['default', 'emails', 'webhooks', 'sms', 'maintenance'];

// Simple in-memory cache for queue stats
const queueStatsCache = {
    data: null,
    lastUpdated: 0,
    ttl: 15000, // 15 seconds
};

// Monitoring dashboard page
router.get('/', isAuthenticated, hasPermission('view_monitoring'), (req, res) => {
    res.render('monitoring', {
        title: 'System Monitoring',
        session: req.session
    });
});

// API endpoint to get queue statistics
router.get('/api/queue-stats', isAuthenticated, hasPermission('view_monitoring'), async (req, res) => {
    const now = Date.now();
    // Serve from cache if it's not stale
    if (queueStatsCache.data && (now - queueStatsCache.lastUpdated < queueStatsCache.ttl)) {
        return res.json(queueStatsCache.data);
    }

    try {
        const stats = {};
        for (const queueName of KNOWN_QUEUES) {
            const queue = getQueue(queueName);
            const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
            stats[queueName] = counts;
        }

        // Update cache
        queueStatsCache.data = stats;
        queueStatsCache.lastUpdated = now;

        res.json(stats);
    } catch (error) {
        console.error('Failed to fetch queue stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
