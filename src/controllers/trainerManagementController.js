const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const xlsx = require('xlsx');
const {
  sequelize,
  User,
  College,
  Training,
  Course,
  CourseModule,
  CourseTopic,
  DailyTopicDelivery,
  ContentConfirmation,
  Attendance,
  AttendanceCorrection,
  Assessment,
  AssessmentSubmission,
  TrainerFeedback,
  TrainerAssignment,
  TrainerSchedule,
  TrainerAvailability,
  TrainerLeave,
  StudentTrainerFeedback,
  AdminTrainerFeedback,
  TrainerInvitation,
  TrainerDocument,
  TrainerAuditLog,
  AcademicYear,
  Program,
  Semester,
  Branch,
  Section,
  AcademicBatch,
  TrainingStudent,
  Notification
} = require('../models');

// Helper to log audit actions
async function recordTrainerAudit(collegeId, trainerId, action, moduleName, details, oldValue = '', newValue = '', actorId = null, ip = '') {
  try {
    await TrainerAuditLog.create({
      collegeId,
      trainerId,
      action,
      module: moduleName,
      details,
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue),
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
      performedBy: actorId,
      ipAddress: ip || ''
    });
  } catch (err) {
    console.error('Failed to record trainer audit log:', err.message);
  }
}

// 1. Trainer Dashboard Overview & Alerts
async function getTrainerDashboardStats(req, res) {
  try {
    const collegeId = req.collegeId;

    // Top Cards: Trainer Statuses
    const totalTrainers = await User.count({ where: { collegeId, role: 'TRAINER' } });
    const activeTrainers = await User.count({ where: { collegeId, role: 'TRAINER', trainerStatus: 'ACTIVE' } });
    const inactiveTrainers = await User.count({ where: { collegeId, role: 'TRAINER', trainerStatus: 'INACTIVE' } });
    const onLeaveTrainers = await User.count({ where: { collegeId, role: 'TRAINER', trainerStatus: 'ON_LEAVE' } });

    // Training Statistics
    const activeTrainings = await Training.count({ where: { collegeId, status: 'ACTIVE' } });
    
    // Distinct batches from assignments
    const activeBatchesCount = await TrainerAssignment.count({
      where: { collegeId, status: 'ACTIVE' },
      distinct: true,
      col: 'batchName'
    });

    // Today's classes count
    const today = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayOfWeek = days[today.getDay()];
    const todayDateStr = today.toISOString().split('T')[0];

    const todayClassesCount = await TrainerSchedule.count({
      where: {
        collegeId,
        [Op.or]: [
          { dayOfWeek: currentDayOfWeek },
          { date: todayDateStr }
        ],
        status: { [Op.ne]: 'CANCELLED' }
      }
    });

    // Pending Attendance Sessions
    // (Today's schedules where attendance was not taken)
    const todaySchedules = await TrainerSchedule.findAll({
      where: {
        collegeId,
        [Op.or]: [
          { dayOfWeek: currentDayOfWeek },
          { date: todayDateStr }
        ],
        status: 'SCHEDULED'
      },
      attributes: ['id', 'trainingId', 'trainerId', 'batchName', 'startTime', 'room']
    });

    // Check which schedules don't have attendance records for today
    let pendingAttendanceCount = 0;
    const pendingAttendanceTrainers = [];

    for (const sch of todaySchedules) {
      const attExists = await Attendance.findOne({
        where: {
          collegeId,
          trainingId: sch.trainingId,
          date: todayDateStr
        }
      });
      if (!attExists) {
        pendingAttendanceCount++;
        pendingAttendanceTrainers.push(sch);
      }
    }

    // Pending Content: Daily topic deliveries scheduled today without isDelivered = true
    const deliveredTodayCount = await DailyTopicDelivery.count({
      where: { collegeId, deliveryDate: todayDateStr, isDelivered: true }
    });
    const pendingContentCount = Math.max(0, todayClassesCount - deliveredTodayCount);

    // Performance Ratios & Aggregates
    const feedbackRecords = await StudentTrainerFeedback.findAll({
      where: { collegeId },
      attributes: ['rating', 'teachingQuality', 'communication', 'doubtResolution', 'contentKnowledge']
    });

    let avgRating = 4.7;
    if (feedbackRecords.length > 0) {
      const sum = feedbackRecords.reduce((acc, f) => acc + (f.rating || 5.0), 0);
      avgRating = Number((sum / feedbackRecords.length).toFixed(1));
    }

    // Content Completion % across active trainings
    const totalTopics = await CourseTopic.count();
    const deliveredTopics = await DailyTopicDelivery.count({
      where: { collegeId, isDelivered: true }
    });
    const contentCompletionRate = totalTopics > 0 
      ? Math.min(100, Math.round((deliveredTopics / Math.max(totalTopics, 1)) * 100))
      : 88;

    // Attendance Completion % (Total Present / Total Records)
    const totalAttRecords = await Attendance.count({ where: { collegeId } });
    const presentAttRecords = await Attendance.count({ where: { collegeId, status: 'PRESENT' } });
    const attendanceCompletionRate = totalAttRecords > 0 
      ? Math.round((presentAttRecords / totalAttRecords) * 100) 
      : 94;

    // Overloaded Trainers (>35 hours or >18 classes)
    const allTrainersList = await User.findAll({
      where: { collegeId, role: 'TRAINER', trainerStatus: 'ACTIVE' },
      attributes: ['id', 'name', 'maxWeeklyHours', 'maxWeeklyClasses']
    });

    const overloadedTrainers = [];
    for (const tr of allTrainersList) {
      const classCount = await TrainerSchedule.count({
        where: { collegeId, trainerId: tr.id, status: 'SCHEDULED' }
      });
      const weeklyHours = classCount * 2; // approx 2h per session
      if (classCount > (tr.maxWeeklyClasses || 18) || weeklyHours > (tr.maxWeeklyHours || 35)) {
        overloadedTrainers.push({
          id: tr.id,
          name: tr.name,
          classCount,
          weeklyHours,
          limitHours: tr.maxWeeklyHours || 35
        });
      }
    }

    // Unassigned active classes / trainings without a trainer
    const unassignedTrainingsCount = await Training.count({
      where: { collegeId, status: 'ACTIVE', trainerId: null }
    });

    // Build system alerts list
    const alerts = [];
    if (pendingAttendanceCount > 0) {
      alerts.push({
        id: 'alt_att',
        type: 'WARNING',
        message: `${pendingAttendanceCount} trainer session(s) have pending attendance for today.`,
        actionTab: 'trainer_attendance'
      });
    }
    if (pendingContentCount > 0) {
      alerts.push({
        id: 'alt_content',
        type: 'INFO',
        message: `${pendingContentCount} class(es) have not yet marked today's course topic as delivered.`,
        actionTab: 'trainer_teaching'
      });
    }
    if (overloadedTrainers.length > 0) {
      alerts.push({
        id: 'alt_workload',
        type: 'DANGER',
        message: `Trainer ${overloadedTrainers[0].name} has workload (${overloadedTrainers[0].weeklyHours} hrs) exceeding the configured limit (${overloadedTrainers[0].limitHours} hrs).`,
        actionTab: 'trainer_workload'
      });
    }
    if (unassignedTrainingsCount > 0) {
      alerts.push({
        id: 'alt_unassigned',
        type: 'WARNING',
        message: `${unassignedTrainingsCount} active training program(s) require a designated trainer assignment.`,
        actionTab: 'trainer_assignments'
      });
    }

    return res.json({
      success: true,
      stats: {
        totalTrainers,
        activeTrainers,
        inactiveTrainers,
        onLeaveTrainers,
        activeTrainings,
        activeBatches: activeBatchesCount || 12,
        todayClasses: todayClassesCount || 8,
        pendingAttendance: pendingAttendanceCount,
        pendingContent: pendingContentCount,
        averageRating: avgRating,
        contentCompletionRate,
        attendanceCompletionRate,
        studentFeedbackRating: avgRating,
        overloadedCount: overloadedTrainers.length,
        alerts
      }
    });
  } catch (err) {
    console.error('getTrainerDashboardStats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 1b. Distinct Trainer Departments (Dynamic from Branches, Programs, Trainers in DB)
async function getTrainerDepartments(req, res) {
  try {
    const collegeId = req.collegeId;
    const branches = await Branch.findAll({
      where: { collegeId },
      attributes: ['name', 'department']
    });
    const programs = await Program.findAll({
      where: { collegeId },
      attributes: ['department']
    });
    const trainerUsers = await User.findAll({
      where: { collegeId, role: 'TRAINER' },
      attributes: ['department']
    });

    const deptSet = new Set();
    branches.forEach(b => {
      if (b.name && b.name.trim()) deptSet.add(b.name.trim());
      if (b.department && b.department.trim()) deptSet.add(b.department.trim());
    });
    programs.forEach(p => {
      if (p.department && p.department.trim()) deptSet.add(p.department.trim());
    });
    trainerUsers.forEach(u => {
      if (u.department && u.department.trim()) deptSet.add(u.department.trim());
    });

    if (deptSet.size === 0) {
      deptSet.add('Computer Science & Engineering');
      deptSet.add('Information Technology');
      deptSet.add('Electronics & Communication Engineering');
      deptSet.add('Mechanical Engineering');
      deptSet.add('Civil Engineering');
      deptSet.add('Electrical Engineering');
    }

    const departments = Array.from(deptSet).filter(Boolean).sort();
    return res.json({ success: true, departments });
  } catch (err) {
    console.error('getTrainerDepartments error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 2. All Trainers Directory (Multi-Filter, Pagination, Metrics)
async function getTrainersDirectory(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      page = 1,
      limit = 20,
      search = '',
      academicYearId,
      department,
      specialization,
      trainingId,
      trainerType,
      trainerStatus,
      sortBy = 'id',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { collegeId, role: 'TRAINER' };

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
        { employeeId: { [Op.like]: q } },
        { specialization: { [Op.like]: q } },
        { department: { [Op.like]: q } }
      ];
    }

    if (trainerStatus && trainerStatus !== 'ALL') {
      where.trainerStatus = trainerStatus;
    }

    if (trainerType && trainerType !== 'ALL') {
      where.trainerType = trainerType;
    }

    if (department && department !== 'ALL') {
      where.department = department;
    }

    if (specialization && specialization.trim()) {
      where.specialization = { [Op.like]: `%${specialization.trim()}%` };
    }

    const { count, rows: trainers } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      attributes: { exclude: ['password'] }
    });

    // Enrich trainers with assignment counts, enrolled students, ratings, and workload
    const enriched = await Promise.all(
      trainers.map(async (tr) => {
        const plain = tr.toJSON();

        // Assigned trainings
        const assignments = await TrainerAssignment.findAll({
          where: { collegeId, trainerId: tr.id, status: 'ACTIVE' },
          include: [
            { model: Training, as: 'training', attributes: ['id', 'name', 'type'] },
            { model: AcademicYear, as: 'academicYear', attributes: ['id', 'yearName'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
            { model: Semester, as: 'semester', attributes: ['id', 'semesterNumber'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
            { model: AcademicBatch, as: 'batch', attributes: ['id', 'name', 'type'] }
          ]
        });

        // Unique training IDs
        const trIds = [...new Set(assignments.map(a => a.trainingId))];
        let studentCount = 0;
        if (trIds.length > 0) {
          studentCount = await TrainingStudent.count({
            where: { collegeId, trainingId: { [Op.in]: trIds } }
          });
        }

        // Weekly scheduled sessions
        const weeklyClasses = await TrainerSchedule.count({
          where: { collegeId, trainerId: tr.id, status: 'SCHEDULED' }
        });
        const weeklyHours = weeklyClasses * 2; // ~2 hrs per class

        // Rating
        const feedbackList = await StudentTrainerFeedback.findAll({
          where: { collegeId, trainerId: tr.id },
          attributes: ['rating']
        });
        let rating = 4.8;
        if (feedbackList.length > 0) {
          const sum = feedbackList.reduce((acc, f) => acc + (f.rating || 5), 0);
          rating = Number((sum / feedbackList.length).toFixed(1));
        }

        // Workload Status
        let workloadLevel = 'NORMAL';
        const limitHrs = tr.maxWeeklyHours || 35;
        if (weeklyHours > limitHrs) {
          workloadLevel = 'OVERLOADED';
        } else if (weeklyHours >= limitHrs * 0.8) {
          workloadLevel = 'HIGH';
        }

        return {
          ...plain,
          assignmentsCount: assignments.length,
          trainingsCount: trIds.length,
          studentsCount: studentCount,
          weeklyClasses,
          weeklyHours,
          workloadLevel,
          rating,
          assignedBatches: assignments.map(a => a.batch?.name || a.batchName || (a.branch ? `${a.branch.code} Sem ${a.semester?.semesterNumber || ''}` : 'Batch A')),
          assignments
        };
      })
    );

    return res.json({
      success: true,
      trainers: enriched,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getTrainersDirectory error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 3. Trainer 360° Profile Comprehensive Dossier
async function getTrainer360Profile(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;

    const trainer = await User.findOne({
      where: { id, collegeId, role: 'TRAINER' },
      attributes: { exclude: ['password'] }
    });

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    // 1. Assignments
    const assignments = await TrainerAssignment.findAll({
      where: { collegeId, trainerId: id },
      include: [
        { model: Training, as: 'training' },
        { model: AcademicYear, as: 'academicYear' },
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' }
      ],
      order: [['id', 'DESC']]
    });

    // 2. Schedule Timetable
    const schedules = await TrainerSchedule.findAll({
      where: { collegeId, trainerId: id },
      include: [
        { model: Training, as: 'training', attributes: ['id', 'name'] },
        { model: User, as: 'substituteTrainer', attributes: ['id', 'name'] }
      ],
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // 3. Assigned Students (via TrainingStudent)
    const trainingIds = [...new Set(assignments.map(a => a.trainingId))];
    let students = [];
    if (trainingIds.length > 0) {
      const studentEnrollments = await TrainingStudent.findAll({
        where: { collegeId, trainingId: { [Op.in]: trainingIds } },
        include: [
          { 
            model: User, 
            as: 'student', 
            attributes: ['id', 'name', 'email', 'rollNo', 'phone', 'studentStatus'],
            include: [
              { model: Branch, as: 'branch', attributes: ['code', 'name'] },
              { model: Semester, as: 'semester', attributes: ['semesterNumber'] },
              { model: Section, as: 'section', attributes: ['name'] }
            ]
          },
          { model: Training, as: 'training', attributes: ['id', 'name'] }
        ],
        limit: 100
      });
      students = studentEnrollments.map(se => ({
        ...se.student?.toJSON(),
        trainingName: se.training?.name,
        enrollmentStatus: se.status
      }));
    }

    // 4. Content Delivery Log
    const contentDeliveries = await DailyTopicDelivery.findAll({
      where: { collegeId, trainerId: id },
      include: [
        { model: CourseTopic, as: 'topic', attributes: ['id', 'title'] },
        { model: Training, as: 'training', attributes: ['id', 'name'] }
      ],
      order: [['deliveryDate', 'DESC']],
      limit: 20
    });

    // 5. Student Confirmations for this trainer's topics
    const deliveryIds = contentDeliveries.map(cd => cd.id);
    let confirmationStats = { yes: 0, no: 0, pending: 0 };
    if (deliveryIds.length > 0) {
      const confirmations = await ContentConfirmation.findAll({
        where: { dailyDeliveryId: { [Op.in]: deliveryIds } },
        attributes: ['isDelivered']
      });
      confirmations.forEach(c => {
        if (c.isDelivered === 'YES') confirmationStats.yes++;
        else if (c.isDelivered === 'NO') confirmationStats.no++;
        else confirmationStats.pending++;
      });
    }

    // 6. Attendance Summary
    const attendanceRecords = await Attendance.findAll({
      where: { collegeId, trainerId: id },
      attributes: ['status', 'date']
    });
    const totalSessions = new Set(attendanceRecords.map(a => a.date)).size;
    const totalStudentMarks = attendanceRecords.length;
    const presentMarks = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const avgStudentAttendance = totalStudentMarks > 0 ? Math.round((presentMarks / totalStudentMarks) * 100) : 92;

    // 7. Student & Admin Feedbacks
    const studentFeedbacks = await StudentTrainerFeedback.findAll({
      where: { collegeId, trainerId: id },
      include: [{ model: User, as: 'student', attributes: ['id', 'name', 'rollNo'] }],
      order: [['id', 'DESC']]
    });

    const adminFeedbacks = await AdminTrainerFeedback.findAll({
      where: { collegeId, trainerId: id },
      include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
      order: [['id', 'DESC']]
    });

    // 8. Leaves & Availability
    const leaves = await TrainerLeave.findAll({
      where: { collegeId, trainerId: id },
      include: [{ model: User, as: 'substituteTrainer', attributes: ['id', 'name'] }],
      order: [['startDate', 'DESC']]
    });

    const availabilities = await TrainerAvailability.findAll({
      where: { collegeId, trainerId: id },
      order: [['dayOfWeek', 'ASC']]
    });

    // 9. Documents & Audit Logs
    const documents = await TrainerDocument.findAll({
      where: { collegeId, trainerId: id },
      order: [['id', 'DESC']]
    });

    const auditLogs = await TrainerAuditLog.findAll({
      where: { collegeId, trainerId: id },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
      limit: 50
    });

    // Workload computation
    const weeklyHours = schedules.length * 2;
    const limitHours = trainer.maxWeeklyHours || 35;
    let workloadStatus = 'NORMAL';
    if (weeklyHours > limitHours) workloadStatus = 'OVERLOADED';
    else if (weeklyHours >= limitHours * 0.8) workloadStatus = 'HIGH';

    return res.json({
      success: true,
      profile: {
        trainer: trainer.toJSON(),
        metrics: {
          trainingsCount: assignments.length,
          studentsCount: students.length,
          classesCount: schedules.length,
          weeklyHours,
          workloadStatus,
          attendanceRate: avgStudentAttendance,
          contentDeliveriesCount: contentDeliveries.length,
          rating: trainer.rating || 4.8,
          confirmationStats
        },
        assignments,
        schedules,
        students,
        contentDeliveries,
        studentFeedbacks,
        adminFeedbacks,
        leaves,
        availabilities,
        documents,
        auditLogs
      }
    });
  } catch (err) {
    console.error('getTrainer360Profile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 4. Create / Onboard New Trainer
async function createTrainer(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      name,
      email,
      password,
      phone,
      alternatePhone,
      employeeId,
      designation,
      department,
      joiningDate,
      trainerType = 'FULL_TIME',
      experience,
      specialization,
      skills,
      qualification,
      certifications,
      previousExperience,
      gender = 'MALE',
      dob,
      address,
      city,
      state,
      pincode,
      maxWeeklyHours = 35,
      maxWeeklyClasses = 18,
      trainerPermissions
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and official email are required.' });
    }

    // Check duplicate email
    const existing = await User.findOne({
      where: { collegeId, email: email.trim().toLowerCase() }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Check duplicate employee ID if provided
    if (employeeId && employeeId.trim()) {
      const existingEmp = await User.findOne({
        where: { collegeId, employeeId: employeeId.trim() }
      });
      if (existingEmp) {
        return res.status(400).json({ success: false, message: `Employee ID ${employeeId} is already in use.` });
      }
    }

    const hashedPassword = await bcrypt.hash(password || 'trainer123', 10);
    const empId = employeeId ? employeeId.trim() : `TR-${Date.now().toString().slice(-4)}`;

    const trainer = await User.create({
      collegeId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      alternatePhone: alternatePhone ? alternatePhone.trim() : '',
      role: 'TRAINER',
      employeeId: empId,
      designation: designation || 'Technical Instructor',
      department: department || 'Computer Science',
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      trainerType,
      experience: experience || '3 Years',
      specialization: specialization || 'Software Engineering',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : ['Programming']),
      qualification: qualification || 'B.Tech / MCA',
      certifications: certifications || '',
      previousExperience: previousExperience || '',
      gender: gender || 'MALE',
      dob: dob || null,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      trainerStatus: 'ACTIVE',
      maxWeeklyHours: parseInt(maxWeeklyHours) || 35,
      maxWeeklyClasses: parseInt(maxWeeklyClasses) || 18,
      trainerPermissions: trainerPermissions || ['VIEW_STUDENTS', 'ATTENDANCE', 'COURSE_CONTENT', 'FEEDBACK'],
      isActive: true
    });

    await recordTrainerAudit(
      collegeId,
      trainer.id,
      'TRAINER_ONBOARDED',
      'PROFILE',
      `Trainer ${trainer.name} onboarded with Employee ID: ${empId}`,
      null,
      trainer.toJSON(),
      req.userId,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Trainer created successfully!',
      trainer: {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        employeeId: trainer.employeeId,
        designation: trainer.designation
      }
    });
  } catch (err) {
    console.error('createTrainer error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 5. Update Trainer Details
async function updateTrainer(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;
    const updates = req.body;

    const trainer = await User.findOne({
      where: { id, collegeId, role: 'TRAINER' }
    });

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const oldData = trainer.toJSON();

    if (updates.name) trainer.name = updates.name.trim();
    if (updates.phone !== undefined) trainer.phone = updates.phone.trim();
    if (updates.alternatePhone !== undefined) trainer.alternatePhone = updates.alternatePhone.trim();
    if (updates.designation) trainer.designation = updates.designation.trim();
    if (updates.department) trainer.department = updates.department.trim();
    if (updates.trainerType) trainer.trainerType = updates.trainerType;
    if (updates.experience) trainer.experience = updates.experience;
    if (updates.specialization) trainer.specialization = updates.specialization;
    if (updates.qualification) trainer.qualification = updates.qualification;
    if (updates.skills) trainer.skills = Array.isArray(updates.skills) ? updates.skills : updates.skills.split(',').map(s => s.trim());
    if (updates.certifications !== undefined) trainer.certifications = updates.certifications;
    if (updates.previousExperience !== undefined) trainer.previousExperience = updates.previousExperience;
    if (updates.maxWeeklyHours) trainer.maxWeeklyHours = parseInt(updates.maxWeeklyHours);
    if (updates.maxWeeklyClasses) trainer.maxWeeklyClasses = parseInt(updates.maxWeeklyClasses);
    if (updates.trainerPermissions) trainer.trainerPermissions = updates.trainerPermissions;

    await trainer.save();

    await recordTrainerAudit(
      collegeId,
      trainer.id,
      'TRAINER_UPDATED',
      'PROFILE',
      `Trainer ${trainer.name} profile details updated`,
      oldData,
      trainer.toJSON(),
      req.userId,
      req.ip
    );

    return res.json({ success: true, message: 'Trainer details updated successfully!', trainer });
  } catch (err) {
    console.error('updateTrainer error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 6. Update Trainer Status
async function updateTrainerStatus(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'CONTRACT_ENDED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const trainer = await User.findOne({
      where: { id, collegeId, role: 'TRAINER' }
    });

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const oldStatus = trainer.trainerStatus;
    trainer.trainerStatus = status;
    trainer.isActive = status === 'ACTIVE';
    await trainer.save();

    await recordTrainerAudit(
      collegeId,
      trainer.id,
      'STATUS_CHANGED',
      'LIFECYCLE',
      `Trainer status changed from ${oldStatus} to ${status}. Reason: ${reason || 'Admin action'}`,
      oldStatus,
      status,
      req.userId,
      req.ip
    );

    return res.json({ success: true, message: `Trainer status updated to ${status}`, trainerStatus: status });
  } catch (err) {
    console.error('updateTrainerStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 7. Reset Password / Force Password Change
async function resetTrainerPassword(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;
    const { newPassword, forcePasswordChange = true } = req.body;

    const trainer = await User.findOne({
      where: { id, collegeId, role: 'TRAINER' }
    });

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const pwd = newPassword || 'Trainer@2026';
    trainer.password = await bcrypt.hash(pwd, 10);
    trainer.forcePasswordChange = forcePasswordChange;
    await trainer.save();

    await recordTrainerAudit(
      collegeId,
      trainer.id,
      'PASSWORD_RESET',
      'SECURITY',
      `Password reset for trainer ${trainer.name} by Admin`,
      null,
      { forcePasswordChange },
      req.userId,
      req.ip
    );

    return res.json({
      success: true,
      message: `Password reset successfully for ${trainer.name}. Temporary Password: ${pwd}`,
      temporaryPassword: pwd
    });
  } catch (err) {
    console.error('resetTrainerPassword error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 8. Bulk Import Trainers via Excel/CSV
async function bulkImportTrainers(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainersData } = req.body;

    if (!Array.isArray(trainersData) || trainersData.length === 0) {
      return res.status(400).json({ success: false, message: 'No trainer data provided.' });
    }

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < trainersData.length; i++) {
      const row = trainersData[i];
      const rowNum = i + 1;

      if (!row.name || !row.email) {
        errors.push({ row: rowNum, error: 'Name and Email are required fields.' });
        continue;
      }

      const cleanEmail = row.email.trim().toLowerCase();
      const existing = await User.findOne({
        where: { collegeId, email: cleanEmail }
      });
      if (existing) {
        errors.push({ row: rowNum, email: cleanEmail, error: 'Email already exists.' });
        continue;
      }

      const empId = row.employeeId ? row.employeeId.trim() : `TR-${Date.now().toString().slice(-4)}-${i}`;
      const defaultPwd = await bcrypt.hash('trainer123', 10);

      try {
        await User.create({
          collegeId,
          name: row.name.trim(),
          email: cleanEmail,
          password: defaultPwd,
          phone: row.phone || '',
          employeeId: empId,
          designation: row.designation || 'Technical Trainer',
          department: row.department || 'Computer Science',
          joiningDate: row.joiningDate || new Date().toISOString().split('T')[0],
          trainerType: row.trainerType || 'FULL_TIME',
          specialization: row.specialization || 'Software Engineering',
          experience: row.experience || '2 Years',
          role: 'TRAINER',
          trainerStatus: 'ACTIVE',
          isActive: true
        });
        successCount++;
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Bulk import completed: ${successCount} trainers created, ${errors.length} skipped or failed.`,
      successCount,
      errorsCount: errors.length,
      errors
    });
  } catch (err) {
    console.error('bulkImportTrainers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 9. Trainer Invitations
async function getTrainerInvitations(req, res) {
  try {
    const collegeId = req.collegeId;
    const invitations = await TrainerInvitation.findAll({
      where: { collegeId },
      order: [['id', 'DESC']]
    });
    return res.json({ success: true, invitations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function sendTrainerInvitation(req, res) {
  try {
    const collegeId = req.collegeId;
    const { email, name, department, trainerType } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await TrainerInvitation.create({
      collegeId,
      email: email.trim().toLowerCase(),
      name: name || '',
      department: department || 'Engineering',
      trainerType: trainerType || 'FULL_TIME',
      token,
      status: 'PENDING',
      expiresAt,
      invitedBy: req.userId
    });

    return res.json({
      success: true,
      message: `Invitation generated successfully for ${email}.`,
      invitation: invite
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function cancelTrainerInvitation(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;

    const invite = await TrainerInvitation.findOne({ where: { id, collegeId } });
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    invite.status = 'CANCELLED';
    await invite.save();

    return res.json({ success: true, message: 'Invitation cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 10. Trainer Assignments & Allocation
async function getTrainerAssignments(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, trainingId, academicYearId } = req.query;

    const where = { collegeId };
    if (trainerId) where.trainerId = trainerId;
    if (trainingId) where.trainingId = trainingId;
    if (academicYearId) where.academicYearId = academicYearId;

    const assignments = await TrainerAssignment.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'email', 'employeeId', 'specialization'] },
        { model: Training, as: 'training', attributes: ['id', 'name', 'type', 'status'] },
        { model: AcademicYear, as: 'academicYear', attributes: ['id', 'yearName'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] },
        { model: Semester, as: 'semester', attributes: ['id', 'semesterNumber', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'code', 'name'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: AcademicBatch, as: 'batch', attributes: ['id', 'name', 'type'] }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, assignments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createTrainerAssignment(req, res) {
  try {
    const collegeId = req.collegeId;
    let {
      trainerId,
      trainingId,
      courseId,
      batchId,
      batchName,
      academicYearId,
      programId,
      semesterId,
      branchId,
      sectionId,
      role = 'PRIMARY',
      startDate,
      endDate,
      notes
    } = req.body;

    if (!trainerId || !trainingId) {
      return res.status(400).json({ success: false, message: 'Trainer and Training selection are required.' });
    }

    const trainer = await User.findOne({ where: { id: trainerId, collegeId, role: 'TRAINER' } });
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Selected trainer does not exist.' });
    }

    const training = await Training.findOne({ where: { id: trainingId, collegeId } });
    if (!training) {
      return res.status(404).json({ success: false, message: 'Selected training does not exist.' });
    }

    // Auto-derive batch name from AcademicBatch if batchId provided
    let bName = batchName;
    let bId = batchId ? parseInt(batchId) : null;
    if (bId) {
      const batchRec = await AcademicBatch.findOne({ where: { id: bId, collegeId } });
      if (batchRec) {
        bName = batchRec.name;
        if (!academicYearId) academicYearId = batchRec.academicYearId;
        if (!branchId) branchId = batchRec.branchId;
        if (!semesterId) semesterId = batchRec.semesterId;
        if (!sectionId) sectionId = batchRec.sectionId;
      }
    }

    if (!bName) {
      bName = `${training.name} - Batch`;
    }

    const assignment = await TrainerAssignment.create({
      collegeId,
      trainerId,
      trainingId,
      courseId: courseId || null,
      batchId: bId,
      batchName: bName,
      academicYearId: academicYearId || training.academicYearId || null,
      programId: programId || null,
      semesterId: semesterId || training.semesterId || null,
      branchId: branchId || training.branchId || null,
      sectionId: sectionId || training.sectionId || null,
      role,
      startDate: startDate || training.startDate || null,
      endDate: endDate || training.endDate || null,
      status: 'ACTIVE',
      notes: notes || ''
    });

    // Also link training.trainerId if primary and training has none
    if (role === 'PRIMARY' && !training.trainerId) {
      training.trainerId = trainerId;
      await training.save();
    }

    await recordTrainerAudit(
      collegeId,
      trainerId,
      'ASSIGNMENT_CREATED',
      'ASSIGNMENTS',
      `Trainer assigned to ${bName} as ${role}`,
      null,
      assignment.toJSON(),
      req.userId,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: `Trainer successfully assigned to ${bName} as ${role}!`,
      assignment
    });
  } catch (err) {
    console.error('createTrainerAssignment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteTrainerAssignment(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;

    const assignment = await TrainerAssignment.findOne({ where: { id, collegeId } });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    await assignment.destroy();
    return res.json({ success: true, message: 'Assignment removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 11. Schedule Timetable & Conflict Detection
async function checkScheduleConflictInternal(collegeId, trainerId, dayOfWeek, startTime, endTime, excludeScheduleId = null) {
  const where = {
    collegeId,
    trainerId,
    dayOfWeek,
    status: { [Op.ne]: 'CANCELLED' }
  };
  if (excludeScheduleId) {
    where.id = { [Op.ne]: excludeScheduleId };
  }

  const existingSchedules = await TrainerSchedule.findAll({ where });

  // Compare overlapping time slots
  for (const sch of existingSchedules) {
    // Overlap condition: (StartA < EndB) and (EndA > StartB)
    if (sch.startTime === startTime || (sch.startTime < endTime && sch.endTime > startTime)) {
      return {
        hasConflict: true,
        conflictingSchedule: sch
      };
    }
  }

  return { hasConflict: false };
}

async function checkScheduleConflict(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, dayOfWeek, startTime, endTime, scheduleId } = req.body;

    if (!trainerId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Trainer, day, start and end times are required.' });
    }

    const conflict = await checkScheduleConflictInternal(
      collegeId,
      trainerId,
      dayOfWeek,
      startTime,
      endTime,
      scheduleId ? parseInt(scheduleId) : null
    );

    return res.json({ success: true, ...conflict });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getTrainerSchedule(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, trainingId, dayOfWeek } = req.query;

    const where = { collegeId };
    if (trainerId) where.trainerId = trainerId;
    if (trainingId) where.trainingId = trainingId;
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;

    const schedules = await TrainerSchedule.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'email', 'employeeId'] },
        { model: User, as: 'substituteTrainer', attributes: ['id', 'name', 'email'] },
        { model: Training, as: 'training', attributes: ['id', 'name'] },
        { model: AcademicBatch, as: 'batch', attributes: ['id', 'name', 'type'] }
      ],
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    return res.json({ success: true, schedules });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createScheduleSession(req, res) {
  try {
    const collegeId = req.collegeId;
    let {
      trainerId,
      trainingId,
      batchId,
      batchName,
      dayOfWeek,
      date,
      startTime,
      endTime,
      room,
      deliveryMode = 'OFFLINE',
      sessionType = 'REGULAR_CLASS',
      topicTitle,
      force = false
    } = req.body;

    if (!trainerId || !trainingId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Trainer, Training, Day, Start and End times are required.' });
    }

    let bName = batchName;
    let bId = batchId ? parseInt(batchId) : null;
    if (bId) {
      const batchRec = await AcademicBatch.findOne({ where: { id: bId, collegeId } });
      if (batchRec && !bName) {
        bName = batchRec.name;
      }
    }
    if (!bName) {
      bName = 'Regular Batch';
    }

    // Conflict detection check
    const conflict = await checkScheduleConflictInternal(collegeId, trainerId, dayOfWeek, startTime, endTime);
    if (conflict.hasConflict && !force) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: `Schedule Conflict: Trainer is already assigned to a class (${conflict.conflictingSchedule.batchName || 'Session'}) from ${conflict.conflictingSchedule.startTime} to ${conflict.conflictingSchedule.endTime}.`,
        conflictingSchedule: conflict.conflictingSchedule
      });
    }

    const session = await TrainerSchedule.create({
      collegeId,
      trainerId,
      trainingId,
      batchId: bId,
      batchName: bName,
      dayOfWeek,
      date: date || null,
      startTime,
      endTime,
      room: room || 'Room 101',
      deliveryMode,
      sessionType,
      topicTitle: topicTitle || '',
      status: 'SCHEDULED'
    });

    await recordTrainerAudit(
      collegeId,
      trainerId,
      'SESSION_SCHEDULED',
      'SCHEDULE',
      `Session scheduled on ${dayOfWeek} from ${startTime} to ${endTime} in ${room}`,
      null,
      session.toJSON(),
      req.userId,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Schedule session created successfully!',
      session
    });
  } catch (err) {
    console.error('createScheduleSession error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 12. Trainer Availability
async function getTrainerAvailability(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId } = req.query;

    const where = { collegeId };
    if (trainerId) where.trainerId = trainerId;

    const availabilities = await TrainerAvailability.findAll({
      where,
      include: [{ model: User, as: 'trainer', attributes: ['id', 'name'] }],
      order: [['dayOfWeek', 'ASC']]
    });

    return res.json({ success: true, availabilities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function saveTrainerAvailability(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, slots } = req.body;

    if (!trainerId || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'Trainer ID and availability slots are required.' });
    }

    // Delete existing and bulk create
    await TrainerAvailability.destroy({ where: { collegeId, trainerId } });

    const newSlots = slots.map(s => ({
      collegeId,
      trainerId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime || '09:00 AM',
      endTime: s.endTime || '05:00 PM',
      isAvailable: s.isAvailable !== false
    }));

    await TrainerAvailability.bulkCreate(newSlots);

    return res.json({ success: true, message: 'Trainer availability updated successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 13. Trainer Leaves & Substitute Reassignment
async function getTrainerLeaves(req, res) {
  try {
    const collegeId = req.collegeId;
    const { status, trainerId } = req.query;

    const where = { collegeId };
    if (status && status !== 'ALL') where.status = status;
    if (trainerId) where.trainerId = trainerId;

    const leaves = await TrainerLeave.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'email', 'employeeId', 'specialization'] },
        { model: User, as: 'substituteTrainer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] }
      ],
      order: [['startDate', 'DESC']]
    });

    return res.json({ success: true, leaves });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createLeaveRequest(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, leaveType = 'CASUAL', startDate, endDate, reason } = req.body;

    if (!trainerId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Trainer, start and end dates are required.' });
    }

    // Check affected scheduled classes
    const affectedClasses = await TrainerSchedule.count({
      where: {
        collegeId,
        trainerId,
        status: 'SCHEDULED'
      }
    });

    const leave = await TrainerLeave.create({
      collegeId,
      trainerId,
      leaveType,
      startDate,
      endDate,
      reason: reason || '',
      status: 'PENDING'
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      leave,
      affectedClassesWarning: affectedClasses > 0 ? `${affectedClasses} scheduled classes may be affected during this period.` : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function reviewLeaveRequest(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;
    const { status, substituteTrainerId, rejectionReason } = req.body;

    const leave = await TrainerLeave.findOne({ where: { id, collegeId } });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.approvedBy = req.userId;
    if (substituteTrainerId) {
      leave.substituteTrainerId = substituteTrainerId;
    }
    if (rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }
    await leave.save();

    // If approved, update trainer status to ON_LEAVE
    if (status === 'APPROVED') {
      await User.update(
        { trainerStatus: 'ON_LEAVE' },
        { where: { id: leave.trainerId, collegeId } }
      );

      // Reassign affected schedules to substitute if provided
      if (substituteTrainerId) {
        await TrainerSchedule.update(
          { substituteTrainerId },
          { where: { collegeId, trainerId: leave.trainerId, status: 'SCHEDULED' } }
        );
      }
    }

    return res.json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()}!`,
      leave
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function assignSubstituteTrainer(req, res) {
  try {
    const collegeId = req.collegeId;
    const { originalTrainerId, substituteTrainerId, scheduleIds, reason } = req.body;

    if (!originalTrainerId || !substituteTrainerId) {
      return res.status(400).json({ success: false, message: 'Original trainer and substitute trainer are required.' });
    }

    const where = { collegeId, trainerId: originalTrainerId, status: 'SCHEDULED' };
    if (Array.isArray(scheduleIds) && scheduleIds.length > 0) {
      where.id = { [Op.in]: scheduleIds };
    }

    const [updatedCount] = await TrainerSchedule.update(
      { substituteTrainerId },
      { where }
    );

    await recordTrainerAudit(
      collegeId,
      originalTrainerId,
      'SUBSTITUTE_ASSIGNED',
      'SCHEDULE',
      `Substitute trainer assigned for ${updatedCount} classes. Reason: ${reason || 'Leave substitution'}`,
      originalTrainerId,
      substituteTrainerId,
      req.userId,
      req.ip
    );

    return res.json({
      success: true,
      message: `Substitute trainer successfully assigned to ${updatedCount} scheduled sessions.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 14. Attendance Overview & Correction Workflow
async function getTrainerAttendanceOverview(req, res) {
  try {
    const collegeId = req.collegeId;

    const trainers = await User.findAll({
      where: { collegeId, role: 'TRAINER' },
      attributes: ['id', 'name', 'employeeId', 'specialization']
    });

    const report = await Promise.all(
      trainers.map(async (tr) => {
        const scheduledCount = await TrainerSchedule.count({
          where: { collegeId, trainerId: tr.id }
        });

        const attendanceLogs = await Attendance.findAll({
          where: { collegeId, trainerId: tr.id },
          attributes: ['date', 'status']
        });

        const distinctDates = new Set(attendanceLogs.map(a => a.date)).size;
        const totalMarks = attendanceLogs.length;
        const presentMarks = attendanceLogs.filter(a => a.status === 'PRESENT').length;
        const studentRate = totalMarks > 0 ? Math.round((presentMarks / totalMarks) * 100) : 95;

        return {
          trainer: tr,
          totalSessions: scheduledCount,
          attendanceTakenSessions: distinctDates,
          pendingSessions: Math.max(0, scheduledCount - distinctDates),
          averageStudentAttendanceRate: studentRate
        };
      })
    );

    return res.json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getAttendanceCorrections(req, res) {
  try {
    const collegeId = req.collegeId;
    const { status } = req.query;

    const where = { collegeId };
    if (status && status !== 'ALL') where.status = status;

    const corrections = await AttendanceCorrection.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'employeeId'] },
        { model: User, as: 'student', attributes: ['id', 'name', 'rollNo'] },
        { model: Training, as: 'training', attributes: ['id', 'name'] }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, corrections });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function reviewAttendanceCorrection(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    const correction = await AttendanceCorrection.findOne({ where: { id, collegeId } });
    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found.' });
    }

    correction.status = status;
    correction.reviewedBy = req.userId;
    correction.reviewNote = reviewNote || '';
    await correction.save();

    // If approved, update actual Attendance record
    if (status === 'APPROVED') {
      await Attendance.update(
        { status: correction.newStatus },
        {
          where: {
            collegeId,
            trainingId: correction.trainingId,
            studentId: correction.studentId,
            date: correction.date
          }
        }
      );
    }

    return res.json({
      success: true,
      message: `Attendance correction has been ${status.toLowerCase()}!`,
      correction
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 15. Content Delivery & Student Confirmation Discrepancy
async function getContentDeliveryOverview(req, res) {
  try {
    const collegeId = req.collegeId;

    const trainings = await Training.findAll({
      where: { collegeId, status: 'ACTIVE' },
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'employeeId'] }
      ]
    });

    const deliveries = await Promise.all(
      trainings.map(async (tr) => {
        const totalTopicsCount = await CourseTopic.count(); // estimated syllabus
        const delivered = await DailyTopicDelivery.findAll({
          where: { collegeId, trainingId: tr.id, isDelivered: true },
          include: [{ model: CourseTopic, as: 'topic', attributes: ['id', 'title'] }],
          order: [['deliveryDate', 'DESC']]
        });

        // Confirmations
        const deliveryIds = delivered.map(d => d.id);
        let yesCount = 0, noCount = 0, pendingCount = 0;
        if (deliveryIds.length > 0) {
          const confs = await ContentConfirmation.findAll({
            where: { dailyDeliveryId: { [Op.in]: deliveryIds } }
          });
          confs.forEach(c => {
            if (c.isDelivered === 'YES') yesCount++;
            else if (c.isDelivered === 'NO') noCount++;
            else pendingCount++;
          });
        }

        const deliveredCount = delivered.length;
        const total = totalTopicsCount || 60;
        const completionRate = Math.min(100, Math.round((deliveredCount / Math.max(total, 1)) * 100));

        return {
          training: tr,
          trainer: tr.trainer,
          totalTopics: total,
          deliveredTopics: deliveredCount,
          pendingTopics: Math.max(0, total - deliveredCount),
          completionPercentage: completionRate,
          studentConfirmations: {
            yes: yesCount,
            no: noCount,
            pending: pendingCount
          },
          discrepancyAlert: noCount > 5,
          recentDeliveries: delivered.slice(0, 5)
        };
      })
    );

    return res.json({ success: true, contentDeliveries: deliveries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 16. Workload Monitor & Configurable Limits
async function getTrainerWorkload(req, res) {
  try {
    const collegeId = req.collegeId;

    const trainers = await User.findAll({
      where: { collegeId, role: 'TRAINER' },
      attributes: ['id', 'name', 'employeeId', 'specialization', 'department', 'maxWeeklyHours', 'maxWeeklyClasses', 'trainerStatus']
    });

    const workloadData = await Promise.all(
      trainers.map(async (tr) => {
        // Assignments
        const assignments = await TrainerAssignment.findAll({
          where: { collegeId, trainerId: tr.id, status: 'ACTIVE' }
        });
        const trainingIds = [...new Set(assignments.map(a => a.trainingId))];

        // Students count
        let studentCount = 0;
        if (trainingIds.length > 0) {
          studentCount = await TrainingStudent.count({
            where: { collegeId, trainingId: { [Op.in]: trainingIds } }
          });
        }

        // Weekly scheduled sessions
        const weeklyClasses = await TrainerSchedule.count({
          where: { collegeId, trainerId: tr.id, status: 'SCHEDULED' }
        });
        const weeklyHours = weeklyClasses * 2; // approx 2h per session

        const limitHours = tr.maxWeeklyHours || 35;
        const limitClasses = tr.maxWeeklyClasses || 18;

        let workloadStatus = 'NORMAL'; // GREEN
        if (weeklyHours > limitHours || weeklyClasses > limitClasses) {
          workloadStatus = 'OVERLOADED'; // RED
        } else if (weeklyHours >= limitHours * 0.8) {
          workloadStatus = 'HIGH'; // ORANGE
        }

        return {
          trainer: tr,
          totalTrainings: trainingIds.length,
          totalBatches: assignments.length,
          totalStudents: studentCount,
          weeklyClasses,
          weeklyHours,
          limitHours,
          limitClasses,
          workloadStatus
        };
      })
    );

    return res.json({ success: true, workload: workloadData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 17. Trainer Feedback (Student & Admin)
async function getTrainerFeedbacks(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId } = req.query;

    const where = { collegeId };
    if (trainerId) where.trainerId = trainerId;

    const studentFeedbacks = await StudentTrainerFeedback.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'employeeId'] },
        { model: User, as: 'student', attributes: ['id', 'name', 'rollNo'] }
      ],
      order: [['id', 'DESC']]
    });

    const adminFeedbacks = await AdminTrainerFeedback.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'employeeId'] },
        { model: User, as: 'admin', attributes: ['id', 'name'] }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, studentFeedbacks, adminFeedbacks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function submitAdminFeedback(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, rating = 4.5, strength, improvement, notes } = req.body;

    if (!trainerId) {
      return res.status(400).json({ success: false, message: 'Trainer ID is required.' });
    }

    const feedback = await AdminTrainerFeedback.create({
      collegeId,
      trainerId,
      adminId: req.userId,
      rating: parseFloat(rating),
      strength: strength || '',
      improvement: improvement || '',
      notes: notes || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Admin feedback submitted successfully!',
      feedback
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 18. Trainer Reports Generator
async function getTrainerReports(req, res) {
  try {
    const collegeId = req.collegeId;
    const { reportType = 'MASTER' } = req.query;

    const trainers = await User.findAll({
      where: { collegeId, role: 'TRAINER' },
      attributes: ['id', 'name', 'email', 'phone', 'employeeId', 'designation', 'department', 'specialization', 'trainerType', 'trainerStatus', 'joiningDate']
    });

    if (reportType === 'WORKLOAD') {
      const data = await Promise.all(
        trainers.map(async tr => {
          const assignments = await TrainerAssignment.count({ where: { collegeId, trainerId: tr.id } });
          const classes = await TrainerSchedule.count({ where: { collegeId, trainerId: tr.id } });
          return {
            name: tr.name,
            employeeId: tr.employeeId,
            trainingsCount: assignments,
            weeklyClasses: classes,
            weeklyHours: classes * 2,
            status: tr.trainerStatus
          };
        })
      );
      return res.json({ success: true, reportType, data });
    }

    // Default MASTER report
    return res.json({ success: true, reportType: 'MASTER', data: trainers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 19. Trainer Audit Logs
async function getTrainerAuditLogs(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId, moduleName } = req.query;

    const where = { collegeId };
    if (trainerId) where.trainerId = trainerId;
    if (moduleName && moduleName !== 'ALL') where.module = moduleName;

    const logs = await TrainerAuditLog.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name', 'employeeId'] },
        { model: User, as: 'actor', attributes: ['id', 'name'] }
      ],
      order: [['id', 'DESC']],
      limit: 100
    });

    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 20. Trainer Documents
async function getTrainerDocuments(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId } = req.params;

    const documents = await TrainerDocument.findAll({
      where: { collegeId, trainerId },
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, documents });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function uploadTrainerDocument(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainerId } = req.params;
    const { docType = 'OTHER', title, fileUrl, fileSize } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Document title is required.' });
    }

    const doc = await TrainerDocument.create({
      collegeId,
      trainerId,
      docType,
      title,
      fileUrl: fileUrl || '',
      fileSize: fileSize || '1.2 MB'
    });

    return res.status(201).json({ success: true, message: 'Document uploaded successfully.', document: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteTrainerDocument(req, res) {
  try {
    const collegeId = req.collegeId;
    const { id } = req.params;

    const doc = await TrainerDocument.findOne({ where: { id, collegeId } });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    await doc.destroy();
    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getTrainerDashboardStats,
  getTrainerDepartments,
  getTrainersDirectory,
  getTrainer360Profile,
  createTrainer,
  updateTrainer,
  updateTrainerStatus,
  resetTrainerPassword,
  bulkImportTrainers,
  getTrainerInvitations,
  sendTrainerInvitation,
  cancelTrainerInvitation,
  getTrainerAssignments,
  createTrainerAssignment,
  deleteTrainerAssignment,
  checkScheduleConflict,
  getTrainerSchedule,
  createScheduleSession,
  getTrainerAvailability,
  saveTrainerAvailability,
  getTrainerLeaves,
  createLeaveRequest,
  reviewLeaveRequest,
  assignSubstituteTrainer,
  getTrainerAttendanceOverview,
  getAttendanceCorrections,
  reviewAttendanceCorrection,
  getContentDeliveryOverview,
  getTrainerWorkload,
  getTrainerFeedbacks,
  submitAdminFeedback,
  getTrainerReports,
  getTrainerAuditLogs,
  getTrainerDocuments,
  uploadTrainerDocument,
  deleteTrainerDocument
};
