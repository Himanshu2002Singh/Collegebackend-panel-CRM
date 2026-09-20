const { Op } = require('sequelize');
const {
  College, User, Program, AcademicYear, Semester, Branch, Section,
  AcademicBatch, Subject, SubjectOffering, AcademicEnrollment,
  AcademicCalendarEvent, Training
} = require('../models');

// 1. Academic Dashboard Metrics
async function getAcademicDashboard(req, res) {
  try {
    const collegeId = req.collegeId;
    const selectedAyId = req.query.academicYearId;

    let currentAY = null;
    if (selectedAyId) {
      currentAY = await AcademicYear.findOne({ where: { id: selectedAyId, collegeId } });
    }
    if (!currentAY) {
      currentAY = await AcademicYear.findOne({ where: { collegeId, isCurrent: true } }) ||
                  await AcademicYear.findOne({ where: { collegeId }, order: [['id', 'DESC']] });
    }

    const academicYears = await AcademicYear.findAll({
      where: { collegeId },
      order: [['startDate', 'DESC'], ['id', 'DESC']]
    });

    const totalPrograms = await Program.count({ where: { collegeId, status: 'ACTIVE' } });
    const totalSemesters = await Semester.count({
      where: { collegeId, ...(currentAY ? { academicYearId: currentAY.id } : {}) }
    });
    const totalBranches = await Branch.count({ where: { collegeId, status: 'ACTIVE' } });
    const totalSections = await Section.count({
      where: { collegeId, ...(currentAY ? { academicYearId: currentAY.id } : {}) }
    });
    const totalSubjects = await Subject.count({ where: { collegeId } });
    const totalSubjectOfferings = currentAY ? await SubjectOffering.count({
      where: { collegeId, academicYearId: currentAY.id }
    }) : 0;

    let totalEnrolledStudents = 0;
    if (currentAY) {
      totalEnrolledStudents = await AcademicEnrollment.count({
        where: { collegeId, academicYearId: currentAY.id, status: 'ACTIVE' }
      });
    }
    if (totalEnrolledStudents === 0) {
      totalEnrolledStudents = await User.count({ where: { collegeId, role: 'STUDENT', isActive: true } });
    }

    // Branch breakdown
    const branches = await Branch.findAll({ where: { collegeId } });
    const branchStats = [];
    for (const b of branches) {
      const count = currentAY ? await AcademicEnrollment.count({
        where: { collegeId, academicYearId: currentAY.id, branchId: b.id, status: 'ACTIVE' }
      }) : await User.count({ where: { collegeId, branchId: b.id, role: 'STUDENT' } });
      branchStats.push({
        branchId: b.id,
        branchName: b.name,
        branchCode: b.code,
        studentCount: count
      });
    }

    res.json({
      success: true,
      data: {
        currentAY,
        academicYears,
        stats: {
          totalPrograms,
          totalSemesters,
          totalBranches,
          totalSections,
          totalSubjects,
          totalSubjectOfferings,
          totalEnrolledStudents
        },
        branchStats
      }
    });
  } catch (err) {
    console.error('Academic dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2. Academic Hierarchy Tree
async function getAcademicTree(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId } = req.query;

    let ay = null;
    if (academicYearId) {
      ay = await AcademicYear.findOne({ where: { id: academicYearId, collegeId } });
    }
    if (!ay) {
      ay = await AcademicYear.findOne({ where: { collegeId, isCurrent: true } }) ||
           await AcademicYear.findOne({ where: { collegeId }, order: [['id', 'DESC']] });
    }

    const academicYears = await AcademicYear.findAll({ where: { collegeId }, order: [['yearName', 'DESC']] });
    const programs = await Program.findAll({ where: { collegeId } });
    const branches = await Branch.findAll({ where: { collegeId } });
    const subjects = await Subject.findAll({ where: { collegeId } });

    const semesterWhere = { collegeId };
    if (ay) semesterWhere.academicYearId = ay.id;
    const semesters = await Semester.findAll({
      where: semesterWhere,
      order: [['semesterNumber', 'ASC']]
    });

    const sectionWhere = { collegeId };
    if (ay) sectionWhere.academicYearId = ay.id;
    const sections = await Section.findAll({
      where: sectionWhere,
      include: [
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' }
      ]
    });

    const sectionsWithCount = await Promise.all(sections.map(async (sec) => {
      const count = ay ? await AcademicEnrollment.count({
        where: { collegeId, academicYearId: ay.id, sectionId: sec.id, status: 'ACTIVE' }
      }) : await User.count({ where: { collegeId, sectionId: sec.id, role: 'STUDENT' } });

      const trainingsCount = await Training.count({
        where: { collegeId, sectionId: sec.id, ...(ay ? { academicYearId: ay.id } : {}) }
      });

      const sJson = sec.toJSON();
      sJson.studentCount = count;
      sJson.trainingsCount = trainingsCount;
      return sJson;
    }));

    const offerings = ay ? await SubjectOffering.findAll({
      where: { collegeId, academicYearId: ay.id },
      include: [
        { model: Subject, as: 'subject' },
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' }
      ]
    }) : [];

    res.json({
      success: true,
      data: {
        selectedAcademicYear: ay,
        academicYears,
        programs,
        semesters,
        branches,
        sections: sectionsWithCount,
        subjects,
        offerings
      }
    });
  } catch (err) {
    console.error('Academic tree error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3. Academic Years Endpoints
async function getAcademicYears(req, res) {
  try {
    const collegeId = req.collegeId;
    const years = await AcademicYear.findAll({
      where: { collegeId },
      order: [['startDate', 'DESC'], ['id', 'DESC']]
    });

    const detailedYears = await Promise.all(years.map(async (y) => {
      const semesterCount = await Semester.count({ where: { academicYearId: y.id } });
      const sectionCount = await Section.count({ where: { academicYearId: y.id } });
      const studentCount = await AcademicEnrollment.count({ where: { academicYearId: y.id, status: 'ACTIVE' } });
      const subjectOfferingCount = await SubjectOffering.count({ where: { academicYearId: y.id } });
      const trainingCount = await Training.count({ where: { academicYearId: y.id } });

      const yJson = y.toJSON();
      yJson.semesterCount = semesterCount;
      yJson.sectionCount = sectionCount;
      yJson.studentCount = studentCount;
      yJson.subjectOfferingCount = subjectOfferingCount;
      yJson.trainingCount = trainingCount;
      return yJson;
    }));

    res.json({ success: true, data: detailedYears });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createAcademicYear(req, res) {
  try {
    const collegeId = req.collegeId;
    const { yearName, startDate, endDate, status, isCurrent, description } = req.body;
    if (!yearName) {
      return res.status(400).json({ success: false, message: 'Academic Year name is required (e.g., 2026-27).' });
    }

    if (isCurrent) {
      await AcademicYear.update({ isCurrent: false }, { where: { collegeId } });
    }

    const year = await AcademicYear.create({
      collegeId,
      yearName: yearName.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'ACTIVE',
      isCurrent: Boolean(isCurrent),
      description: description || ''
    });

    res.status(201).json({ success: true, year });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const { yearName, startDate, endDate, status, isCurrent, description } = req.body;
    const year = await AcademicYear.findOne({ where: { id, collegeId: req.collegeId } });
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found.' });

    if (isCurrent && !year.isCurrent) {
      await AcademicYear.update({ isCurrent: false }, { where: { collegeId: req.collegeId } });
    }

    await year.update({
      yearName: yearName !== undefined ? yearName.trim() : year.yearName,
      startDate: startDate !== undefined ? startDate : year.startDate,
      endDate: endDate !== undefined ? endDate : year.endDate,
      status: status !== undefined ? status : year.status,
      isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : year.isCurrent,
      description: description !== undefined ? description : year.description
    });

    res.json({ success: true, year });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function setCurrentAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId;
    const year = await AcademicYear.findOne({ where: { id, collegeId } });
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found.' });

    await AcademicYear.update({ isCurrent: false }, { where: { collegeId } });
    await year.update({ isCurrent: true, status: 'ACTIVE' });

    res.json({
      success: true,
      message: `${year.yearName} is now set as the active current academic year.`,
      year
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function archiveAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const year = await AcademicYear.findOne({ where: { id, collegeId: req.collegeId } });
    if (!year) return res.status(404).json({ success: false, message: 'Academic Year not found.' });

    await year.update({ status: 'ARCHIVED', isCurrent: false });

    res.json({
      success: true,
      message: `${year.yearName} has been archived. All student, marks, and attendance history are locked in read-only mode.`,
      year
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function cloneAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId;
    const { newYearName, startDate, endDate, copySemesters, copySections, copyOfferings } = req.body;

    const sourceYear = await AcademicYear.findOne({ where: { id, collegeId } });
    if (!sourceYear) return res.status(404).json({ success: false, message: 'Source Academic Year not found.' });

    if (!newYearName) {
      return res.status(400).json({ success: false, message: 'New Academic Year name is required.' });
    }

    const existingNew = await AcademicYear.findOne({ where: { collegeId, yearName: newYearName.trim() } });
    if (existingNew) {
      return res.status(400).json({ success: false, message: `Academic Year ${newYearName} already exists.` });
    }

    // 1. Create Target Academic Year
    const newAY = await AcademicYear.create({
      collegeId,
      yearName: newYearName.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      status: 'UPCOMING',
      isCurrent: false,
      description: `Cloned structure from ${sourceYear.yearName}`
    });

    const semesterIdMap = {};

    // 2. Clone Semesters
    if (copySemesters !== false) {
      const sourceSemesters = await Semester.findAll({ where: { collegeId, academicYearId: sourceYear.id } });
      for (const sem of sourceSemesters) {
        const newSem = await Semester.create({
          collegeId,
          academicYearId: newAY.id,
          programId: sem.programId,
          semesterNumber: sem.semesterNumber,
          name: sem.name,
          type: sem.type,
          startDate: sem.startDate,
          endDate: sem.endDate,
          status: 'UPCOMING'
        });
        semesterIdMap[sem.id] = newSem.id;
      }
    }

    // 3. Clone Sections
    if (copySections !== false) {
      const sourceSections = await Section.findAll({ where: { collegeId, academicYearId: sourceYear.id } });
      for (const sec of sourceSections) {
        const targetSemId = semesterIdMap[sec.semesterId] || sec.semesterId;
        await Section.create({
          collegeId,
          academicYearId: newAY.id,
          semesterId: targetSemId,
          branchId: sec.branchId,
          name: sec.name,
          roomNo: sec.roomNo,
          maxCapacity: sec.maxCapacity
        });
      }
    }

    // 4. Clone Subject Offerings
    if (copyOfferings !== false) {
      const sourceOfferings = await SubjectOffering.findAll({ where: { collegeId, academicYearId: sourceYear.id } });
      for (const off of sourceOfferings) {
        const targetSemId = semesterIdMap[off.semesterId] || off.semesterId;
        await SubjectOffering.create({
          collegeId,
          subjectId: off.subjectId,
          academicYearId: newAY.id,
          semesterId: targetSemId,
          branchId: off.branchId,
          status: 'ACTIVE'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully cloned academic structure from ${sourceYear.yearName} to ${newAY.yearName}.`,
      academicYear: newAY
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId;

    const studentCount = await AcademicEnrollment.count({ where: { academicYearId: id, collegeId } });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this academic year because it has ${studentCount} student enrollment records. You can archive it instead.`
      });
    }

    await AcademicYear.destroy({ where: { id, collegeId } });
    res.json({ success: true, message: 'Academic Year deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4. Programs / Degrees CRUD
async function getPrograms(req, res) {
  try {
    const programs = await Program.findAll({
      where: { collegeId: req.collegeId },
      include: [{ model: Branch, as: 'branches' }]
    });
    res.json({ success: true, data: programs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createProgram(req, res) {
  try {
    const { name, code, durationYears, totalSemesters, department, status } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Program name and code are required.' });
    }
    const program = await Program.create({
      collegeId: req.collegeId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      durationYears: durationYears || 4,
      totalSemesters: totalSemesters || 8,
      department: department || 'Engineering & Technology',
      status: status || 'ACTIVE'
    });
    res.status(201).json({ success: true, program });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateProgram(req, res) {
  try {
    const { id } = req.params;
    const program = await Program.findOne({ where: { id, collegeId: req.collegeId } });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found.' });

    await program.update(req.body);
    res.json({ success: true, program });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteProgram(req, res) {
  try {
    const { id } = req.params;
    await Program.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Program deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 5. Semesters CRUD
async function getSemesters(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, programId } = req.query;

    const where = { collegeId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (programId) where.programId = programId;

    const semesters = await Semester.findAll({
      where,
      include: [
        { model: AcademicYear, as: 'academicYear' },
        { model: Program, as: 'program' }
      ],
      order: [['semesterNumber', 'ASC']]
    });

    res.json({ success: true, data: semesters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSemester(req, res) {
  try {
    const { academicYearId, programId, semesterNumber, name, type, startDate, endDate, status } = req.body;
    if (!academicYearId || !semesterNumber) {
      return res.status(400).json({ success: false, message: 'Academic Year and Semester Number are required.' });
    }

    const semester = await Semester.create({
      collegeId: req.collegeId,
      academicYearId,
      programId: programId || null,
      semesterNumber: parseInt(semesterNumber),
      name: name || `Semester ${semesterNumber}`,
      type: type || (parseInt(semesterNumber) % 2 === 1 ? 'ODD' : 'EVEN'),
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'ACTIVE'
    });

    res.status(201).json({ success: true, semester });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSemester(req, res) {
  try {
    const { id } = req.params;
    const semester = await Semester.findOne({ where: { id, collegeId: req.collegeId } });
    if (!semester) return res.status(404).json({ success: false, message: 'Semester not found.' });

    await semester.update(req.body);
    res.json({ success: true, semester });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSemester(req, res) {
  try {
    const { id } = req.params;
    await Semester.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Semester deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 6. Branches CRUD
async function getBranches(req, res) {
  try {
    const collegeId = req.collegeId;
    const { programId } = req.query;

    const where = { collegeId };
    if (programId) where.programId = programId;

    const branches = await Branch.findAll({
      where,
      include: [{ model: Program, as: 'program' }]
    });

    // Count enrolled students per branch
    const branchesWithCount = await Promise.all(branches.map(async (b) => {
      const studentCount = await User.count({ where: { collegeId, branchId: b.id, role: 'STUDENT' } });
      const bJson = b.toJSON();
      bJson.studentCount = studentCount;
      return bJson;
    }));

    res.json({ success: true, data: branchesWithCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createBranch(req, res) {
  try {
    const { name, code, programId, department, hodName, status } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Branch Name and Code are required.' });
    }

    const branch = await Branch.create({
      collegeId: req.collegeId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      programId: programId || null,
      department: department || '',
      hodName: hodName || '',
      status: status || 'ACTIVE'
    });

    res.status(201).json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateBranch(req, res) {
  try {
    const { id } = req.params;
    const branch = await Branch.findOne({ where: { id, collegeId: req.collegeId } });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

    await branch.update(req.body);
    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteBranch(req, res) {
  try {
    const { id } = req.params;
    await Branch.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Branch deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 7. Sections CRUD
async function getSections(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, semesterId, branchId } = req.query;

    const where = { collegeId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (semesterId) where.semesterId = semesterId;
    if (branchId) where.branchId = branchId;

    const sections = await Section.findAll({
      where,
      include: [
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' }
      ]
    });

    const sectionsWithCount = await Promise.all(sections.map(async (sec) => {
      const studentCount = await AcademicEnrollment.count({
        where: { collegeId, sectionId: sec.id, status: 'ACTIVE' }
      });
      const sJson = sec.toJSON();
      sJson.studentCount = studentCount;
      return sJson;
    }));

    res.json({ success: true, data: sectionsWithCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSection(req, res) {
  try {
    const { academicYearId, semesterId, branchId, name, roomNo, maxCapacity } = req.body;
    if (!semesterId || !branchId || !name) {
      return res.status(400).json({ success: false, message: 'Semester, Branch, and Section Name are required.' });
    }

    const section = await Section.create({
      collegeId: req.collegeId,
      academicYearId: academicYearId || null,
      semesterId,
      branchId,
      name: name.trim().toUpperCase(),
      roomNo: roomNo || '',
      maxCapacity: maxCapacity || 60
    });

    res.status(201).json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSection(req, res) {
  try {
    const { id } = req.params;
    const section = await Section.findOne({ where: { id, collegeId: req.collegeId } });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    await section.update(req.body);
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSection(req, res) {
  try {
    const { id } = req.params;
    await Section.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Section deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 8. Batches CRUD
async function getBatches(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, branchId, semesterId, sectionId } = req.query;

    const where = { collegeId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (branchId) where.branchId = branchId;
    if (semesterId) where.semesterId = semesterId;
    if (sectionId) where.sectionId = sectionId;

    const batches = await AcademicBatch.findAll({
      where,
      include: [
        { model: Branch, as: 'branch' },
        { model: Semester, as: 'semester' },
        { model: Section, as: 'section' }
      ]
    });

    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createBatch(req, res) {
  try {
    const { academicYearId, branchId, semesterId, sectionId, name, type, status } = req.body;
    if (!academicYearId || !branchId || !semesterId || !name) {
      return res.status(400).json({ success: false, message: 'Academic Year, Branch, Semester, and Batch Name are required.' });
    }

    const batch = await AcademicBatch.create({
      collegeId: req.collegeId,
      academicYearId,
      branchId,
      semesterId,
      sectionId: sectionId || null,
      name: name.trim(),
      type: type || 'ACADEMIC',
      status: status || 'ACTIVE'
    });

    res.status(201).json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateBatch(req, res) {
  try {
    const { id } = req.params;
    const batch = await AcademicBatch.findOne({ where: { id, collegeId: req.collegeId } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });

    await batch.update(req.body);
    res.json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteBatch(req, res) {
  try {
    const { id } = req.params;
    await AcademicBatch.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Batch deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 9. Subjects & Subject Offerings
async function getSubjects(req, res) {
  try {
    const subjects = await Subject.findAll({
      where: { collegeId: req.collegeId }
    });
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSubject(req, res) {
  try {
    const { name, code, credits, type, department, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Subject Name and Code are required.' });
    }

    const subject = await Subject.create({
      collegeId: req.collegeId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: credits || 4,
      type: type || 'THEORY_PRACTICAL',
      department: department || '',
      description: description || ''
    });

    res.status(201).json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateSubject(req, res) {
  try {
    const { id } = req.params;
    const subject = await Subject.findOne({ where: { id, collegeId: req.collegeId } });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    await subject.update(req.body);
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    await Subject.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSubjectOfferings(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, semesterId, branchId } = req.query;

    const where = { collegeId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (semesterId) where.semesterId = semesterId;
    if (branchId) where.branchId = branchId;

    const offerings = await SubjectOffering.findAll({
      where,
      include: [
        { model: Subject, as: 'subject' },
        { model: AcademicYear, as: 'academicYear' },
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' }
      ]
    });

    res.json({ success: true, data: offerings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createSubjectOffering(req, res) {
  try {
    const { subjectId, academicYearId, semesterId, branchId, sectionId, status } = req.body;
    if (!subjectId || !academicYearId || !semesterId || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Subject, Academic Year, Semester, and Branch are required for subject offering.'
      });
    }

    const offering = await SubjectOffering.create({
      collegeId: req.collegeId,
      subjectId,
      academicYearId,
      semesterId,
      branchId,
      sectionId: sectionId || null,
      status: status || 'ACTIVE'
    });

    res.status(201).json({ success: true, offering });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteSubjectOffering(req, res) {
  try {
    const { id } = req.params;
    await SubjectOffering.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Subject offering removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 10. Student Promotion Engine
async function getPromotionCandidates(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId, semesterId, branchId, sectionId } = req.query;

    if (!academicYearId || !semesterId) {
      return res.status(400).json({ success: false, message: 'Academic Year and Semester are required.' });
    }

    const enrollmentWhere = { collegeId, academicYearId, semesterId, status: 'ACTIVE' };
    if (branchId) enrollmentWhere.branchId = branchId;
    if (sectionId) enrollmentWhere.sectionId = sectionId;

    const enrollments = await AcademicEnrollment.findAll({
      where: enrollmentWhere,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'rollNo', 'enrollmentNo', 'phone']
        },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' },
        { model: Semester, as: 'semester' }
      ],
      order: [['rollNo', 'ASC'], ['id', 'ASC']]
    });

    res.json({ success: true, candidates: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function promoteStudents(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      studentIds,
      sourceAcademicYearId,
      sourceSemesterId,
      targetAcademicYearId,
      targetSemesterId,
      targetBranchId,
      targetSectionId,
      remarks
    } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one student to promote.' });
    }
    if (!targetAcademicYearId || !targetSemesterId) {
      return res.status(400).json({ success: false, message: 'Target Academic Year and Semester are required.' });
    }

    let promotedCount = 0;
    for (const studentId of studentIds) {
      // Mark previous active enrollment as PROMOTED
      await AcademicEnrollment.update(
        { status: 'PROMOTED', remarks: remarks || 'Promoted to next academic term' },
        {
          where: {
            collegeId,
            studentId,
            ...(sourceAcademicYearId ? { academicYearId: sourceAcademicYearId } : {}),
            ...(sourceSemesterId ? { semesterId: sourceSemesterId } : {}),
            status: 'ACTIVE'
          }
        }
      );

      // Fetch student details
      const student = await User.findOne({ where: { id: studentId, collegeId } });
      const branchIdToUse = targetBranchId || (student ? student.branchId : null);

      // Create new enrollment in target year/semester
      await AcademicEnrollment.create({
        collegeId,
        studentId,
        academicYearId: targetAcademicYearId,
        programId: student ? student.programId : null,
        semesterId: targetSemesterId,
        branchId: branchIdToUse,
        sectionId: targetSectionId || null,
        rollNo: student ? student.rollNo : '',
        status: 'ACTIVE',
        remarks: remarks || `Promoted from AY ${sourceAcademicYearId || ''} Sem ${sourceSemesterId || ''}`,
        enrolledAt: new Date()
      });

      // Update current pointers on student profile
      if (student) {
        await student.update({
          academicYearId: targetAcademicYearId,
          semesterId: targetSemesterId,
          ...(branchIdToUse ? { branchId: branchIdToUse } : {}),
          ...(targetSectionId ? { sectionId: targetSectionId } : {})
        });
      }
      promotedCount++;
    }

    res.json({
      success: true,
      message: `Successfully promoted ${promotedCount} student(s) to the new academic term!`,
      promotedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 11. Student Transfer (Section or Branch change with history preservation)
async function transferStudent(req, res) {
  try {
    const collegeId = req.collegeId;
    const { studentId, transferType, targetSectionId, targetBranchId, reason } = req.body;

    const student = await User.findOne({ where: { id: studentId, collegeId } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const activeEnrollment = await AcademicEnrollment.findOne({
      where: { collegeId, studentId, status: 'ACTIVE' },
      order: [['id', 'DESC']]
    });

    if (transferType === 'SECTION_TRANSFER') {
      if (!targetSectionId) {
        return res.status(400).json({ success: false, message: 'Target section is required for section transfer.' });
      }

      if (activeEnrollment) {
        await activeEnrollment.update({
          status: 'TRANSFERRED',
          remarks: `Transferred to Section ID ${targetSectionId}. Reason: ${reason || 'Approved section transfer'}`
        });
      }

      await AcademicEnrollment.create({
        collegeId,
        studentId,
        academicYearId: activeEnrollment ? activeEnrollment.academicYearId : student.academicYearId,
        programId: student.programId,
        semesterId: activeEnrollment ? activeEnrollment.semesterId : student.semesterId,
        branchId: activeEnrollment ? activeEnrollment.branchId : student.branchId,
        sectionId: targetSectionId,
        rollNo: student.rollNo,
        status: 'ACTIVE',
        remarks: `Section Transfer: ${reason || 'Approved section transfer'}`,
        enrolledAt: new Date()
      });

      await student.update({ sectionId: targetSectionId });

      res.json({
        success: true,
        message: 'Student section transferred successfully. Attendance and past records remain intact.'
      });
    } else if (transferType === 'BRANCH_TRANSFER') {
      if (!targetBranchId) {
        return res.status(400).json({ success: false, message: 'Target branch is required for branch transfer.' });
      }

      if (activeEnrollment) {
        await activeEnrollment.update({
          status: 'TRANSFERRED',
          remarks: `Branch Changed to Branch ID ${targetBranchId}. Reason: ${reason || 'Approved branch change'}`
        });
      }

      await AcademicEnrollment.create({
        collegeId,
        studentId,
        academicYearId: activeEnrollment ? activeEnrollment.academicYearId : student.academicYearId,
        programId: student.programId,
        semesterId: activeEnrollment ? activeEnrollment.semesterId : student.semesterId,
        branchId: targetBranchId,
        sectionId: targetSectionId || null,
        rollNo: student.rollNo,
        status: 'ACTIVE',
        remarks: `Branch Transfer: ${reason || 'Approved branch change'}`,
        enrolledAt: new Date()
      });

      await student.update({
        branchId: targetBranchId,
        ...(targetSectionId ? { sectionId: targetSectionId } : {})
      });

      res.json({
        success: true,
        message: 'Student branch transferred successfully. Complete history preserved in academic progression.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid transferType. Use SECTION_TRANSFER or BRANCH_TRANSFER.'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 12. Student Academic Progression History
async function getStudentAcademicHistory(req, res) {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId;

    const student = await User.findOne({
      where: { id, collegeId, role: 'STUDENT' },
      attributes: { exclude: ['password'] }
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const history = await AcademicEnrollment.findAll({
      where: { collegeId, studentId: id },
      include: [
        { model: AcademicYear, as: 'academicYear' },
        { model: Program, as: 'program' },
        { model: Semester, as: 'semester' },
        { model: Branch, as: 'branch' },
        { model: Section, as: 'section' }
      ],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, student, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 13. Academic Calendar
async function getCalendarEvents(req, res) {
  try {
    const collegeId = req.collegeId;
    const { academicYearId } = req.query;

    const where = { collegeId };
    if (academicYearId) where.academicYearId = academicYearId;

    const events = await AcademicCalendarEvent.findAll({
      where,
      order: [['startDate', 'ASC']]
    });

    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCalendarEvent(req, res) {
  try {
    const { academicYearId, title, eventType, startDate, endDate, description } = req.body;
    if (!academicYearId || !title || !startDate) {
      return res.status(400).json({ success: false, message: 'Academic Year, Title, and Start Date are required.' });
    }

    const event = await AcademicCalendarEvent.create({
      collegeId: req.collegeId,
      academicYearId,
      title: title.trim(),
      eventType: eventType || 'EVENT',
      startDate,
      endDate: endDate || startDate,
      description: description || ''
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    const event = await AcademicCalendarEvent.findOne({ where: { id, collegeId: req.collegeId } });
    if (!event) return res.status(404).json({ success: false, message: 'Calendar event not found.' });

    await event.update(req.body);
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteCalendarEvent(req, res) {
  try {
    const { id } = req.params;
    await AcademicCalendarEvent.destroy({ where: { id, collegeId: req.collegeId } });
    res.json({ success: true, message: 'Calendar event removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAcademicDashboard,
  getAcademicTree,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  setCurrentAcademicYear,
  archiveAcademicYear,
  cloneAcademicYear,
  deleteAcademicYear,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectOfferings,
  createSubjectOffering,
  deleteSubjectOffering,
  getPromotionCandidates,
  promoteStudents,
  transferStudent,
  getStudentAcademicHistory,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
