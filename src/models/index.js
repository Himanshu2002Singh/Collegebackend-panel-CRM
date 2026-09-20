const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 1. College
const College = sequelize.define('College', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  tenantId: { type: DataTypes.STRING, allowNull: false, unique: true },
  logoUrl: { type: DataTypes.STRING, defaultValue: '' },
  loginBgUrl: { type: DataTypes.STRING, defaultValue: '' },
  faviconUrl: { type: DataTypes.STRING, defaultValue: '' },
  primaryColor: { type: DataTypes.STRING, defaultValue: '#3b82f6' },
  secondaryColor: { type: DataTypes.STRING, defaultValue: '#1d4ed8' },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, defaultValue: '' },
  address: { type: DataTypes.TEXT, defaultValue: '' },
  affiliation: { type: DataTypes.STRING, defaultValue: 'State Technical Board / UGC' },
  website: { type: DataTypes.STRING, defaultValue: 'https://college.edu.in' },
  establishedYear: { type: DataTypes.STRING, defaultValue: '2005' },
  settingsConfig: { type: DataTypes.JSON, defaultValue: {} },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'EXPIRED'), defaultValue: 'ACTIVE' }
});

// 2. Plan
const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  studentLimit: { type: DataTypes.INTEGER, defaultValue: 500 },
  trainerLimit: { type: DataTypes.INTEGER, defaultValue: 20 },
  trainingLimit: { type: DataTypes.INTEGER, defaultValue: 10 }, // -1 for unlimited
  hasAssessments: { type: DataTypes.BOOLEAN, defaultValue: true },
  hasWhatsApp: { type: DataTypes.BOOLEAN, defaultValue: false },
  hasAIAnalytics: { type: DataTypes.BOOLEAN, defaultValue: false },
  hasCodingAssessment: { type: DataTypes.BOOLEAN, defaultValue: true },
  hasParentPortal: { type: DataTypes.BOOLEAN, defaultValue: false },
  price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  description: { type: DataTypes.TEXT, defaultValue: '' }
});

// 3. Subscription
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  planId: { type: DataTypes.INTEGER, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  studentLimit: { type: DataTypes.INTEGER, defaultValue: 500 },
  trainerLimit: { type: DataTypes.INTEGER, defaultValue: 20 },
  status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'PENDING'), defaultValue: 'ACTIVE' }
});

// 4. Payment
const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  planId: { type: DataTypes.INTEGER, allowNull: false },
  paymentId: { type: DataTypes.STRING, allowNull: false },
  orderId: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'), defaultValue: 'SUCCESS' },
  invoiceNumber: { type: DataTypes.STRING, allowNull: false },
  paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 5. User
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: true }, // Null for Super Admin
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, defaultValue: '' },
  role: { 
    type: DataTypes.ENUM('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT'), 
    allowNull: false 
  },
  subRole: { 
    type: DataTypes.ENUM('MAIN_ADMIN', 'TRAINING_MGR', 'EXAM_MGR', 'HR_MGR', 'NONE'), 
    defaultValue: 'NONE' 
  },
  enrollmentNo: { type: DataTypes.STRING, defaultValue: '' },
  rollNo: { type: DataTypes.STRING, defaultValue: '' },
  parentName: { type: DataTypes.STRING, defaultValue: '' },
  parentMobile: { type: DataTypes.STRING, defaultValue: '' },
  parentEmail: { type: DataTypes.STRING, defaultValue: '' },
  motherName: { type: DataTypes.STRING, defaultValue: '' },
  motherMobile: { type: DataTypes.STRING, defaultValue: '' },
  motherEmail: { type: DataTypes.STRING, defaultValue: '' },
  motherOccupation: { type: DataTypes.STRING, defaultValue: '' },
  fatherOccupation: { type: DataTypes.STRING, defaultValue: '' },
  gender: { type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'), defaultValue: 'MALE' },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  bloodGroup: { type: DataTypes.STRING, defaultValue: '' },
  personalEmail: { type: DataTypes.STRING, defaultValue: '' },
  alternatePhone: { type: DataTypes.STRING, defaultValue: '' },
  address: { type: DataTypes.TEXT, defaultValue: '' },
  city: { type: DataTypes.STRING, defaultValue: '' },
  state: { type: DataTypes.STRING, defaultValue: '' },
  pincode: { type: DataTypes.STRING, defaultValue: '' },
  admissionDate: { type: DataTypes.DATEONLY, allowNull: true },
  admissionNo: { type: DataTypes.STRING, defaultValue: '' },
  studentStatus: { 
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED', 'ALUMNI'), 
    defaultValue: 'ACTIVE' 
  },
  batch: { type: DataTypes.STRING, defaultValue: '2026-30' },
  avatarUrl: { type: DataTypes.STRING, defaultValue: '' },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  employeeId: { type: DataTypes.STRING, defaultValue: '' },
  designation: { type: DataTypes.STRING, defaultValue: '' },
  department: { type: DataTypes.STRING, defaultValue: '' },
  joiningDate: { type: DataTypes.DATEONLY, allowNull: true },
  trainerType: { 
    type: DataTypes.ENUM('FULL_TIME', 'PART_TIME', 'VISITING_FACULTY', 'EXTERNAL_TRAINER', 'INDUSTRY_EXPERT', 'GUEST_TRAINER', 'CONTRACT_TRAINER'), 
    defaultValue: 'FULL_TIME' 
  },
  experience: { type: DataTypes.STRING, defaultValue: '' },
  specialization: { type: DataTypes.STRING, defaultValue: '' },
  skills: { type: DataTypes.JSON, defaultValue: [] },
  qualification: { type: DataTypes.STRING, defaultValue: '' },
  certifications: { type: DataTypes.TEXT, defaultValue: '' },
  previousExperience: { type: DataTypes.TEXT, defaultValue: '' },
  trainerStatus: { 
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'CONTRACT_ENDED', 'ARCHIVED'), 
    defaultValue: 'ACTIVE' 
  },
  maxWeeklyHours: { type: DataTypes.INTEGER, defaultValue: 35 },
  maxWeeklyClasses: { type: DataTypes.INTEGER, defaultValue: 18 },
  trainerPermissions: { 
    type: DataTypes.JSON, 
    defaultValue: ['VIEW_STUDENTS', 'ATTENDANCE', 'COURSE_CONTENT', 'FEEDBACK'] 
  },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  failedLoginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  forcePasswordChange: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  indexes: [
    { fields: ['college_id', 'email'], unique: true },
    { fields: ['college_id', 'role'] }
  ]
});

