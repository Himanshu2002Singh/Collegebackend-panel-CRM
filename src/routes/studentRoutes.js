const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate } = require('../middlewares/auth');
const { enforceTenant } = require('../middlewares/tenant');
const { authorize } = require('../middlewares/role');
const { checkSubscriptionStatus } = require('../middlewares/subscriptionCheck');

// Public route for dynamic college branding on student login screen
router.get('/branding/:code', studentController.getCollegePublicBranding);

// Protected routes for authenticated students
router.use(authenticate, authorize('STUDENT', 'COLLEGE_ADMIN', 'SUPER_ADMIN'), enforceTenant, checkSubscriptionStatus);

// 1. Dashboard
router.get('/dashboard', studentController.getDashboard);

// 2. Profile
router.get('/profile', studentController.getMyProfile);
router.put('/profile', studentController.updateMyProfile);

// 3. Academic
router.get('/academic', studentController.getAcademicData);

// 4. Trainings
router.get('/trainings', studentController.getMyTrainings);

// 5. Workshops
router.get('/workshops', studentController.getWorkshops);
router.post('/workshops/:id/register', studentController.registerWorkshop);

// 6. Learning
router.get('/learning', studentController.getLearningData);
router.post('/content-confirmation', studentController.submitContentConfirmation);

// 7. Attendance
router.get('/attendance', studentController.getAttendanceHistory);

// 8. Assessments (Live Proctored & Practice)
router.get('/assessments', studentController.getAvailableAssessments);
router.get('/assessments/:id', studentController.getAssessmentDetails);
router.post('/assessments/:assessmentId/violation', studentController.recordAssessmentViolation);
router.post('/assessments/submit', studentController.submitAssessment);

// 9. Performance & AI Suggestions
router.get('/performance', studentController.getPerformanceAndSuggestions);

// 10. Certificates
router.get('/certificates', studentController.getCertificates);

// 11. Feedback
router.get('/feedback', studentController.getFeedbackData);
router.post('/feedback', studentController.submitFeedback);

// 12. Notifications
router.get('/notifications', studentController.getNotifications);

// 13. Settings
router.put('/settings/password', studentController.changePassword);

module.exports = router;
