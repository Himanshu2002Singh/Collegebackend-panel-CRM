const bcrypt = require('bcryptjs');
const { ensureDatabaseExists, sequelize } = require('../config/database');
const {
  College, Plan, Subscription, Payment, User, AcademicYear, Semester, Branch, Section, Subject,
  Training, Course, CourseModule, CourseTopic, DailyTopicDelivery, ContentConfirmation,
  AttendanceRule, Attendance, Assessment, Question, AssessmentSubmission, StudentAnswer,
  TrainerFeedback, PerformanceSuggestion, Notification
} = require('../models');

async function seed() {
  try {
    console.log('--- Initializing Database & Running Migrations ---');
    await ensureDatabaseExists();
    await sequelize.sync({ force: true });
    console.log('Tables synchronized successfully.');

    // 1. Seed Subscription Plans
    console.log('Seeding Plans...');
    const basicPlan = await Plan.create({
      name: 'Basic',
      code: 'BASIC',
      studentLimit: 500,
      trainerLimit: 20,
      trainingLimit: 10,
      hasAssessments: true,
      hasWhatsApp: false,
      hasAIAnalytics: false,
      hasCodingAssessment: true,
      hasParentPortal: false,
      price: 25000.00,
      description: 'Ideal for small institutions getting started with technical training.'
    });

    const proPlan = await Plan.create({
      name: 'Professional',
      code: 'PROFESSIONAL',
      studentLimit: 2000,
      trainerLimit: 100,
      trainingLimit: -1, // Unlimited
      hasAssessments: true,
      hasWhatsApp: true,
      hasAIAnalytics: true,
      hasCodingAssessment: true,
      hasParentPortal: true,
      price: 50000.00,
      description: 'Full-featured platform with WhatsApp alerts, coding IDE, and automated analytics.'
    });

    const enterprisePlan = await Plan.create({
      name: 'Enterprise',
      code: 'ENTERPRISE',
      studentLimit: 10000,
      trainerLimit: 500,
      trainingLimit: -1,
      hasAssessments: true,
      hasWhatsApp: true,
      hasAIAnalytics: true,
      hasCodingAssessment: true,
      hasParentPortal: true,
      price: 120000.00,
      description: 'Unlimited scale, dedicated hosting, AI-driven placement predictors and custom integrations.'
    });

    // 2. Seed Super Admin
    console.log('Seeding Super Admin...');
    const hashedSuperPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Super Admin',
      email: 'superadmin@saas.com',
      password: hashedSuperPassword,
      phone: '+91 9999900000',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    // 3. Seed Colleges
    console.log('Seeding Colleges...');
    const collegeABC = await College.create({
      name: 'ABC Institute of Technology',
      code: 'ABC',
      tenantId: 'TENANT_ABC_2026',
      logoUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=160',
      loginBgUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400',
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      email: 'admin@abc.com',
      phone: '+91 11 23456789',
      address: 'Knowledge Park III, Greater Noida, UP, India',
      status: 'ACTIVE'
    });

    const collegeXYZ = await College.create({
      name: 'XYZ College of Engineering',
      code: 'XYZ',
      tenantId: 'TENANT_XYZ_2026',
      logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160',
      loginBgUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1400',
      primaryColor: '#059669',
      secondaryColor: '#047857',
      email: 'admin@xyz.com',
      phone: '+91 22 87654321',
      address: 'Powai Vihar, Mumbai, Maharashtra, India',
      status: 'ACTIVE'
    });

    // 4. Subscriptions & Payments
    await Subscription.create({
      collegeId: collegeABC.id,
      planId: proPlan.id,
      startDate: '2026-09-01',
      expiryDate: '2027-08-31',
      amount: 50000.00,
      studentLimit: 2000,
      trainerLimit: 100,
      status: 'ACTIVE'
    });

    await Payment.create({
      collegeId: collegeABC.id,
      planId: proPlan.id,
      paymentId: 'pay_ABC_98127391',
      orderId: 'order_ABC_8192831',
      amount: 50000.00,
      status: 'SUCCESS',
      invoiceNumber: 'INV-2026-00142',
      paymentDate: new Date('2026-09-01')
    });

    await Subscription.create({
      collegeId: collegeXYZ.id,
      planId: basicPlan.id,
      startDate: '2026-09-01',
      expiryDate: '2027-08-31',
      amount: 25000.00,
      studentLimit: 500,
      trainerLimit: 20,
      status: 'ACTIVE'
    });

    // 5. College Admins
    console.log('Seeding College Admins...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    const abcAdmin = await User.create({
      collegeId: collegeABC.id,
      name: 'Rahul Sharma',
      email: 'admin@abc.com',
      password: hashedAdminPassword,
      phone: '+91 9811122233',
      role: 'COLLEGE_ADMIN',
      subRole: 'MAIN_ADMIN',
      isActive: true
    });

    await User.create({
      collegeId: collegeABC.id,
      name: 'Anjali Verma',
      email: 'training@abc.com',
      password: hashedAdminPassword,
      phone: '+91 9811133344',
      role: 'COLLEGE_ADMIN',
      subRole: 'TRAINING_MGR',
      isActive: true
    });

    await User.create({
      collegeId: collegeXYZ.id,
      name: 'Dr. K. S. Rao',
      email: 'admin@xyz.com',
      password: hashedAdminPassword,
      phone: '+91 9822233344',
      role: 'COLLEGE_ADMIN',
      subRole: 'MAIN_ADMIN',
      isActive: true
    });

    // 6. Academic Hierarchy for ABC College
    console.log('Seeding Academic Tree...');
    const academicYear = await AcademicYear.create({
      collegeId: collegeABC.id,
      yearName: '2026-27',
      isCurrent: true
    });

    const sem3 = await Semester.create({
      collegeId: collegeABC.id,
      academicYearId: academicYear.id,
      semesterNumber: 3,
      name: 'Semester 3'
    });

    const sem5 = await Semester.create({
      collegeId: collegeABC.id,
      academicYearId: academicYear.id,
      semesterNumber: 5,
      name: 'Semester 5'
    });

    const branchCSE = await Branch.create({
      collegeId: collegeABC.id,
      name: 'Computer Science & Engineering',
      code: 'CSE'
    });

    const branchIT = await Branch.create({
      collegeId: collegeABC.id,
      name: 'Information Technology',
      code: 'IT'
    });

    const section3A = await Section.create({
      collegeId: collegeABC.id,
      semesterId: sem3.id,
      branchId: branchCSE.id,
      name: 'A'
    });

    const section3B = await Section.create({
      collegeId: collegeABC.id,
      semesterId: sem3.id,
      branchId: branchCSE.id,
      name: 'B'
    });

    const subjectDSA = await Subject.create({
      collegeId: collegeABC.id,
      name: 'Data Structures & Algorithms',
      code: 'CS301'
    });

    // 7. Trainers
    console.log('Seeding Trainers...');
    const hashedTrainerPass = await bcrypt.hash('trainer123', 10);
    const rahulSir = await User.create({
      collegeId: collegeABC.id,
      name: 'Rahul Sir',
      email: 'rahul@abc.com',
      password: hashedTrainerPass,
      phone: '+91 9711144455',
      role: 'TRAINER',
      isActive: true
    });

    const priyaMaam = await User.create({
      collegeId: collegeABC.id,
      name: 'Priya Sharma',
      email: 'priya@abc.com',
      password: hashedTrainerPass,
      phone: '+91 9711155566',
      role: 'TRAINER',
      isActive: true
    });

    // 8. Students (60 Students in CSE 3A, including Rahul Singh)
    console.log('Seeding 60 Students for CSE 3A...');
    const hashedStudentPass = await bcrypt.hash('student123', 10);

    const rahulSingh = await User.create({
      collegeId: collegeABC.id,
      name: 'Rahul Singh',
      email: 'rahul@student.abc.com',
      password: hashedStudentPass,
      phone: '+91 9876500001',
      role: 'STUDENT',
      enrollmentNo: 'EN2026001',
      rollNo: '01',
      parentName: 'Vikram Singh',
      parentMobile: '+91 9876543210',
      parentEmail: 'vikram.singh@gmail.com',
      branchId: branchCSE.id,
      semesterId: sem3.id,
      sectionId: section3A.id,
      isActive: true
    });

    const otherStudents = [
      { name: 'Aman Gupta', email: 'aman@student.abc.com', roll: '02' },
      { name: 'Ravi Verma', email: 'ravi@student.abc.com', roll: '03' },
      { name: 'Mohit Kumar', email: 'mohit@student.abc.com', roll: '04' },
      { name: 'Sneha Patel', email: 'sneha@student.abc.com', roll: '05' },
      { name: 'Pooja Sharma', email: 'pooja@student.abc.com', roll: '06' },
      { name: 'Vikash Yadav', email: 'vikash@student.abc.com', roll: '07' },
      { name: 'Rohan Mehra', email: 'rohan@student.abc.com', roll: '08' }
    ];

    const studentEntities = [rahulSingh];

    for (let i = 0; i < otherStudents.length; i++) {
      const s = otherStudents[i];
      const stud = await User.create({
        collegeId: collegeABC.id,
        name: s.name,
        email: s.email,
        password: hashedStudentPass,
        phone: `+91 98765000${s.roll}`,
        role: 'STUDENT',
        enrollmentNo: `EN20260${s.roll}`,
        rollNo: s.roll,
        parentName: `Parent of ${s.name}`,
        parentMobile: `+91 98765990${s.roll}`,
        branchId: branchCSE.id,
        semesterId: sem3.id,
        sectionId: section3A.id,
        isActive: true
      });
      studentEntities.push(stud);
    }

    // Generate remaining students up to 60
    for (let i = 9; i <= 60; i++) {
      const rollStr = i < 10 ? `0${i}` : `${i}`;
      const stud = await User.create({
        collegeId: collegeABC.id,
        name: `Student CSE ${rollStr}`,
        email: `student${rollStr}@student.abc.com`,
        password: hashedStudentPass,
        phone: `+91 98765000${rollStr}`,
        role: 'STUDENT',
        enrollmentNo: `EN20260${rollStr}`,
        rollNo: rollStr,
        parentName: `Parent ${rollStr}`,
        parentMobile: `+91 98765880${rollStr}`,
        branchId: branchCSE.id,
        semesterId: sem3.id,
        sectionId: section3A.id,
        isActive: true
      });
      studentEntities.push(stud);
    }

    // 9. Training: Java + DSA
    console.log('Seeding Trainings & Workshops...');
    const trainingDSA = await Training.create({
      collegeId: collegeABC.id,
      name: 'Java + DSA',
      type: 'SEMESTER_TRAINING',
      subjectId: subjectDSA.id,
      semesterId: sem3.id,
      branchId: branchCSE.id,
      sectionId: section3A.id,
      trainerId: rahulSir.id,
      durationDays: 45,
      startDate: '2026-09-15',
      endDate: '2026-10-30',
      status: 'ACTIVE'
    });

    await Training.create({
      collegeId: collegeABC.id,
      name: 'Python for Data Science',
      type: 'SEMESTER_TRAINING',
      semesterId: sem3.id,
      branchId: branchIT.id,
      trainerId: priyaMaam.id,
      durationDays: 40,
      startDate: '2026-09-15',
      endDate: '2026-10-25',
      status: 'ACTIVE'
    });

    await Training.create({
      collegeId: collegeABC.id,
      name: 'Generative AI Workshop',
      type: 'WORKSHOP',
      semesterId: sem5.id,
      branchId: branchCSE.id,
      trainerId: rahulSir.id,
      durationDays: 3,
      startDate: '2026-09-20',
      endDate: '2026-09-22',
      status: 'ACTIVE'
    });

    // 10. Course Curriculum (TOC)
    console.log('Seeding Course Table of Contents...');
    const course = await Course.create({
      collegeId: collegeABC.id,
      trainingId: trainingDSA.id,
      title: 'Java + DSA Master Curriculum',
      description: 'Comprehensive industry-aligned Data Structures & Algorithms training in Java.'
    });

    const moduleTopics = [
      { module: 'Module 1: Introduction', topics: ['Introduction to DSA', 'Variables & Control Flow'] },
      { module: 'Module 2: Complexity Analysis', topics: ['Time & Space Complexity', 'Asymptotic Notations'] },
      { module: 'Module 3: Arrays & Searching', topics: ['Arrays In-Depth', 'Binary Search & Two Pointers'] },
      { module: 'Module 4: Strings', topics: ['String Manipulations', 'Sliding Window Pattern'] },
      { module: 'Module 5: Linked List', topics: ['Singly & Doubly Linked List', 'Fast & Slow Pointer'] },
      { module: 'Module 6: Stack', topics: ['Stack Implementation & LIFO', 'Monotonic Stack'] },
      { module: 'Module 7: Queue', topics: ['Queue FIFO & Circular Queue', 'Priority Queue'] },
      { module: 'Module 8: Trees', topics: ['Binary Trees & Traversals', 'Binary Search Trees'] },
      { module: 'Module 9: Graph', topics: ['BFS & DFS Algorithms', 'Dijkstra Shortest Path'] },
      { module: 'Module 10: Dynamic Programming', topics: ['1D DP & Memoization', '0/1 Knapsack'] }
    ];

    let binarySearchTopic = null;
    let introTopic = null;

    for (let mIdx = 0; mIdx < moduleTopics.length; mIdx++) {
      const mod = await CourseModule.create({
        courseId: course.id,
        title: moduleTopics[mIdx].module,
        orderIndex: mIdx + 1
      });

      for (let tIdx = 0; tIdx < moduleTopics[mIdx].topics.length; tIdx++) {
        const title = moduleTopics[mIdx].topics[tIdx];
        const topic = await CourseTopic.create({
          moduleId: mod.id,
          title,
          description: `Detailed hands-on lecture and exercises for ${title}`,
          notes: `Core principles, algorithmic patterns, and step-by-step dry runs for ${title}.`,
          pdfUrl: 'https://example.com/notes.pdf',
          videoUrl: 'https://youtube.com/embed/example',
          practiceQuestions: `Solve 5 foundational problems on ${title}`,
          orderIndex: tIdx + 1
        });

        if (title === 'Introduction to DSA') introTopic = topic;
        if (title === 'Binary Search & Two Pointers') binarySearchTopic = topic;
      }
    }

    // 11. Daily Topic Delivery
    console.log('Seeding Daily Delivery & Content Confirmations...');
    const dailyDelivery = await DailyTopicDelivery.create({
      collegeId: collegeABC.id,
      trainingId: trainingDSA.id,
      topicId: binarySearchTopic.id,
      trainerId: rahulSir.id,
      deliveryDate: '2026-09-12',
      isDelivered: true,
      notes: 'Covered Binary Search on sorted arrays, time complexity O(log N), and boundary conditions.',
      practiceQuestions: '1. LeetCode #704 (Binary Search)\n2. Find First and Last Position\n3. Peak Index in Mountain Array',
      assignment: 'Submit clean Java solutions for 3 Binary Search problems by 10 PM.'
    });

    // Seed student content confirmation: 56 Yes, 2 No, 2 Pending
    for (let i = 0; i < 56; i++) {
      await ContentConfirmation.create({
        collegeId: collegeABC.id,
        dailyDeliveryId: dailyDelivery.id,
        studentId: studentEntities[i].id,
        isDelivered: 'YES',
        confirmedAt: new Date(),
        comments: 'Topic delivered with practical code examples.'
      });
    }

    for (let i = 56; i < 58; i++) {
      await ContentConfirmation.create({
        collegeId: collegeABC.id,
        dailyDeliveryId: dailyDelivery.id,
        studentId: studentEntities[i].id,
        isDelivered: 'NO',
        confirmedAt: new Date(),
        comments: 'Could not follow the edge cases clearly.'
      });
    }

    for (let i = 58; i < 60; i++) {
      await ContentConfirmation.create({
        collegeId: collegeABC.id,
        dailyDeliveryId: dailyDelivery.id,
        studentId: studentEntities[i].id,
        isDelivered: 'PENDING',
        confirmedAt: null
      });
    }

    // 12. Attendance Rule & Records
    console.log('Seeding Attendance Rules & Consecutive Absence Scenario...');
    await AttendanceRule.create({
      collegeId: collegeABC.id,
      mode: 'DAILY',
      startTime: '09:50 AM',
      endTime: '10:05 AM',
      allowedDurationMinutes: 15
    });

    // Rahul Singh's 3 consecutive absences scenario
    const dates = ['2026-09-10', '2026-09-11', '2026-09-12'];
    for (const d of dates) {
      await Attendance.create({
        collegeId: collegeABC.id,
        trainingId: trainingDSA.id,
        studentId: rahulSingh.id,
        trainerId: rahulSir.id,
        date: d,
        status: 'ABSENT',
        remarks: 'Absent without prior intimation'
      });
    }

    // Trigger WhatsApp & In-app Notification for Rahul's 3 consecutive absences
    await Notification.create({
      collegeId: collegeABC.id,
      recipientId: rahulSingh.id,
      recipientRole: 'PARENT',
      title: '3 Consecutive Absences Detected - Rahul Singh',
      message: 'Dear Parent, Rahul Singh has been absent from Java + DSA training for 3 consecutive days. Kindly review with student.',
      type: 'WHATSAPP_LOG'
    });

    await Notification.create({
      collegeId: collegeABC.id,
      recipientRole: 'COLLEGE_ADMIN',
      title: 'Consecutive Absence Alert: Rahul Singh',
      message: 'Student Rahul Singh (Enrollment: EN2026001) has been absent for 3 consecutive sessions in Java + DSA.',
      type: 'IN_APP'
    });

    // Attendance for the rest of the 59 students on 2026-09-12 (54 Present, 3 Absent, 2 Late)
    for (let i = 1; i < studentEntities.length; i++) {
      let status = 'PRESENT';
      if (i === 1 || i === 2 || i === 3) status = 'ABSENT';
      else if (i === 4 || i === 5) status = 'LATE';

      await Attendance.create({
        collegeId: collegeABC.id,
        trainingId: trainingDSA.id,
        studentId: studentEntities[i].id,
        trainerId: rahulSir.id,
        date: '2026-09-12',
        status,
        remarks: status === 'LATE' ? 'Arrived 10 mins late' : ''
      });
    }

    // 13. Assessment: DSA Test 1 (MCQs + Theory + Coding)
    console.log('Seeding Assessment & Questions...');
    const assessment = await Assessment.create({
      collegeId: collegeABC.id,
      trainingId: trainingDSA.id,
      title: 'DSA Test 1: Foundations, Searching & Logic',
      durationMinutes: 60,
      totalMarks: 50,
      passingMarks: 20,
      status: 'PUBLISHED',
      instructions: 'Please attempt all 20 MCQs, 2 Theory questions, and 2 Coding problems within 60 minutes.'
    });

    // 20 MCQs
    const mcqQuestions = [
      { text: 'What is the primary principle of a Stack data structure?', options: ['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'Random Access', 'Priority-based'], correct: 'LIFO (Last In First Out)', topic: 'Stack' },
      { text: 'What is the average time complexity of searching in a sorted array using Binary Search?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'], correct: 'O(log N)', topic: 'Binary Search' },
      { text: 'Which data structure is primarily utilized for Breadth-First Search (BFS)?', options: ['Stack', 'Queue', 'Priority Queue', 'Tree'], correct: 'Queue', topic: 'Queue' },
      { text: 'What is the space complexity of a recursive algorithm with recursion depth N?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], correct: 'O(N)', topic: 'Recursion' },
      { text: 'In a balanced Binary Search Tree, what is the height of the tree with N nodes?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], correct: 'O(log N)', topic: 'Trees' },
      { text: 'Which sorting algorithm has the best average-case time complexity of O(N log N)?', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 'Merge Sort', topic: 'Arrays' },
      { text: 'What happens when elements are pushed into a Stack beyond its allocated capacity?', options: ['Stack Underflow', 'Stack Overflow', 'Segmentation Memory Fault', 'Garbage Collection'], correct: 'Stack Overflow', topic: 'Stack' },
      { text: 'What is the maximum number of children a node in a Binary Tree can have?', options: ['1', '2', '3', 'Unlimited'], correct: '2', topic: 'Trees' },
      { text: 'Which data structure provides O(1) average time complexity for insert, delete, and lookup operations?', options: ['Array', 'LinkedList', 'HashMap', 'Binary Tree'], correct: 'HashMap', topic: 'Arrays' },
      { text: 'Which algorithmic paradigm does Binary Search belong to?', options: ['Dynamic Programming', 'Greedy Method', 'Divide and Conquer', 'Backtracking'], correct: 'Divide and Conquer', topic: 'Binary Search' },
      { text: 'What is the minimum number of queues required to implement a Stack?', options: ['1', '2', '3', 'None'], correct: '2', topic: 'Stack' },
      { text: 'In Inorder traversal of a Binary Search Tree, elements are visited in:', options: ['Descending Order', 'Ascending Order', 'Random Order', 'Level Order'], correct: 'Ascending Order', topic: 'Trees' },
      { text: 'Which technique is used to avoid redundant computation in recursive subproblems?', options: ['Memoization', 'Greedy Choice', 'Divide and Rule', 'Sorting'], correct: 'Memoization', topic: 'Recursion' },
      { text: 'What is the worst case time complexity of QuickSort?', options: ['O(N log N)', 'O(N)', 'O(N^2)', 'O(log N)'], correct: 'O(N^2)', topic: 'Arrays' },
      { text: 'Which of the following is a non-linear data structure?', options: ['Array', 'Linked List', 'Tree', 'Queue'], correct: 'Tree', topic: 'Trees' },
      { text: 'What is the time complexity of reversing a Singly Linked List of N nodes?', options: ['O(1)', 'O(N)', 'O(N log N)', 'O(N^2)'], correct: 'O(N)', topic: 'Linked List' },
      { text: 'How do you detect a cycle in a Linked List?', options: ['Two Pointers (Floyd Cycle Algorithm)', 'Binary Search', 'Quick Sort', 'Divide and Conquer'], correct: 'Two Pointers (Floyd Cycle Algorithm)', topic: 'Linked List' },
      { text: 'Which data structure is suitable for evaluating postfix expressions?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correct: 'Stack', topic: 'Stack' },
      { text: 'What is the base case in a recursive function?', options: ['The case that triggers more recursion', 'The terminating condition that stops recursion', 'The maximum recursion limit', 'The heap allocation condition'], correct: 'The terminating condition that stops recursion', topic: 'Recursion' },
      { text: 'In an array of size N, what is the index of the last element?', options: ['N', 'N - 1', 'N + 1', '0'], correct: 'N - 1', topic: 'Arrays' }
    ];

    for (const q of mcqQuestions) {
      await Question.create({
        assessmentId: assessment.id,
        type: 'MCQ',
        text: q.text,
        options: q.options,
        correctAnswer: q.correct,
        marks: 1,
        difficulty: 'MEDIUM',
        topicName: q.topic
      });
    }

    // 2 Theory Questions
    await Question.create({
      assessmentId: assessment.id,
      type: 'THEORY',
      text: 'Explain the working principle of Binary Search. What conditions must the dataset satisfy to apply Binary Search, and why is its time complexity O(log N)?',
      marks: 5,
      difficulty: 'MEDIUM',
      topicName: 'Binary Search'
    });

    await Question.create({
      assessmentId: assessment.id,
      type: 'THEORY',
      text: 'Explain the concept of Tree Traversals: Preorder, Inorder, and Postorder. How does Inorder traversal behave on a Binary Search Tree (BST)?',
      marks: 5,
      difficulty: 'HARD',
      topicName: 'Trees'
    });

    // 2 Coding Questions
    const codingQ1 = await Question.create({
      assessmentId: assessment.id,
      type: 'CODING',
      text: 'Problem: Given an array of integers arr[], find the second largest distinct element. If no second largest element exists, return -1.',
      marks: 10,
      difficulty: 'MEDIUM',
      language: 'Java',
      boilerplateCode: `public class Solution {\n    public static int findSecondLargest(int[] arr) {\n        // Write your code here\n        int largest = -1, second = -1;\n        for (int num : arr) {\n            if (num > largest) {\n                second = largest;\n                largest = num;\n            } else if (num > second && num != largest) {\n                second = num;\n            } \n        }\n        return second;\n    }\n}`,
      testCases: [
        { input: '[12, 35, 1, 10, 34, 1]', expected: '34' },
        { input: '[10, 5, 10]', expected: '5' },
        { input: '[10, 10, 10]', expected: '-1' }
      ],
      topicName: 'Arrays'
    });

    const codingQ2 = await Question.create({
      assessmentId: assessment.id,
      type: 'CODING',
      text: 'Problem: Given a string containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid using a Stack.',
      marks: 10,
      difficulty: 'MEDIUM',
      language: 'Java',
      boilerplateCode: `import java.util.Stack;\npublic class Solution {\n    public static boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`,
      testCases: [
        { input: '"()[]{}"', expected: 'true' },
        { input: '"(]"', expected: 'false' },
        { input: '"([)]"', expected: 'false' }
      ],
      topicName: 'Stack'
    });

    // 14. Seed Rahul's Submission: 42/50 (84%)
    console.log('Seeding Rahul Singh Test Submission (42/50 - 84%)...');
    const submission = await AssessmentSubmission.create({
      assessmentId: assessment.id,
      studentId: rahulSingh.id,
      totalScore: 42.00,
      percentage: 84.00,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-09-12T11:00:00Z')
    });

    // Seed Performance Suggestions for Rahul Singh
    await PerformanceSuggestion.create({
      collegeId: collegeABC.id,
      studentId: rahulSingh.id,
      trainingId: trainingDSA.id,
      strongTopics: [
        { topic: 'Arrays', score: 90 },
        { topic: 'Strings', score: 86 },
        { topic: 'Stack', score: 82 }
      ],
      weakTopics: [
        { topic: 'Trees', score: 62 },
        { topic: 'Recursion', score: 58 }
      ],
      suggestions: [
        'Student should practice recursion and tree-based problems and attend the upcoming revision session.',
        'Practice 20 Recursion Questions on LeetCode / GeeksForGeeks.',
        'Watch Recursion & Tree Traversals revision lecture in student portal.',
        'Attempt Recursion and BST Quiz scheduled for this Friday.'
      ]
    });

    // Seed Trainer Feedback for Rahul Singh
    await TrainerFeedback.create({
      collegeId: collegeABC.id,
      trainingId: trainingDSA.id,
      studentId: rahulSingh.id,
      trainerId: rahulSir.id,
      feedbackText: 'Concept understanding in Arrays and Stack is solid. Needs to focus more on Recursion and Tree edge cases.',
      participation: 'GOOD',
      assignmentStatus: 'COMPLETED',
      codingRating: 'AVERAGE',
      date: '2026-09-12'
    });

    console.log('=====================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Login Credentials:');
    console.log('  1. Super Admin: superadmin@saas.com / admin123');
    console.log('  2. College Admin: admin@abc.com / admin123');
    console.log('  3. Trainer: rahul@abc.com / trainer123');
    console.log('  4. Student: rahul@student.abc.com / student123 (Enrollment: EN2026001)');
    console.log('=====================================================');

  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seed().then(() => {
    process.exit(0);
  });
}

module.exports = { seed };