// 6. RolePermission
const RolePermission = sequelize.define('RolePermission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: true },
  subRole: { type: DataTypes.STRING, allowNull: false },
  permissions: { type: DataTypes.JSON, defaultValue: [] }
});

// 6.5. Program / Degree
const Program = sequelize.define('Program', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. Bachelor of Technology
  code: { type: DataTypes.STRING, allowNull: false }, // e.g. B.TECH
  durationYears: { type: DataTypes.INTEGER, defaultValue: 4 },
  totalSemesters: { type: DataTypes.INTEGER, defaultValue: 8 },
  department: { type: DataTypes.STRING, defaultValue: 'Engineering & Technology' },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' }
});

// 7. AcademicYear
const AcademicYear = sequelize.define('AcademicYear', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  yearName: { type: DataTypes.STRING, allowNull: false }, // e.g. 2026-27
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { 
    type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'UPCOMING', 'ARCHIVED'), 
    defaultValue: 'ACTIVE' 
  },
  isCurrent: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT, defaultValue: '' }
});

// 8. Semester
const Semester = sequelize.define('Semester', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: false },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. Semester 3
  type: { type: DataTypes.ENUM('ODD', 'EVEN'), defaultValue: 'ODD' },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('ACTIVE', 'UPCOMING', 'COMPLETED'), defaultValue: 'ACTIVE' }
});

// 9. Branch
const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: false }, // Computer Science & Engineering
  code: { type: DataTypes.STRING, allowNull: false },  // CSE
  department: { type: DataTypes.STRING, defaultValue: '' },
  hodName: { type: DataTypes.STRING, defaultValue: '' },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' }
});

// 10. Section
const Section = sequelize.define('Section', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // Section A
  roomNo: { type: DataTypes.STRING, defaultValue: '' },
  maxCapacity: { type: DataTypes.INTEGER, defaultValue: 60 }
});

// 10.5 AcademicBatch
const AcademicBatch = sequelize.define('AcademicBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  semesterId: { type: DataTypes.INTEGER, allowNull: false },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. Batch A1 / Batch 2024-28
  type: { type: DataTypes.ENUM('ACADEMIC', 'LAB', 'TRAINING'), defaultValue: 'ACADEMIC' },
  status: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED'), defaultValue: 'ACTIVE' }
});

// 11. Subject
const Subject = sequelize.define('Subject', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false },
  credits: { type: DataTypes.INTEGER, defaultValue: 4 },
  type: { type: DataTypes.ENUM('THEORY', 'PRACTICAL', 'THEORY_PRACTICAL'), defaultValue: 'THEORY_PRACTICAL' },
  department: { type: DataTypes.STRING, defaultValue: '' },
  description: { type: DataTypes.TEXT, defaultValue: '' }
});

// 11.5 SubjectOffering
const SubjectOffering = sequelize.define('SubjectOffering', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  subjectId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: false },
  semesterId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' }
});

// 11.6 AcademicEnrollment (Multi-term Student Academic Progression & History)
const AcademicEnrollment = sequelize.define('AcademicEnrollment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: false },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: false },
  branchId: { type: DataTypes.INTEGER, allowNull: false },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  rollNo: { type: DataTypes.STRING, defaultValue: '' },
  status: { 
    type: DataTypes.ENUM('ACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED', 'DROPPED'), 
    defaultValue: 'ACTIVE' 
  },
  remarks: { type: DataTypes.STRING, defaultValue: '' },
  enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 11.7 AcademicCalendarEvent
const AcademicCalendarEvent = sequelize.define('AcademicCalendarEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  eventType: { 
    type: DataTypes.ENUM('SEMESTER_START', 'SEMESTER_END', 'HOLIDAY', 'EXAM', 'EVENT'), 
    defaultValue: 'EVENT' 
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  description: { type: DataTypes.TEXT, defaultValue: '' }
});

// 12. Training
const Training = sequelize.define('Training', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // Java + DSA
  trainingCode: { type: DataTypes.STRING, allowNull: true },
  type: { 
    type: DataTypes.STRING, 
    defaultValue: 'SEMESTER_TRAINING' 
  },
  trainingType: {
    type: DataTypes.STRING,
    defaultValue: 'SEMESTER_TRAINING'
  },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  subjectId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  trainerId: { type: DataTypes.INTEGER, allowNull: true },
  durationDays: { type: DataTypes.INTEGER, defaultValue: 45 },
  totalDays: { type: DataTypes.INTEGER, defaultValue: 45 },
  totalHours: { type: DataTypes.INTEGER, defaultValue: 90 },
  totalLectures: { type: DataTypes.INTEGER, defaultValue: 30 },
  weeklyLectures: { type: DataTypes.INTEGER, defaultValue: 3 },
  dailyHours: { type: DataTypes.FLOAT, defaultValue: 2 },
  daysOfWeek: { type: DataTypes.JSON, defaultValue: ['MON', 'WED', 'FRI'] },
  startTime: { type: DataTypes.STRING, defaultValue: '10:00 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '12:00 PM' },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  mode: { type: DataTypes.ENUM('OFFLINE', 'ONLINE', 'HYBRID'), defaultValue: 'OFFLINE' },
  location: { type: DataTypes.STRING, defaultValue: 'Lab 101' },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'ONGOING' 
  },
  attendanceRequired: { type: DataTypes.BOOLEAN, defaultValue: true },
  minAttendancePercentage: { type: DataTypes.INTEGER, defaultValue: 75 },
  attendanceWindowStart: { type: DataTypes.STRING, defaultValue: '09:45 AM' },
  attendanceWindowEnd: { type: DataTypes.STRING, defaultValue: '10:15 AM' },
  lateThresholdMinutes: { type: DataTypes.INTEGER, defaultValue: 15 },
  completionCriteria: { type: DataTypes.JSON, defaultValue: {} }
});

// 13. Course
const Course = sequelize.define('Course', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' }
});

