const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const { User, Question, Section, Branch, Semester } = require('../models');

// Parse and import Students from Excel/CSV
async function importStudentsFromExcel(buffer, collegeId, defaultBranchId, defaultSemesterId, defaultSectionId) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  let totalRecords = rows.length;
  let imported = 0;
  let failed = 0;
  let duplicate = 0;
  let invalid = 0;
  const errorDetails = [];

  const defaultPassword = await bcrypt.hash('student123', 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // considering 1-based index + header

    // Map fields flexibly (case insensitive keys)
    const name = row['Name'] || row['name'] || row['Student Name'];
    const email = (row['Email'] || row['email'] || '').trim().toLowerCase();
    const enrollment = row['Enrollment'] || row['Enrollment No'] || row['enrollmentNo'] || '';
    const rollNo = row['Roll No'] || row['rollNo'] || row['Roll'] || '';
    const mobile = row['Mobile'] || row['mobile'] || '';
    const parentName = row['Parent Name'] || row['parentName'] || '';
    const parentMobile = row['Parent Mobile'] || row['parentMobile'] || '';

    // Validation
    if (!name || !email) {
      invalid++;
      failed++;
      errorDetails.push({ row: rowNum, name: name || 'N/A', email: email || 'N/A', reason: 'Missing Name or Email' });
      continue;
    }

    // Check duplicate email or enrollment in college
    const existing = await User.findOne({
      where: {
        collegeId,
        email
      }
    });

    if (existing) {
      duplicate++;
      failed++;
      errorDetails.push({ row: rowNum, name, email, reason: 'Duplicate email address in college' });
      continue;
    }

    try {
      await User.create({
        collegeId,
        name,
        email,
        password: defaultPassword,
        phone: String(mobile),
        role: 'STUDENT',
        enrollmentNo: String(enrollment),
        rollNo: String(rollNo),
        parentName: String(parentName),
        parentMobile: String(parentMobile),
        branchId: defaultBranchId || null,
        semesterId: defaultSemesterId || null,
        sectionId: defaultSectionId || null,
        isActive: true
      });
      imported++;
    } catch (err) {
      failed++;
      errorDetails.push({ row: rowNum, name, email, reason: err.message });
    }
  }

  return {
    totalRecords,
    imported,
    failed,
    duplicate,
    invalid,
    errorDetails
  };
}

// Parse and import Questions from Excel/CSV
async function importQuestionsFromExcel(buffer, assessmentId) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  let totalRecords = rows.length;
  let imported = 0;
  let failed = 0;
  const errorDetails = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const questionText = row['Question'] || row['question'] || row['Question Text'];
    const optA = row['Option A'] || row['optionA'] || row['A'];
    const optB = row['Option B'] || row['optionB'] || row['B'];
    const optC = row['Option C'] || row['optionC'] || row['C'];
    const optD = row['Option D'] || row['optionD'] || row['D'];
    const correct = row['Correct Answer'] || row['correctAnswer'] || row['Answer'] || '';
    const marks = parseInt(row['Marks'] || row['marks'] || 1, 10);
    const difficulty = (row['Difficulty'] || 'MEDIUM').toUpperCase();
    const type = (row['Type'] || 'MCQ').toUpperCase();
    const topic = row['Topic'] || row['topic'] || 'General';

    if (!questionText) {
      failed++;
      errorDetails.push({ row: rowNum, reason: 'Empty question text' });
      continue;
    }

    try {
      const options = (optA || optB || optC || optD) ? [optA, optB, optC, optD].filter(Boolean) : [];
      await Question.create({
        assessmentId,
        type: ['MCQ', 'THEORY', 'CODING'].includes(type) ? type : 'MCQ',
        text: questionText,
        options,
        correctAnswer: String(correct),
        marks: isNaN(marks) ? 1 : marks,
        difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM',
        topicName: topic
      });
      imported++;
    } catch (err) {
      failed++;
      errorDetails.push({ row: rowNum, reason: err.message });
    }
  }

  return {
    totalRecords,
    imported,
    failed,
    errorDetails
  };
}

module.exports = {
  importStudentsFromExcel,
  importQuestionsFromExcel
};
