const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');
const { authenticate } = require('../middlewares/auth');
const { enforceTenant } = require('../middlewares/tenant');
const { authorize } = require('../middlewares/role');
const { checkSubscriptionStatus } = require('../middlewares/subscriptionCheck');

router.use(authenticate, authorize('TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN'), enforceTenant, checkSubscriptionStatus);

router.get('/dashboard', trainerController.getDashboard);
router.get('/trainings', trainerController.getMyTrainings);
router.post('/deliveries/mark', trainerController.markTopicDelivered);
router.post('/attendance/batch', trainerController.markBatchAttendance);
router.get('/trainings/:trainingId/students', trainerController.getAssignedStudents);
router.post('/feedback', trainerController.submitFeedback);
router.get('/deliveries/:dailyDeliveryId/confirmations', trainerController.getContentConfirmationStats);

module.exports = router;