// 14. CourseModule
const CourseModule = sequelize.define('CourseModule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
});

// 15. CourseTopic
const CourseTopic = sequelize.define('CourseTopic', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  moduleId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  pdfUrl: { type: DataTypes.STRING, defaultValue: '' },
  pptUrl: { type: DataTypes.STRING, defaultValue: '' },
  videoUrl: { type: DataTypes.STRING, defaultValue: '' },
  practiceQuestions: { type: DataTypes.TEXT, defaultValue: '' },
  orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
});

// 16. DailyTopicDelivery
const DailyTopicDelivery = sequelize.define('DailyTopicDelivery', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  topicId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  deliveryDate: { type: DataTypes.DATEONLY, allowNull: false },
  isDelivered: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  practiceQuestions: { type: DataTypes.TEXT, defaultValue: '' },
  assignment: { type: DataTypes.TEXT, defaultValue: '' }
});

// 17. ContentConfirmation
const ContentConfirmation = sequelize.define('ContentConfirmation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  dailyDeliveryId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  isDelivered: { type: DataTypes.ENUM('YES', 'NO', 'PENDING'), defaultValue: 'PENDING' },
  confirmedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  comments: { type: DataTypes.STRING, defaultValue: '' }
});

// 18. AttendanceRule
const AttendanceRule = sequelize.define('AttendanceRule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  mode: { type: DataTypes.ENUM('DAILY', 'SESSION'), defaultValue: 'DAILY' },
  startTime: { type: DataTypes.STRING, defaultValue: '09:50 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '10:05 AM' },
  allowedDurationMinutes: { type: DataTypes.INTEGER, defaultValue: 15 }
});

// 19. Attendance
const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { 
    type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE'), 
    defaultValue: 'PRESENT' 
  },
  remarks: { type: DataTypes.STRING, defaultValue: '' }
});

// 20. Assessment
const Assessment = sequelize.define('Assessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: true },
  workshopId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  assessmentCode: { type: DataTypes.STRING, defaultValue: '' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  type: { 
    type: DataTypes.ENUM('MCQ', 'SUBJECTIVE', 'CODING', 'MIXED', 'QUIZ', 'ASSIGNMENT', 'PRACTICAL', 'VIVA', 'PROJECT'), 
    defaultValue: 'MCQ' 
  },
  assessmentFor: { 
    type: DataTypes.ENUM('TRAINING', 'WORKSHOP'), 
    defaultValue: 'TRAINING' 
  },
  subjectName: { type: DataTypes.STRING, defaultValue: '' },
  courseName: { type: DataTypes.STRING, defaultValue: '' },
  moduleName: { type: DataTypes.STRING, defaultValue: '' },
  topicName: { type: DataTypes.STRING, defaultValue: '' },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  batchIds: { type: DataTypes.JSON, defaultValue: [] },
  primaryTrainerId: { type: DataTypes.INTEGER, allowNull: true },
  evaluatorId: { type: DataTypes.INTEGER, allowNull: true },
  totalQuestions: { type: DataTypes.INTEGER, defaultValue: 25 },
  totalMarks: { type: DataTypes.INTEGER, defaultValue: 50 },
  passingMarks: { type: DataTypes.INTEGER, defaultValue: 20 },
  passingPercentage: { type: DataTypes.INTEGER, defaultValue: 40 },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  startTime: { type: DataTypes.STRING, defaultValue: '10:00' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  endTime: { type: DataTypes.STRING, defaultValue: '11:00' },
  maxAttempts: { type: DataTypes.INTEGER, defaultValue: 1 },
  negativeMarking: { type: DataTypes.BOOLEAN, defaultValue: false },
  negativeMarks: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  randomizeQuestions: { type: DataTypes.BOOLEAN, defaultValue: false },
  randomizeOptions: { type: DataTypes.BOOLEAN, defaultValue: false },
  showResultImmediately: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowedLanguages: { type: DataTypes.JSON, defaultValue: ['Java', 'Python', 'C++', 'JavaScript'] },
  mcqConfig: { type: DataTypes.JSON, defaultValue: {} },
  subjectiveConfig: { type: DataTypes.JSON, defaultValue: {} },
  codingConfig: { type: DataTypes.JSON, defaultValue: {} },
  selectedStudentIds: { type: DataTypes.JSON, defaultValue: [] },
  status: { 
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'ONGOING', 'PUBLISHED', 'COMPLETED'), 
    defaultValue: 'PUBLISHED' 
  },
  instructions: { type: DataTypes.TEXT, defaultValue: '' }
});

