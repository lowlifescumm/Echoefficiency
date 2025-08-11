const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const WebhookEndpoint = require('../models/WebhookEndpoint');

// @route   GET /webhooks
// @desc    Display webhook management page
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const endpoints = await WebhookEndpoint.find({ organization: req.session.currentOrganizationId });
        res.render('webhooks', {
            endpoints,
            csrfToken: res.locals.csrfToken,
        });
    } catch (error) {
        console.error('Error fetching webhook endpoints:', error);
        res.status(500).send('Error loading page.');
    }
});

// @route   POST /webhooks
// @desc    Create a new webhook endpoint
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { url, subscribed_topics } = req.body;
        await WebhookEndpoint.create({
            organization: req.session.currentOrganizationId,
            url,
            // Ensure topics are always an array
            subscribed_topics: Array.isArray(subscribed_topics) ? subscribed_topics : [subscribed_topics],
        });
        req.flash('success', 'Webhook endpoint created successfully.');
        res.redirect('/webhooks');
    } catch (error) {
        console.error('Error creating webhook endpoint:', error);
        req.flash('error', 'Failed to create webhook endpoint.');
        res.redirect('/webhooks');
    }
});

// @route   POST /webhooks/:endpointId/delete
// @desc    Delete a webhook endpoint
// @access  Private
router.post('/:endpointId/delete', isAuthenticated, async (req, res) => {
    try {
        await WebhookEndpoint.findOneAndDelete({
            _id: req.params.endpointId,
            organization: req.session.currentOrganizationId, // Security check
        });
        req.flash('success', 'Webhook endpoint deleted.');
        res.redirect('/webhooks');
    } catch (error) {
        console.error('Error deleting webhook endpoint:', error);
        req.flash('error', 'Failed to delete webhook endpoint.');
        res.redirect('/webhooks');
    }
});

module.exports = router;
