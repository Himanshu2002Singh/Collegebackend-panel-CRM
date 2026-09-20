const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const xlsx = require('xlsx');
const {
  sequelize,
  User,
  College,
  AcademicYear,
  Program,
  Semester,
  Branch,
  Section,
  AcademicEnrollment,
  Training,
  TrainingStudent,
  StudentParent,
  StudentImportLog,
  StudentActivityLog,
  Attendance,
  Assessment,
  AssessmentSubmission,
  TrainerFeedback,
  ContentConfirmation,
  Notification
} = require('../models');
const { calculateStudentPerformance } = require('../services/analyticsEngine');

// 1. Student Dashboard Statistics & KPIs
async function getStudentDashboardStats(req, res) {
  try {
    const collegeId = req.collegeId;

    // Total counts by status
    const totalStudents = await User.count({ where: { collegeId, role: 'STUDENT' } });
    const activeStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'ACTIVE' } });
    const inactiveStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'INACTIVE' } });
    const suspendedStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'SUSPENDED' } });
    const graduatedStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'GRADUATED' } });
    const alumniStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'ALUMNI' } });
    const onLeaveStudents = await User.count({ where: { collegeId, role: 'STUDENT', studentStatus: 'ON_LEAVE' } });

    // Gender breakdown
    const maleCount = await User.count({ where: { collegeId, role: 'STUDENT', gender: 'MALE' } });
    const femaleCount = await User.count({ where: { collegeId, role: 'STUDENT', gender: 'FEMALE' } });
    const otherGenderCount = await User.count({ where: { collegeId, role: 'STUDENT', gender: 'OTHER' } });

    // Program breakdown
    const programs = await Program.findAll({
      where: { collegeId },
      attributes: ['id', 'name', 'code']
    });

    const programDistribution = await Promise.all(
      programs.map(async (prog) => {
        const count = await User.count({
          where: { collegeId, role: 'STUDENT', programId: prog.id }
        });
        return {
          programId: prog.id,
          name: prog.name,
          code: prog.code,
          count
        };
      })
    );

    // Academic Year breakdown
    const academicYears = await AcademicYear.findAll({
      where: { collegeId },
      attributes: ['id', 'yearName', 'isCurrent', 'status']
    });

    const ayDistribution = await Promise.all(
      academicYears.map(async (ay) => {
        const count = await AcademicEnrollment.count({
          where: { collegeId, academicYearId: ay.id, status: 'ACTIVE' }
        });
        return {
          academicYearId: ay.id,
          yearName: ay.yearName,
          isCurrent: ay.isCurrent,
          status: ay.status,
          enrolledCount: count
        };
      })
    );

    // Calculate quick At-Risk metric (<75% attendance)
    const attendances = await Attendance.findAll({
      where: { collegeId },
      attributes: ['studentId', 'status']
    });

    const studentAttMap = {};
    attendances.forEach(att => {
      if (!studentAttMap[att.studentId]) {
        studentAttMap[att.studentId] = { total: 0, present: 0 };
      }
      studentAttMap[att.studentId].total++;
      if (att.status === 'PRESENT') studentAttMap[att.studentId].present++;
    });

    let atRiskAttendanceCount = 0;
    Object.keys(studentAttMap).forEach(sId => {
      const { total, present } = studentAttMap[sId];
      if (total >= 3 && (present / total) * 100 < 75) {
        atRiskAttendanceCount++;
      }
    });

    // Total trainings assigned
    const totalTrainingEnrollments = await TrainingStudent.count({ where: { collegeId } });

    return res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        suspendedStudents,
        graduatedStudents,
        alumniStudents,
        onLeaveStudents,
        genderDistribution: {
          male: maleCount,
          female: femaleCount,
          other: otherGenderCount
        },
        programDistribution,
        academicYearDistribution: ayDistribution,
        atRiskAttendanceCount,
        totalTrainingEnrollments
      }
    });
  } catch (error) {
    console.error('getStudentDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student dashboard stats', error: error.message });
  }
}