// 21. Question
const Question = sequelize.define('Question', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assessmentId: { type: DataTypes.INTEGER, allowNull: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: true },
  type: { 
    type: DataTypes.ENUM('MCQ', 'THEORY', 'SUBJECTIVE', 'CODING'), 
    defaultValue: 'MCQ' 
  },
  problemTitle: { type: DataTypes.STRING, defaultValue: '' },
  text: { type: DataTypes.TEXT, allowNull: false },
  options: { type: DataTypes.JSON, defaultValue: [] }, // ['FIFO', 'LIFO', 'Random', 'None']
  correctAnswer: { type: DataTypes.TEXT, defaultValue: '' },
  marks: { type: DataTypes.INTEGER, defaultValue: 1 },
  negativeMarks: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  difficulty: { type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD'), defaultValue: 'MEDIUM' },
  language: { type: DataTypes.STRING, defaultValue: 'Java' },
  boilerplateCode: { type: DataTypes.TEXT, defaultValue: '' },
  testCases: { type: DataTypes.JSON, defaultValue: [] }, // Sample visible: [{input: '...', expected: '...'}]
  hiddenTestCases: { type: DataTypes.JSON, defaultValue: [] }, // Hidden test cases
  topicName: { type: DataTypes.STRING, defaultValue: 'General' },
  subjectName: { type: DataTypes.STRING, defaultValue: '' },
  moduleName: { type: DataTypes.STRING, defaultValue: '' },
  courseName: { type: DataTypes.STRING, defaultValue: '' },
  evaluationCriteria: { type: DataTypes.TEXT, defaultValue: '' },
  explanation: { type: DataTypes.TEXT, defaultValue: '' },
  sampleInput: { type: DataTypes.TEXT, defaultValue: '' },
  sampleOutput: { type: DataTypes.TEXT, defaultValue: '' },
  constraints: { type: DataTypes.TEXT, defaultValue: '' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  isBankQuestion: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 22. AssessmentSubmission
const AssessmentSubmission = sequelize.define('AssessmentSubmission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assessmentId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  totalScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  mcqScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  subjectiveScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  codingScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  attemptNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  timeSpentSeconds: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { 
    type: DataTypes.ENUM('IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'PUBLISHED'), 
    defaultValue: 'SUBMITTED' 
  },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 23. StudentAnswer
const StudentAnswer = sequelize.define('StudentAnswer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  submissionId: { type: DataTypes.INTEGER, allowNull: false },
  questionId: { type: DataTypes.INTEGER, allowNull: false },
  selectedOption: { type: DataTypes.TEXT, defaultValue: '' },
  theoryAnswer: { type: DataTypes.TEXT, defaultValue: '' },
  codeAnswer: { type: DataTypes.TEXT, defaultValue: '' },
  marksAwarded: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  evaluatorMarks: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  isCorrect: { type: DataTypes.BOOLEAN, defaultValue: false },
  feedback: { type: DataTypes.TEXT, defaultValue: '' },
  rubricScores: { type: DataTypes.JSON, defaultValue: {} },
  manualAdjustment: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  adjustmentReason: { type: DataTypes.STRING, defaultValue: '' },
  testCasesRun: { type: DataTypes.JSON, defaultValue: [] }
});

// 23.5 AssessmentReevaluation
const AssessmentReevaluation = sequelize.define('AssessmentReevaluation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  assessmentId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  submissionId: { type: DataTypes.INTEGER, allowNull: false },
  oldMarks: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  newMarks: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  evaluatorId: { type: DataTypes.INTEGER, allowNull: true },
  evaluatorName: { type: DataTypes.STRING, defaultValue: 'Admin Evaluator' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('APPROVED', 'PENDING', 'REJECTED'), defaultValue: 'APPROVED' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 24. TrainerFeedback
const TrainerFeedback = sequelize.define('TrainerFeedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  feedbackText: { type: DataTypes.TEXT, allowNull: false },
  participation: { 
    type: DataTypes.ENUM('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT'), 
    defaultValue: 'GOOD' 
  },
  assignmentStatus: { 
    type: DataTypes.ENUM('COMPLETED', 'PENDING', 'NOT_SUBMITTED'), 
    defaultValue: 'COMPLETED' 
  },
  codingRating: { 
    type: DataTypes.ENUM('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT'), 
    defaultValue: 'AVERAGE' 
  },
  date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }
});

// 25. PerformanceSuggestion
const PerformanceSuggestion = sequelize.define('PerformanceSuggestion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  strongTopics: { type: DataTypes.JSON, defaultValue: [] },
  weakTopics: { type: DataTypes.JSON, defaultValue: [] },
  suggestions: { type: DataTypes.JSON, defaultValue: [] }
});

// 26. Notification
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: true },
  recipientId: { type: DataTypes.INTEGER, allowNull: true },
  recipientRole: { 
    type: DataTypes.ENUM('SUPER_ADMIN', 'COLLEGE_ADMIN', 'TRAINER', 'STUDENT', 'PARENT'), 
    defaultValue: 'STUDENT' 
  },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { 
    type: DataTypes.ENUM('IN_APP', 'WHATSAPP_LOG', 'EMAIL_LOG'), 
    defaultValue: 'IN_APP' 
  },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 27. AuditLog
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT, defaultValue: '' },
  ipAddress: { type: DataTypes.STRING, defaultValue: '' }
});

// 28. StudentParent (Multi-parent / Guardian details)
const StudentParent = sequelize.define('StudentParent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  relation: { type: DataTypes.ENUM('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'), defaultValue: 'FATHER' },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, defaultValue: '' },
  email: { type: DataTypes.STRING, defaultValue: '' },
  occupation: { type: DataTypes.STRING, defaultValue: '' },
  address: { type: DataTypes.TEXT, defaultValue: '' },
  isPrimaryContact: { type: DataTypes.BOOLEAN, defaultValue: false },
  whatsappAlertsEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  emailAlertsEnabled: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// 29. TrainingStudent (Direct Student to Training mapping)
const TrainingStudent = sequelize.define('TrainingStudent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('ENROLLED', 'COMPLETED', 'DROPPED'), defaultValue: 'ENROLLED' },
  enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  indexes: [
    { fields: ['trainingId', 'studentId'], unique: true }
  ]
});

// 30. StudentImportLog (Audit trail for bulk Excel/CSV uploads)
const StudentImportLog = sequelize.define('StudentImportLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  fileName: { type: DataTypes.STRING, allowNull: false },
  totalRows: { type: DataTypes.INTEGER, defaultValue: 0 },
  successCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  failureCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('COMPLETED', 'FAILED', 'PARTIAL'), defaultValue: 'COMPLETED' },
  errorDetails: { type: DataTypes.JSON, defaultValue: [] },
  importedBy: { type: DataTypes.INTEGER, allowNull: true }
});

// 31. StudentActivityLog (Lifecycle activity and audit trail)
const StudentActivityLog = sequelize.define('StudentActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  activityType: { 
    type: DataTypes.ENUM('STATUS_CHANGE', 'ACADEMIC_TRANSFER', 'PROMOTION', 'TRAINING_ASSIGNED', 'ALERT_SENT', 'NOTE_ADDED', 'LOGIN'), 
    defaultValue: 'NOTE_ADDED' 
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  performedBy: { type: DataTypes.INTEGER, allowNull: true },
  metadata: { type: DataTypes.JSON, defaultValue: {} }
});

// 32. TrainerAssignment (Decoupled mapping: Trainer to Training, Batch, Academic Cohort)
const TrainerAssignment = sequelize.define('TrainerAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: true },
  batchId: { type: DataTypes.INTEGER, allowNull: true },
  batchName: { type: DataTypes.STRING, defaultValue: '' },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  role: { 
    type: DataTypes.ENUM('PRIMARY', 'CO_TRAINER', 'SECONDARY', 'GUEST'), 
    defaultValue: 'PRIMARY' 
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { 
    type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'DROPPED'), 
    defaultValue: 'ACTIVE' 
  },
  notes: { type: DataTypes.TEXT, defaultValue: '' }
});

