const { College, Subscription } = require('../models');

// Enforces tenant isolation: colleges cannot view/modify another college's records
const enforceTenant = (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    // Super admin can optionally specify college via header or query, or access platform-wide
    const headerCollegeId = req.headers['x-college-id'] || req.query.collegeId;
    if (headerCollegeId) {
      req.collegeId = parseInt(headerCollegeId, 10);
    }
    return next();
  }

  // Non-super-admins MUST be bound to their own collegeId
  if (!req.user.collegeId) {
    return res.status(403).json({ success: false, message: 'No college association found for this user.' });
  }

  req.collegeId = req.user.collegeId;
  next();
};

module.exports = {
  enforceTenant
};