// 2. Advanced Multi-Filter Student Directory
async function getStudentsAdvanced(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      page = 1,
      limit = 20,
      search = '',
      academicYearId,
      programId,
      semesterId,
      branchId,
      sectionId,
      studentStatus,
      riskLevel,
      gender,
      batch
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { collegeId, role: 'STUDENT' };

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { rollNo: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
        { admissionNo: { [Op.like]: q } }
      ];
    }

    if (studentStatus && studentStatus !== 'ALL') {
      where.studentStatus = studentStatus;
    }

    if (gender && gender !== 'ALL') {
      where.gender = gender;
    }

    if (batch && batch.trim()) {
      where.batch = batch.trim();
    }

    if (academicYearId) where.academicYearId = academicYearId;
    if (programId) where.programId = programId;
    if (semesterId) where.semesterId = semesterId;
    if (branchId) where.branchId = branchId;
    if (sectionId) where.sectionId = sectionId;

    const { count, rows: students } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['id', 'DESC']],
      include: [
        { model: Program, as: 'program', attributes: ['id', 'name', 'code'] },
        { model: AcademicYear, as: 'academicYear', attributes: ['id', 'yearName'] },
        { model: Semester, as: 'semester', attributes: ['id', 'semesterNumber', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: StudentParent, as: 'parents', attributes: ['id', 'relation', 'name', 'phone', 'isPrimaryContact'] }
      ]
    });

    // Compute student attendance & assessment metrics for directory view
    const studentIds = students.map(s => s.id);
    
    // Batch fetch attendance
    const attendanceRecords = await Attendance.findAll({
      where: { collegeId, studentId: { [Op.in]: studentIds } },
      attributes: ['studentId', 'status']
    });

    const attMap = {};
    attendanceRecords.forEach(att => {
      if (!attMap[att.studentId]) attMap[att.studentId] = { total: 0, present: 0 };
      attMap[att.studentId].total++;
      if (att.status === 'PRESENT') attMap[att.studentId].present++;
    });

    // Batch fetch assessment submissions
    const submissions = await AssessmentSubmission.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      attributes: ['studentId', 'percentage', 'status']
    });

    const scoreMap = {};
    submissions.forEach(sub => {
      if (!scoreMap[sub.studentId]) scoreMap[sub.studentId] = { total: 0, sum: 0 };
      if (sub.percentage !== null && sub.percentage !== undefined) {
        scoreMap[sub.studentId].total++;
        scoreMap[sub.studentId].sum += parseFloat(sub.percentage);
      }
    });

    const enrichedStudents = students.map(st => {
      const attData = attMap[st.id] || { total: 0, present: 0 };
      const attRate = attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : 100;
      
      const scData = scoreMap[st.id] || { total: 0, sum: 0 };
      const avgScore = scData.total > 0 ? Math.round(scData.sum / scData.total) : 85;

      // Risk determination
      let calculatedRisk = 'SAFE';
      if (attRate < 60 || avgScore < 40) {
        calculatedRisk = 'CRITICAL';
      } else if (attRate < 75 || avgScore < 60) {
        calculatedRisk = 'WARNING';
      }

      const stJson = st.toJSON();
      return {
        ...stJson,
        metrics: {
          attendanceRate: attRate,
          totalAttendanceSessions: attData.total,
          presentAttendanceSessions: attData.present,
          averageAssessmentScore: avgScore,
          assessmentCount: scData.total,
          riskLevel: calculatedRisk
        }
      };
    });

    // Filter by riskLevel if specified
    let finalStudents = enrichedStudents;
    if (riskLevel && riskLevel !== 'ALL') {
      finalStudents = enrichedStudents.filter(s => s.metrics.riskLevel === riskLevel);
    }

    return res.json({
      success: true,
      students: finalStudents,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getStudentsAdvanced error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
}

// 3. Complete 360° Student Profile
async function getStudent360Profile(req, res) {
  try {
    const collegeId = req.collegeId;
    const studentId = req.params.id;

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' },
      include: [
        { model: Program, as: 'program' },
        { model: AcademicYear, as: 'academicYear' },
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' },
        { model: Section, as: 'section' },
        { model: StudentParent, as: 'parents' },
        {
          model: AcademicEnrollment,
          as: 'academicEnrollments',
          include: [
            { model: AcademicYear, as: 'academicYear' },
            { model: Program, as: 'program' },
            { model: Semester, as: 'semester' },
            { model: Branch, as: 'branch' },
            { model: Section, as: 'section' }
          ],
          order: [['id', 'DESC']]
        },
        {
          model: TrainingStudent,
          as: 'trainingEnrollments',
          include: [
            {
              model: Training,
              as: 'training',
              include: [{ model: User, as: 'trainer', attributes: ['id', 'name', 'email'] }]
            }
          ]
        },
        {
          model: StudentActivityLog,
          as: 'activityLogs',
          order: [['createdAt', 'DESC']],
          limit: 30
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found in this college' });
    }

    // Attendance records (Day by Day Matrix)
    const attendanceRecords = await Attendance.findAll({
      where: { collegeId, studentId },
      order: [['date', 'DESC']],
      limit: 90,
      include: [{ model: Training, attributes: ['id', 'name'] }]
    });

    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const absentAttendance = attendanceRecords.filter(a => a.status === 'ABSENT').length;
    const lateAttendance = attendanceRecords.filter(a => a.status === 'LATE').length;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

    // Assessment Submissions & Results
    const assessmentSubmissions = await AssessmentSubmission.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      include: [{ model: Assessment, as: 'assessment' }]
    });

    // Trainer Feedback
    const trainerFeedbacks = await TrainerFeedback.findAll({
      where: { studentId },
      order: [['date', 'DESC']],
      include: [
        { model: Training, as: 'training', attributes: ['id', 'name'] },
        { model: User, as: 'trainer', attributes: ['id', 'name'] }
      ]
    });

    // Content Confirmations
    const contentConfirmations = await ContentConfirmation.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    // Run Analytics Engine for AI suggestions & 4-pillar calculation
    let performanceAnalytics = null;
    try {
      performanceAnalytics = await calculateStudentPerformance(studentId);
    } catch (err) {
      console.warn('Could not compute deep analytics:', err.message);
    }

    return res.json({
      success: true,
      profile: {
        student: student.toJSON(),
        attendance: {
          total: totalAttendance,
          present: presentAttendance,
          absent: absentAttendance,
          late: lateAttendance,
          percentage: attendancePercentage,
          records: attendanceRecords
        },
        assessments: assessmentSubmissions,
        trainerFeedbacks,
        contentConfirmations,
        performanceAnalytics,
        academicEnrollments: student.academicEnrollments,
        trainings: student.trainingEnrollments,
        parents: student.parents,
        activityLogs: student.activityLogs
      }
    });
  } catch (error) {
    console.error('getStudent360Profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student 360 profile', error: error.message });
  }
}

