const { sequelize } = require('../config/database');
const {
  College, User, Program, AcademicYear, Semester, Branch, Section,
  AcademicBatch, Subject, SubjectOffering, AcademicEnrollment,
  AcademicCalendarEvent, Training
} = require('../models');

async function migrateAcademicHierarchy() {
  try {
    console.log('--- Step 1: Synchronizing Tables with Alter ---');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronized with altered columns successfully.');

    // Find the primary demo college (ABC Institute of Technology)
    const college = await College.findOne({ where: { code: 'ABC' } });
    if (!college) {
      console.log('College ABC not found. Please run regular seed first.');
      process.exit(0);
    }
    const collegeId = college.id;

    console.log('--- Step 2: Seeding Institutional Programs / Degrees ---');
    let btech = await Program.findOne({ where: { collegeId, code: 'B.TECH' } });
    if (!btech) {
      btech = await Program.create({
        collegeId,
        name: 'Bachelor of Technology',
        code: 'B.TECH',
        durationYears: 4,
        totalSemesters: 8,
        department: 'School of Engineering & Computing',
        status: 'ACTIVE'
      });
    }

    let bca = await Program.findOne({ where: { collegeId, code: 'BCA' } });
    if (!bca) {
      bca = await Program.create({
        collegeId,
        name: 'Bachelor of Computer Applications',
        code: 'BCA',
        durationYears: 3,
        totalSemesters: 6,
        department: 'School of Computer Science',
        status: 'ACTIVE'
      });
    }

    let mba = await Program.findOne({ where: { collegeId, code: 'MBA' } });
    if (!mba) {
      mba = await Program.create({
        collegeId,
        name: 'Master of Business Administration',
        code: 'MBA',
        durationYears: 2,
        totalSemesters: 4,
        department: 'School of Management Studies',
        status: 'ACTIVE'
      });
    }

    console.log('--- Step 3: Updating & Seeding Academic Years ---');
    // Ensure 2026-27 exists and is marked as Current
    let ay2026 = await AcademicYear.findOne({ where: { collegeId, yearName: '2026-27' } });
    if (ay2026) {
      await ay2026.update({
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        status: 'ACTIVE',
        isCurrent: true,
        description: 'Current active academic year for undergraduate and postgraduate cohorts.'
      });
    } else {
      ay2026 = await AcademicYear.create({
        collegeId,
        yearName: '2026-27',
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        status: 'ACTIVE',
        isCurrent: true,
        description: 'Current active academic year for undergraduate and postgraduate cohorts.'
      });
    }

    // Historical Year: 2025-26 (Completed / Archived)
    let ay2025 = await AcademicYear.findOne({ where: { collegeId, yearName: '2025-26' } });
    if (!ay2025) {
      ay2025 = await AcademicYear.create({
        collegeId,
        yearName: '2025-26',
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        status: 'COMPLETED',
        isCurrent: false,
        description: 'Historical session. Records preserved in read-only audit mode.'
      });
    }

    // Upcoming Year: 2027-28
    let ay2027 = await AcademicYear.findOne({ where: { collegeId, yearName: '2027-28' } });
    if (!ay2027) {
      ay2027 = await AcademicYear.create({
        collegeId,
        yearName: '2027-28',
        startDate: '2027-07-01',
        endDate: '2028-06-30',
        status: 'UPCOMING',
        isCurrent: false,
        description: 'Upcoming academic year for planning and advance admissions.'
      });
    }

    console.log('--- Step 4: Updating Branches ---');
    const branches = await Branch.findAll({ where: { collegeId } });
    for (const b of branches) {
      if (b.code === 'CSE') {
        await b.update({
          programId: btech.id,
          department: 'Computer Science & Engineering',
          hodName: 'Dr. S. K. Roy',
          status: 'ACTIVE'
        });
      } else if (b.code === 'IT') {
        await b.update({
          programId: btech.id,
          department: 'Information Technology',
          hodName: 'Prof. M. Verma',
          status: 'ACTIVE'
        });
      }
    }

    // Add ECE and AI & DS if not present
    let branchECE = await Branch.findOne({ where: { collegeId, code: 'ECE' } });
    if (!branchECE) {
      branchECE = await Branch.create({
        collegeId,
        programId: btech.id,
        name: 'Electronics & Communication Engineering',
        code: 'ECE',
        department: 'Electronics & Communication',
        hodName: 'Dr. P. Joshi',
        status: 'ACTIVE'
      });
    }

    let branchAIDS = await Branch.findOne({ where: { collegeId, code: 'AI&DS' } });
    if (!branchAIDS) {
      branchAIDS = await Branch.create({
        collegeId,
        programId: btech.id,
        name: 'Artificial Intelligence & Data Science',
        code: 'AI&DS',
        department: 'Computer Science & Engineering',
        hodName: 'Dr. Anita Desai',
        status: 'ACTIVE'
      });
    }

    console.log('--- Step 5: Updating Semesters ---');
    const sem3 = await Semester.findOne({ where: { collegeId, academicYearId: ay2026.id, semesterNumber: 3 } });
    if (sem3) {
      await sem3.update({
        programId: btech.id,
        name: 'Semester 3',
        type: 'ODD',
        startDate: '2026-07-15',
        endDate: '2026-11-30',
        status: 'ACTIVE'
      });
    }

    const sem5 = await Semester.findOne({ where: { collegeId, academicYearId: ay2026.id, semesterNumber: 5 } });
    if (sem5) {
      await sem5.update({
        programId: btech.id,
        name: 'Semester 5',
        type: 'ODD',
        startDate: '2026-07-15',
        endDate: '2026-11-30',
        status: 'ACTIVE'
      });
    }

    // Add Semester 1, 2, 4, 6, 7, 8 for complete hierarchy
    const semNumbers = [1, 2, 4, 6, 7, 8];
    for (const num of semNumbers) {
      const existingSem = await Semester.findOne({ where: { collegeId, academicYearId: ay2026.id, semesterNumber: num } });
      if (!existingSem) {
        await Semester.create({
          collegeId,
          academicYearId: ay2026.id,
          programId: btech.id,
          semesterNumber: num,
          name: `Semester ${num}`,
          type: num % 2 === 1 ? 'ODD' : 'EVEN',
          startDate: num % 2 === 1 ? '2026-07-15' : '2027-01-10',
          endDate: num % 2 === 1 ? '2026-11-30' : '2027-05-30',
          status: num % 2 === 1 ? 'ACTIVE' : 'UPCOMING'
        });
      }
    }

    console.log('--- Step 6: Updating Sections & Batches ---');
    const sections = await Section.findAll({ where: { collegeId } });
    for (const s of sections) {
      await s.update({
        academicYearId: ay2026.id,
        roomNo: s.name === 'A' ? 'Lecture Hall 301' : 'Lecture Hall 302',
        maxCapacity: 60
      });
    }

    // Academic batches
    const branchCSE = await Branch.findOne({ where: { collegeId, code: 'CSE' } });
    const sec3A = await Section.findOne({ where: { collegeId, semesterId: sem3 ? sem3.id : 1, name: 'A' } });

    if (sec3A && branchCSE) {
      let batchA1 = await AcademicBatch.findOne({ where: { collegeId, name: 'CSE-3A-Batch-1' } });
      if (!batchA1) {
        await AcademicBatch.create({
          collegeId,
          academicYearId: ay2026.id,
          branchId: branchCSE.id,
          semesterId: sem3 ? sem3.id : 1,
          sectionId: sec3A.id,
          name: 'CSE-3A-Batch-1 (Roll 01-30)',
          type: 'LAB',
          status: 'ACTIVE'
        });
      }

      let batchA2 = await AcademicBatch.findOne({ where: { collegeId, name: 'CSE-3A-Batch-2' } });
      if (!batchA2) {
        await AcademicBatch.create({
          collegeId,
          academicYearId: ay2026.id,
          branchId: branchCSE.id,
          semesterId: sem3 ? sem3.id : 1,
          sectionId: sec3A.id,
          name: 'CSE-3A-Batch-2 (Roll 31-60)',
          type: 'LAB',
          status: 'ACTIVE'
        });
      }
    }

    console.log('--- Step 7: Seeding Subject Master & Subject Offerings ---');
    const subjectsData = [
      { name: 'Data Structures & Algorithms', code: 'CS301', credits: 4, type: 'THEORY_PRACTICAL' },
      { name: 'Database Management Systems', code: 'CS302', credits: 4, type: 'THEORY_PRACTICAL' },
      { name: 'Computer Organization & Architecture', code: 'CS303', credits: 3, type: 'THEORY' },
      { name: 'Discrete Mathematics', code: 'CS304', credits: 4, type: 'THEORY' },
      { name: 'Object Oriented Java Programming', code: 'CS305', credits: 3, type: 'THEORY_PRACTICAL' },
      { name: 'Operating Systems', code: 'CS501', credits: 4, type: 'THEORY_PRACTICAL' }
    ];

    const seededSubjects = [];
    for (const sub of subjectsData) {
      let [entity] = await Subject.findOrCreate({
        where: { collegeId, code: sub.code },
        defaults: {
          collegeId,
          name: sub.name,
          code: sub.code,
          credits: sub.credits,
          type: sub.type,
          department: 'Computer Science & Engineering',
          description: `Comprehensive course on ${sub.name}.`
        }
      });
      seededSubjects.push(entity);
    }

    // Map offerings in Academic Year 2026-27
    if (sem3 && branchCSE) {
      for (const sub of seededSubjects.slice(0, 5)) {
        await SubjectOffering.findOrCreate({
          where: {
            collegeId,
            subjectId: sub.id,
            academicYearId: ay2026.id,
            semesterId: sem3.id,
            branchId: branchCSE.id
          },
          defaults: {
            collegeId,
            subjectId: sub.id,
            academicYearId: ay2026.id,
            semesterId: sem3.id,
            branchId: branchCSE.id,
            status: 'ACTIVE'
          }
        });
      }
    }

    console.log('--- Step 8: Seeding Academic Enrollments (Multi-term Progression) ---');
    const students = await User.findAll({ where: { collegeId, role: 'STUDENT' } });
    console.log(`Found ${students.length} students to enroll.`);

    for (const student of students) {
      // 1. Current enrollment in AY 2026-27 (Sem 3, CSE, Section A)
      await AcademicEnrollment.findOrCreate({
        where: {
          collegeId,
          studentId: student.id,
          academicYearId: ay2026.id,
          semesterId: sem3 ? sem3.id : 1
        },
        defaults: {
          collegeId,
          studentId: student.id,
          academicYearId: ay2026.id,
          programId: btech.id,
          semesterId: sem3 ? sem3.id : 1,
          branchId: branchCSE.id,
          sectionId: sec3A ? sec3A.id : null,
          rollNo: student.rollNo,
          status: 'ACTIVE',
          remarks: 'Enrolled in 2nd Year / Semester 3',
          enrolledAt: new Date('2026-07-15')
        }
      });

      // Update student record pointers
      await student.update({
        academicYearId: ay2026.id,
        programId: btech.id
      });
    }

    // For Rahul Singh and first 5 students, seed historical enrollment in 2025-26
    const sampleStudents = students.slice(0, 6);
    // Find or create Sem 1 in 2025-26
    let sem1_2025 = await Semester.findOne({ where: { collegeId, academicYearId: ay2025.id, semesterNumber: 1 } });
    if (!sem1_2025) {
      sem1_2025 = await Semester.create({
        collegeId,
        academicYearId: ay2025.id,
        programId: btech.id,
        semesterNumber: 1,
        name: 'Semester 1',
        type: 'ODD',
        startDate: '2025-07-15',
        endDate: '2025-11-30',
        status: 'COMPLETED'
      });
    }

    for (const student of sampleStudents) {
      await AcademicEnrollment.findOrCreate({
        where: {
          collegeId,
          studentId: student.id,
          academicYearId: ay2025.id,
          semesterId: sem1_2025.id
        },
        defaults: {
          collegeId,
          studentId: student.id,
          academicYearId: ay2025.id,
          programId: btech.id,
          semesterId: sem1_2025.id,
          branchId: branchCSE.id,
          sectionId: null,
          rollNo: student.rollNo,
          status: 'PROMOTED',
          remarks: 'Successfully cleared Semester 1 with SGPA 8.4',
          enrolledAt: new Date('2025-07-15')
        }
      });
    }

    console.log('--- Step 9: Seeding Academic Calendar Events ---');
    const calendarEvents = [
      { title: 'Odd Semester 2026-27 Commencement', eventType: 'SEMESTER_START', startDate: '2026-07-15', endDate: '2026-07-15', description: 'Classes begin for 3rd and 5th semester students.' },
      { title: 'Independence Day Holiday', eventType: 'HOLIDAY', startDate: '2026-08-15', endDate: '2026-08-15', description: 'National holiday celebration and flag hoisting.' },
      { title: 'Mid-Term Examinations Cycle', eventType: 'EXAM', startDate: '2026-10-12', endDate: '2026-10-17', description: 'Internal Mid-Term evaluations across all departments.' },
      { title: 'Diwali & Autumn Break', eventType: 'HOLIDAY', startDate: '2026-10-28', endDate: '2026-11-03', description: 'Institutional recess for festive break.' },
      { title: 'End-Term Practical Assessments', eventType: 'EXAM', startDate: '2026-11-20', endDate: '2026-11-25', description: 'Lab practicals, coding vivas, and project presentations.' },
      { title: 'Odd Semester Term End', eventType: 'SEMESTER_END', startDate: '2026-11-30', endDate: '2026-11-30', description: 'Official completion of Odd Semester academic term.' }
    ];

    for (const ev of calendarEvents) {
      await AcademicCalendarEvent.findOrCreate({
        where: { collegeId, academicYearId: ay2026.id, title: ev.title },
        defaults: {
          collegeId,
          academicYearId: ay2026.id,
          title: ev.title,
          eventType: ev.eventType,
          startDate: ev.startDate,
          endDate: ev.endDate,
          description: ev.description
        }
      });
    }

    console.log('--- Step 10: Updating Trainings with Academic Year ---');
    const trainings = await Training.findAll({ where: { collegeId } });
    for (const t of trainings) {
      await t.update({ academicYearId: ay2026.id });
    }

    console.log('🎉 Academic Hierarchy & Enrollment Migration successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAcademicHierarchy();
