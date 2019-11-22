const validator = require('validator');
const moment = require('moment');
const SwishSource = require('../SwishSource');
/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  res.render('home', {
    title: 'Home'
  });
};

/**
 * GET /privacy/
 * Home page.
 */
exports.privacy = (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy'
  });
};

/**
 * POST /upload
 * Upload a file and begin processing.
 */
exports.postUpload = (req, res) => {
  res.status(200);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/plain');
  console.dir(res);
  const validationErrors = [];
  const domains = ['https://auckland.instructure.com:443', 'https://auckland.beta.instructure.com:443', 'https://auckland.test.instructure.com:443'];
  if (!validator.isInt(req.body.COURSE_ID)) validationErrors.push({ msg: 'Please enter a valid (numeric) Course ID.' });
  if (!validator.isInt(req.body.DOMAIN, { min: 0, max: domains.length - 1 })) validationErrors.push({ msg: 'Please enter a valid domain.' });
  if (!validator.isLength(req.body.ASSIGNMENT_TITLE, { min: 0, max: 254 })) validationErrors.push({ msg: 'Your assignment title prefix is too long (more than 254 characters)' });
  if (validator.isEmpty(req.body.TOKEN)) validationErrors.push({ msg: 'Please enter a valid token.' });
  if (validator.isEmpty(req.body.filedata)) validationErrors.push({ msg: 'The file you uploaded did not contain valid data.' });
  if (!moment(req.body.LOCK_DATE, 'DD/MM/YYYY hh:mm a', true).isValid()) validationErrors.push({ msg: 'Please enter a valid date in the format "DD/MM/YYYY hh:mm a".' });
  if (validator.isEmpty(req.body.TOTAL_MARKS_PER_QUIZ)) validationErrors.push({ msg: 'You must give the total marks per quiz.' });
  if (!validator.isInt(req.body.NUMBER_OF_QUESTIONS_PER_QUIZ)) validationErrors.push({ msg: 'You must give the number of questions per quiz.' });

  if (validationErrors.length) {
    res.write(`There was an issue with the settings you chose: \n${validationErrors.map(a => a.msg).join('\n')}\n`);
    res.end('Finished.');
    return;
  }
  const s = new SwishSource({
    COURSE_ID: req.body.COURSE_ID,
    DOMAIN: domains[parseInt(req.body.DOMAIN, 10)],
    TOKEN: req.body.TOKEN,
    studentsQA: JSON.parse(req.body.filedata),
    ASSIGNMENT_TITLE: req.body.ASSIGNMENT_TITLE,
    NUMBER_OF_ATTEMPTS: req.body.NUMBER_OF_ATTEMPTS !== '' ? req.body.NUMBER_OF_ATTEMPTS : 0,
    LOCK_DATE: moment(req.body.LOCK_DATE, 'DD/MM/YYYY hh:mm a', true).format(),
    TOTAL_MARKS_PER_QUIZ: req.body.TOTAL_MARKS_PER_QUIZ,
    NUMBER_OF_QUESTIONS_PER_QUIZ: req.body.NUMBER_OF_QUESTIONS_PER_QUIZ,
    MARKS_PER_QUESTION: req.body.TOTAL_MARKS_PER_QUIZ / req.body.NUMBER_OF_QUESTIONS_PER_QUIZ
  });

  function resHandler(p, msg, err = '') {
    if (err !== '') {
      console.error(`Error: ${err}`);
      res.write(`Error: ${err}\n`);
      return;
    }
    res.write(`${p.toFixed(2)}%: ${msg}\n`);
    if (p >= 100) { res.end('Finished.'); }
  }
  s.start(resHandler);
};
