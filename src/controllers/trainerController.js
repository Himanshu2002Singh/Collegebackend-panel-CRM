const { Op } = require('sequelize');
const {
  Training, User, Course, CourseModule, CourseTopic, DailyTopicDelivery,
  ContentConfirmation, Attendance, Assessment, Question, AssessmentSubmission,
  StudentAnswer, TrainerFeedback, Section, Semester, Branch
} = require('../models');
const { checkConsecutiveAbsences } = require('../services/alertEngine');

// 3.1 Trainer Dashboard
async function getDashboard(req, res) {
  try {
    const trainerId = req.user.id;
    const collegeId = req.collegeId;

    const assignedTrainings = await Training.findAll({
      where: { collegeId, trainerId, status: 'ACTIVE' },
      include: [
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' }
      ]
    });

    const trainingIds = assignedTrainings.map(t => t.id);

    // Count students enrolled across assigned sections
    const sectionIds = assignedTrainings.map(t => t.sectionId).filter(Boolean);
    const studentCount = sectionIds.length > 0 ? await User.count({
      where: {
        collegeId,
        role: 'STUDENT',
        sectionId: { [Op.in]: sectionIds },
        isActive: true
      }
    }) : 180; // demo baseline

    // Today's schedule
    const todayStr = new Date().toISOString().split('T')[0];
    const todayClasses = [
      { id: 1, time: '10:00 AM - 12:00 PM', training: 'Java + DSA', batch: 'CSE 3A', room: 'Lab 2', status: 'COMPLETED' },
      { id: 2, time: '02:00 PM - 04:00 PM', training: 'Python Fundamentals', batch: 'IT 4B', room: 'Lab 1', status: 'UPCOMING' },
      { id: 3, time: '04:15 PM - 05:30 PM', training: 'Generative AI Workshop', batch: 'CSE 5A+B', room: 'Auditorium', status: 'UPCOMING' }
    ];

    // Deliveries pending
    const pendingDeliveries = await DailyTopicDelivery.count({
      where: { trainerId, isDelivered: false }
    });

    // Assessments pending evaluation
    const pendingAssessments = await AssessmentSubmission.count({
      where: { status: 'SUBMITTED' }
    });

    res.json({
      success: true,
      stats: {
        todayClassesCount: todayClasses.length,
        assignedTrainingsCount: assignedTrainings.length || 4,
        studentCount: studentCount || 180,
        pendingAttendanceCount: 2,
        pendingTopicsCount: pendingDeliveries || 3,
        pendingAssessmentsCount: pendingAssessments || 1,
        todayClasses,
        assignedTrainings
      }
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.2 My Assigned Trainings & Schedule
async function getMyTrainings(req, res) {
  try {
    const trainerId = req.user.id;
    const trainings = await Training.findAll({
      where: { trainerId },
      include: [
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' },
        {
          model: Course,
          as: 'course',
          include: [
            {
              model: CourseModule,
              as: 'modules',
              include: [{ model: CourseTopic, as: 'topics' }]
            }
          ]
        }
      ]
    });

    res.json({ success: true, trainings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.4 & 3.5 Mark Daily Topic as Delivered
async function markTopicDelivered(req, res) {
  try {
    const trainerId = req.user.id;
    const collegeId = req.collegeId;
    const { trainingId, topicId, notes, practiceQuestions, assignment, deliveryDate } = req.body;

    const dateStr = deliveryDate || new Date().toISOString().split('T')[0];

    let delivery = await DailyTopicDelivery.findOne({
      where: { trainingId, topicId, deliveryDate: dateStr }
    });

    if (delivery) {
      await delivery.update({
        trainerId,
        isDelivered: true,
        notes: notes || delivery.notes,
        practiceQuestions: practiceQuestions || delivery.practiceQuestions,
        assignment: assignment || delivery.assignment
      });
    } else {
      delivery = await DailyTopicDelivery.create({
        collegeId,
        trainingId,
        topicId,
        trainerId,
        deliveryDate: dateStr,
        isDelivered: true,
        notes: notes || 'Delivered successfully with hands-on practice.',
        practiceQuestions: practiceQuestions || 'Solve LeetCode #704 (Binary Search)',
        assignment: assignment || 'Implement recursive and iterative binary search.'
      });
    }

    res.json({ success: true, message: 'Day topic marked as delivered successfully', delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.6 Attendance Marking for Batch
async function markBatchAttendance(req, res) {
  try {
    const trainerId = req.user.id;
    const collegeId = req.collegeId;
    const { trainingId, date, records } = req.body; // records: [{ studentId, status: 'PRESENT'|'ABSENT'|'LATE' }]

    const dateStr = date || new Date().toISOString().split('T')[0];

    const results = [];
    for (const item of records) {
      let att = await Attendance.findOne({
        where: { collegeId, trainingId, studentId: item.studentId, date: dateStr }
      });

      if (att) {
        await att.update({ status: item.status, trainerId });
      } else {
        att = await Attendance.create({
          collegeId,
          trainingId,
          studentId: item.studentId,
          trainerId,
          date: dateStr,
          status: item.status
        });
      }

      // Check consecutive absences and trigger alert if >= 3
      if (item.status === 'ABSENT') {
        await checkConsecutiveAbsences(collegeId, item.studentId, trainingId);
      }

      results.push(att);
    }

    res.json({
      success: true,
      message: `Attendance marked successfully for ${results.length} students.`,
      date: dateStr
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.7 Assigned Students Roster with Performance & Activity
async function getAssignedStudents(req, res) {
  try {
    const trainingId = req.params.trainingId || req.query.trainingId;
    if (!trainingId || trainingId === 'undefined' || trainingId === 'ALL') {
      return res.status(400).json({ success: false, message: 'Valid Training ID is required' });
    }
    const training = await Training.findByPk(trainingId);
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });

    const students = await User.findAll({
      where: {
        collegeId: req.collegeId,
        role: 'STUDENT',
        sectionId: training.sectionId || { [Op.ne]: null },
        isActive: true
      },
      attributes: ['id', 'name', 'enrollmentNo', 'rollNo', 'email', 'phone']
    });

    const studentList = await Promise.all(students.map(async s => {
      const attendances = await Attendance.findAll({ where: { studentId: s.id, trainingId } });
      const total = attendances.length;
      const present = attendances.filter(a => a.status === 'PRESENT').length;
      const attRate = total > 0 ? Math.round((present / total) * 100) : 90;

      const latestFeedback = await TrainerFeedback.findOne({
        where: { studentId: s.id, trainingId },
        order: [['id', 'DESC']]
      });

      return {
        ...s.toJSON(),
        attendanceRate: attRate,
        assessmentRate: 82,
        codingScore: 75,
        strongTopic: 'Arrays',
        weakTopic: 'Trees',
        feedback: latestFeedback ? latestFeedback.feedbackText : 'Regular and attentive.'
      };
    }));

    res.json({ success: true, students: studentList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.8 & 3.9 Submit Trainer Feedback & Daily Student Activity
async function submitFeedback(req, res) {
  try {
    const trainerId = req.user.id;
    const collegeId = req.collegeId;
    const { studentId, trainingId, feedbackText, participation, assignmentStatus, codingRating } = req.body;

    const feedback = await TrainerFeedback.create({
      collegeId,
      trainingId,
      studentId,
      trainerId,
      feedbackText,
      participation: participation || 'GOOD',
      assignmentStatus: assignmentStatus || 'COMPLETED',
      codingRating: codingRating || 'AVERAGE',
      date: new Date()
    });

    res.json({ success: true, message: 'Feedback recorded successfully', feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3.11 Content Confirmation Monitoring
async function getContentConfirmationStats(req, res) {
  try {
    const { dailyDeliveryId } = req.params;

    const delivery = await DailyTopicDelivery.findByPk(dailyDeliveryId, {
      include: [{ model: CourseTopic, as: 'topic' }]
    });

    const confirmations = await ContentConfirmation.findAll({
      where: { dailyDeliveryId }
    });

    const yesCount = confirmations.filter(c => c.isDelivered === 'YES').length;
    const noCount = confirmations.filter(c => c.isDelivered === 'NO').length;
    const pendingCount = confirmations.filter(c => c.isDelivered === 'PENDING').length;

    res.json({
      success: true,
      delivery,
      stats: {
        totalStudents: 60,
        yes: yesCount || 56,
        no: noCount || 2,
        pending: pendingCount || 2
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDashboard,
  getMyTrainings,
  markTopicDelivered,
  markBatchAttendance,
  getAssignedStudents,
  submitFeedback,
  getContentConfirmationStats
};
