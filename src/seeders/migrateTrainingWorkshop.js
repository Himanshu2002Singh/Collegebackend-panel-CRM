const { sequelize } = require('../config/database');
const {
  College, User, Program, AcademicYear, Semester, Branch, Section,
  AcademicBatch, Subject, Training, Course, CourseModule, CourseTopic,
  DailyTopicDelivery, ContentConfirmation, Attendance, Assessment, Question,
  AssessmentSubmission, Workshop, WorkshopRegistration, WorkshopSession,
  WorkshopAttendance, TrainingBatch, TrainingSession, TrainingCertificate,
  TrainingCommunicationLog, TrainingAuditLog
} = require('../models');

async function migrateTrainingWorkshop() {
  try {
    console.log('--- Step 1: Synchronizing Tables with Alter ---');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronized with altered columns successfully.');

    // Find the primary demo college
    const college = await College.findOne({ where: { code: 'ABC' } });
    if (!college) {
      console.log('College ABC not found. Running against first available college.');
    }
    const collegeId = college ? college.id : 1;

    console.log(`--- Step 2: Ensuring Core Academic References for College ${collegeId} ---`);
    const ay = await AcademicYear.findOne({ where: { collegeId, isCurrent: true } }) ||
               await AcademicYear.findOne({ where: { collegeId } });
    const ayId = ay ? ay.id : 1;

    const program = await Program.findOne({ where: { collegeId } });
    const programId = program ? program.id : 1;

    const semester = await Semester.findOne({ where: { collegeId } });
    const semesterId = semester ? semester.id : 1;

    const branch = await Branch.findOne({ where: { collegeId } });
    const branchId = branch ? branch.id : 1;

    const section = await Section.findOne({ where: { collegeId } });
    const sectionId = section ? section.id : 1;

    const trainer = await User.findOne({ where: { collegeId, role: 'TRAINER' } });
    const trainerId = trainer ? trainer.id : null;

    console.log('--- Step 3: Seeding Master Semester Trainings ---');
    let dsaTraining = await Training.findOne({ where: { collegeId, trainingCode: 'TRN-DSA-2026' } });
    if (!dsaTraining) {
      dsaTraining = await Training.create({
        collegeId,
        name: 'Data Structures & Algorithms Masterclass',
        trainingCode: 'TRN-DSA-2026',
        type: 'SEMESTER_TRAINING',
        trainingType: 'SEMESTER_TRAINING',
        description: 'Comprehensive industry-aligned Data Structures & Algorithms training covering Arrays, Trees, Graphs, and Dynamic Programming in Java.',
        academicYearId: ayId,
        programId,
        semesterId,
        branchId,
        sectionId,
        trainerId,
        durationDays: 45,
        totalDays: 45,
        totalHours: 90,
        startDate: '2026-08-15',
        endDate: '2026-11-30',
        mode: 'OFFLINE',
        location: 'Lab 204 (Second Floor)',
        status: 'ONGOING',
        attendanceRequired: true,
        minAttendancePercentage: 75,
        attendanceWindowStart: '09:45 AM',
        attendanceWindowEnd: '10:15 AM',
        lateThresholdMinutes: 15,
        completionCriteria: { minAttendance: 75, passAssessment: true, minScore: 60 }
      });
      console.log('✅ Created DSA Training:', dsaTraining.id);
    } else {
      await dsaTraining.update({
        trainingCode: 'TRN-DSA-2026',
        trainingType: 'SEMESTER_TRAINING',
        status: 'ONGOING'
      });
    }

    let webTraining = await Training.findOne({ where: { collegeId, trainingCode: 'TRN-FSW-2026' } });
    if (!webTraining) {
      webTraining = await Training.create({
        collegeId,
        name: 'Full-Stack Web Development & Cloud Deployments',
        trainingCode: 'TRN-FSW-2026',
        type: 'PLACEMENT_TRAINING',
        trainingType: 'PLACEMENT_TRAINING',
        description: 'Hands-on React, Node.js, Express, Docker, and AWS cloud deployment training designed for high-paying campus placements.',
        academicYearId: ayId,
        programId,
        semesterId,
        branchId,
        sectionId,
        trainerId,
        durationDays: 60,
        totalDays: 60,
        totalHours: 120,
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        mode: 'HYBRID',
        location: 'Software Lab 3 & Virtual Cloud',
        status: 'ONGOING',
        attendanceRequired: true,
        minAttendancePercentage: 80,
        attendanceWindowStart: '01:45 PM',
        attendanceWindowEnd: '02:15 PM',
        lateThresholdMinutes: 15,
        completionCriteria: { minAttendance: 80, passAssessment: true, minScore: 65 }
      });
      console.log('✅ Created Web Dev Training:', webTraining.id);
    }

    let aiTraining = await Training.findOne({ where: { collegeId, trainingCode: 'TRN-AIML-2026' } });
    if (!aiTraining) {
      aiTraining = await Training.create({
        collegeId,
        name: 'AI & Machine Learning Foundations',
        trainingCode: 'TRN-AIML-2026',
        type: 'TECHNICAL_TRAINING',
        trainingType: 'TECHNICAL_TRAINING',
        description: 'Mathematics for ML, Scikit-Learn, Deep Learning with PyTorch, and Computer Vision.',
        academicYearId: ayId,
        programId,
        semesterId,
        branchId,
        sectionId,
        trainerId,
        durationDays: 40,
        totalDays: 40,
        totalHours: 80,
        startDate: '2026-10-01',
        endDate: '2026-12-20',
        mode: 'OFFLINE',
        location: 'AI Research Lab (Block C)',
        status: 'UPCOMING',
        attendanceRequired: true,
        minAttendancePercentage: 75
      });
      console.log('✅ Created AI Training:', aiTraining.id);
    }

    console.log('--- Step 4: Seeding Dedicated Workshops ---');
    let genAiWorkshop = await Workshop.findOne({ where: { collegeId, code: 'WKP-GENAI-2026' } });
    if (!genAiWorkshop) {
      genAiWorkshop = await Workshop.create({
        collegeId,
        name: '2-Day Generative AI & Prompt Engineering Bootcamp',
        code: 'WKP-GENAI-2026',
        description: 'An intensive hands-on bootcamp exploring LLMs, RAG architectures, LangChain, vector databases, and enterprise AI Agents.',
        category: 'Artificial Intelligence',
        workshopType: 'BOOTCAMP',
        academicYearId: ayId,
        programId,
        semesterId,
        branchId,
        sectionId,
        startDate: '2026-09-20',
        endDate: '2026-09-21',
        startTime: '09:30 AM',
        endTime: '04:30 PM',
        trainerId,
        speakerName: 'Dr. Arvind Swaminathan',
        speakerDesignation: 'Principal AI Scientist',
        speakerCompany: 'TechNova Labs & OpenAI Fellow',
        speakerBio: 'Over 14 years of AI research experience, author of 20+ papers on transformer models and autonomous agents.',
        speakerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        speakerEmail: 'arvind.s@technova.ai',
        speakerMobile: '+91 9876543299',
        speakerLinkedIn: 'https://linkedin.com/in/arvind-swaminathan',
        venue: 'Main Auditorium (Dr. APJ Abdul Kalam Hall)',
        mode: 'OFFLINE',
        capacity: 200,
        registrationRequired: true,
        waitlistEnabled: true,
        certificateAvailable: true,
        certificateMinAttendance: 75,
        status: 'UPCOMING'
      });
      console.log('✅ Created Generative AI Workshop:', genAiWorkshop.id);
    }

    let devopsWorkshop = await Workshop.findOne({ where: { collegeId, code: 'WKP-K8S-2026' } });
    if (!devopsWorkshop) {
      devopsWorkshop = await Workshop.create({
        collegeId,
        name: 'Full-Day Cloud DevOps & Kubernetes Hands-on',
        code: 'WKP-K8S-2026',
        description: 'Learn modern CI/CD pipelines, container orchestration with Kubernetes, helm charts, and production observability.',
        category: 'Cloud Engineering',
        workshopType: 'TECHNICAL',
        academicYearId: ayId,
        programId,
        semesterId,
        branchId,
        sectionId,
        startDate: '2026-09-28',
        endDate: '2026-09-28',
        startTime: '10:00 AM',
        endTime: '05:00 PM',
        trainerId,
        speakerName: 'Neha Kapoor',
        speakerDesignation: 'Cloud Solutions Architect',
        speakerCompany: 'CloudSphere Global',
        speakerBio: 'Kubernetes certified administrator (CKA) helping global enterprises modernize microservices.',
        venue: 'Virtual Cloud Lab (Zoom Live)',
        mode: 'ONLINE',
        capacity: 150,
        registrationRequired: true,
        waitlistEnabled: true,
        certificateAvailable: true,
        certificateMinAttendance: 80,
        status: 'UPCOMING'
      });
      console.log('✅ Created DevOps Workshop:', devopsWorkshop.id);
    }

    console.log('--- Step 5: Seeding Workshop Sessions ---');
    const existingSessions = await WorkshopSession.count({ where: { workshopId: genAiWorkshop.id } });
    if (existingSessions === 0) {
      await WorkshopSession.bulkCreate([
        {
          collegeId,
          workshopId: genAiWorkshop.id,
          dayNumber: 1,
          sessionNumber: 1,
          title: 'Introduction to Transformers & Foundation Models',
          startTime: '09:30 AM',
          endTime: '12:30 PM',
          speakerName: 'Dr. Arvind Swaminathan',
          venue: 'Auditorium Hall',
          status: 'SCHEDULED'
        },
        {
          collegeId,
          workshopId: genAiWorkshop.id,
          dayNumber: 1,
          sessionNumber: 2,
          title: 'Hands-on Prompt Engineering & Function Calling',
          startTime: '01:30 PM',
          endTime: '04:30 PM',
          speakerName: 'Dr. Arvind Swaminathan',
          venue: 'Auditorium Hall',
          status: 'SCHEDULED'
        },
        {
          collegeId,
          workshopId: genAiWorkshop.id,
          dayNumber: 2,
          sessionNumber: 3,
          title: 'Retrieval Augmented Generation (RAG) Architectures',
          startTime: '09:30 AM',
          endTime: '12:30 PM',
          speakerName: 'Dr. Arvind Swaminathan',
          venue: 'Auditorium Hall',
          status: 'SCHEDULED'
        },
        {
          collegeId,
          workshopId: genAiWorkshop.id,
          dayNumber: 2,
          sessionNumber: 4,
          title: 'Building Autonomous Multi-Agent Workflows',
          startTime: '01:30 PM',
          endTime: '04:30 PM',
          speakerName: 'Dr. Arvind Swaminathan',
          venue: 'Auditorium Hall',
          status: 'SCHEDULED'
        }
      ]);
      console.log('✅ Created 4 Workshop Sessions for Gen AI Bootcamp');
    }

    console.log('--- Step 6: Seeding Training Batches & Sessions ---');
    let batchA = await TrainingBatch.findOne({ where: { trainingId: dsaTraining.id, batchName: 'Batch A (Roll 01-30)' } });
    if (!batchA) {
      batchA = await TrainingBatch.create({
        collegeId,
        trainingId: dsaTraining.id,
        batchName: 'Batch A (Roll 01-30)',
        batchCode: 'DSA-3A-B1',
        academicYearId: ayId,
        branchId,
        sectionId,
        trainerId,
        startDate: dsaTraining.startDate,
        endDate: dsaTraining.endDate,
        capacity: 35,
        mode: 'OFFLINE',
        room: 'Lab 204',
        status: 'ACTIVE'
      });
      console.log('✅ Created Training Batch A:', batchA.id);
    }

    let batchB = await TrainingBatch.findOne({ where: { trainingId: dsaTraining.id, batchName: 'Batch B (Roll 31-60)' } });
    if (!batchB) {
      batchB = await TrainingBatch.create({
        collegeId,
        trainingId: dsaTraining.id,
        batchName: 'Batch B (Roll 31-60)',
        batchCode: 'DSA-3A-B2',
        academicYearId: ayId,
        branchId,
        sectionId,
        trainerId,
        startDate: dsaTraining.startDate,
        endDate: dsaTraining.endDate,
        capacity: 35,
        mode: 'OFFLINE',
        room: 'Lab 205',
        status: 'ACTIVE'
      });
      console.log('✅ Created Training Batch B:', batchB.id);
    }

    const sessionCount = await TrainingSession.count({ where: { trainingId: dsaTraining.id } });
    if (sessionCount === 0) {
      await TrainingSession.bulkCreate([
        {
          collegeId,
          trainingId: dsaTraining.id,
          batchId: batchA.id,
          trainerId,
          sessionNumber: 1,
          date: '2026-09-15',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          topicTitle: 'Arrays, Two Pointers & Sliding Window Patterns',
          room: 'Lab 204',
          deliveryMode: 'OFFLINE',
          status: 'COMPLETED',
          notes: 'Covered array rotation, kadane algorithm, and two-pointer traversal.',
          homework: 'Solve LeetCode 1, 53, 121.',
          isAttendanceMarked: true,
          isContentDelivered: true
        },
        {
          collegeId,
          trainingId: dsaTraining.id,
          batchId: batchA.id,
          trainerId,
          sessionNumber: 2,
          date: '2026-09-16',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          topicTitle: 'Searching Algorithms & Binary Search Space Optimizations',
          room: 'Lab 204',
          deliveryMode: 'OFFLINE',
          status: 'SCHEDULED',
          notes: 'Binary search on monotonic predicates.',
          isAttendanceMarked: false,
          isContentDelivered: false
        }
      ]);
      console.log('✅ Created Initial Sessions for DSA Training');
    }

    console.log('--- Step 7: Seeding Demo Workshop Registrations ---');
    const students = await User.findAll({ where: { collegeId, role: 'STUDENT' }, limit: 5 });
    for (const st of students) {
      const reg = await WorkshopRegistration.findOne({ where: { workshopId: genAiWorkshop.id, studentId: st.id } });
      if (!reg) {
        await WorkshopRegistration.create({
          collegeId,
          workshopId: genAiWorkshop.id,
          studentId: st.id,
          status: 'APPROVED',
          attendancePercentage: 100,
          remarks: 'Pre-approved based on academic standing.'
        });
      }
    }
    console.log(`✅ Ensured demo registrations for Gen AI Workshop`);

    console.log('\n🌟 TRAINING & WORKSHOP MIGRATION COMPLETE!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateTrainingWorkshop().then(() => process.exit(0));
}

module.exports = { migrateTrainingWorkshop };
