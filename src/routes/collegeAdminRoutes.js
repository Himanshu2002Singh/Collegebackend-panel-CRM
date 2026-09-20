const express = require('express');
const router = express.Router();
const multer = require('multer');
const collegeAdminController = require('../controllers/collegeAdminController');
const studentLifecycleController = require('../controllers/studentLifecycleController');
const trainerManagementController = require('../controllers/trainerManagementController');
const trainingWorkshopController = require('../controllers/trainingWorkshopController');
const reportController = require('../controllers/reportController');
const assessmentController = require('../controllers/assessmentManagementController');
const { authenticate } = require('../middlewares/auth');
const { enforceTenant } = require('../middlewares/tenant');
const { authorize } = require('../middlewares/role');
const { checkSubscriptionStatus, checkStudentLimit } = require('../middlewares/subscriptionCheck');

const upload = multer({ storage: multer.memoryStorage() });

// College Admin protection
router.use(authenticate, authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), enforceTenant, checkSubscriptionStatus);

router.get('/dashboard', collegeAdminController.getDashboard);

// Academic structure & Dashboard
router.get('/academic-dashboard', collegeAdminController.getAcademicDashboard);
router.get('/academic-tree', collegeAdminController.getAcademicTree);

// Academic Years
router.get('/academic-years', collegeAdminController.getAcademicYears);
router.post('/academic-years', collegeAdminController.createAcademicYear);
router.put('/academic-years/:id', collegeAdminController.updateAcademicYear);
router.post('/academic-years/:id/set-current', collegeAdminController.setCurrentAcademicYear);
router.post('/academic-years/:id/archive', collegeAdminController.archiveAcademicYear);
router.post('/academic-years/:id/clone', collegeAdminController.cloneAcademicYear);
router.delete('/academic-years/:id', collegeAdminController.deleteAcademicYear);

// Programs / Degrees
router.get('/programs', collegeAdminController.getPrograms);
router.post('/programs', collegeAdminController.createProgram);
router.put('/programs/:id', collegeAdminController.updateProgram);
router.delete('/programs/:id', collegeAdminController.deleteProgram);

// Semesters
router.get('/semesters', collegeAdminController.getSemesters);
router.post('/semesters', collegeAdminController.createSemester);
router.put('/semesters/:id', collegeAdminController.updateSemester);
router.delete('/semesters/:id', collegeAdminController.deleteSemester);

// Branches
router.get('/branches', collegeAdminController.getBranches);
router.post('/branches', collegeAdminController.createBranch);
router.put('/branches/:id', collegeAdminController.updateBranch);
router.delete('/branches/:id', collegeAdminController.deleteBranch);

// Sections
router.get('/sections', collegeAdminController.getSections);
router.post('/sections', collegeAdminController.createSection);
router.put('/sections/:id', collegeAdminController.updateSection);
router.delete('/sections/:id', collegeAdminController.deleteSection);

// Batches
router.get('/batches', collegeAdminController.getBatches);
router.post('/batches', collegeAdminController.createBatch);
router.put('/batches/:id', collegeAdminController.updateBatch);
router.delete('/batches/:id', collegeAdminController.deleteBatch);

// Subjects Master
router.get('/subjects', collegeAdminController.getSubjects);
router.post('/subjects', collegeAdminController.createSubject);
router.put('/subjects/:id', collegeAdminController.updateSubject);
router.delete('/subjects/:id', collegeAdminController.deleteSubject);

// Subject Offerings
router.get('/subject-offerings', collegeAdminController.getSubjectOfferings);
router.post('/subject-offerings', collegeAdminController.createSubjectOffering);
router.delete('/subject-offerings/:id', collegeAdminController.deleteSubjectOffering);

// Student Promotion Engine
router.get('/students/promotion-candidates', collegeAdminController.getPromotionCandidates);
router.post('/students/promote', collegeAdminController.promoteStudents);

// Student Transfer & Academic Progression History
router.post('/students/transfer', collegeAdminController.transferStudent);
router.get('/students/:id/academic-history', collegeAdminController.getStudentAcademicHistory);

// Academic Calendar
router.get('/academic-calendar', collegeAdminController.getCalendarEvents);
router.post('/academic-calendar', collegeAdminController.createCalendarEvent);
router.put('/academic-calendar/:id', collegeAdminController.updateCalendarEvent);
router.delete('/academic-calendar/:id', collegeAdminController.deleteCalendarEvent);