// 4. Create Single Student (Personal + Academic + Parents)
async function createStudentComprehensive(req, res) {
  const t = await sequelize.transaction();
  try {
    const collegeId = req.collegeId;
    const {
      name,
      email,
      rollNo,
      phone = '',
      gender = 'MALE',
      dob = null,
      bloodGroup = '',
      personalEmail = '',
      alternatePhone = '',
      address = '',
      city = '',
      state = '',
      pincode = '',
      admissionNo = '',
      admissionDate = null,
      batch = '2026-30',
      studentStatus = 'ACTIVE',
      password = 'Student@123',
      academicYearId,
      programId,
      semesterId,
      branchId,
      sectionId,
      parents = []
    } = req.body;

    if (!name || !email || !rollNo) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Name, Email, and Roll Number are required.' });
    }

    const existingEmail = await User.findOne({
      where: { collegeId, email: email.trim().toLowerCase() }
    });

    if (existingEmail) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'A student with this email address already exists in your college.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'Student@123', 10);

    const newStudent = await User.create({
      collegeId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'STUDENT',
      rollNo: rollNo.trim(),
      phone: phone.trim(),
      gender,
      dob: dob || null,
      bloodGroup: bloodGroup.trim(),
      personalEmail: personalEmail.trim(),
      alternatePhone: alternatePhone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      admissionNo: (admissionNo || rollNo).trim(),
      admissionDate: admissionDate || new Date(),
      batch: batch.trim(),
      studentStatus,
      programId: programId || null,
      academicYearId: academicYearId || null,
      semesterId: semesterId || null,
      branchId: branchId || null,
      sectionId: sectionId || null,
      isActive: studentStatus === 'ACTIVE'
    }, { transaction: t });

    // Create Academic Enrollment if academic details are provided
    if (academicYearId && semesterId && branchId) {
      await AcademicEnrollment.create({
        collegeId,
        studentId: newStudent.id,
        academicYearId,
        programId: programId || null,
        semesterId,
        branchId,
        sectionId: sectionId || null,
        rollNo: newStudent.rollNo,
        status: 'ACTIVE',
        enrolledAt: admissionDate || new Date()
      }, { transaction: t });
    }

    // Create Parents / Guardians
    if (Array.isArray(parents) && parents.length > 0) {
      for (const p of parents) {
        if (p.name && p.name.trim()) {
          await StudentParent.create({
            collegeId,
            studentId: newStudent.id,
            relation: p.relation || 'FATHER',
            name: p.name.trim(),
            phone: (p.phone || '').trim(),
            email: (p.email || '').trim(),
            occupation: (p.occupation || '').trim(),
            address: (p.address || '').trim(),
            isPrimaryContact: Boolean(p.isPrimaryContact),
            whatsappAlertsEnabled: p.whatsappAlertsEnabled !== false,
            emailAlertsEnabled: p.emailAlertsEnabled !== false
          }, { transaction: t });
        }
      }
    }

    // Log Activity
    await StudentActivityLog.create({
      collegeId,
      studentId: newStudent.id,
      activityType: 'STATUS_CHANGE',
      title: 'Student Admitted',
      description: `Student ${newStudent.name} (Roll: ${newStudent.rollNo}) admitted with status ${newStudent.studentStatus}.`,
      performedBy: req.user?.id || null
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Student admitted and enrolled successfully',
      student: newStudent
    });
  } catch (error) {
    await t.rollback();
    console.error('createStudentComprehensive error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create student', error: error.message });
  }
}

