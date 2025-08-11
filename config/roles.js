const roles = {
  Viewer: [
    'view_dashboard',
    'view_submissions'
  ],
  Analyst: [
    'view_dashboard',
    'view_submissions',
    'export_data'
  ],
  Editor: [
    'view_dashboard',
    'view_submissions',
    'create_form',
    'edit_form',
    'delete_form'
  ],
  Admin: [
    'view_dashboard',
    'view_submissions',
    'export_data',
    'create_form',
    'edit_form',
    'delete_form',
    'manage_members'
  ],
  Owner: [
    'view_dashboard',
    'view_submissions',
    'export_data',
    'create_form',
    'edit_form',
    'delete_form',
    'manage_members',
    'manage_organization_settings'
  ],
};

module.exports = roles;
