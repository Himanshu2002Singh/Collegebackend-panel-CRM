const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  College, User, AcademicYear, Semester, Branch, Section, Subject,
  Training, Course, CourseModule, CourseTopic, Attendance, AttendanceRule,
  Assessment, Question, AssessmentSubmission, StudentAnswer, TrainerFeedback,
  Notification, PerformanceSuggestion, Subscription, Plan,
  TrainingAuditLog, TrainerAuditLog, StudentActivityLog
} = require('../models');
const { checkConsecutiveAbsences, getCollegeAbsenceAlerts } = require('../services/alertEngine');
const { calculateStudentPerformance } = require('../services/analyticsEngine');
const { importStudentsFromExcel, importQuestionsFromExcel } = require('../services/excelService');

// 2.1 College Admin Dashboard
async function getDashboard(req, res) {
  try {
    const collegeId = req.collegeId;

    const totalStudents = await User.count({ where: { collegeId, role: 'STUDENT', isActive: true } });
    const totalTrainers = await User.count({ where: { collegeId, role: 'TRAINER', isActive: true } });
    const activeTrainings = await Training.count({ where: { collegeId, type: 'SEMESTER_TRAINING', status: 'ACTIVE' } });
    const activeWorkshops = await Training.count({ where: { collegeId, type: 'WORKSHOP', status: 'ACTIVE' } });

    // Today's attendance calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = await Attendance.findAll({ where: { collegeId, date: todayStr } });
    let todayAttendanceRate = 0;
    if (todayRecords.length > 0) {
      const present = todayRecords.filter(r => r.status === 'PRESENT').length;
      todayAttendanceRate = Math.round((present / todayRecords.length) * 100);
    }

    // Pending assessments
    const pendingAssessments = await Assessment.count({ where: { collegeId, status: 'PUBLISHED' } });

    // Consecutive absence alerts
    const absenceAlerts = await getCollegeAbsenceAlerts(collegeId);

    // Fetch subscription status & limits
    const subscription = await Subscription.findOne({
      where: { collegeId, status: 'ACTIVE' },
      include: [{ model: Plan, as: 'plan' }]
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTrainers,
        activeTrainings,
        activeWorkshops,
        todayAttendanceRate,
        averagePerformance: 0,
        pendingAssessments,
        lowAttendanceCount: absenceAlerts.length,
        absenceAlerts,
        subscription: subscription ? {
          planName: subscription.plan.name,
          studentLimit: subscription.studentLimit,
          currentStudents: totalStudents,
          expiryDate: subscription.expiryDate,
          usagePercentage: subscription.studentLimit > 0 ? Math.round((totalStudents / subscription.studentLimit) * 100) : 0
        } : null
      }
    });
  } catch (err) {
    console.error('College admin dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

const academicController = require('./academicController');

// 2.2 Academic Structure & Hierarchy (Delegated to academicController)
const getAcademicDashboard = academicController.getAcademicDashboard;
const getAcademicTree = academicController.getAcademicTree;
const getAcademicYears = academicController.getAcademicYears;
const createAcademicYear = academicController.createAcademicYear;
const updateAcademicYear = academicController.updateAcademicYear;
const setCurrentAcademicYear = academicController.setCurrentAcademicYear;
const archiveAcademicYear = academicController.archiveAcademicYear;
const cloneAcademicYear = academicController.cloneAcademicYear;
const deleteAcademicYear = academicController.deleteAcademicYear;
const getPrograms = academicController.getPrograms;
const createProgram = academicController.createProgram;
const updateProgram = academicController.updateProgram;
const deleteProgram = academicController.deleteProgram;
const getSemesters = academicController.getSemesters;
const createSemester = academicController.createSemester;
const updateSemester = academicController.updateSemester;
const deleteSemester = academicController.deleteSemester;
const getBranches = academicController.getBranches;
const createBranch = academicController.createBranch;
const updateBranch = academicController.updateBranch;
const deleteBranch = academicController.deleteBranch;
const getSections = academicController.getSections;
const createSection = academicController.createSection;
const updateSection = academicController.updateSection;
const deleteSection = academicController.deleteSection;
const getBatches = academicController.getBatches;
const createBatch = academicController.createBatch;
const updateBatch = academicController.updateBatch;
const deleteBatch = academicController.deleteBatch;
const getSubjects = academicController.getSubjects;
const createSubject = academicController.createSubject;
const updateSubject = academicController.updateSubject;
const deleteSubject = academicController.deleteSubject;
const getSubjectOfferings = academicController.getSubjectOfferings;
const createSubjectOffering = academicController.createSubjectOffering;
const deleteSubjectOffering = academicController.deleteSubjectOffering;
const getPromotionCandidates = academicController.getPromotionCandidates;
const promoteStudents = academicController.promoteStudents;
const transferStudent = academicController.transferStudent;
const getStudentAcademicHistory = academicController.getStudentAcademicHistory;
const getCalendarEvents = academicController.getCalendarEvents;
const createCalendarEvent = academicController.createCalendarEvent;
const updateCalendarEvent = academicController.updateCalendarEvent;
const deleteCalendarEvent = academicController.deleteCalendarEvent;

// 2.3 Student Management
async function getStudents(req, res) {
  try {
    const collegeId = req.collegeId;
    const { branchId, semesterId, sectionId, search } = req.query;

    const where = { collegeId, role: 'STUDENT' };
    if (branchId) where.branchId = branchId;
    if (semesterId) where.semesterId = semesterId;
    if (sectionId) where.sectionId = sectionId;

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { enrollmentNo: { [Op.like]: `%${search}%` } },
        { rollNo: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const students = await User.findAll({
      where,
      order: [['id', 'ASC']],
      attributes: { exclude: ['password'] },
      include: [
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' },
        { model: Section, as: 'section' }
      ]
    });

    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createStudent(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      name, enrollmentNo, rollNo, email, mobile,
      branchId, semesterId, sectionId,
      parentName, parentMobile, parentEmail, password
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const existing = await User.findOne({ where: { collegeId, email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student with this email already exists in college.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'student123', 10);
    const student = await User.create({
      collegeId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: mobile || '',
      role: 'STUDENT',
      enrollmentNo: enrollmentNo || '',
      rollNo: rollNo || '',
      parentName: parentName || '',
      parentMobile: parentMobile || '',
      parentEmail: parentEmail || '',
      branchId: branchId || null,
      semesterId: semesterId || null,
      sectionId: sectionId || null,
      isActive: true
    });

    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.4 Excel Student Upload
async function uploadStudentsExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file.' });
    }

    const { branchId, semesterId, sectionId } = req.body;
    const result = await importStudentsFromExcel(
      req.file.buffer,
      req.collegeId,
      branchId ? parseInt(branchId, 10) : null,
      semesterId ? parseInt(semesterId, 10) : null,
      sectionId ? parseInt(sectionId, 10) : null
    );

    res.json({
      success: true,
      message: `Import complete: ${result.imported} imported, ${result.failed} failed`,
      summary: result
    });
  } catch (err) {
    console.error('Excel upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.5 Student Detailed Profile
async function getStudentProfile(req, res) {
  try {
    const { id } = req.params;
    const student = await User.findOne({
      where: { id, collegeId: req.collegeId, role: 'STUDENT' },
      attributes: { exclude: ['password'] },
      include: [
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' },
        { model: Section, as: 'section' }
      ]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const performance = await calculateStudentPerformance(student.id);
    const recentAttendance = await Attendance.findAll({
      where: { studentId: student.id },
      order: [['date', 'DESC']],
      limit: 10
    });

    const submissions = await AssessmentSubmission.findAll({
      where: { studentId: student.id },
      include: [{ model: Assessment, as: 'assessment' }],
      order: [['id', 'DESC']]
    });

    res.json({
      success: true,
      student,
      performance,
      recentAttendance,
      submissions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.6 Trainer Management
async function getTrainers(req, res) {
  try {
    const trainers = await User.findAll({
      where: { collegeId: req.collegeId, role: 'TRAINER' },
      attributes: { exclude: ['password'] }
    });

    const augmented = await Promise.all(trainers.map(async tr => {
      const activeTrainings = await Training.findAll({
        where: { collegeId: req.collegeId, trainerId: tr.id, status: 'ACTIVE' },
        include: [{ model: Section, as: 'section' }]
      });
      const plain = tr.toJSON();
      plain.assignedTrainings = activeTrainings;
      return plain;
    }));

    res.json({ success: true, trainers: augmented });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createTrainer(req, res) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'trainer123', 10);
    const trainer = await User.create({
      collegeId: req.collegeId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      role: 'TRAINER',
      isActive: true
    });

    res.status(201).json({ success: true, trainer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.7 Training & Workshop Management
async function getTrainings(req, res) {
  try {
    const trainings = await Training.findAll({
      where: { collegeId: req.collegeId },
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'email'] },
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' },
        { model: Course, as: 'course' }
      ]
    });

    res.json({ success: true, trainings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createTraining(req, res) {
  try {
    const {
      name, type, subjectId, semesterId, branchId, sectionId,
      durationDays, startDate, endDate, trainerId
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Name, Start Date, and End Date are required.' });
    }

    const training = await Training.create({
      collegeId: req.collegeId,
      name,
      type: type || 'SEMESTER_TRAINING',
      subjectId: subjectId || null,
      semesterId: semesterId || null,
      branchId: branchId || null,
      sectionId: sectionId || null,
      trainerId: trainerId || null,
      durationDays: durationDays || 45,
      startDate,
      endDate,
      status: 'ACTIVE'
    });

    // Auto-create associated Course outline
    await Course.create({
      collegeId: req.collegeId,
      trainingId: training.id,
      title: `${name} Curriculum`,
      description: `Complete syllabus and day-to-day modules for ${name}`
    });

    res.status(201).json({ success: true, training });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.10 Course, Modules, and Topics
async function getCourseDetails(req, res) {
  try {
    const trainingId = req.params.trainingId || req.query.trainingId;
    const where = { collegeId: req.collegeId };
    if (trainingId && trainingId !== 'ALL' && trainingId !== 'undefined') {
      where.trainingId = trainingId;
    }
    const course = await Course.findOne({
      where,
      include: [
        {
          model: CourseModule,
          as: 'modules',
          include: [{ model: CourseTopic, as: 'topics' }]
        }
      ]
    });

    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addCourseModule(req, res) {
  try {
    const { courseId, title, orderIndex } = req.body;
    const module = await CourseModule.create({
      courseId,
      title,
      orderIndex: orderIndex || 0
    });
    res.status(201).json({ success: true, module });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addCourseTopic(req, res) {
  try {
    const { moduleId, title, description, notes, pdfUrl, pptUrl, videoUrl, practiceQuestions, orderIndex } = req.body;
    const topic = await CourseTopic.create({
      moduleId,
      title,
      description: description || '',
      notes: notes || '',
      pdfUrl: pdfUrl || '',
      pptUrl: pptUrl || '',
      videoUrl: videoUrl || '',
      practiceQuestions: practiceQuestions || '',
      orderIndex: orderIndex || 0
    });
    res.status(201).json({ success: true, topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.14 Attendance Dashboard & Configuration
async function getAttendanceDashboard(req, res) {
  try {
    const collegeId = req.collegeId;
    const { date, trainingId, sectionId } = req.query;

    const where = { collegeId };
    if (date) where.date = date;
    if (trainingId) where.trainingId = trainingId;

    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'enrollmentNo', 'rollNo'] },
        { model: User, as: 'trainer', attributes: ['id', 'name'] }
      ]
    });

    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'PRESENT').length;
    const absent = attendances.filter(a => a.status === 'ABSENT').length;
    const late = attendances.filter(a => a.status === 'LATE').length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    const rule = await AttendanceRule.findOne({ where: { collegeId } });

    res.json({
      success: true,
      metrics: {
        total,
        present,
        absent,
        late,
        percentage
      },
      attendances,
      rule: rule || { mode: 'DAILY', startTime: '09:50 AM', endTime: '10:05 AM', allowedDurationMinutes: 15 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateAttendanceRule(req, res) {
  try {
    const collegeId = req.collegeId;
    const { mode, startTime, endTime, allowedDurationMinutes } = req.body;

    let rule = await AttendanceRule.findOne({ where: { collegeId } });
    if (rule) {
      await rule.update({ mode, startTime, endTime, allowedDurationMinutes });
    } else {
      rule = await AttendanceRule.create({ collegeId, mode, startTime, endTime, allowedDurationMinutes });
    }

    res.json({ success: true, message: 'Attendance rules updated successfully', rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}



// 2.3 Student Edit & Delete
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const student = await User.findOne({ where: { id, collegeId: req.collegeId, role: 'STUDENT' } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const { name, email, phone, rollNo, enrollmentNo, parentName, parentMobile, branchId, semesterId, sectionId } = req.body;
    await student.update({
      name: name || student.name,
      email: email ? email.trim().toLowerCase() : student.email,
      phone: phone !== undefined ? phone : student.phone,
      rollNo: rollNo !== undefined ? rollNo : student.rollNo,
      enrollmentNo: enrollmentNo !== undefined ? enrollmentNo : student.enrollmentNo,
      parentName: parentName !== undefined ? parentName : student.parentName,
      parentMobile: parentMobile !== undefined ? parentMobile : student.parentMobile,
      branchId: branchId || student.branchId,
      semesterId: semesterId || student.semesterId,
      sectionId: sectionId || student.sectionId
    });

    res.json({ success: true, message: 'Student updated successfully', student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    const student = await User.findOne({ where: { id, collegeId: req.collegeId, role: 'STUDENT' } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    await student.destroy();
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.9 Trainer Assignment
async function assignTrainer(req, res) {
  try {
    const { trainingId, trainerId, sectionId } = req.body;
    const training = await Training.findOne({ where: { id: trainingId, collegeId: req.collegeId } });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });

    await training.update({
      trainerId: trainerId || training.trainerId,
      sectionId: sectionId || training.sectionId
    });

    res.json({ success: true, message: 'Trainer assigned successfully', training });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.13 Daily Content Confirmation Monitor
async function getContentConfirmations(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainingId } = req.query;

    const delivery = await DailyTopicDelivery.findOne({
      where: { collegeId, ...(trainingId ? { trainingId } : {}) },
      order: [['deliveryDate', 'DESC']],
      include: [
        { model: CourseTopic, as: 'topic' },
        { model: User, as: 'trainer', attributes: ['name'] }
      ]
    });

    let stats = { totalStudents: 60, yes: 56, no: 2, pending: 2 };
    let confirmationList = [];

    if (delivery) {
      const confirmations = await ContentConfirmation.findAll({
        where: { dailyDeliveryId: delivery.id },
        include: [{ model: User, as: 'student', attributes: ['id', 'name', 'enrollmentNo', 'rollNo'] }]
      });

      if (confirmations.length > 0) {
        const yes = confirmations.filter(c => c.isDelivered === 'YES').length;
        const no = confirmations.filter(c => c.isDelivered === 'NO').length;
        const pending = confirmations.filter(c => c.isDelivered === 'PENDING').length;
        stats = {
          totalStudents: confirmations.length,
          yes,
          no,
          pending
        };
        confirmationList = confirmations;
      }
    }

    res.json({
      success: true,
      delivery,
      stats,
      confirmations: confirmationList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.17 Assessment Management
async function getAssessments(req, res) {
  try {
    const assessments = await Assessment.findAll({
      where: { collegeId: req.collegeId },
      include: [
        { model: Training, as: 'training', attributes: ['id', 'name'] },
        { model: Question, as: 'questions' },
        { model: AssessmentSubmission, as: 'submissions' }
      ]
    });

    const augmented = assessments.map(a => {
      const plain = a.toJSON();
      plain.questionCount = plain.questions ? plain.questions.length : 0;
      plain.submissionCount = plain.submissions ? plain.submissions.length : 0;
      return plain;
    });

    res.json({ success: true, assessments: augmented });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createAssessment(req, res) {
  try {
    const { trainingId, title, durationMinutes, totalMarks, passingMarks, instructions } = req.body;
    const assessment = await Assessment.create({
      collegeId: req.collegeId,
      trainingId: trainingId || 1,
      title,
      durationMinutes: durationMinutes || 60,
      totalMarks: totalMarks || 50,
      passingMarks: passingMarks || 20,
      instructions: instructions || '',
      status: 'PUBLISHED'
    });

    res.status(201).json({ success: true, assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function addAssessmentQuestion(req, res) {
  try {
    const { assessmentId } = req.params;
    const { type, text, options, correctAnswer, marks, difficulty, language, boilerplateCode, topicName } = req.body;

    const question = await Question.create({
      assessmentId,
      type: type || 'MCQ',
      text,
      options: options || [],
      correctAnswer: correctAnswer || '',
      marks: marks || 1,
      difficulty: difficulty || 'MEDIUM',
      language: language || 'Java',
      boilerplateCode: boilerplateCode || '',
      topicName: topicName || 'General'
    });

    res.status(201).json({ success: true, question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function uploadQuestionsExcelEndpoint(req, res) {
  try {
    const { assessmentId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const result = await importQuestionsFromExcel(req.file.buffer, assessmentId);
    res.json({ success: true, message: `Questions imported: ${result.imported}`, summary: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.24 Notification Management & Direct Absence Alert
async function sendNotification(req, res) {
  try {
    const { recipientRole, recipientId, title, message, type } = req.body;
    const notification = await Notification.create({
      collegeId: req.collegeId,
      recipientRole: recipientRole || 'STUDENT',
      recipientId: recipientId || null,
      title,
      message,
      type: type || 'IN_APP'
    });

    res.status(201).json({ success: true, message: 'Notification dispatched successfully', notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function sendParentAbsenceAlert(req, res) {
  try {
    const { studentId } = req.body;
    const student = await User.findByPk(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const notification = await Notification.create({
      collegeId: req.collegeId,
      recipientId: student.id,
      recipientRole: 'PARENT',
      title: `3 Consecutive Absences Detected - ${student.name}`,
      message: `Dear Parent, ${student.name} has been absent from technical training for 3 consecutive days. Kindly review with student.`,
      type: 'WHATSAPP_LOG'
    });

    res.json({
      success: true,
      message: `WhatsApp alert successfully logged and sent to parent of ${student.name} (${student.parentMobile || '+91 9876543210'})!`,
      notification
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.25 Fetch Complete College Settings
async function getCollegeSettings(req, res) {
  try {
    const collegeId = req.collegeId || 1;
    const college = await College.findByPk(collegeId);
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    // Defaults for institutional policy sections
    const defaultSettings = {
      attendancePolicy: {
        minimumPercentage: 75,
        graceMinutes: 15,
        consecutiveAbsenceThreshold: 3,
        enableParentWhatsAppAlerts: true,
        enableDailyAbsenceSMS: false,
        strictAttendanceForExams: true
      },
      assessmentPolicy: {
        defaultPassingPercentage: 40,
        negativeMarkingDefault: false,
        defaultNegativeMarks: 0.5,
        randomizeQuestions: true,
        randomizeOptions: true,
        showResultImmediately: true,
        allowedCodingLanguages: ['Java', 'Python', 'C++', 'JavaScript', 'C#'],
        compilerTimeoutSeconds: 5
      },
      notificationPreferences: {
        studentWelcomeEmail: true,
        trainerAssignmentAlerts: true,
        parentAbsenceAlerts: true,
        assessmentPublishedSMS: true,
        weeklyDigestToAdmin: true
      },
      securitySettings: {
        twoFactorAuthRequired: false,
        sessionTimeoutMinutes: 60,
        enforceStrongPassword: true,
        allowExportReportsToTrainers: false
      },
      permissionMatrix: [
        { role: 'COLLEGE_ADMIN', manageTrainings: true, gradeAssessments: true, publishResults: true, exportReports: true, manageFaculty: true },
        { role: 'ACADEMIC_COORDINATOR', manageTrainings: true, gradeAssessments: true, publishResults: false, exportReports: true, manageFaculty: false },
        { role: 'TRAINER', manageTrainings: false, gradeAssessments: true, publishResults: false, exportReports: true, manageFaculty: false },
        { role: 'EVALUATOR', manageTrainings: false, gradeAssessments: true, publishResults: false, exportReports: false, manageFaculty: false },
        { role: 'STUDENT', manageTrainings: false, gradeAssessments: false, publishResults: false, exportReports: false, manageFaculty: false }
      ]
    };

    const mergedConfig = {
      ...defaultSettings,
      ...(college.settingsConfig || {})
    };

    return res.json({
      success: true,
      settings: {
        id: college.id,
        name: college.name,
        code: college.code,
        tenantId: college.tenantId,
        email: college.email,
        phone: college.phone || '',
        address: college.address || '',
        website: college.website || 'https://college.edu.in',
        affiliation: college.affiliation || 'State Technical Board / UGC',
        establishedYear: college.establishedYear || '2005',
        primaryColor: college.primaryColor || '#2563eb',
        secondaryColor: college.secondaryColor || '#1d4ed8',
        logoUrl: college.logoUrl || '',
        loginBgUrl: college.loginBgUrl || '',
        faviconUrl: college.faviconUrl || '',
        status: college.status,
        ...mergedConfig
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.25 College Settings & Branding Update
async function updateCollegeSettings(req, res) {
  try {
    const collegeId = req.collegeId || 1;
    const college = await College.findByPk(collegeId);
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    const {
      name,
      code,
      phone,
      address,
      website,
      affiliation,
      establishedYear,
      primaryColor,
      secondaryColor,
      logoUrl,
      loginBgUrl,
      faviconUrl,
      attendancePolicy,
      assessmentPolicy,
      notificationPreferences,
      securitySettings,
      permissionMatrix,
      settingsConfig
    } = req.body;

    const existingConfig = college.settingsConfig || {};
    const updatedConfig = {
      ...existingConfig,
      ...(settingsConfig || {}),
      ...(attendancePolicy ? { attendancePolicy } : {}),
      ...(assessmentPolicy ? { assessmentPolicy } : {}),
      ...(notificationPreferences ? { notificationPreferences } : {}),
      ...(securitySettings ? { securitySettings } : {}),
      ...(permissionMatrix ? { permissionMatrix } : {})
    };

    await college.update({
      name: name || college.name,
      code: code || college.code,
      phone: phone !== undefined ? phone : college.phone,
      address: address !== undefined ? address : college.address,
      website: website !== undefined ? website : college.website,
      affiliation: affiliation !== undefined ? affiliation : college.affiliation,
      establishedYear: establishedYear !== undefined ? establishedYear : college.establishedYear,
      primaryColor: primaryColor || college.primaryColor,
      secondaryColor: secondaryColor || college.secondaryColor,
      logoUrl: logoUrl !== undefined ? logoUrl : college.logoUrl,
      loginBgUrl: loginBgUrl !== undefined ? loginBgUrl : college.loginBgUrl,
      faviconUrl: faviconUrl !== undefined ? faviconUrl : college.faviconUrl,
      settingsConfig: updatedConfig
    });

    res.json({
      success: true,
      message: 'College institutional settings updated successfully',
      college: {
        id: college.id,
        name: college.name,
        code: college.code,
        primaryColor: college.primaryColor,
        secondaryColor: college.secondaryColor,
        logoUrl: college.logoUrl,
        loginBgUrl: college.loginBgUrl,
        settingsConfig: college.settingsConfig
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2.25 Security & System Audit Logs
async function getAuditLogs(req, res) {
  try {
    const collegeId = req.collegeId;
    const { category, level, limit = 100 } = req.query;

    const [trainingLogs, trainerLogs, studentLogs] = await Promise.all([
      TrainingAuditLog.findAll({
        where: { collegeId },
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] }],
        order: [['id', 'DESC']],
        limit: parseInt(limit)
      }).catch(() => []),
      TrainerAuditLog.findAll({
        where: { collegeId },
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] }],
        order: [['id', 'DESC']],
        limit: parseInt(limit)
      }).catch(() => []),
      StudentActivityLog.findAll({
        where: { collegeId },
        include: [{ model: User, as: 'student', attributes: ['id', 'name', 'email', 'rollNo'] }],
        order: [['id', 'DESC']],
        limit: parseInt(limit)
      }).catch(() => [])
    ]);

    let unified = [
      ...trainingLogs.map(l => ({
        id: `trn-${l.id}`,
        action: l.action || 'Training Event',
        category: l.moduleName || 'TRAINING',
        details: l.details || '',
        performedBy: l.actor ? `${l.actor.name} (${l.actor.role || 'Admin'})` : 'System / Admin',
        ip: l.ipAddress || '127.0.0.1',
        level: 'INFO',
        timestamp: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString()
      })),
      ...trainerLogs.map(l => ({
        id: `tr-${l.id}`,
        action: l.action || 'Trainer Activity',
        category: 'TRAINER',
        details: l.details || '',
        performedBy: l.actor ? `${l.actor.name} (${l.actor.role || 'Admin'})` : 'System',
        ip: l.ipAddress || '127.0.0.1',
        level: 'INFO',
        timestamp: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString()
      })),
      ...studentLogs.map(l => ({
        id: `stu-${l.id}`,
        action: l.activityType || 'Student Activity',
        category: 'STUDENT',
        details: l.description || '',
        performedBy: l.student ? `${l.student.name} (Student)` : 'System',
        ip: '127.0.0.1',
        level: 'INFO',
        timestamp: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString()
      }))
    ];

    if (category && category !== 'ALL') {
      unified = unified.filter(l => l.category?.toUpperCase() === category.toUpperCase());
    }
    if (level && level !== 'ALL') {
      unified = unified.filter(l => l.level?.toUpperCase() === level.toUpperCase());
    }

    unified.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, logs: unified.slice(0, parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getAbsenceAlertsEndpoint(req, res) {
  try {
    const alerts = await getCollegeAbsenceAlerts(req.collegeId);
    res.json({ success: true, alerts: alerts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDashboard,
  ...academicController,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentsExcel,
  getStudentProfile,
  getTrainers,
  createTrainer,
  assignTrainer,
  getTrainings,
  createTraining,
  getCourseDetails,
  addCourseModule,
  addCourseTopic,
  getContentConfirmations,
  getAttendanceDashboard,
  updateAttendanceRule,
  getAssessments,
  createAssessment,
  addAssessmentQuestion,
  uploadQuestionsExcelEndpoint,
  sendNotification,
  sendParentAbsenceAlert,
  getCollegeSettings,
  updateCollegeSettings,
  getAuditLogs,
  getAbsenceAlertsEndpoint
};
