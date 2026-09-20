const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, College, Subscription, Plan } = require('../models');
const { JWT_SECRET } = require('../middlewares/auth');

// Unified Login for Super Admin, College Admin, Trainer, Student
async function login(req, res) {
  try {
    const { identifier, email, password, collegeCode } = req.body;
    const loginId = (identifier || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Email/Identifier and password are required.' });
    }

    // Lookup user by email OR enrollmentNo
    let userWhere = {
      [Op.or]: [
        { email: loginId },
        { enrollmentNo: loginId }
      ]
    };

    let college = null;
    if (collegeCode) {
      college = await College.findOne({ where: { code: collegeCode.trim().toUpperCase() } });
      if (college) {
        userWhere.collegeId = college.id;
      }
    }

    const user = await User.findOne({
      where: userWhere,
      include: [
        { 
          model: College, 
          as: 'college',
          include: [
            {
              model: Subscription,
              as: 'subscriptions',
              where: { status: 'ACTIVE' },
              required: false,
              include: [{ model: Plan, as: 'plan' }]
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact administration.' });
    }

    // Password verification
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your password.' });
    }

    // College status & subscription checks for tenant users
    let isExpired = false;
    let activePlan = null;

    if (user.role !== 'SUPER_ADMIN' && user.college) {
      if (user.college.status === 'INACTIVE') {
        return res.status(403).json({ success: false, message: 'College account is inactive.' });
      }

      const activeSub = user.college.subscriptions && user.college.subscriptions[0];
      const today = new Date().toISOString().split('T')[0];
      if (!activeSub || activeSub.expiryDate < today) {
        isExpired = true;
      } else {
        activePlan = activeSub.plan;
      }
    }

    // Generate JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subRole: user.subRole,
      collegeId: user.collegeId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Response with branding
    const responseData = {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subRole: user.subRole,
        enrollmentNo: user.enrollmentNo,
        rollNo: user.rollNo,
        collegeId: user.collegeId
      },
      isExpired,
      branding: user.college ? {
        id: user.college.id,
        name: user.college.name,
        code: user.college.code,
        logoUrl: user.college.logoUrl,
        loginBgUrl: user.college.loginBgUrl,
        primaryColor: user.college.primaryColor,
        secondaryColor: user.college.secondaryColor,
        plan: activePlan ? activePlan.name : 'Standard'
      } : null
    };

    res.json(responseData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication: ' + err.message });
  }
}

// Get current logged-in profile
async function getMe(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: College,
          as: 'college',
          include: [
            {
              model: Subscription,
              as: 'subscriptions',
              include: [{ model: Plan, as: 'plan' }]
            }
          ]
        }
      ]
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  login,
  getMe
};
