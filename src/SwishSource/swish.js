const async = require('async');
const fs = require('fs');
const path = require('path');
const RestClient = require('node-rest-client').Client;
const util = require('./util.js');

// Default (invalid) settings
const DefaultSettings = {
  resourcesPath: 'inOutFiles',
  COURSE_ID: 99999,
  DOMAIN: 'https://auckland.beta.instructure.com:443',
  TOKEN: 'xxxxx',
  QA_FILE: '',
  ASSIGNMENT_TITLE: 'Files Assignment Q1-Q5',
  STARTING_Q_NUMBER: 1,
  NUMBER_OF_ATTEMPTS: 3,
  LOCK_DATE: (new Date('2019/12/31 23:59:59')).toISOString(),
  TOTAL_MARKS_PER_QUIZ: 50,
  NUMBER_OF_QUESTIONS_PER_QUIZ: 5,
  MARKS_PER_QUESTION: this.TOTAL_MARKS_PER_QUIZ / this.NUMBER_OF_QUESTIONS_PER_QUIZ,
  studentsQA: {}
};

function defaultHandler(p, msg, err = '') {
  if (err !== '') {
    console.error(`Error: ${err}`);
    return;
  }
  console.log(`Progress: ${p}%`);
  console.log(`Message: ${msg}`);
}