// 5. Update Comprehensive Student Profile
async function updateStudentComprehensive(req, res) {
  const t = await sequelize.transaction();
  try {
    const collegeId = req.collegeId;
    const studentId = req.params.id;

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' }
    });

    if (!student) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const {
      name,
      rollNo,
      phone,
      gender,
      dob,
      bloodGroup,
      personalEmail,
      alternatePhone,
      address,
      city,
      state,
      pincode,
      admissionNo,
      admissionDate,
      batch,
      studentStatus,
      programId,
      academicYearId,
      semesterId,
      branchId,
      sectionId,
      parents
    } = req.body;

    // Check if status changed
    const oldStatus = student.studentStatus;

    await student.update({
      name: name !== undefined ? name.trim() : student.name,
      rollNo: rollNo !== undefined ? rollNo.trim() : student.rollNo,
      phone: phone !== undefined ? phone.trim() : student.phone,
      gender: gender !== undefined ? gender : student.gender,
      dob: dob !== undefined ? dob : student.dob,
      bloodGroup: bloodGroup !== undefined ? bloodGroup.trim() : student.bloodGroup,
      personalEmail: personalEmail !== undefined ? personalEmail.trim() : student.personalEmail,
      alternatePhone: alternatePhone !== undefined ? alternatePhone.trim() : student.alternatePhone,
      address: address !== undefined ? address.trim() : student.address,
      city: city !== undefined ? city.trim() : student.city,
      state: state !== undefined ? state.trim() : student.state,
      pincode: pincode !== undefined ? pincode.trim() : student.pincode,
      admissionNo: admissionNo !== undefined ? admissionNo.trim() : student.admissionNo,
      admissionDate: admissionDate !== undefined ? admissionDate : student.admissionDate,
      batch: batch !== undefined ? batch.trim() : student.batch,
      studentStatus: studentStatus !== undefined ? studentStatus : student.studentStatus,
      programId: programId !== undefined ? programId : student.programId,
      academicYearId: academicYearId !== undefined ? academicYearId : student.academicYearId,
      semesterId: semesterId !== undefined ? semesterId : student.semesterId,
      branchId: branchId !== undefined ? branchId : student.branchId,
      sectionId: sectionId !== undefined ? sectionId : student.sectionId,
      isActive: studentStatus ? studentStatus === 'ACTIVE' : student.isActive
    }, { transaction: t });

    // Sync parents if array provided
    if (Array.isArray(parents)) {
      await StudentParent.destroy({ where: { studentId, collegeId }, transaction: t });
      for (const p of parents) {
        if (p.name && p.name.trim()) {
          await StudentParent.create({
            collegeId,
            studentId,
            relation: p.relation || 'FATHER',
            name: p.name.trim(),
            phone: (p.phone || '').trim(),
            email: (p.email || '').trim(),
            occupation: (p.occupation || '').trim(),
            address: (p.address || '').trim(),
            isPrimaryContact: Boolean(p.isPrimaryContact),
            whatsappAlertsEnabled: p.whatsappAlertsEnabled !== false,
            emailAlertsEnabled: p.emailAlertsEnabled !== false
          }, { transaction: t });
        }
      }
    }

    if (studentStatus && studentStatus !== oldStatus) {
      await StudentActivityLog.create({
        collegeId,
        studentId,
        activityType: 'STATUS_CHANGE',
        title: `Status updated to ${studentStatus}`,
        description: `Student status modified from ${oldStatus} to ${studentStatus}.`,
        performedBy: req.user?.id || null
      }, { transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      message: 'Student profile updated successfully',
      student
    });
  } catch (error) {
    await t.rollback();
    console.error('updateStudentComprehensive error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update student', error: error.message });
  }
}

