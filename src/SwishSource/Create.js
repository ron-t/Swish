const async = require('async');
const fs = require('fs');
const path = require('path');
const util = require('./util.js');
const RestClient = require('node-rest-client').Client;

const resourcesPath = 'inOutFiles';

const COURSE_ID = 42544; // Obtain from Canvas
const DOMAIN = 'https://auckland.beta.instructure.com:443';
const TOKEN = '6199~l9c6dag1OYrpesZDql4yII3gY5ipJwI6y2IfjNDyO7AGOxkoGKPlHwM96I1t1u78'; // Obtain from Canvas

/** Sample setup parameters for a sample "Files" assignment
/********************************************************** */
let QA_FILE = 'SampleFilesQA.json';

const ASSIGNMENT_TITLE = 'Files Assignment Q1-Q5';
const STARTING_Q_NUMBER = 1;

const NUMBER_OF_ATTEMPTS = 3;

const LOCK_DATE = (new Date('2019/12/31 23:59:59')).toISOString(); // End of 2019 for this example.
const TOTAL_MARKS_PER_QUIZ = 50;
const NUMBER_OF_QUESTIONS_PER_QUIZ = 5;
const MARKS_PER_QUESTION = TOTAL_MARKS_PER_QUIZ / NUMBER_OF_QUESTIONS_PER_QUIZ;

/** ************************************************************* */

util.init(TOKEN);

const client = new RestClient();
const quizIds = ['assignmentId|quizId|canvasStudentId'];
/**
 * API call to get list of students' CanvasId and AUID
 * Read from .json file a list of students (by AUID) and for each student:
 *    Create quiz
 *    Add questions (read from .json file)
 *    Add override
 */

// Load student questions and answers
QA_FILE = path.join(resourcesPath, QA_FILE);
const studentsQA = util.loadStudentQaFile(QA_FILE);

// Check and proceed only if:
//  - every question has an answer and the answer is truthy or 0
//  - every student has a non-blank description
const truthyCheckResult = util.checkTruthy(studentsQA);
if (truthyCheckResult.errors) {
  console.error(`
Errors found in QA file:
${truthyCheckResult.errors}
`);
  process.exit();
}

// Get Canvas student ids
getCanvasUserIds(`${DOMAIN}/api/v1/courses/${COURSE_ID}/users?enrollment_type[]=student&per_page=100`);
// When getUsers finishes recursing it calls createQuizzes().

function createQuizzes() {
  // Remove students who don't exist on Canvas:
  // Filter objects which have the auid property, then map to an array of those auid values.
  const auids = [];
  Object.keys(studentsQA).forEach((k) => {
    if (studentsQA[k].auid) {
      auids.push(studentsQA[k].auid);
    } else {
      console.log(`skipped ${k} | in studentsQA file but not in Canvas`);
    }
  });

  const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes`;

  async.eachSeries(auids, (auid, studentDone) => {
    const title = `${ASSIGNMENT_TITLE} for ${auid}`;

    const { description } = studentsQA[auid];

    const quizArgs = util.newQuizArgs(title, description, TOTAL_MARKS_PER_QUIZ, NUMBER_OF_ATTEMPTS);

    console.log(`Creating ${ASSIGNMENT_TITLE} for ${auid}`);

    client.post(url, quizArgs, (data, response) => {
      if (response.statusCode !== 200) return;

      const quizId = data.id;
      const assignmentId = data.assignment_id;
      const canvasStudentId = studentsQA[auid].id;

      quizIds.push(`${assignmentId}|${quizId}|${canvasStudentId}`);

      async.series([
        (questionsAdded) => {
          addQuestions(quizId, auid, questionsAdded);
          // questionsAdded is called from inside addQuestions()
        },
        (overridesAdded) => {
          const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/assignments/${assignmentId}/overrides`;
          const overrideArgs = util.newOverrideArgs(LOCK_DATE, canvasStudentId);
          client.post(url, overrideArgs, (data, response) => {
            if (response.statusCode === 201) {
              overridesAdded();
            } else {
              console.log(`Override failed for canvasStudentId ${canvasStudentId} (assignmentId ${assignmentId}) Result: ${response.statusCode} : ${response.statusMessage}`);
            }
          });
        },
        (quizPublished) => {
          const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes/${quizId}`;
          client.put(url, util.newPublishQuizArgs(), (data, response) => {
            quizPublished();
          });
        }
      ], () => { // one quiz done
        studentDone();
      });
    });
  }, () => { // all students done
    const outFile = path.join(resourcesPath, util.generateIdOutputFileName(QA_FILE, ASSIGNMENT_TITLE));
    fs.writeFileSync(outFile, quizIds);
    console.log('All done.');
    process.exit();
  });
}

function addQuestions(quizId, auid, done) {
  const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes/${quizId}/questions`;
  const tasks = [];

  // i is the question number
  for (let i = STARTING_Q_NUMBER; i <= (STARTING_Q_NUMBER - 1) + NUMBER_OF_QUESTIONS_PER_QUIZ; i++) {
    tasks.push((questionDone) => {
      const args = util.newQuestionArgs(i, // position
        `${i}`, // name
        MARKS_PER_QUESTION,
        studentsQA[auid][`q${i}q`].replace(/\n/g, '<br/>'),
        studentsQA[auid][`q${i}a`]);
      client.post(url, args, (data, response) => {
        questionDone();
      });
    });
  }

  async.series(tasks,
    () => done());
}

function getCanvasUserIds(url) {
  client.get(url, util.standardArgs(), (data, response) => {
    if (data.errors) { // May want to check for response.statusCode and response.statusMessage too
      data.errors.forEach(e => console.error(e.message));
      return;
    }

    // save users
    data.forEach((s) => {
      if (studentsQA[s.sis_user_id]) {
        studentsQA[s.sis_user_id].id = s.id;
        studentsQA[s.sis_user_id].auid = s.sis_user_id;
      } else {
        console.log(`skipped ${s.sortable_name} | ${s.id} ${s.sis_user_id} ${s.sis_login_id} | in Canvas but not in studentsQA file`);
      }
    });

    // process next url
    const nextUrl = util.nextURL(response.headers.link);
    if (nextUrl) {
      getCanvasUserIds(nextUrl);
    } else {
      // No more users
      createQuizzes();
    }
  });
}