const SwishSource = class {
  constructor(options = {}) {
    this.settings = {};
    Object.assign(this.settings, DefaultSettings, options);
    this.quizIds = ['assignmentId|quizId|canvasStudentId'];
    util.init(this.settings.TOKEN);
    this.client = new RestClient();
  }

  start(handler = defaultHandler) {
    this.handler = handler;
    this.progress = 0.00;
    /**
         * API call to get list of students' CanvasId and AUID
         * Read from .json file a list of students (by AUID) and for each student:
         *    Create quiz
         *    Add questions (read from .json file or as object given)
         *    Add override
         */
    // Load student questions and answers
    if (this.settings.studentsQA === {}) {
      this.handler(this.progress += 0.01, 'Loading studentsQA from disk');
      this.settings.QA_FILE = path.join(this.settings.resourcesPath, this.settings.QA_FILE);
      this.settings.studentsQA = util.loadStudentQaFile(this.settings.QA_FILE);
    }
    this.handler(this.progress += 10, 'Started Processing.');

    // Check and proceed only if:
    //  - every question has an answer and the answer is truthy or 0
    //  - every student has a non-blank description
    const truthyCheckResult = util.checkTruthy(this.settings.studentsQA);
    if (truthyCheckResult.errors) {
      const ef = truthyCheckResult.errors.map(e => ` - ${e}`).join('\n');
      this.handler(100, '', `\nErrors found in QA file:\n${ef}`);
      return;
    }

    // Get Canvas student ids
    this.getCanvasUserIds(`${this.settings.DOMAIN}/api/v1/courses/${this.settings.COURSE_ID}/users?enrollment_type[]=student&per_page=100`);
    // When getUsers finishes recursing it calls createQuizzes().
  }

  // When getUsers finishes recursing it calls createQuizzes().
  createQuizzes() {
    // Remove students who don't exist on Canvas:
    // Filter objects which have the auid property, then map to an array of those auid values.
    const auids = [];
    let skipped = 0;
    Object.keys(this.settings.studentsQA).forEach((k) => {
      if (this.settings.studentsQA[k].auid) {
        auids.push(this.settings.studentsQA[k].auid);
      } else {
        const progremain = Math.max(100 - this.progress - 10, 0);
        this.handler(this.progress += progremain / (Object.keys(this.settings.studentsQA).length - auids.length - skipped), `skipped ${k} | in studentsQA file but not in Canvas`);
        skipped++;
      }
    });

    const url = `${this.settings.DOMAIN}/api/v1/courses/${this.settings.COURSE_ID}/quizzes`;

    async.eachSeries(auids, (auid, studentDone) => {
      const title = `${this.settings.ASSIGNMENT_TITLE} for ${auid}`;

      const { description } = this.settings.studentsQA[auid];

      const quizArgs = util.newQuizArgs(title, description, this.settings.TOTAL_MARKS_PER_QUIZ, this.settings.NUMBER_OF_ATTEMPTS);

      this.handler(this.progress += 10, `Creating ${this.settings.ASSIGNMENT_TITLE} for ${auid}`);

      this.client.post(url, quizArgs, (data, response) => {
        if (response.statusCode !== 200) return;

        const quizId = data.id;
        const assignmentId = data.assignment_id;
        const canvasStudentId = this.settings.studentsQA[auid].id;

        this.quizIds.push(`${assignmentId}|${quizId}|${canvasStudentId}`);

        async.series([
          (questionsAdded) => {
            this.addQuestions(quizId, auid, questionsAdded);
            // questionsAdded is called from inside addQuestions()
          },
          (overridesAdded) => {
            const url = `${this.settings.DOMAIN}/api/v1/courses/${this.settings.COURSE_ID}/assignments/${assignmentId}/overrides`;
            const overrideArgs = util.newOverrideArgs(this.settings.LOCK_DATE, canvasStudentId);
            this.client.post(url, overrideArgs, (data, response) => {
              if (response.statusCode === 201) {
                overridesAdded();
              } else {
                this.handler(this.progress += 1, `Override failed for canvasStudentId ${canvasStudentId} (assignmentId ${assignmentId}) Result: ${response.statusCode} : ${response.statusMessage}`);
              }
            });
          },
          (quizPublished) => {
            const url = `${this.settings.DOMAIN}/api/v1/courses/${this.settings.COURSE_ID}/quizzes/${quizId}`;
            this.client.put(url, util.newPublishQuizArgs(), (data, response) => {
              quizPublished();
            });
          }
        ], () => { // one quiz done
          studentDone();
        });
      });
    }, () => { // all students done
      const outFile = path.join(this.settings.resourcesPath, util.generateIdOutputFileName(this.settings.QA_FILE, this.settings.ASSIGNMENT_TITLE));
      // fs.writeFileSync(outFile, this.quizIds);
      this.handler(this.progress = 100, 'All done.');
    });
  }

  addQuestions(quizId, auid, done) {
    const url = `${this.settings.DOMAIN}/api/v1/courses/${this.settings.COURSE_ID}/quizzes/${quizId}/questions`;
    const tasks = [];

    // i is the question number
    for (let i = this.settings.STARTING_Q_NUMBER; i <= (this.settings.STARTING_Q_NUMBER - 1) + this.settings.NUMBER_OF_QUESTIONS_PER_QUIZ; i++) {
      tasks.push((questionDone) => {
        // eslint-disable-next-line function-paren-newline
        const args = util.newQuestionArgs(
          i, // position
          `${i}`, // name
          this.settings.MARKS_PER_QUESTION,
          this.settings.studentsQA[auid][`q${i}q`].replace(/\n/g, '<br/>'),
          this.settings.studentsQA[auid][`q${i}a`]
          // eslint-disable-next-line function-paren-newline
        );
        this.client.post(url, args, (data, response) => {
          questionDone();
        });
      });
    }

    async.series(tasks,
      () => done());
  }

  getCanvasUserIds(url) {
    this.client.get(url, util.standardArgs(), (data, response) => {
      if (data.errors) { // May want to check for response.statusCode and response.statusMessage too
        data.errors.forEach(e => this.handler(100, '', e.message));
        return;
      }

      // save users
      data.forEach((s) => {
        if (this.settings.studentsQA[s.sis_user_id]) {
          this.settings.studentsQA[s.sis_user_id].id = s.id;
          this.settings.studentsQA[s.sis_user_id].auid = s.sis_user_id;
        } else {
          this.handler(this.progress += 0.01, `Skipped ${s.sortable_name} | ${s.id} ${s.sis_user_id} ${s.sis_login_id} | in Canvas but not in studentsQA file`);
        }
      });

      // process next url
      const nextUrl = util.nextURL(response.headers.link);
      if (nextUrl) {
        this.getCanvasUserIds(nextUrl);
      } else {
        // No more users
        this.createQuizzes();
      }
    });
  }
};

module.exports = SwishSource;

// Testing
if (require.main === module) {
  console.log('called directly.. Running test!');
  const x = new SwishSource();
  x.start();
}
