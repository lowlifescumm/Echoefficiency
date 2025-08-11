const Membership = require('../../models/Membership');
const roles = require('../../config/roles');

const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.session.userId || !req.session.currentOrganizationId) {
      return res.status(401).send('Authentication required.');
    }

    try {
      const membership = await Membership.findOne({
        user: req.session.userId,
        organization: req.session.currentOrganizationId,
      });

      if (!membership) {
        return res.status(403).send('You are not a member of this organization.');
      }

      const userRole = membership.role;
      const userPermissions = roles[userRole];

      if (userPermissions && userPermissions.includes(permission)) {
        next();
      } else {
        res.status(403).send('You do not have permission to perform this action.');
      }
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).send('Error checking permissions.');
    }
  };
};

module.exports = { hasPermission };