// 6. Bulk Import Students (Validation, Preview, Commit & Audit Log)
async function bulkImportStudents(req, res) {
  try {
    const collegeId = req.collegeId;
    const mode = req.body.mode || 'preview'; // 'preview' or 'commit'
    const defaultAYId = req.body.academicYearId ? parseInt(req.body.academicYearId) : null;
    const defaultProgramId = req.body.programId ? parseInt(req.body.programId) : null;
    const defaultSemesterId = req.body.semesterId ? parseInt(req.body.semesterId) : null;
    const defaultBranchId = req.body.branchId ? parseInt(req.body.branchId) : null;
    const defaultSectionId = req.body.sectionId ? parseInt(req.body.sectionId) : null;
    const defaultBatch = req.body.batch || '2026-30';

    let rows = [];

    // Check if uploaded via multer file or sent as parsed JSON rows
    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    } else if (Array.isArray(req.body.students)) {
      rows = req.body.students;
    } else {
      return res.status(400).json({ success: false, message: 'Please upload an Excel/CSV file or provide a students array.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file/data contains no student records.' });
    }

    // Pre-fetch all existing student emails in college for duplicate detection
    const existingStudents = await User.findAll({
      where: { collegeId, role: 'STUDENT' },
      attributes: ['email', 'rollNo']
    });
    const existingEmailSet = new Set(existingStudents.map(s => s.email.toLowerCase()));
    const existingRollSet = new Set(existingStudents.map(s => s.rollNo ? s.rollNo.toUpperCase() : ''));

    const seenFileEmails = new Set();
    const seenFileRolls = new Set();

    const validRows = [];
    const errorDetails = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      const name = (r['Name'] || r['name'] || r['Student Name'] || '').trim();
      const email = (r['Email'] || r['email'] || '').trim().toLowerCase();
      const rollNo = (r['Roll No'] || r['rollNo'] || r['RollNumber'] || r['Enrollment'] || '').trim();
      const phone = (r['Phone'] || r['phone'] || r['Mobile'] || '').trim();
      const gender = (r['Gender'] || r['gender'] || 'MALE').trim().toUpperCase();
      const parentName = (r['Parent Name'] || r['parentName'] || r['Father Name'] || '').trim();
      const parentPhone = (r['Parent Phone'] || r['parentPhone'] || r['Parent Mobile'] || '').trim();

      // Row Validation
      if (!name) {
        errorDetails.push({ row: rowNum, name: 'N/A', email, rollNo, reason: 'Missing student name' });
        continue;
      }
      if (!email || !email.includes('@')) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Invalid or missing email address' });
        continue;
      }
      if (!rollNo) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Missing roll number' });
        continue;
      }

      // Check duplicate in file
      if (seenFileEmails.has(email)) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Duplicate email within uploaded file' });
        continue;
      }
      if (seenFileRolls.has(rollNo.toUpperCase())) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Duplicate roll number within uploaded file' });
        continue;
      }

      // Check duplicate in database
      if (existingEmailSet.has(email)) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Email already registered in college' });
        continue;
      }
      if (existingRollSet.has(rollNo.toUpperCase())) {
        errorDetails.push({ row: rowNum, name, email, rollNo, reason: 'Roll number already exists in college' });
        continue;
      }

      seenFileEmails.add(email);
      seenFileRolls.add(rollNo.toUpperCase());

      validRows.push({
        name,
        email,
        rollNo,
        phone,
        gender: ['MALE', 'FEMALE', 'OTHER'].includes(gender) ? gender : 'MALE',
        parentName,
        parentPhone,
        academicYearId: defaultAYId,
        programId: defaultProgramId,
        semesterId: defaultSemesterId,
        branchId: defaultBranchId,
        sectionId: defaultSectionId,
        batch: defaultBatch
      });
    }

    // In PREVIEW mode: return validation summary without committing
    if (mode === 'preview') {
      return res.json({
        success: true,
        mode: 'preview',
        totalRows: rows.length,
        validCount: validRows.length,
        invalidCount: errorDetails.length,
        previewRows: validRows.slice(0, 10),
        errorDetails
      });
    }

    // In COMMIT mode: write records and log audit
    const defaultPassword = await bcrypt.hash('Student@123', 10);
    const createdStudents = [];

    for (const v of validRows) {
      const student = await User.create({
        collegeId,
        name: v.name,
        email: v.email,
        password: defaultPassword,
        role: 'STUDENT',
        rollNo: v.rollNo,
        phone: v.phone,
        gender: v.gender,
        admissionNo: v.rollNo,
        admissionDate: new Date(),
        batch: v.batch,
        studentStatus: 'ACTIVE',
        programId: v.programId,
        academicYearId: v.academicYearId,
        semesterId: v.semesterId,
        branchId: v.branchId,
        sectionId: v.sectionId,
        isActive: true
      });

      // Enrollment
      if (v.academicYearId && v.semesterId && v.branchId) {
        await AcademicEnrollment.create({
          collegeId,
          studentId: student.id,
          academicYearId: v.academicYearId,
          programId: v.programId,
          semesterId: v.semesterId,
          branchId: v.branchId,
          sectionId: v.sectionId,
          rollNo: v.rollNo,
          status: 'ACTIVE',
          enrolledAt: new Date()
        });
      }

      // Parent
      if (v.parentName) {
        await StudentParent.create({
          collegeId,
          studentId: student.id,
          relation: 'FATHER',
          name: v.parentName,
          phone: v.parentPhone || '',
          isPrimaryContact: true
        });
      }

      createdStudents.push(student.id);
    }

    // Save Import Log
    const importLog = await StudentImportLog.create({
      collegeId,
      academicYearId: defaultAYId,
      fileName: req.file ? req.file.originalname : 'Manual Batch JSON Import',
      totalRows: rows.length,
      successCount: validRows.length,
      failureCount: errorDetails.length,
      status: errorDetails.length === 0 ? 'COMPLETED' : (validRows.length > 0 ? 'PARTIAL' : 'FAILED'),
      errorDetails,
      importedBy: req.user?.id || null
    });

    return res.json({
      success: true,
      mode: 'commit',
      message: `Bulk import completed: ${validRows.length} imported, ${errorDetails.length} failed`,
      importLogId: importLog.id,
      successCount: validRows.length,
      failureCount: errorDetails.length,
      errorDetails
    });
  } catch (error) {
    console.error('bulkImportStudents error:', error);
    return res.status(500).json({ success: false, message: 'Bulk import failed', error: error.message });
  }
}

// 7. Get Bulk Import History Logs
async function getImportHistory(req, res) {
  try {
    const collegeId = req.collegeId;
    const logs = await StudentImportLog.findAll({
      where: { collegeId },
      order: [['createdAt', 'DESC']],
      limit: 50,
      include: [
        { model: AcademicYear, as: 'academicYear', attributes: ['id', 'yearName'] },
        { model: User, as: 'uploader', attributes: ['id', 'name', 'email'] }
      ]
    });

    return res.json({ success: true, logs });
  } catch (error) {
    console.error('getImportHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch import history', error: error.message });
  }
}