// Complete Student Lifecycle Management Routes
router.get('/students/dashboard-stats', studentLifecycleController.getStudentDashboardStats);
router.get('/students/advanced', studentLifecycleController.getStudentsAdvanced);
router.get('/students/at-risk', studentLifecycleController.getAtRiskStudents);
router.get('/students/import-history', studentLifecycleController.getImportHistory);
router.post('/students/bulk-import', checkStudentLimit, upload.single('file'), studentLifecycleController.bulkImportStudents);
router.post('/students/assign-trainings', studentLifecycleController.assignTrainingsToStudents);
router.post('/students/send-alert', studentLifecycleController.sendStudentOrParentAlert);
router.post('/students/bulk-promote', studentLifecycleController.bulkPromoteStudents);
router.post('/students/comprehensive', checkStudentLimit, studentLifecycleController.createStudentComprehensive);
router.put('/students/:id/comprehensive', studentLifecycleController.updateStudentComprehensive);
router.patch('/students/:id/status', studentLifecycleController.updateStudentStatus);
router.post('/students/:id/reset-password', studentLifecycleController.resetStudentPassword);
router.post('/students/:id/transfer-advanced', studentLifecycleController.transferStudent);
router.get('/students/:id/profile-360', studentLifecycleController.getStudent360Profile);

// Legacy Students routes (Backward compatibility)
router.get('/students', collegeAdminController.getStudents);
router.post('/students', checkStudentLimit, collegeAdminController.createStudent);
router.put('/students/:id', collegeAdminController.updateStudent);
router.delete('/students/:id', collegeAdminController.deleteStudent);
router.post('/students/upload-excel', checkStudentLimit, upload.single('file'), collegeAdminController.uploadStudentsExcel);
router.get('/students/:id', collegeAdminController.getStudentProfile);

// Complete Trainer Management Endpoints
router.get('/trainers/dashboard-stats', trainerManagementController.getTrainerDashboardStats);
router.get('/trainers/departments', trainerManagementController.getTrainerDepartments);
router.get('/trainers/directory', trainerManagementController.getTrainersDirectory);
router.post('/trainers/onboard', trainerManagementController.createTrainer);
router.post('/trainers/bulk-import', trainerManagementController.bulkImportTrainers);

router.get('/trainers/invitations', trainerManagementController.getTrainerInvitations);
router.post('/trainers/invitations/send', trainerManagementController.sendTrainerInvitation);
router.post('/trainers/invitations/:id/cancel', trainerManagementController.cancelTrainerInvitation);

router.get('/trainers/assignments', trainerManagementController.getTrainerAssignments);
router.post('/trainers/assignments', trainerManagementController.createTrainerAssignment);
router.delete('/trainers/assignments/:id', trainerManagementController.deleteTrainerAssignment);

router.get('/trainers/schedule', trainerManagementController.getTrainerSchedule);
router.post('/trainers/schedule', trainerManagementController.createScheduleSession);
router.post('/trainers/schedule/check-conflict', trainerManagementController.checkScheduleConflict);

router.get('/trainers/availability', trainerManagementController.getTrainerAvailability);
router.post('/trainers/availability', trainerManagementController.saveTrainerAvailability);

router.get('/trainers/leaves', trainerManagementController.getTrainerLeaves);
router.post('/trainers/leaves', trainerManagementController.createLeaveRequest);
router.put('/trainers/leaves/:id/status', trainerManagementController.reviewLeaveRequest);
router.post('/trainers/substitute', trainerManagementController.assignSubstituteTrainer);

router.get('/trainers/attendance-overview', trainerManagementController.getTrainerAttendanceOverview);
router.get('/trainers/attendance-corrections', trainerManagementController.getAttendanceCorrections);
router.put('/trainers/attendance-corrections/:id', trainerManagementController.reviewAttendanceCorrection);

router.get('/trainers/content-delivery', trainerManagementController.getContentDeliveryOverview);
router.get('/trainers/workload', trainerManagementController.getTrainerWorkload);

router.get('/trainers/feedbacks', trainerManagementController.getTrainerFeedbacks);
router.post('/trainers/feedbacks/admin', trainerManagementController.submitAdminFeedback);

router.get('/trainers/reports', trainerManagementController.getTrainerReports);
router.get('/trainers/audit-logs', trainerManagementController.getTrainerAuditLogs);

router.get('/trainers/:trainerId/documents', trainerManagementController.getTrainerDocuments);
router.post('/trainers/:trainerId/documents', trainerManagementController.uploadTrainerDocument);
router.delete('/trainers/documents/:id', trainerManagementController.deleteTrainerDocument);

router.get('/trainers/:id/profile-360', trainerManagementController.getTrainer360Profile);
router.put('/trainers/:id/status', trainerManagementController.updateTrainerStatus);
router.put('/trainers/:id/details', trainerManagementController.updateTrainer);
router.post('/trainers/:id/reset-password', trainerManagementController.resetTrainerPassword);

