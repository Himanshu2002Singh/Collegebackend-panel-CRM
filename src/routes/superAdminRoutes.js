const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

// All routes in this file require SUPER_ADMIN role
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/dashboard', superAdminController.getDashboardStats);

// College management
router.get('/colleges', superAdminController.getAllColleges);
router.post('/colleges', superAdminController.createCollege);
router.put('/colleges/:id', superAdminController.updateCollege);
router.post('/colleges/admin', superAdminController.addCollegeAdmin);

// Plans & Subscriptions
router.get('/plans', superAdminController.getPlans);
router.put('/plans/:id', superAdminController.updatePlan);
router.get('/subscriptions', superAdminController.getSubscriptions);
router.post('/payments/process', superAdminController.processRazorpayPayment);

// Reports
router.get('/reports', reportController.getSuperAdminReports);

module.exports = router;