// 33. TrainerSchedule (Timetable & Live Sessions)
const TrainerSchedule = sequelize.define('TrainerSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  assignmentId: { type: DataTypes.INTEGER, allowNull: true },
  batchId: { type: DataTypes.INTEGER, allowNull: true },
  batchName: { type: DataTypes.STRING, defaultValue: '' },
  dayOfWeek: { 
    type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
    allowNull: false 
  },
  date: { type: DataTypes.DATEONLY, allowNull: true },
  startTime: { type: DataTypes.STRING, allowNull: false }, // e.g. "09:00 AM" or "09:00"
  endTime: { type: DataTypes.STRING, allowNull: false },   // e.g. "11:00 AM" or "11:00"
  room: { type: DataTypes.STRING, defaultValue: 'Room 101' },
  deliveryMode: { 
    type: DataTypes.ENUM('OFFLINE', 'ONLINE', 'HYBRID'), 
    defaultValue: 'OFFLINE' 
  },
  sessionType: { 
    type: DataTypes.ENUM('REGULAR_CLASS', 'LAB_PRACTICAL', 'DOUBT_SESSION', 'WORKSHOP', 'ASSESSMENT'), 
    defaultValue: 'REGULAR_CLASS' 
  },
  status: { 
    type: DataTypes.ENUM('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED'), 
    defaultValue: 'SCHEDULED' 
  },
  topicTitle: { type: DataTypes.STRING, defaultValue: '' },
  substituteTrainerId: { type: DataTypes.INTEGER, allowNull: true }
});

// 34. TrainerAvailability (Weekly availability slots)
const TrainerAvailability = sequelize.define('TrainerAvailability', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  dayOfWeek: { 
    type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
    allowNull: false 
  },
  startTime: { type: DataTypes.STRING, defaultValue: '09:00 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '05:00 PM' },
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// 35. TrainerLeave (Leave requests & Substitute handling)
const TrainerLeave = sequelize.define('TrainerLeave', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  leaveType: { 
    type: DataTypes.ENUM('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'UNPAID', 'DUTY'), 
    defaultValue: 'CASUAL' 
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT, defaultValue: '' },
  status: { 
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'), 
    defaultValue: 'PENDING' 
  },
  substituteTrainerId: { type: DataTypes.INTEGER, allowNull: true },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, defaultValue: '' }
});

// 36. AttendanceCorrection (Attendance Dispute & Correction Requests)
const AttendanceCorrection = sequelize.define('AttendanceCorrection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  oldStatus: { type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE'), defaultValue: 'ABSENT' },
  newStatus: { type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE'), defaultValue: 'PRESENT' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { 
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), 
    defaultValue: 'PENDING' 
  },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
  reviewNote: { type: DataTypes.TEXT, defaultValue: '' }
});

// 37. StudentTrainerFeedback (Students rating trainers)
const StudentTrainerFeedback = sequelize.define('StudentTrainerFeedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: true },
  rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  teachingQuality: { type: DataTypes.INTEGER, defaultValue: 5 },
  communication: { type: DataTypes.INTEGER, defaultValue: 5 },
  doubtResolution: { type: DataTypes.INTEGER, defaultValue: 5 },
  contentKnowledge: { type: DataTypes.INTEGER, defaultValue: 5 },
  comment: { type: DataTypes.TEXT, defaultValue: '' }
});

// 38. AdminTrainerFeedback (Admin performance review for trainer)
const AdminTrainerFeedback = sequelize.define('AdminTrainerFeedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  adminId: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.FLOAT, defaultValue: 4.5 },
  strength: { type: DataTypes.TEXT, defaultValue: '' },
  improvement: { type: DataTypes.TEXT, defaultValue: '' },
  notes: { type: DataTypes.TEXT, defaultValue: '' }
});

// 39. TrainerInvitation (Onboarding invitations)
const TrainerInvitation = sequelize.define('TrainerInvitation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, defaultValue: '' },
  department: { type: DataTypes.STRING, defaultValue: '' },
  trainerType: { type: DataTypes.STRING, defaultValue: 'FULL_TIME' },
  token: { type: DataTypes.STRING, allowNull: false },
  status: { 
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'), 
    defaultValue: 'PENDING' 
  },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  invitedBy: { type: DataTypes.INTEGER, allowNull: true }
});

// 40. TrainerDocument (Uploaded certifications, contracts, resumes)
const TrainerDocument = sequelize.define('TrainerDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: false },
  docType: { 
    type: DataTypes.ENUM('RESUME', 'QUALIFICATION', 'EXPERIENCE_LETTER', 'CERTIFICATION', 'ID_PROOF', 'CONTRACT', 'OTHER'), 
    defaultValue: 'OTHER' 
  },
  title: { type: DataTypes.STRING, allowNull: false },
  fileUrl: { type: DataTypes.STRING, defaultValue: '' },
  fileSize: { type: DataTypes.STRING, defaultValue: '' }
});

// 41. TrainerAuditLog (Immutable action log)
const TrainerAuditLog = sequelize.define('TrainerAuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  module: { type: DataTypes.STRING, defaultValue: 'GENERAL' },
  details: { type: DataTypes.TEXT, defaultValue: '' },
  oldValue: { type: DataTypes.TEXT, defaultValue: '' },
  newValue: { type: DataTypes.TEXT, defaultValue: '' },
  performedBy: { type: DataTypes.INTEGER, allowNull: true },
  ipAddress: { type: DataTypes.STRING, defaultValue: '' }
});