// Legacy backward compatibility
router.get('/trainers', trainerManagementController.getTrainersDirectory);
router.post('/trainers', trainerManagementController.createTrainer);
router.post('/trainers/assign', trainerManagementController.createTrainerAssignment);

// ==========================================
// TRAINING & WORKSHOP MANAGEMENT (ENTERPRISE)
// ==========================================
router.get('/trainings-workshops/dashboard-stats', trainingWorkshopController.getDashboardStats);

// Trainings (CRUD, 360, Status)
router.get('/trainings-workshops/trainings', trainingWorkshopController.getTrainings);
router.post('/trainings-workshops/trainings', trainingWorkshopController.createTraining);
router.get('/trainings-workshops/trainings/:id', trainingWorkshopController.getTrainingById);
router.put('/trainings-workshops/trainings/:id', trainingWorkshopController.updateTraining);
router.delete('/trainings-workshops/trainings/:id', trainingWorkshopController.deleteTraining);
router.get('/trainings-workshops/trainings/:id/profile-360', trainingWorkshopController.getTraining360Profile);

// Workshops (CRUD, Registration, Sessions)
router.get('/trainings-workshops/workshops', trainingWorkshopController.getWorkshops);
router.post('/trainings-workshops/workshops', trainingWorkshopController.createWorkshop);
router.put('/trainings-workshops/workshops/:id', trainingWorkshopController.updateWorkshop);
router.delete('/trainings-workshops/workshops/:id', trainingWorkshopController.deleteWorkshop);
router.get('/trainings-workshops/workshops/:workshopId/registrations', trainingWorkshopController.getWorkshopRegistrations);
router.post('/trainings-workshops/workshops/:workshopId/register', trainingWorkshopController.registerForWorkshop);
router.put('/trainings-workshops/workshops/registrations/:registrationId', trainingWorkshopController.updateWorkshopRegistrationStatus);
router.get('/trainings-workshops/workshops/:workshopId/sessions', trainingWorkshopController.getWorkshopSessions);
router.post('/trainings-workshops/workshops/:workshopId/sessions', trainingWorkshopController.createWorkshopSession);

// Batches
router.get('/trainings-workshops/batches', trainingWorkshopController.getTrainingBatches);
router.post('/trainings-workshops/batches', trainingWorkshopController.createTrainingBatch);

// Allocations (Trainers & Students)
router.post('/trainings-workshops/allocate-trainer', trainingWorkshopController.allocateTrainerToTraining);
router.get('/trainings-workshops/eligible-students', trainingWorkshopController.getEligibleStudents);
router.post('/trainings-workshops/allocate-students', trainingWorkshopController.allocateStudentsToTraining);

// Course TOC & Daily Content Delivery
router.get('/trainings-workshops/courses/:trainingId/toc', trainingWorkshopController.getCourseTOC);
router.post('/trainings-workshops/courses/modules', trainingWorkshopController.createCourseModule);
router.post('/trainings-workshops/courses/topics', trainingWorkshopController.createCourseTopic);
router.get('/trainings-workshops/daily-content', trainingWorkshopController.getDailyContentDelivery);
router.post('/trainings-workshops/daily-content/delivered', trainingWorkshopController.markDailyContentDelivered);

// Schedule & Sessions
router.get('/trainings-workshops/schedule', trainingWorkshopController.getTrainingSchedule);
router.post('/trainings-workshops/sessions', trainingWorkshopController.createTrainingSession);
router.put('/trainings-workshops/sessions/:id/status', trainingWorkshopController.updateSessionStatus);

// Attendance
router.get('/trainings-workshops/attendance', trainingWorkshopController.getTrainingAttendance);
router.post('/trainings-workshops/attendance/mark', trainingWorkshopController.markTrainingAttendance);

// Assessments & Performance & At-Risk
router.get('/trainings-workshops/assessments', trainingWorkshopController.getTrainingAssessments);
router.post('/trainings-workshops/assessments', trainingWorkshopController.createTrainingAssessment);
router.get('/trainings-workshops/performance', trainingWorkshopController.getTrainingPerformance);
router.get('/trainings-workshops/at-risk-students', trainingWorkshopController.getAtRiskStudents);
router.get('/trainings-workshops/at-risk', trainingWorkshopController.getAtRiskStudents);

// Certificates
router.get('/trainings-workshops/certificates', trainingWorkshopController.getCertificates);
router.post('/trainings-workshops/certificates/generate', trainingWorkshopController.generateCertificates);

// Student Feedback
router.get('/trainings-workshops/feedback', trainingWorkshopController.getTrainingFeedback);

// Notifications / Broadcast & Logs
router.post('/trainings-workshops/broadcast', trainingWorkshopController.broadcastMessage);
router.get('/trainings-workshops/broadcast/logs', trainingWorkshopController.getCommunicationLogs);

