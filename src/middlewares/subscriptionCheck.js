const { Subscription, User, College } = require('../models');

// Checks if college subscription is valid and not expired
const checkSubscriptionStatus = async (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const collegeId = req.collegeId || req.user.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, message: 'Tenant identifier missing.' });
  }

  try {
    const college = await College.findByPk(collegeId);
    if (!college || college.status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'College account is inactive.' });
    }

    const subscription = await Subscription.findOne({
      where: { collegeId, status: 'ACTIVE' },
      order: [['id', 'DESC']]
    });

    if (!subscription) {
      return res.status(403).json({ 
        success: false, 
        message: 'No active subscription found. Features are locked.',
        isExpired: true 
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (subscription.expiryDate < today) {
      await subscription.update({ status: 'EXPIRED' });
      await college.update({ status: 'EXPIRED' });
      return res.status(403).json({ 
        success: false, 
        message: 'Subscription Expired. Please renew your plan.',
        isExpired: true 
      });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('Subscription check error:', err);
    next(err);
  }
};

// Enforces student limit when adding students
const checkStudentLimit = async (req, res, next) => {
  const collegeId = req.collegeId || req.user.collegeId;
  try {
    const subscription = await Subscription.findOne({
      where: { collegeId, status: 'ACTIVE' },
      order: [['id', 'DESC']]
    });

    if (!subscription) {
      return res.status(403).json({ success: false, message: 'Active subscription required to add students.' });
    }

    const currentCount = await User.count({
      where: { collegeId, role: 'STUDENT' }
    });

    if (currentCount >= subscription.studentLimit) {
      return res.status(403).json({
        success: false,
        message: `Student limit reached (${currentCount}/${subscription.studentLimit}). Please upgrade your plan.`,
        limitReached: true
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkSubscriptionStatus,
  checkStudentLimit
};