// 42. Workshop (Short duration bootcamps, hackathons, seminars)
const Workshop = sequelize.define('Workshop', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  category: { type: DataTypes.STRING, defaultValue: 'Technical' },
  workshopType: { 
    type: DataTypes.STRING, 
    defaultValue: 'TECHNICAL' 
  },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  programId: { type: DataTypes.INTEGER, allowNull: true },
  semesterId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, defaultValue: '10:00 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '04:00 PM' },
  totalLectures: { type: DataTypes.INTEGER, defaultValue: 2 },
  weeklyLectures: { type: DataTypes.INTEGER, defaultValue: 2 },
  dailyHours: { type: DataTypes.FLOAT, defaultValue: 4 },
  daysOfWeek: { type: DataTypes.JSON, defaultValue: ['SAT', 'SUN'] },
  trainerId: { type: DataTypes.INTEGER, allowNull: true },
  speakerName: { type: DataTypes.STRING, defaultValue: '' },
  speakerDesignation: { type: DataTypes.STRING, defaultValue: '' },
  speakerCompany: { type: DataTypes.STRING, defaultValue: '' },
  speakerBio: { type: DataTypes.TEXT, defaultValue: '' },
  speakerPhoto: { type: DataTypes.STRING, defaultValue: '' },
  speakerEmail: { type: DataTypes.STRING, defaultValue: '' },
  speakerMobile: { type: DataTypes.STRING, defaultValue: '' },
  speakerLinkedIn: { type: DataTypes.STRING, defaultValue: '' },
  venue: { type: DataTypes.STRING, defaultValue: 'Main Auditorium' },
  mode: { type: DataTypes.ENUM('OFFLINE', 'ONLINE', 'HYBRID'), defaultValue: 'OFFLINE' },
  capacity: { type: DataTypes.INTEGER, defaultValue: 100 },
  registrationRequired: { type: DataTypes.BOOLEAN, defaultValue: true },
  waitlistEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  certificateAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
  certificateMinAttendance: { type: DataTypes.INTEGER, defaultValue: 75 },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'UPCOMING' 
  }
});

// 43. WorkshopRegistration (Student applications and approvals)
const WorkshopRegistration = sequelize.define('WorkshopRegistration', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  workshopId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  registrationDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { 
    type: DataTypes.ENUM('REGISTERED', 'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'ABSENT'), 
    defaultValue: 'APPROVED' 
  },
  attendancePercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  certificateIssued: { type: DataTypes.BOOLEAN, defaultValue: false },
  certificateNumber: { type: DataTypes.STRING, defaultValue: '' },
  remarks: { type: DataTypes.STRING, defaultValue: '' }
});

// 44. WorkshopSession (Multi-session breakdown)
const WorkshopSession = sequelize.define('WorkshopSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  workshopId: { type: DataTypes.INTEGER, allowNull: false },
  dayNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  sessionNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  title: { type: DataTypes.STRING, allowNull: false },
  startTime: { type: DataTypes.STRING, defaultValue: '10:00 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '12:00 PM' },
  speakerName: { type: DataTypes.STRING, defaultValue: '' },
  venue: { type: DataTypes.STRING, defaultValue: '' },
  status: { 
    type: DataTypes.ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED'), 
    defaultValue: 'SCHEDULED' 
  }
});

// 45. WorkshopAttendance (Per session tracking)
const WorkshopAttendance = sequelize.define('WorkshopAttendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  workshopId: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  status: { 
    type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE'), 
    defaultValue: 'PRESENT' 
  },
  markedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 46. TrainingBatch (Batches under Training e.g. Batch A, Batch B)
const TrainingBatch = sequelize.define('TrainingBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  academicBatchId: { type: DataTypes.INTEGER, allowNull: true },
  batchName: { type: DataTypes.STRING, allowNull: false }, // e.g. Batch A (CSE-3A)
  batchCode: { type: DataTypes.STRING, allowNull: true },
  academicYearId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.INTEGER, allowNull: true },
  sectionId: { type: DataTypes.INTEGER, allowNull: true },
  trainerId: { type: DataTypes.INTEGER, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  capacity: { type: DataTypes.INTEGER, defaultValue: 60 },
  mode: { type: DataTypes.ENUM('OFFLINE', 'ONLINE', 'HYBRID'), defaultValue: 'OFFLINE' },
  room: { type: DataTypes.STRING, defaultValue: 'Lab 201' },
  status: { 
    type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED'), 
    defaultValue: 'ACTIVE' 
  }
});

// 47. TrainingSession (Individual class/session record)
const TrainingSession = sequelize.define('TrainingSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: false },
  batchId: { type: DataTypes.INTEGER, allowNull: true },
  trainerId: { type: DataTypes.INTEGER, allowNull: true },
  sessionNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, defaultValue: '10:00 AM' },
  endTime: { type: DataTypes.STRING, defaultValue: '12:00 PM' },
  topicTitle: { type: DataTypes.STRING, allowNull: false },
  topicId: { type: DataTypes.INTEGER, allowNull: true },
  contentUrl: { type: DataTypes.STRING, defaultValue: '' },
  room: { type: DataTypes.STRING, defaultValue: 'Lab 204' },
  deliveryMode: { type: DataTypes.ENUM('OFFLINE', 'ONLINE', 'HYBRID'), defaultValue: 'OFFLINE' },
  status: { 
    type: DataTypes.ENUM('SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'), 
    defaultValue: 'SCHEDULED' 
  },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  homework: { type: DataTypes.TEXT, defaultValue: '' },
  assignment: { type: DataTypes.TEXT, defaultValue: '' },
  isAttendanceMarked: { type: DataTypes.BOOLEAN, defaultValue: false },
  isContentDelivered: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 48. TrainingCertificate (Completion certificates with QR verification)
const TrainingCertificate = sequelize.define('TrainingCertificate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  entityType: { type: DataTypes.ENUM('TRAINING', 'WORKSHOP'), defaultValue: 'TRAINING' },
  entityId: { type: DataTypes.INTEGER, allowNull: false }, // trainingId or workshopId
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  certificateNo: { type: DataTypes.STRING, allowNull: false, unique: true },
  issueDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  completionScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  attendancePercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  verificationUrl: { type: DataTypes.STRING, defaultValue: '' },
  status: { type: DataTypes.ENUM('GENERATED', 'ISSUED', 'REVOKED'), defaultValue: 'ISSUED' },
  signatoryAuthority: { type: DataTypes.STRING, defaultValue: 'Dean / Academic Director' }
});

// 49. TrainingCommunicationLog (In-App, Email, SMS, WhatsApp broadcasts)
const TrainingCommunicationLog = sequelize.define('TrainingCommunicationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: true },
  workshopId: { type: DataTypes.INTEGER, allowNull: true },
  channel: { type: DataTypes.ENUM('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'), defaultValue: 'IN_APP' },
  recipientsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  subject: { type: DataTypes.STRING, defaultValue: '' },
  message: { type: DataTypes.TEXT, allowNull: false },
  sentBy: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'SENT' }
});