// Compliance Reports & CSV Downloads
router.get('/trainings-workshops/reports/attendance-csv', trainingWorkshopController.getAttendanceReportCSV);
router.get('/trainings-workshops/reports/certificates-csv', trainingWorkshopController.getCertificatesReportCSV);
router.get('/trainings-workshops/reports/workload-csv', trainingWorkshopController.getTrainerWorkloadReportCSV);

// Audit Logs
router.get('/trainings-workshops/audit-logs', trainingWorkshopController.getTrainingAuditLogs);

// Trainings & Workshops (Legacy fallback aliases)
router.get('/trainings', trainingWorkshopController.getTrainings);
router.post('/trainings', trainingWorkshopController.createTraining);

// Course modules & topics
router.get('/courses/:trainingId', collegeAdminController.getCourseDetails);
router.post('/courses/modules', collegeAdminController.addCourseModule);
router.post('/courses/topics', collegeAdminController.addCourseTopic);

// Content Delivery & Confirmations Monitor
router.get('/daily-content/confirmations', collegeAdminController.getContentConfirmations);

// Attendance
router.get('/attendance', collegeAdminController.getAttendanceDashboard);
router.post('/attendance/rules', collegeAdminController.updateAttendanceRule);
router.get('/attendance/absence-alerts', collegeAdminController.getAbsenceAlertsEndpoint);
router.post('/attendance/send-parent-alert', collegeAdminController.sendParentAbsenceAlert);

// ==========================================
// ASSESSMENT MANAGEMENT (100% Live Backend Suite)
// ==========================================
router.get('/assessments/dashboard', assessmentController.getAssessmentDashboard);
router.get('/assessments', assessmentController.getAssessments);
router.get('/assessments/question-bank', assessmentController.getQuestionBank);
router.post('/assessments/question-bank', assessmentController.createQuestionBankItem);
router.post('/assessments/questions/import', assessmentController.importQuestionsToBank);
router.get('/assessments/attempts', assessmentController.getAssessmentAttempts);
router.get('/assessments/results/student', assessmentController.getStudentResults);
router.get('/assessments/results/batch', assessmentController.getBatchResults);
router.get('/assessments/results/training', assessmentController.getTrainingResults);
router.get('/assessments/reevaluations', assessmentController.getReevaluationLedger);
router.post('/assessments/reevaluations', assessmentController.performReevaluation);
router.get('/assessments/export-csv', assessmentController.exportAssessmentCSV);
router.get('/assessments/topic-catalog', assessmentController.getTopicCatalog);
router.get('/assessments/daily-topics', assessmentController.getDailyCoveredTopics);
router.get('/assessments/ai-settings', assessmentController.getAISettings);
router.post('/assessments/ai-settings', assessmentController.saveAISettings);
router.post('/assessments/generate-ai-questions', assessmentController.generateAIQuestions);
router.post('/assessments/ai-create-and-publish', assessmentController.aiCreateAndPublishAssessment);

router.get('/assessments/:id', assessmentController.getAssessmentById);
router.post('/assessments', assessmentController.createAssessment);
router.put('/assessments/:id', assessmentController.updateAssessment);
router.delete('/assessments/:id', assessmentController.deleteAssessment);
router.post('/assessments/:id/publish', assessmentController.publishAssessment);
router.post('/assessments/:id/add-from-bank', assessmentController.linkQuestionsToAssessment);
router.get('/assessments/:id/evaluation', assessmentController.getAssessmentEvaluation);
router.post('/assessments/evaluate-answer', assessmentController.evaluateStudentAnswer);
router.post('/assessments/evaluate-coding', assessmentController.evaluateCodingSubmission);
router.post('/assessments/:id/publish-results', assessmentController.publishAssessmentResults);
router.get('/assessments/:id/performance-analysis', assessmentController.getPerformanceAnalysis);
router.post('/assessments/:assessmentId/questions', collegeAdminController.addAssessmentQuestion);
router.post('/assessments/:assessmentId/upload-questions', upload.single('file'), collegeAdminController.uploadQuestionsExcelEndpoint);

// Notifications & Absence Alerts
router.post('/notifications/send', collegeAdminController.sendNotification);
router.post('/notifications/parent-absence-alert', collegeAdminController.sendParentAbsenceAlert);

// Reports
router.get('/reports', reportController.getCollegeReports);
router.get('/reports/export-csv', reportController.exportCollegeReportCSV);

// Audit Logs
router.get('/audit-logs', collegeAdminController.getAuditLogs);

// College Settings & Branding
router.get('/settings', collegeAdminController.getCollegeSettings);
router.put('/settings', collegeAdminController.updateCollegeSettings);

module.exports = router;