// 8. Assign Trainings to Students (Single or Cohort Bulk Assignment)
async function assignTrainingsToStudents(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      trainingIds = [],
      studentIds = [],
      // Or filter-based assignment:
      academicYearId,
      programId,
      semesterId,
      branchId,
      sectionId
    } = req.body;

    const tIds = Array.isArray(trainingIds) ? trainingIds : [trainingIds];
    if (tIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one training ID must be specified.' });
    }

    let targetStudentIds = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetStudentIds = studentIds;
    } else {
      // Find students matching filter
      const filter = { collegeId, role: 'STUDENT', studentStatus: 'ACTIVE' };
      if (academicYearId) filter.academicYearId = academicYearId;
      if (programId) filter.programId = programId;
      if (semesterId) filter.semesterId = semesterId;
      if (branchId) filter.branchId = branchId;
      if (sectionId) filter.sectionId = sectionId;

      const matching = await User.findAll({ where: filter, attributes: ['id'] });
      targetStudentIds = matching.map(m => m.id);
    }

    if (targetStudentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible active students found for assignment.' });
    }

    const trainings = await Training.findAll({
      where: { id: { [Op.in]: tIds }, collegeId },
      attributes: ['id', 'name']
    });

    let assignedCount = 0;
    for (const tr of trainings) {
      for (const sId of targetStudentIds) {
        const [enr, created] = await TrainingStudent.findOrCreate({
          where: { trainingId: tr.id, studentId: sId },
          defaults: {
            collegeId,
            trainingId: tr.id,
            studentId: sId,
            status: 'ENROLLED',
            enrolledAt: new Date()
          }
        });

        if (created) {
          assignedCount++;
          await StudentActivityLog.create({
            collegeId,
            studentId: sId,
            activityType: 'TRAINING_ASSIGNED',
            title: `Assigned to Training: ${tr.name}`,
            description: `Student enrolled into training course "${tr.name}".`,
            performedBy: req.user?.id || null
          });
        }
      }
    }

    return res.json({
      success: true,
      message: `Successfully enrolled ${targetStudentIds.length} student(s) into ${trainings.length} training(s) (${assignedCount} new enrollments).`
    });
  } catch (error) {
    console.error('assignTrainingsToStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign trainings', error: error.message });
  }
}

// 9. At-Risk Students Center
async function getAtRiskStudents(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, programId, branchId, semesterId } = req.query;

    const studentWhere = { collegeId, role: 'STUDENT', studentStatus: 'ACTIVE' };
    if (academicYearId) studentWhere.academicYearId = academicYearId;
    if (programId) studentWhere.programId = programId;
    if (branchId) studentWhere.branchId = branchId;
    if (semesterId) studentWhere.semesterId = semesterId;

    const students = await User.findAll({
      where: studentWhere,
      attributes: ['id', 'name', 'email', 'rollNo', 'phone', 'batch'],
      include: [
        { model: Program, as: 'program', attributes: ['id', 'name', 'code'] },
        { model: Semester, as: 'semester', attributes: ['id', 'semesterNumber', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: StudentParent, as: 'parents', attributes: ['id', 'relation', 'name', 'phone', 'email', 'isPrimaryContact'] }
      ]
    });

    const sIds = students.map(s => s.id);

    // Fetch attendance data
    const attendances = await Attendance.findAll({
      where: { collegeId, studentId: { [Op.in]: sIds } },
      order: [['date', 'DESC']]
    });

    const studentAtt = {};
    attendances.forEach(a => {
      if (!studentAtt[a.studentId]) {
        studentAtt[a.studentId] = { total: 0, present: 0, consecutiveAbsences: 0, consecutiveBroken: false };
      }
      const item = studentAtt[a.studentId];
      item.total++;
      if (a.status === 'PRESENT') {
        item.present++;
        item.consecutiveBroken = true;
      } else if (a.status === 'ABSENT' && !item.consecutiveBroken) {
        item.consecutiveAbsences++;
      }
    });

    // Fetch assessment scores
    const submissions = await AssessmentSubmission.findAll({
      where: { studentId: { [Op.in]: sIds } },
      attributes: ['studentId', 'percentage']
    });

    const studentScores = {};
    submissions.forEach(sub => {
      if (!studentScores[sub.studentId]) studentScores[sub.studentId] = { total: 0, sum: 0 };
      if (sub.percentage !== null && sub.percentage !== undefined) {
        studentScores[sub.studentId].total++;
        studentScores[sub.studentId].sum += parseFloat(sub.percentage);
      }
    });

    const atRiskList = [];

    students.forEach(st => {
      const att = studentAtt[st.id] || { total: 0, present: 0, consecutiveAbsences: 0 };
      const attRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
      
      const sc = studentScores[st.id] || { total: 0, sum: 0 };
      const avgScore = sc.total > 0 ? Math.round(sc.sum / sc.total) : 75;

      const riskReasons = [];
      if (attRate < 75) {
        riskReasons.push(`Low attendance: ${attRate}% (<75% threshold)`);
      }
      if (att.consecutiveAbsences >= 3) {
        riskReasons.push(`Consecutive absences: ${att.consecutiveAbsences} days in a row`);
      }
      if (avgScore < 60) {
        riskReasons.push(`Low assessment average: ${avgScore}% (<60% threshold)`);
      }

      if (riskReasons.length > 0) {
        const isCritical = attRate < 60 || avgScore < 40 || att.consecutiveAbsences >= 4;
        const primaryParent = st.parents.find(p => p.isPrimaryContact) || st.parents[0] || null;

        atRiskList.push({
          student: st,
          riskLevel: isCritical ? 'CRITICAL' : 'WARNING',
          reasons: riskReasons,
          metrics: {
            attendanceRate: attRate,
            totalSessions: att.total,
            consecutiveAbsences: att.consecutiveAbsences,
            averageScore: avgScore,
            assessmentCount: sc.total
          },
          primaryParent
        });
      }
    });

    // Sort: CRITICAL first, then by attendance rate ascending
    atRiskList.sort((a, b) => {
      if (a.riskLevel === 'CRITICAL' && b.riskLevel !== 'CRITICAL') return -1;
      if (a.riskLevel !== 'CRITICAL' && b.riskLevel === 'CRITICAL') return 1;
      return a.metrics.attendanceRate - b.metrics.attendanceRate;
    });

    return res.json({
      success: true,
      totalAtRisk: atRiskList.length,
      criticalCount: atRiskList.filter(r => r.riskLevel === 'CRITICAL').length,
      warningCount: atRiskList.filter(r => r.riskLevel === 'WARNING').length,
      atRiskStudents: atRiskList
    });
  } catch (error) {
    console.error('getAtRiskStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch at-risk students', error: error.message });
  }
}