// 50. TrainingAuditLog (Audit ledger for Training & Workshop events)
const TrainingAuditLog = sequelize.define('TrainingAuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  collegeId: { type: DataTypes.INTEGER, allowNull: false },
  trainingId: { type: DataTypes.INTEGER, allowNull: true },
  workshopId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  moduleName: { type: DataTypes.STRING, defaultValue: 'TRAINING' },
  details: { type: DataTypes.TEXT, defaultValue: '' },
  performedBy: { type: DataTypes.INTEGER, allowNull: true },
  ipAddress: { type: DataTypes.STRING, defaultValue: '' }
});

// Define Associations
College.hasMany(User, { foreignKey: 'collegeId', as: 'users' });
User.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

College.hasMany(Subscription, { foreignKey: 'collegeId', as: 'subscriptions' });
Subscription.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

College.hasMany(Payment, { foreignKey: 'collegeId', as: 'payments' });
Payment.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

College.hasMany(Program, { foreignKey: 'collegeId', as: 'programs' });
Program.belongsTo(College, { foreignKey: 'collegeId' });

Program.hasMany(Branch, { foreignKey: 'programId', as: 'branches' });
Branch.belongsTo(Program, { foreignKey: 'programId', as: 'program' });

Program.hasMany(Semester, { foreignKey: 'programId', as: 'semesters' });
Semester.belongsTo(Program, { foreignKey: 'programId', as: 'program' });

College.hasMany(AcademicYear, { foreignKey: 'collegeId', as: 'academicYears' });
AcademicYear.belongsTo(College, { foreignKey: 'collegeId' });

AcademicYear.hasMany(Semester, { foreignKey: 'academicYearId', as: 'semesters' });
Semester.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

AcademicYear.hasMany(Section, { foreignKey: 'academicYearId', as: 'sections' });
Section.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

AcademicYear.hasMany(AcademicBatch, { foreignKey: 'academicYearId', as: 'batches' });
AcademicBatch.belongsTo(AcademicYear, { foreignKey: 'academicYearId' });
AcademicBatch.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
AcademicBatch.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
AcademicBatch.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

College.hasMany(Branch, { foreignKey: 'collegeId', as: 'branches' });
Branch.belongsTo(College, { foreignKey: 'collegeId' });

College.hasMany(Section, { foreignKey: 'collegeId', as: 'sections' });
Section.belongsTo(College, { foreignKey: 'collegeId' });
Section.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Section.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });

College.hasMany(Subject, { foreignKey: 'collegeId', as: 'subjects' });
Subject.belongsTo(College, { foreignKey: 'collegeId' });

Subject.hasMany(SubjectOffering, { foreignKey: 'subjectId', as: 'offerings' });
SubjectOffering.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
SubjectOffering.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
SubjectOffering.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
SubjectOffering.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
SubjectOffering.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

AcademicYear.hasMany(AcademicCalendarEvent, { foreignKey: 'academicYearId', as: 'calendarEvents' });
AcademicCalendarEvent.belongsTo(AcademicYear, { foreignKey: 'academicYearId' });

User.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
User.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
User.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
User.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

// Academic Enrollments (Multi-term Student Progression History)
User.hasMany(AcademicEnrollment, { foreignKey: 'studentId', as: 'academicEnrollments' });
AcademicEnrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
AcademicEnrollment.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
AcademicEnrollment.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
AcademicEnrollment.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
AcademicEnrollment.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
AcademicEnrollment.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

AcademicYear.hasMany(Training, { foreignKey: 'academicYearId', as: 'trainings' });
Training.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });

College.hasMany(Training, { foreignKey: 'collegeId', as: 'trainings' });
Training.belongsTo(College, { foreignKey: 'collegeId' });
Training.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
Training.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
Training.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Training.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

Training.hasOne(Course, { foreignKey: 'trainingId', as: 'course' });
Course.belongsTo(Training, { foreignKey: 'trainingId' });

Course.hasMany(CourseModule, { foreignKey: 'courseId', as: 'modules' });
CourseModule.belongsTo(Course, { foreignKey: 'courseId' });

CourseModule.hasMany(CourseTopic, { foreignKey: 'moduleId', as: 'topics' });
CourseTopic.belongsTo(CourseModule, { foreignKey: 'moduleId' });

Training.hasMany(DailyTopicDelivery, { foreignKey: 'trainingId', as: 'deliveries' });
DailyTopicDelivery.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
DailyTopicDelivery.belongsTo(CourseTopic, { foreignKey: 'topicId', as: 'topic' });
DailyTopicDelivery.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

DailyTopicDelivery.hasMany(ContentConfirmation, { foreignKey: 'dailyDeliveryId', as: 'confirmations' });
ContentConfirmation.belongsTo(DailyTopicDelivery, { foreignKey: 'dailyDeliveryId' });
ContentConfirmation.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Training.hasMany(Attendance, { foreignKey: 'trainingId', as: 'attendances' });
Attendance.belongsTo(Training, { foreignKey: 'trainingId' });
Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Attendance.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

Training.hasMany(Assessment, { foreignKey: 'trainingId', as: 'assessments' });
Assessment.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
Assessment.belongsTo(Workshop, { foreignKey: 'workshopId', as: 'workshop' });

Assessment.hasMany(Question, { foreignKey: 'assessmentId', as: 'questions' });
Question.belongsTo(Assessment, { foreignKey: 'assessmentId' });

Assessment.hasMany(AssessmentSubmission, { foreignKey: 'assessmentId', as: 'submissions' });
AssessmentSubmission.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
AssessmentSubmission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

AssessmentSubmission.hasMany(StudentAnswer, { foreignKey: 'submissionId', as: 'answers' });
StudentAnswer.belongsTo(AssessmentSubmission, { foreignKey: 'submissionId' });
StudentAnswer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

Assessment.hasMany(AssessmentReevaluation, { foreignKey: 'assessmentId', as: 'reevaluations' });
AssessmentReevaluation.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
AssessmentReevaluation.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
AssessmentReevaluation.belongsTo(User, { foreignKey: 'evaluatorId', as: 'evaluator' });

