const { Attendance, Notification, User, Training } = require('../models');
const { Op } = require('sequelize');

async function checkConsecutiveAbsences(collegeId, studentId, trainingId = null) {
  try {
    const where = { collegeId, studentId };
    if (trainingId) where.trainingId = trainingId;

    const recentAttendances = await Attendance.findAll({
      where,
      order: [['date', 'DESC']],
      limit: 5
    });

    let consecutiveAbsentCount = 0;
    for (const record of recentAttendances) {
      if (record.status === 'ABSENT') {
        consecutiveAbsentCount++;
      } else {
        break; // Stop when a non-absent day is encountered
      }
    }

    if (consecutiveAbsentCount >= 3) {
      const student = await User.findByPk(studentId);
      const training = trainingId ? await Training.findByPk(trainingId) : null;
      const trainingName = training ? training.name : 'Training';

      // Check if notification already sent in last 24h
      const existingAlert = await Notification.findOne({
        where: {
          collegeId,
          recipientId: studentId,
          title: { [Op.like]: '%Consecutive Absences Detected%' },
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existingAlert) {
        // 1. WhatsApp simulation to Parent
        await Notification.create({
          collegeId,
          recipientId: studentId,
          recipientRole: 'PARENT',
          title: `3 Consecutive Absences Detected - ${student ? student.name : 'Student'}`,
          message: `Dear Parent, ${student ? student.name : 'your child'} has been absent from ${trainingName} training for 3 consecutive days. Kindly review with student.`,
          type: 'WHATSAPP_LOG'
        });

        // 2. Alert for College Admin
        await Notification.create({
          collegeId,
          recipientRole: 'COLLEGE_ADMIN',
          title: `Consecutive Absence Alert: ${student ? student.name : 'Student'}`,
          message: `Student ${student ? student.name : ''} (Enrollment: ${student ? student.enrollmentNo : ''}) has been absent for 3 consecutive sessions in ${trainingName}.`,
          type: 'IN_APP'
        });
      }

      return {
        hasAlert: true,
        consecutiveDays: consecutiveAbsentCount,
        studentName: student ? student.name : 'Student',
        enrollmentNo: student ? student.enrollmentNo : '',
        parentMobile: student ? student.parentMobile : ''
      };
    }

    return { hasAlert: false, consecutiveDays: consecutiveAbsentCount };
  } catch (error) {
    console.error('Error in checkConsecutiveAbsences:', error);
    return { hasAlert: false, error: error.message };
  }
}

// Scans entire college for low attendance & consecutive absences
async function getCollegeAbsenceAlerts(collegeId) {
  try {
    const students = await User.findAll({
      where: { collegeId, role: 'STUDENT', isActive: true }
    });

    const flaggedStudents = [];

    for (const student of students) {
      const recent = await Attendance.findAll({
        where: { collegeId, studentId: student.id },
        order: [['date', 'DESC']],
        limit: 3
      });

      if (recent.length === 3 && recent.every(r => r.status === 'ABSENT')) {
        flaggedStudents.push({
          id: student.id,
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          parentName: student.parentName,
          parentMobile: student.parentMobile,
          absentDays: 3,
          message: `⚠ ${student.name} — 3 Days Absent (Parent Notified via WhatsApp)`
        });
      }
    }

    return flaggedStudents;
  } catch (err) {
    console.error('Error getting absence alerts:', err);
    return [];
  }
}

module.exports = {
  checkConsecutiveAbsences,
  getCollegeAbsenceAlerts
};
