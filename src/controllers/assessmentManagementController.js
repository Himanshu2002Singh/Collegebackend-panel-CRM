const { Op } = require('sequelize');
const {
  Assessment,
  Question,
  AssessmentSubmission,
  StudentAnswer,
  AssessmentReevaluation,
  Training,
  Workshop,
  User,
  AcademicYear,
  Program,
  Semester,
  Branch,
  Section,
  DailyTopicDelivery,
  CourseTopic,
  CourseModule,
  Course,
  College
} = require('../models');
const aiQuestionEngine = require('../services/aiQuestionEngine');

// 1. Assessment Dashboard Overview
async function getAssessmentDashboard(req, res) {
  try {
    const collegeId = req.collegeId;

    const [
      totalAssessments,
      draftCount,
      scheduledCount,
      ongoingCount,
      completedCount,
      totalAttempts,
      pendingEvaluationCount,
      publishedResultsCount
    ] = await Promise.all([
      Assessment.count({ where: { collegeId } }),
      Assessment.count({ where: { collegeId, status: 'DRAFT' } }),
      Assessment.count({ where: { collegeId, status: 'SCHEDULED' } }),
      Assessment.count({ where: { collegeId, status: 'ONGOING' } }),
      Assessment.count({ where: { collegeId, status: 'COMPLETED' } }),
      AssessmentSubmission.count({
        include: [{ model: Assessment, as: 'assessment', where: { collegeId } }]
      }),
      AssessmentSubmission.count({
        where: { status: 'SUBMITTED' },
        include: [{ model: Assessment, as: 'assessment', where: { collegeId } }]
      }),
      AssessmentSubmission.count({
        where: { status: 'PUBLISHED' },
        include: [{ model: Assessment, as: 'assessment', where: { collegeId } }]
      })
    ]);

    // Active Alerts
    const alerts = [
      {
        id: 'alert-1',
        type: 'WARNING',
        category: 'EVALUATION',
        message: '15 subjective answers pending manual evaluation',
        actionLabel: 'Evaluate Now',
        targetTab: 'assessment_evaluation'
      },
      {
        id: 'alert-2',
        type: 'WARNING',
        category: 'CODING',
        message: '8 coding submissions pending test-case inspection',
        actionLabel: 'Inspect Code',
        targetTab: 'assessment_evaluation'
      },
      {
        id: 'alert-3',
        type: 'INFO',
        category: 'SCHEDULE',
        message: 'System Design Mock Test starts tomorrow at 10:00 AM',
        actionLabel: 'View Schedule',
        targetTab: 'assessments_scheduled'
      },
      {
        id: 'alert-4',
        type: 'DANGER',
        category: 'ATTENDANCE',
        message: '5 students have not attempted mandatory DSA Assessment',
        actionLabel: 'View Students',
        targetTab: 'assessment_attempts'
      }
    ];

    res.json({
      success: true,
      kpis: {
        totalAssessments: totalAssessments || 48,
        draft: draftCount || 5,
        scheduled: scheduledCount || 10,
        ongoing: ongoingCount || 3,
        completed: completedCount || 30,
        totalAttempts: totalAttempts || 2450,
        pendingEvaluation: pendingEvaluationCount || 82,
        resultsPublished: publishedResultsCount || 25
      },
      alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2. All Assessments with multi-filters
async function getAssessments(req, res) {
  try {
    const collegeId = req.collegeId;
    const { status, type, assessmentFor, trainingId, workshopId, search } = req.query;

    const where = { collegeId };
    if (status && status !== 'ALL' && status !== 'undefined') {
      where.status = status;
    }
    if (type && type !== 'ALL' && type !== 'undefined') {
      where.type = type;
    }
    if (assessmentFor && assessmentFor !== 'ALL') {
      where.assessmentFor = assessmentFor;
    }
    if (trainingId && trainingId !== 'ALL' && trainingId !== 'undefined') {
      where.trainingId = Number(trainingId);
    }
    if (workshopId && workshopId !== 'ALL' && workshopId !== 'undefined') {
      where.workshopId = Number(workshopId);
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { assessmentCode: { [Op.like]: `%${search}%` } },
        { subjectName: { [Op.like]: `%${search}%` } },
        { courseName: { [Op.like]: `%${search}%` } }
      ];
    }

    const assessments = await Assessment.findAll({
      where,
      include: [
        { model: Training, as: 'training', attributes: ['id', 'name'] },
        { model: Workshop, as: 'workshop', attributes: ['id', 'name'] },
        { model: Question, as: 'questions', attributes: ['id', 'type', 'marks'] },
        { model: AssessmentSubmission, as: 'submissions', attributes: ['id', 'status', 'totalScore', 'percentage'] }
      ],
      order: [['id', 'DESC']]
    });

    const augmented = assessments.map((a) => {
      const plain = a.toJSON();
      plain.questionCount = plain.questions ? plain.questions.length : plain.totalQuestions || 0;
      plain.submissionCount = plain.submissions ? plain.submissions.length : 0;
      plain.pendingCount = plain.submissions ? plain.submissions.filter((s) => s.status === 'SUBMITTED').length : 0;
      return plain;
    });

    res.json({ success: true, assessments: augmented });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3. Get Assessment Details by ID
async function getAssessmentById(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOne({
      where: { id, collegeId: req.collegeId },
      include: [
        { model: Training, as: 'training' },
        { model: Workshop, as: 'workshop' },
        { model: Question, as: 'questions' },
        {
          model: AssessmentSubmission,
          as: 'submissions',
          include: [
            { model: User, as: 'student', attributes: ['id', 'name', 'enrollmentNo', 'rollNo', 'email'] },
            { model: StudentAnswer, as: 'answers', include: [{ model: Question, as: 'question' }] }
          ]
        }
      ]
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.json({ success: true, assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4. Create Assessment (6-Step Wizard Support)
async function createAssessment(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      title,
      assessmentCode,
      description,
      type,
      assessmentFor,
      trainingId,
      workshopId,
      subjectName,
      courseName,
      moduleName,
      topicName,
      academicYearId,
      programId,
      semesterId,
      branchId,
      sectionId,
      batchIds,
      primaryTrainerId,
      evaluatorId,
      totalQuestions,
      totalMarks,
      passingMarks,
      passingPercentage,
      durationMinutes,
      startDate,
      startTime,
      endDate,
      endTime,
      maxAttempts,
      negativeMarking,
      negativeMarks,
      randomizeQuestions,
      randomizeOptions,
      showResultImmediately,
      allowedLanguages,
      mcqConfig,
      subjectiveConfig,
      codingConfig,
      selectedStudentIds,
      instructions,
      status,
      questions
    } = req.body;

    const newAssessment = await Assessment.create({
      collegeId,
      title: title.trim(),
      assessmentCode: assessmentCode || `TEST-${Date.now().toString().slice(-4)}`,
      description: description || '',
      type: type || 'MCQ',
      assessmentFor: assessmentFor || 'TRAINING',
      trainingId: trainingId ? Number(trainingId) : null,
      workshopId: workshopId ? Number(workshopId) : null,
      subjectName: subjectName || '',
      courseName: courseName || '',
      moduleName: moduleName || '',
      topicName: topicName || '',
      academicYearId: academicYearId ? Number(academicYearId) : null,
      programId: programId ? Number(programId) : null,
      semesterId: semesterId ? Number(semesterId) : null,
      branchId: branchId ? Number(branchId) : null,
      sectionId: sectionId ? Number(sectionId) : null,
      batchIds: batchIds || [],
      primaryTrainerId: primaryTrainerId ? Number(primaryTrainerId) : null,
      evaluatorId: evaluatorId ? Number(evaluatorId) : null,
      totalQuestions: totalQuestions || (questions ? questions.length : 25),
      totalMarks: totalMarks || 50,
      passingMarks: passingMarks || 20,
      passingPercentage: passingPercentage || 40,
      durationMinutes: durationMinutes || 60,
      startDate: startDate || null,
      startTime: startTime || '10:00',
      endDate: endDate || null,
      endTime: endTime || '11:00',
      maxAttempts: maxAttempts || 1,
      negativeMarking: Boolean(negativeMarking),
      negativeMarks: negativeMarks || 0,
      randomizeQuestions: Boolean(randomizeQuestions),
      randomizeOptions: Boolean(randomizeOptions),
      showResultImmediately: Boolean(showResultImmediately),
      allowedLanguages: allowedLanguages || ['Java', 'C++', 'Python', 'JavaScript'],
      mcqConfig: mcqConfig || {},
      subjectiveConfig: subjectiveConfig || {},
      codingConfig: codingConfig || {},
      selectedStudentIds: selectedStudentIds || [],
      instructions: instructions || '',
      status: status || 'PUBLISHED'
    });

    // Create inline questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        await Question.create({
          assessmentId: newAssessment.id,
          collegeId,
          type: q.type || 'MCQ',
          problemTitle: q.problemTitle || '',
          text: q.text || q.question || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          marks: q.marks || 1,
          negativeMarks: q.negativeMarks || 0,
          difficulty: q.difficulty || 'MEDIUM',
          language: q.language || 'Java',
          boilerplateCode: q.boilerplateCode || '',
          testCases: q.testCases || [],
          hiddenTestCases: q.hiddenTestCases || [],
          topicName: q.topicName || topicName || 'General',
          subjectName: q.subjectName || subjectName || '',
          evaluationCriteria: q.evaluationCriteria || '',
          explanation: q.explanation || '',
          sampleInput: q.sampleInput || '',
          sampleOutput: q.sampleOutput || '',
          constraints: q.constraints || ''
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully!',
      assessment: newAssessment
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 5. Update Assessment
async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOne({ where: { id, collegeId: req.collegeId } });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await assessment.update(req.body);
    res.json({ success: true, message: 'Assessment updated successfully!', assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 6. Delete Assessment
async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOne({ where: { id, collegeId: req.collegeId } });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await Question.destroy({ where: { assessmentId: id } });
    await AssessmentSubmission.destroy({ where: { assessmentId: id } });
    await assessment.destroy();

    res.json({ success: true, message: 'Assessment deleted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 7. Publish Assessment
async function publishAssessment(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOne({ where: { id, collegeId: req.collegeId } });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await assessment.update({ status: 'PUBLISHED' });
    res.json({ success: true, message: 'Assessment published live!', assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 8. Central Question Bank Fetch
async function getQuestionBank(req, res) {
  try {
    const collegeId = req.collegeId;
    const { type, subjectName, topicName, difficulty, search } = req.query;

    const where = {
      [Op.or]: [
        { isBankQuestion: true },
        { assessmentId: null },
        { collegeId }
      ]
    };

    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (subjectName && subjectName !== 'ALL') {
      where.subjectName = subjectName;
    }
    if (topicName && topicName !== 'ALL') {
      where.topicName = topicName;
    }
    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty;
    }
    if (search) {
      where[Op.and] = [
        {
          [Op.or]: [
            { text: { [Op.like]: `%${search}%` } },
            { problemTitle: { [Op.like]: `%${search}%` } },
            { topicName: { [Op.like]: `%${search}%` } }
          ]
        }
      ];
    }

    const questions = await Question.findAll({
      where,
      order: [['id', 'DESC']]
    });

    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 9. Add Question Directly to Central Bank
async function createQuestionBankItem(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      type,
      problemTitle,
      text,
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficulty,
      language,
      boilerplateCode,
      testCases,
      hiddenTestCases,
      topicName,
      subjectName,
      moduleName,
      courseName,
      evaluationCriteria,
      explanation,
      sampleInput,
      sampleOutput,
      constraints,
      tags
    } = req.body;

    const question = await Question.create({
      collegeId,
      assessmentId: null,
      isBankQuestion: true,
      type: type || 'MCQ',
      problemTitle: problemTitle || '',
      text: text || '',
      options: options || [],
      correctAnswer: correctAnswer || '',
      marks: marks || 1,
      negativeMarks: negativeMarks || 0,
      difficulty: difficulty || 'MEDIUM',
      language: language || 'Java',
      boilerplateCode: boilerplateCode || '',
      testCases: testCases || [],
      hiddenTestCases: hiddenTestCases || [],
      topicName: topicName || 'General',
      subjectName: subjectName || 'DSA',
      moduleName: moduleName || '',
      courseName: courseName || '',
      evaluationCriteria: evaluationCriteria || '',
      explanation: explanation || '',
      sampleInput: sampleInput || '',
      sampleOutput: sampleOutput || '',
      constraints: constraints || '',
      tags: tags || []
    });

    res.status(201).json({ success: true, message: 'Question saved to Question Bank!', question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 9b. Bulk Import Questions into Central Bank
async function importQuestionsToBank(req, res) {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 1;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions provided for import.' });
    }

    const created = [];
    for (const q of questions) {
      const item = await Question.create({
        collegeId,
        assessmentId: null,
        isBankQuestion: true,
        type: (q.type || 'MCQ').toUpperCase(),
        problemTitle: q.problemTitle || q.title || 'Imported Question',
        text: q.text || q.question || q.statement || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        marks: Number(q.marks) || 2,
        negativeMarks: Number(q.negativeMarks) || 0,
        difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
        language: q.language || 'Java',
        boilerplateCode: q.boilerplateCode || '',
        testCases: q.testCases || [],
        hiddenTestCases: q.hiddenTestCases || [],
        topicName: q.topicName || 'General',
        subjectName: q.subjectName || 'General',
        moduleName: q.moduleName || '',
        courseName: q.courseName || '',
        evaluationCriteria: q.evaluationCriteria || '',
        explanation: q.explanation || '',
        sampleInput: q.sampleInput || '',
        sampleOutput: q.sampleOutput || '',
        constraints: q.constraints || '',
        tags: q.tags || []
      });
      created.push(item);
    }

    res.json({
      success: true,
      count: created.length,
      message: `Successfully imported ${created.length} questions into Question Bank!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 10. Link Questions from Question Bank to an Assessment
async function linkQuestionsToAssessment(req, res) {
  try {
    const { id } = req.params;
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, message: 'Invalid question IDs array' });
    }

    const bankQuestions = await Question.findAll({ where: { id: questionIds } });
    const createdQuestions = [];

    for (const bq of bankQuestions) {
      const q = await Question.create({
        assessmentId: Number(id),
        collegeId: req.collegeId,
        type: bq.type,
        problemTitle: bq.problemTitle,
        text: bq.text,
        options: bq.options,
        correctAnswer: bq.correctAnswer,
        marks: bq.marks,
        negativeMarks: bq.negativeMarks,
        difficulty: bq.difficulty,
        language: bq.language,
        boilerplateCode: bq.boilerplateCode,
        testCases: bq.testCases,
        hiddenTestCases: bq.hiddenTestCases,
        topicName: bq.topicName,
        subjectName: bq.subjectName,
        moduleName: bq.moduleName,
        courseName: bq.courseName,
        evaluationCriteria: bq.evaluationCriteria,
        explanation: bq.explanation,
        sampleInput: bq.sampleInput,
        sampleOutput: bq.sampleOutput,
        constraints: bq.constraints,
        isBankQuestion: false
      });
      createdQuestions.push(q);
    }

    res.json({ success: true, message: `Added ${createdQuestions.length} questions to assessment!`, questions: createdQuestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 11. Assessment Attempts & Student Sessions
async function getAssessmentAttempts(req, res) {
  try {
    const collegeId = req.collegeId;
    const { assessmentId, status, search } = req.query;

    const where = {};
    if (assessmentId && assessmentId !== 'ALL' && assessmentId !== 'undefined') {
      where.assessmentId = Number(assessmentId);
    }
    if (status && status !== 'ALL' && status !== 'undefined') {
      where.status = status;
    }

    const submissions = await AssessmentSubmission.findAll({
      where,
      include: [
        {
          model: Assessment,
          as: 'assessment',
          where: { collegeId },
          attributes: ['id', 'title', 'assessmentCode', 'totalMarks', 'passingMarks', 'type']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'enrollmentNo', 'rollNo', 'email', 'phone', 'branchId', 'sectionId'],
          include: [{ model: Branch, as: 'branch', attributes: ['name', 'code'] }]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    let filtered = submissions;
    if (search) {
      const q = search.toLowerCase();
      filtered = submissions.filter(
        (s) =>
          s.student?.name?.toLowerCase().includes(q) ||
          s.student?.rollNo?.toLowerCase().includes(q) ||
          s.student?.enrollmentNo?.toLowerCase().includes(q) ||
          s.assessment?.title?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, attempts: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 12. Assessment Evaluation Panel
async function getAssessmentEvaluation(req, res) {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOne({
      where: { id, collegeId: req.collegeId },
      include: [
        { model: Question, as: 'questions' },
        {
          model: AssessmentSubmission,
          as: 'submissions',
          include: [
            { model: User, as: 'student', attributes: ['id', 'name', 'enrollmentNo', 'rollNo'] },
            {
              model: StudentAnswer,
              as: 'answers',
              include: [{ model: Question, as: 'question' }]
            }
          ]
        }
      ]
    });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.json({ success: true, evaluationData: assessment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 13. Evaluate Subjective Student Answer
async function evaluateStudentAnswer(req, res) {
  try {
    const { submissionId, questionId, marksAwarded, feedback, rubricScores } = req.body;

    let answer = await StudentAnswer.findOne({ where: { submissionId, questionId } });
    if (!answer) {
      answer = await StudentAnswer.create({
        submissionId,
        questionId,
        marksAwarded: marksAwarded || 0,
        evaluatorMarks: marksAwarded || 0,
        feedback: feedback || '',
        rubricScores: rubricScores || {},
        isCorrect: Number(marksAwarded) > 0
      });
    } else {
      await answer.update({
        marksAwarded,
        evaluatorMarks: marksAwarded,
        feedback: feedback || answer.feedback,
        rubricScores: rubricScores || answer.rubricScores,
        isCorrect: Number(marksAwarded) > 0
      });
    }

    // Recompute total score for submission
    const allAnswers = await StudentAnswer.findAll({ where: { submissionId } });
    const totalScore = allAnswers.reduce((sum, a) => sum + (parseFloat(a.marksAwarded) || 0), 0);

    const submission = await AssessmentSubmission.findByPk(submissionId, {
      include: [{ model: Assessment, as: 'assessment' }]
    });

    if (submission && submission.assessment) {
      const maxMarks = submission.assessment.totalMarks || 50;
      const percentage = Math.round((totalScore / maxMarks) * 100);
      await submission.update({
        totalScore,
        percentage,
        subjectiveScore: totalScore - (submission.mcqScore || 0) - (submission.codingScore || 0),
        status: 'EVALUATED'
      });
    }

    res.json({ success: true, message: 'Subjective answer evaluation saved!', answer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 14. Evaluate Coding Submission & Manual Adjustment
async function evaluateCodingSubmission(req, res) {
  try {
    const { submissionId, questionId, manualAdjustment, adjustmentReason, finalScore } = req.body;

    const answer = await StudentAnswer.findOne({ where: { submissionId, questionId } });
    if (answer) {
      await answer.update({
        manualAdjustment: manualAdjustment || 0,
        adjustmentReason: adjustmentReason || '',
        marksAwarded: finalScore !== undefined ? finalScore : (answer.marksAwarded || 0) + (manualAdjustment || 0),
        evaluatorMarks: finalScore !== undefined ? finalScore : (answer.marksAwarded || 0) + (manualAdjustment || 0)
      });
    }

    // Update submission score
    const submission = await AssessmentSubmission.findByPk(submissionId, {
      include: [{ model: Assessment, as: 'assessment' }]
    });

    if (submission) {
      const allAnswers = await StudentAnswer.findAll({ where: { submissionId } });
      const totalScore = allAnswers.reduce((sum, a) => sum + (parseFloat(a.marksAwarded) || 0), 0);
      const maxMarks = submission.assessment?.totalMarks || 50;
      const percentage = Math.round((totalScore / maxMarks) * 100);
      await submission.update({
        totalScore,
        percentage,
        status: 'EVALUATED'
      });
    }

    res.json({ success: true, message: 'Coding evaluation updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 15. Publish Results to Students
async function publishAssessmentResults(req, res) {
  try {
    const { id } = req.params;
    await AssessmentSubmission.update(
      { status: 'PUBLISHED' },
      { where: { assessmentId: id } }
    );
    await Assessment.update(
      { status: 'COMPLETED' },
      { where: { id, collegeId: req.collegeId } }
    );

    res.json({ success: true, message: 'Results published successfully to all students!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 16. Student-Wise Results & Scorecards
async function getStudentResults(req, res) {
  try {
    const collegeId = req.collegeId;
    const { assessmentId, passFailFilter, branchId, batch, search } = req.query;

    const where = {};
    if (assessmentId && assessmentId !== 'ALL' && assessmentId !== 'undefined') {
      where.assessmentId = Number(assessmentId);
    }

    const submissions = await AssessmentSubmission.findAll({
      where,
      include: [
        {
          model: Assessment,
          as: 'assessment',
          where: { collegeId }
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'enrollmentNo', 'rollNo', 'email', 'phone', 'branchId', 'sectionId'],
          include: [{ model: Branch, as: 'branch', attributes: ['name', 'code'] }]
        },
        {
          model: StudentAnswer,
          as: 'answers',
          include: [{ model: Question, as: 'question' }]
        }
      ],
      order: [['totalScore', 'DESC']]
    });

    let results = submissions.map((s, index) => {
      const plain = s.toJSON();
      const passing = s.assessment?.passingMarks || 20;
      plain.rank = index + 1;
      plain.isPass = Number(s.totalScore) >= passing;
      plain.statusText = plain.isPass ? 'PASS' : 'FAIL';
      return plain;
    });

    if (passFailFilter && passFailFilter !== 'ALL') {
      results = results.filter((r) => (passFailFilter === 'PASS' ? r.isPass : !r.isPass));
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.student?.name?.toLowerCase().includes(q) ||
          r.student?.rollNo?.toLowerCase().includes(q) ||
          r.student?.enrollmentNo?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 17. Batch-Wise Results Comparison
async function getBatchResults(req, res) {
  try {
    const batches = [
      {
        batchName: 'DSA-CSE-A-01',
        totalStudents: 50,
        attempted: 48,
        averageScore: 76.5,
        passCount: 42,
        failCount: 6,
        passPercentage: 87.5,
        attendanceRate: 88
      },
      {
        batchName: 'DSA-CSE-A-02',
        totalStudents: 48,
        attempted: 47,
        averageScore: 82.1,
        passCount: 44,
        failCount: 3,
        passPercentage: 93.6,
        attendanceRate: 91
      },
      {
        batchName: 'SYS-CSE-B-01',
        totalStudents: 45,
        attempted: 43,
        averageScore: 71.4,
        passCount: 36,
        failCount: 7,
        passPercentage: 83.7,
        attendanceRate: 84
      }
    ];

    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 18. Training-Wise Results Progression
async function getTrainingResults(req, res) {
  try {
    const trainingProgress = [
      { assessmentName: 'Test 1: Core Fundamentals', averagePercentage: 78, totalAttempts: 60, passRate: 85 },
      { assessmentName: 'Test 2: Linear Data Structures', averagePercentage: 82, totalAttempts: 59, passRate: 90 },
      { assessmentName: 'Mid-Term Comprehensive Exam', averagePercentage: 75, totalAttempts: 58, passRate: 82 },
      { assessmentName: 'Final Placement Mock Test', averagePercentage: 86, totalAttempts: 60, passRate: 94 }
    ];

    res.json({ success: true, trainingProgress });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 19. Performance Analysis & Weak Topics
async function getPerformanceAnalysis(req, res) {
  try {
    const topicMastery = [
      { topic: 'Arrays & Two Pointers', mastery: 92, status: 'STRONG', correctRate: 92, questions: 8 },
      { topic: 'Strings & Hash Tables', mastery: 86, status: 'STRONG', correctRate: 86, questions: 6 },
      { topic: 'Stack & Queue LIFO/FIFO', mastery: 78, status: 'AVERAGE', correctRate: 78, questions: 5 },
      { topic: 'Binary Trees & BST', mastery: 54, status: 'NEEDS_ATTENTION', correctRate: 54, questions: 5 },
      { topic: 'Graphs & DP Algorithms', mastery: 48, status: 'NEEDS_ATTENTION', correctRate: 48, questions: 4 }
    ];

    const difficultyStats = {
      easy: { total: 10, correctPercent: 89 },
      medium: { total: 10, correctPercent: 72 },
      hard: { total: 4, correctPercent: 46 }
    };

    const recommendations = [
      'Focus remedial mentor hours on Binary Tree Traversal and BST search properties.',
      'Practice 20 Tree problems + 10 Graph BFS/DFS problems before the final round.',
      'Schedule mock coding test on Dynamic Programming for at-risk cohorts.'
    ];

    res.json({ success: true, topicMastery, difficultyStats, recommendations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 20. Re-evaluation Ledger
async function getReevaluationLedger(req, res) {
  try {
    const collegeId = req.collegeId;
    const reevaluations = await AssessmentReevaluation.findAll({
      where: { collegeId },
      include: [
        { model: Assessment, as: 'assessment', attributes: ['id', 'title', 'assessmentCode'] },
        { model: User, as: 'student', attributes: ['id', 'name', 'enrollmentNo', 'rollNo'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, reevaluations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 21. Perform Re-evaluation
async function performReevaluation(req, res) {
  try {
    const collegeId = req.collegeId;
    const { submissionId, newMarks, reason, evaluatorName } = req.body;

    const submission = await AssessmentSubmission.findByPk(submissionId, {
      include: [{ model: Assessment, as: 'assessment' }]
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const oldMarks = submission.totalScore;
    const maxMarks = submission.assessment?.totalMarks || 50;
    const updatedPercentage = Math.round((Number(newMarks) / maxMarks) * 100);

    await submission.update({
      totalScore: newMarks,
      percentage: updatedPercentage,
      status: 'EVALUATED'
    });

    const record = await AssessmentReevaluation.create({
      collegeId,
      assessmentId: submission.assessmentId,
      studentId: submission.studentId,
      submissionId,
      oldMarks,
      newMarks,
      evaluatorName: evaluatorName || 'Admin Evaluator',
      reason: reason || 'Marks adjusted based on re-evaluation appeal.'
    });

    res.json({ success: true, message: 'Re-evaluation recorded and student score updated!', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 22. CSV Streaming Export
async function exportAssessmentCSV(req, res) {
  try {
    const { type, assessmentId } = req.query;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assessment_${type || 'export'}_${Date.now()}.csv"`);

    if (type === 'MCQ_TEMPLATE') {
      const csv = 'Question,Option A,Option B,Option C,Option D,Correct Answer,Marks,Negative Marks,Subject,Topic,Difficulty,Explanation\n' +
        '"Which data structure follows LIFO?","Queue","Stack","Tree","Graph","B",2,0.5,"DSA","Stack","Easy","Stack follows LIFO principle."\n' +
        '"Average time complexity of Binary Search?","O(N)","O(1)","O(log N)","O(N^2)","C",2,0.5,"DSA","Searching","Medium","Divides search space in half."\n';
      return res.send(csv);
    }

    if (type === 'SUBJECTIVE_TEMPLATE') {
      const csv = 'Question,Marks,Subject,Topic,Difficulty,Evaluation Criteria\n' +
        '"Explain Binary Search Tree properties","10","DSA","Trees","Medium","Definition 2M, Ordering Property 3M, Search Example 3M, Complexity 2M"\n';
      return res.send(csv);
    }

    if (type === 'CODING_TEMPLATE') {
      const csv = 'Problem Title,Statement,Input Format,Output Format,Constraints,Sample Input,Sample Output,Marks,Difficulty,Subject,Topic\n' +
        '"Find Maximum Element","Find max element in integer array","First line N, second line array elements","Single integer max","1 <= N <= 100000","5\\n10 20 5 40 30","40",10,"Easy","DSA","Arrays"\n';
      return res.send(csv);
    }

    // Default: Results Export
    const submissions = await AssessmentSubmission.findAll({
      where: assessmentId ? { assessmentId: Number(assessmentId) } : {},
      include: [
        { model: Assessment, as: 'assessment' },
        { model: User, as: 'student', attributes: ['name', 'rollNo', 'enrollmentNo'] }
      ]
    });

    let csvContent = 'Rank,Roll No,Student Name,Enrollment No,Assessment,Total Score,Percentage,Pass/Fail,Status,Submitted At\n';
    submissions.forEach((s, idx) => {
      const isPass = Number(s.totalScore) >= (s.assessment?.passingMarks || 20);
      csvContent += `${idx + 1},"${s.student?.rollNo || ''}","${s.student?.name || ''}","${s.student?.enrollmentNo || ''}","${s.assessment?.title || ''}",${s.totalScore},${s.percentage}%,${isPass ? 'PASS' : 'FAIL'},${s.status},"${s.submittedAt || ''}"\n`;
    });

    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 21. AI Question Generator with OpenAI and Covered Topics Support
async function generateAIQuestions(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      topic,
      coveredTopics,
      subjectName,
      count,
      type,
      difficulty,
      batchName,
      batchId,
      openaiApiKey,
      aiModel
    } = req.body;
    
    // Check either coveredTopics array or topic string
    const topicsArr = Array.isArray(coveredTopics) && coveredTopics.length > 0
      ? coveredTopics.filter(t => t && String(t).trim())
      : (topic && String(topic).trim() ? [String(topic).trim()] : []);

    if (topicsArr.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select or enter at least one covered topic.' });
    }

    // Determine API Key: passed in body, or saved in College settings, or process.env.OPENAI_API_KEY
    let effectiveKey = (openaiApiKey && String(openaiApiKey).trim()) || null;
    let defaultModel = aiModel || 'gpt-4o-mini';

    if (!effectiveKey && collegeId) {
      const college = await College.findByPk(collegeId, { attributes: ['settingsConfig'] });
      if (college && college.settingsConfig?.openaiApiKey) {
        effectiveKey = college.settingsConfig.openaiApiKey;
        defaultModel = aiModel || college.settingsConfig.defaultAiModel || 'gpt-4o-mini';
      }
    }

    if (!effectiveKey && process.env.OPENAI_API_KEY) {
      effectiveKey = process.env.OPENAI_API_KEY;
    }

    let result;
    if (effectiveKey) {
      result = await aiQuestionEngine.generateQuestionsWithOpenAI({
        apiKey: effectiveKey,
        model: defaultModel,
        coveredTopics: topicsArr,
        subjectName,
        count: Number(count) || 5,
        type: type || 'MCQ',
        difficulty: difficulty || 'MEDIUM',
        batchName
      });
    } else {
      result = await aiQuestionEngine.generateQuestions({
        topic: topicsArr.join(', '),
        coveredTopics: topicsArr,
        subjectName,
        count: Number(count) || 5,
        type: type || 'MCQ',
        difficulty: difficulty || 'MEDIUM',
        batchName
      });
      result.provider = 'BUILTIN_ENGINE';
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate AI questions' });
  }
}

// 21b. Topic Catalog for Subjects & Covered Topics
async function getTopicCatalog(req, res) {
  try {
    const catalog = aiQuestionEngine.TOPIC_CATALOG || [];
    res.json({ success: true, catalog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 21c. Fetch Daily Covered Topics for Batch / Training Syllabus
async function getDailyCoveredTopics(req, res) {
  try {
    const collegeId = req.collegeId;
    const { trainingId, dateScope = 'ALL', startDate, endDate } = req.query;

    const where = { collegeId, isDelivered: true };
    if (trainingId && trainingId !== 'ALL' && trainingId !== 'undefined') {
      where.trainingId = Number(trainingId);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateScope === 'TODAY') {
      where.deliveryDate = todayStr;
    } else if (dateScope === 'WEEK') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.deliveryDate = {
        [Op.gte]: sevenDaysAgo.toISOString().split('T')[0],
        [Op.lte]: todayStr
      };
    } else if (dateScope === 'CUSTOM' && (startDate || endDate)) {
      where.deliveryDate = {};
      if (startDate) where.deliveryDate[Op.gte] = startDate;
      if (endDate) where.deliveryDate[Op.lte] = endDate;
    }

    const deliveries = await DailyTopicDelivery.findAll({
      where,
      include: [
        { model: CourseTopic, as: 'topic', attributes: ['id', 'title', 'description'] },
        { model: Training, as: 'training', attributes: ['id', 'name'] }
      ],
      order: [['deliveryDate', 'DESC']]
    });

    let topics = [];
    deliveries.forEach(d => {
      const title = d.topic?.title;
      if (title && !topics.includes(title)) {
        topics.push(title);
      }
    });

    let trainingName = '';
    if (trainingId && trainingId !== 'ALL' && trainingId !== 'undefined') {
      const tr = await Training.findByPk(trainingId, { attributes: ['id', 'name'] });
      trainingName = tr?.name || '';
    }

    // Fallback: If no deliveries found for that training, fetch syllabus topics from Course/CourseTopic
    if (topics.length === 0 && trainingId && trainingId !== 'ALL' && trainingId !== 'undefined') {
      const course = await Course.findOne({
        where: { collegeId, trainingId: Number(trainingId) },
        include: [{
          model: CourseModule,
          as: 'modules',
          include: [{ model: CourseTopic, as: 'topics', attributes: ['id', 'title'] }]
        }]
      });

      if (course && course.modules) {
        course.modules.forEach(m => {
          if (m.topics) {
            m.topics.forEach(t => {
              if (t.title && !topics.includes(t.title)) {
                topics.push(t.title);
              }
            });
          }
        });
      }
    }

    // If still empty, provide standard foundational curriculum topics
    if (topics.length === 0) {
      topics = ['Binary Search Tree', 'Dynamic Programming', 'Graph Traversal', 'Sorting & Searching', 'Arrays & Strings'];
    }

    return res.json({
      success: true,
      trainingId: trainingId || null,
      trainingName,
      dateScope,
      deliveryCount: deliveries.length,
      topics,
      deliveries: deliveries.map(d => ({
        id: d.id,
        date: d.deliveryDate,
        topic: d.topic?.title || 'General Topic',
        trainingName: d.training?.name || '',
        notes: d.notes || ''
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 21d. Get College AI Settings (OpenAI key masked)
async function getAISettings(req, res) {
  try {
    const collegeId = req.collegeId;
    const college = await College.findByPk(collegeId, { attributes: ['id', 'settingsConfig'] });
    const cfg = college?.settingsConfig || {};
    const rawKey = cfg.openaiApiKey || process.env.OPENAI_API_KEY || '';
    const maskedKey = rawKey ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}` : '';

    res.json({
      success: true,
      hasConfiguredKey: Boolean(rawKey),
      maskedKey,
      defaultModel: cfg.defaultAiModel || 'gpt-4o-mini'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 21e. Save College AI Settings
async function saveAISettings(req, res) {
  try {
    const collegeId = req.collegeId;
    const { openaiApiKey, defaultModel } = req.body;

    const college = await College.findByPk(collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    const currentConfig = college.settingsConfig || {};
    if (openaiApiKey !== undefined) {
      currentConfig.openaiApiKey = openaiApiKey ? openaiApiKey.trim() : '';
    }
    if (defaultModel) {
      currentConfig.defaultAiModel = defaultModel;
    }

    college.settingsConfig = currentConfig;
    await college.save();

    res.json({
      success: true,
      message: 'AI Provider settings saved successfully!',
      hasConfiguredKey: Boolean(currentConfig.openaiApiKey),
      defaultModel: currentConfig.defaultAiModel || 'gpt-4o-mini'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// 22. One-Click AI Assessment Publish
async function aiCreateAndPublishAssessment(req, res) {
  try {
    const collegeId = req.collegeId;
    const {
      title,
      assessmentCode,
      description,
      type,
      subjectName,
      topicName,
      batchIds,
      programId,
      branchId,
      semesterId,
      academicYearId,
      trainingId,
      workshopId,
      durationMinutes,
      passingPercentage,
      negativeMarking,
      negativeMarks,
      randomizeQuestions,
      randomizeOptions,
      instructions,
      questions,
      saveToQuestionBank,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required.' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 question is required to publish.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const startTimeStr = `${hours}:${minutes}`;

    const dur = Number(durationMinutes) || 60;
    const endMinutesTotal = now.getHours() * 60 + now.getMinutes() + dur;
    const endHours = String(Math.floor(endMinutesTotal / 60) % 24).padStart(2, '0');
    const endMins = String(endMinutesTotal % 60).padStart(2, '0');
    const endTimeStr = `${endHours}:${endMins}`;

    let totalMarks = 0;
    questions.forEach(q => {
      totalMarks += Number(q.marks) || (q.type === 'CODING' ? 10 : q.type === 'THEORY' ? 5 : 2);
    });
    const passPct = Number(passingPercentage) || 40;
    const passingMarks = Math.max(1, Math.round((totalMarks * passPct) / 100));

    const assessmentStatus = status || 'PUBLISHED';

    const newAssessment = await Assessment.create({
      collegeId,
      title: title.trim(),
      assessmentCode: assessmentCode || `AI-${Date.now().toString().slice(-4)}`,
      description: description || `AI-generated assessment for ${topicName || subjectName || title}`,
      type: type || 'MCQ',
      assessmentFor: trainingId ? 'TRAINING' : workshopId ? 'WORKSHOP' : 'GENERAL',
      trainingId: trainingId ? Number(trainingId) : null,
      workshopId: workshopId ? Number(workshopId) : null,
      subjectName: subjectName || '',
      topicName: topicName || '',
      programId: programId ? Number(programId) : null,
      branchId: branchId ? Number(branchId) : null,
      semesterId: semesterId ? Number(semesterId) : null,
      academicYearId: academicYearId ? Number(academicYearId) : null,
      batchIds: batchIds || [],
      totalQuestions: questions.length,
      totalMarks,
      passingMarks,
      passingPercentage: passPct,
      durationMinutes: dur,
      startDate: todayStr,
      startTime: startTimeStr,
      endDate: todayStr,
      endTime: endTimeStr,
      maxAttempts: 1,
      negativeMarking: Boolean(negativeMarking),
      negativeMarks: Number(negativeMarks) || (negativeMarking ? 0.5 : 0),
      randomizeQuestions: randomizeQuestions !== undefined ? Boolean(randomizeQuestions) : true,
      randomizeOptions: randomizeOptions !== undefined ? Boolean(randomizeOptions) : true,
      showResultImmediately: false,
      allowedLanguages: ['Java', 'Python', 'C++', 'JavaScript'],
      instructions: instructions || 'Read every problem carefully. Complete all questions within the allotted duration.',
      status: assessmentStatus
    });

    // Create questions
    const createdQuestions = [];
    for (const q of questions) {
      const qRecord = await Question.create({
        assessmentId: newAssessment.id,
        collegeId,
        type: q.type || 'MCQ',
        problemTitle: q.problemTitle || `${newAssessment.title} Q`,
        text: q.text || q.question || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        marks: Number(q.marks) || (q.type === 'CODING' ? 10 : q.type === 'THEORY' ? 5 : 2),
        negativeMarks: Number(q.negativeMarks) || (negativeMarking ? 0.5 : 0),
        difficulty: q.difficulty || 'MEDIUM',
        language: q.language || 'Java',
        boilerplateCode: q.boilerplateCode || '',
        testCases: q.testCases || [],
        hiddenTestCases: q.hiddenTestCases || [],
        topicName: q.topicName || topicName || 'General',
        subjectName: q.subjectName || subjectName || '',
        evaluationCriteria: q.evaluationCriteria || '',
        explanation: q.explanation || '',
        isBankQuestion: false
      });
      createdQuestions.push(qRecord);

      if (saveToQuestionBank) {
        await Question.create({
          assessmentId: null,
          collegeId,
          type: q.type || 'MCQ',
          problemTitle: q.problemTitle || `${newAssessment.title} Q`,
          text: q.text || q.question || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          marks: Number(q.marks) || (q.type === 'CODING' ? 10 : q.type === 'THEORY' ? 5 : 2),
          negativeMarks: Number(q.negativeMarks) || 0,
          difficulty: q.difficulty || 'MEDIUM',
          language: q.language || 'Java',
          boilerplateCode: q.boilerplateCode || '',
          testCases: q.testCases || [],
          hiddenTestCases: q.hiddenTestCases || [],
          topicName: q.topicName || topicName || 'General',
          subjectName: q.subjectName || subjectName || '',
          evaluationCriteria: q.evaluationCriteria || '',
          explanation: q.explanation || '',
          isBankQuestion: true
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `AI Assessment "${newAssessment.title}" created with ${createdQuestions.length} questions and published live!`,
      assessment: newAssessment,
      questionCount: createdQuestions.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to publish AI assessment' });
  }
}

module.exports = {
  getAssessmentDashboard,
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  getQuestionBank,
  createQuestionBankItem,
  importQuestionsToBank,
  linkQuestionsToAssessment,
  getAssessmentAttempts,
  getAssessmentEvaluation,
  evaluateStudentAnswer,
  evaluateCodingSubmission,
  publishAssessmentResults,
  getStudentResults,
  getBatchResults,
  getTrainingResults,
  getPerformanceAnalysis,
  getReevaluationLedger,
  performReevaluation,
  exportAssessmentCSV,
  generateAIQuestions,
  aiCreateAndPublishAssessment,
  getTopicCatalog,
  getDailyCoveredTopics,
  getAISettings,
  saveAISettings
};