TrainerFeedback.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
TrainerFeedback.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
TrainerFeedback.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

PerformanceSuggestion.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
PerformanceSuggestion.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

// Student Lifecycle Associations
User.hasMany(StudentParent, { foreignKey: 'studentId', as: 'parents' });
StudentParent.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(TrainingStudent, { foreignKey: 'studentId', as: 'trainingEnrollments' });
TrainingStudent.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Training.hasMany(TrainingStudent, { foreignKey: 'trainingId', as: 'enrolledStudents' });
TrainingStudent.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

College.hasMany(StudentImportLog, { foreignKey: 'collegeId', as: 'studentImportLogs' });
StudentImportLog.belongsTo(College, { foreignKey: 'collegeId' });
StudentImportLog.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
StudentImportLog.belongsTo(User, { foreignKey: 'importedBy', as: 'uploader' });

User.hasMany(StudentActivityLog, { foreignKey: 'studentId', as: 'activityLogs' });
StudentActivityLog.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentActivityLog.belongsTo(User, { foreignKey: 'performedBy', as: 'actor' });

// Trainer Management Associations
User.hasMany(TrainerAssignment, { foreignKey: 'trainerId', as: 'trainerAssignments' });
TrainerAssignment.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
Training.hasMany(TrainerAssignment, { foreignKey: 'trainingId', as: 'trainerAssignments' });
TrainerAssignment.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
TrainerAssignment.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
TrainerAssignment.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
TrainerAssignment.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
TrainerAssignment.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
TrainerAssignment.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
TrainerAssignment.belongsTo(AcademicBatch, { foreignKey: 'batchId', as: 'batch' });

User.hasMany(TrainerSchedule, { foreignKey: 'trainerId', as: 'schedules' });
TrainerSchedule.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
TrainerSchedule.belongsTo(User, { foreignKey: 'substituteTrainerId', as: 'substituteTrainer' });
TrainerSchedule.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
TrainerSchedule.belongsTo(AcademicBatch, { foreignKey: 'batchId', as: 'batch' });

User.hasMany(TrainerAvailability, { foreignKey: 'trainerId', as: 'availabilities' });
TrainerAvailability.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

User.hasMany(TrainerLeave, { foreignKey: 'trainerId', as: 'leaves' });
TrainerLeave.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
TrainerLeave.belongsTo(User, { foreignKey: 'substituteTrainerId', as: 'substituteTrainer' });
TrainerLeave.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

AttendanceCorrection.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
AttendanceCorrection.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
AttendanceCorrection.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

StudentTrainerFeedback.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
StudentTrainerFeedback.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentTrainerFeedback.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

AdminTrainerFeedback.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
AdminTrainerFeedback.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

User.hasMany(TrainerDocument, { foreignKey: 'trainerId', as: 'documents' });
TrainerDocument.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

TrainerAuditLog.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
TrainerAuditLog.belongsTo(User, { foreignKey: 'performedBy', as: 'actor' });

// Workshop Associations
College.hasMany(Workshop, { foreignKey: 'collegeId', as: 'workshops' });
Workshop.belongsTo(College, { foreignKey: 'collegeId' });
Workshop.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'academicYear' });
Workshop.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
Workshop.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
Workshop.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Workshop.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Workshop.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

Workshop.hasMany(WorkshopRegistration, { foreignKey: 'workshopId', as: 'registrations' });
WorkshopRegistration.belongsTo(Workshop, { foreignKey: 'workshopId', as: 'workshop' });
WorkshopRegistration.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Workshop.hasMany(WorkshopSession, { foreignKey: 'workshopId', as: 'sessions' });
WorkshopSession.belongsTo(Workshop, { foreignKey: 'workshopId', as: 'workshop' });
WorkshopSession.hasMany(WorkshopAttendance, { foreignKey: 'sessionId', as: 'attendances' });
WorkshopAttendance.belongsTo(WorkshopSession, { foreignKey: 'sessionId', as: 'session' });
WorkshopAttendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Training Batches & Sessions
Training.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
Training.hasMany(TrainingBatch, { foreignKey: 'trainingId', as: 'batches' });
TrainingBatch.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
TrainingBatch.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
TrainingBatch.belongsTo(AcademicBatch, { foreignKey: 'academicBatchId', as: 'academicBatch' });
TrainingBatch.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
TrainingBatch.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
TrainingBatch.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

Training.hasMany(TrainingSession, { foreignKey: 'trainingId', as: 'sessions' });
TrainingSession.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
TrainingSession.belongsTo(TrainingBatch, { foreignKey: 'batchId', as: 'batch' });
TrainingSession.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

TrainingCertificate.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
TrainingCertificate.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });

TrainingCommunicationLog.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
TrainingCommunicationLog.belongsTo(Workshop, { foreignKey: 'workshopId', as: 'workshop' });
TrainingAuditLog.belongsTo(User, { foreignKey: 'performedBy', as: 'actor' });

module.exports = {
  sequelize,
  College,
  Plan,
  Subscription,
  Payment,
  User,
  RolePermission,
  Program,
  AcademicYear,
  Semester,
  Branch,
  Section,
  AcademicBatch,
  Subject,
  SubjectOffering,
  AcademicEnrollment,
  AcademicCalendarEvent,
  Training,
  Course,
  CourseModule,
  CourseTopic,
  DailyTopicDelivery,
  ContentConfirmation,
  AttendanceRule,
  Attendance,
  Assessment,
  Question,
  AssessmentSubmission,
  StudentAnswer,
  AssessmentReevaluation,
  TrainerFeedback,
  PerformanceSuggestion,
  Notification,
  AuditLog,
  StudentParent,
  TrainingStudent,
  StudentImportLog,
  StudentActivityLog,
  TrainerAssignment,
  TrainerSchedule,
  TrainerAvailability,
  TrainerLeave,
  AttendanceCorrection,
  StudentTrainerFeedback,
  AdminTrainerFeedback,
  TrainerInvitation,
  TrainerDocument,
  TrainerAuditLog,
  Workshop,
  WorkshopRegistration,
  WorkshopSession,
  WorkshopAttendance,
  TrainingBatch,
  TrainingSession,
  TrainingCertificate,
  TrainingCommunicationLog,
  TrainingAuditLog
};