// 10. Send Student / Parent Alert (WhatsApp, Email, In-App)
async function sendStudentOrParentAlert(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      studentId,
      channel = 'WHATSAPP', // 'WHATSAPP', 'EMAIL', 'IN_APP', 'ALL'
      recipientType = 'BOTH', // 'STUDENT', 'PARENT', 'BOTH'
      title = 'Important Academic Notification',
      message
    } = req.body;

    if (!studentId || !message) {
      return res.status(400).json({ success: false, message: 'Student ID and alert message are required.' });
    }

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' },
      include: [{ model: StudentParent, as: 'parents' }]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const createdNotifications = [];

    // Send to Student
    if (recipientType === 'STUDENT' || recipientType === 'BOTH') {
      const notif = await Notification.create({
        collegeId,
        recipientId: student.id,
        recipientRole: 'STUDENT',
        title,
        message,
        type: channel === 'WHATSAPP' ? 'WHATSAPP_LOG' : (channel === 'EMAIL' ? 'EMAIL_LOG' : 'IN_APP'),
        isRead: false
      });
      createdNotifications.push(notif);
    }

    // Send to Parents
    if (recipientType === 'PARENT' || recipientType === 'BOTH') {
      const primaryParent = student.parents.find(p => p.isPrimaryContact) || student.parents[0];
      const parentName = primaryParent ? primaryParent.name : 'Guardian';
      const notif = await Notification.create({
        collegeId,
        recipientId: student.id, // linked to student account context
        recipientRole: 'PARENT',
        title: `[For Parent: ${parentName}] ${title}`,
        message,
        type: channel === 'WHATSAPP' ? 'WHATSAPP_LOG' : (channel === 'EMAIL' ? 'EMAIL_LOG' : 'IN_APP'),
        isRead: false
      });
      createdNotifications.push(notif);
    }

    // Record in Student Activity Log
    await StudentActivityLog.create({
      collegeId,
      studentId: student.id,
      activityType: 'ALERT_SENT',
      title: `Alert Sent via ${channel}`,
      description: `Target: ${recipientType}. Title: "${title}". Message: "${message.substring(0, 120)}${message.length > 120 ? '...' : ''}"`,
      performedBy: req.user?.id || null
    });

    return res.json({
      success: true,
      message: `Alert dispatched successfully via ${channel} to ${recipientType}.`,
      deliveryStatus: 'SENT',
      dispatchedCount: createdNotifications.length
    });
  } catch (error) {
    console.error('sendStudentOrParentAlert error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send alert', error: error.message });
  }
}

// 11. Update Student Lifecycle Status (Suspend, Graduate, Alumni, Reactivate)
async function updateStudentStatus(req, res) {
  try {
    const collegeId = req.collegeId;
    const studentId = req.params.id;
    const { status, reason = '' } = req.body;

    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED', 'ALUMNI'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const oldStatus = student.studentStatus;
    await student.update({
      studentStatus: status,
      isActive: status === 'ACTIVE'
    });

    await StudentActivityLog.create({
      collegeId,
      studentId: student.id,
      activityType: 'STATUS_CHANGE',
      title: `Status Changed to ${status}`,
      description: reason || `Status changed from ${oldStatus} to ${status} by administrator.`,
      performedBy: req.user?.id || null
    });

    return res.json({
      success: true,
      message: `Student status updated to ${status}.`,
      student
    });
  } catch (error) {
    console.error('updateStudentStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update student status', error: error.message });
  }
}

// 12. Reset Student Password
async function resetStudentPassword(req, res) {
  try {
    const collegeId = req.collegeId;
    const studentId = req.params.id;
    const { newPassword = 'Student@123' } = req.body;

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await student.update({ password: hashedPassword });

    await StudentActivityLog.create({
      collegeId,
      studentId: student.id,
      activityType: 'NOTE_ADDED',
      title: 'Password Reset',
      description: 'Account security credential reset by College Administrator.',
      performedBy: req.user?.id || null
    });

    return res.json({
      success: true,
      message: 'Student password reset successfully. Default password is: ' + newPassword
    });
  } catch (error) {
    console.error('resetStudentPassword error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset student password', error: error.message });
  }
}

