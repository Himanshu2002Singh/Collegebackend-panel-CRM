const jwt = require('jsonwebtoken');
const { User, College } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_college_saas_jwt_secret_key_2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: College, as: 'college' }]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid user or account deactivated.' });
    }

    req.user = user;
    req.collegeId = user.collegeId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

module.exports = {
  authenticate,
  JWT_SECRET
};
