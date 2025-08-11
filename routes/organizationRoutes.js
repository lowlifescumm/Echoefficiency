const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { hasPermission } = require('./middleware/rbacMiddleware');
const Membership = require('../models/Membership');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @route   GET /organization/manage
// @desc    Display the organization management page with a list of members
// @access  Private (Admin/Owner)
router.get('/manage', isAuthenticated, hasPermission('manage_members'), async (req, res) => {
  try {
    const memberships = await Membership.find({
      organization: req.session.currentOrganizationId,
    }).populate('user', 'username email'); // Populate user details

    res.render('manage-organization', {
      members: memberships,
      csrfToken: res.locals.csrfToken,
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).send('Error loading organization management page.');
  }
});

// @route   POST /organization/invite
// @desc    Invite a user to the organization by creating a new membership
// @access  Private (Admin/Owner)
router.post('/invite', isAuthenticated, hasPermission('manage_members'), async (req, res) => {
    const { email, role } = req.body;
    try {
        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            req.flash('error', 'User with that email does not exist.');
            return res.redirect('/organization/manage');
        }

        const existingMembership = await Membership.findOne({
            user: userToInvite._id,
            organization: req.session.currentOrganizationId,
        });

        if (existingMembership) {
            req.flash('error', 'User is already a member of this organization.');
            return res.redirect('/organization/manage');
        }

        await Membership.create({
            user: userToInvite._id,
            organization: req.session.currentOrganizationId,
            role,
        });

        req.flash('success', `${email} has been invited as a ${role}.`);
        res.redirect('/organization/manage');

    } catch (error) {
        console.error('Error inviting user:', error);
        req.flash('error', 'An error occurred while inviting the user.');
        res.redirect('/organization/manage');
    }
});

// @route   POST /organization/member/:membershipId/update-role
// @desc    Update a member's role
// @access  Private (Admin/Owner)
router.post('/member/:membershipId/update-role', isAuthenticated, hasPermission('manage_members'), async (req, res) => {
    const { role } = req.body;
    try {
        await Membership.findByIdAndUpdate(req.params.membershipId, { role });
        req.flash('success', 'Member role updated.');
        res.redirect('/organization/manage');
    } catch (error) {
        console.error('Error updating member role:', error);
        req.flash('error', 'An error occurred while updating the role.');
        res.redirect('/organization/manage');
    }
});

// @route   POST /organization/member/:membershipId/remove
// @desc    Remove a member from the organization
// @access  Private (Admin/Owner)
router.post('/member/:membershipId/remove', isAuthenticated, hasPermission('manage_members'), async (req, res) => {
    try {
        await Membership.findByIdAndDelete(req.params.membershipId);
        req.flash('success', 'Member removed from organization.');
        res.redirect('/organization/manage');
    } catch (error) {
        console.error('Error removing member:', error);
        req.flash('error', 'An error occurred while removing the member.');
        res.redirect('/organization/manage');
    }
});

// @route   GET /organization/audit-log
// @desc    Display the audit log for the organization
// @access  Private (Owner)
router.get('/audit-log', isAuthenticated, hasPermission('manage_organization_settings'), async (req, res) => {
    try {
        const logs = await AuditLog.find({
            organization: req.session.currentOrganizationId,
        })
        .populate('user', 'username')
        .sort({ timestamp: -1 });

        res.render('audit-log', {
            logs: logs,
            csrfToken: res.locals.csrfToken,
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).send('Error loading audit log page.');
    }
});

module.exports = router;