// 13. Transfer Student (Branch / Section Change with History Preservation)
async function transferStudent(req, res) {
  const t = await sequelize.transaction();
  try {
    const collegeId = req.collegeId;
    const studentId = req.params.id;
    const { targetBranchId, targetSectionId, reason = '' } = req.body;

    const student = await User.findOne({
      where: { id: studentId, collegeId, role: 'STUDENT' }
    });

    if (!student) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const oldBranch = student.branchId ? await Branch.findByPk(student.branchId) : null;
    const newBranch = targetBranchId ? await Branch.findByPk(targetBranchId) : null;
    const oldSection = student.sectionId ? await Section.findByPk(student.sectionId) : null;
    const newSection = targetSectionId ? await Section.findByPk(targetSectionId) : null;

    // Update active AcademicEnrollment if exists
    const currentEnrollment = await AcademicEnrollment.findOne({
      where: {
        collegeId,
        studentId: student.id,
        status: 'ACTIVE'
      },
      order: [['id', 'DESC']]
    });

    if (currentEnrollment) {
      await currentEnrollment.update({
        branchId: targetBranchId || currentEnrollment.branchId,
        sectionId: targetSectionId || currentEnrollment.sectionId
      }, { transaction: t });
    }

    // Update student
    await student.update({
      branchId: targetBranchId || student.branchId,
      sectionId: targetSectionId || student.sectionId
    }, { transaction: t });

    // Activity Log
    await StudentActivityLog.create({
      collegeId,
      studentId: student.id,
      activityType: 'ACADEMIC_TRANSFER',
      title: 'Student Academic Transfer',
      description: `Transferred from [Branch: ${oldBranch?.name || 'N/A'}, Section: ${oldSection?.name || 'N/A'}] to [Branch: ${newBranch?.name || 'N/A'}, Section: ${newSection?.name || 'N/A'}]. Reason: ${reason || 'Administrative adjustment'}`,
      performedBy: req.user?.id || null
    }, { transaction: t });

    await t.commit();

    return res.json({
      success: true,
      message: 'Student transferred successfully',
      student
    });
  } catch (error) {
    await t.rollback();
    console.error('transferStudent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to transfer student', error: error.message });
  }
}

// 14. Bulk Promote Students to Next Academic Year / Semester
async function bulkPromoteStudents(req, res) {
  const t = await sequelize.transaction();
  try {
    const collegeId = req.collegeId;
    const {
      studentIds = [],
      toAcademicYearId,
      toProgramId,
      toSemesterId,
      toBranchId,
      toSectionId
    } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Please select at least one student to promote.' });
    }

    if (!toAcademicYearId || !toSemesterId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Target Academic Year and Semester are required.' });
    }

    const students = await User.findAll({
      where: {
        id: { [Op.in]: studentIds },
        collegeId,
        role: 'STUDENT'
      }
    });

    const targetSem = await Semester.findByPk(toSemesterId);
    const targetAY = await AcademicYear.findByPk(toAcademicYearId);

    for (const st of students) {
      // Archive current active enrollment as COMPLETED
      await AcademicEnrollment.update(
        { status: 'COMPLETED' },
        {
          where: {
            collegeId,
            studentId: st.id,
            status: 'ACTIVE'
          },
          transaction: t
        }
      );

      // Create new enrollment
      await AcademicEnrollment.create({
        collegeId,
        studentId: st.id,
        academicYearId: toAcademicYearId,
        programId: toProgramId || st.programId,
        semesterId: toSemesterId,
        branchId: toBranchId || st.branchId,
        sectionId: toSectionId || st.sectionId,
        rollNo: st.rollNo,
        status: 'ACTIVE',
        enrolledAt: new Date()
      }, { transaction: t });

      // Update student current pointers
      await st.update({
        academicYearId: toAcademicYearId,
        programId: toProgramId || st.programId,
        semesterId: toSemesterId,
        branchId: toBranchId || st.branchId,
        sectionId: toSectionId || st.sectionId
      }, { transaction: t });

      // Log promotion activity
      await StudentActivityLog.create({
        collegeId,
        studentId: st.id,
        activityType: 'PROMOTION',
        title: `Promoted to ${targetSem?.name || 'Next Semester'}`,
        description: `Promoted to Academic Year ${targetAY?.yearName || ''}, Semester ${targetSem?.semesterNumber || ''}.`,
        performedBy: req.user?.id || null
      }, { transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      message: `Successfully promoted ${students.length} students to ${targetSem?.name || 'next term'}.`
    });
  } catch (error) {
    await t.rollback();
    console.error('bulkPromoteStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to promote students', error: error.message });
  }
}

module.exports = {
  getStudentDashboardStats,
  getStudentsAdvanced,
  getStudent360Profile,
  createStudentComprehensive,
  updateStudentComprehensive,
  bulkImportStudents,
  getImportHistory,
  assignTrainingsToStudents,
  getAtRiskStudents,
  sendStudentOrParentAlert,
  updateStudentStatus,
  resetStudentPassword,
  transferStudent,
  bulkPromoteStudents
};
