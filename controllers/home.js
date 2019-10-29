const validator = require('validator');
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
 * POST /upload
 * Upload a file and begin processing.
 */
exports.postUpload = (req, res) => {
  res.status(200);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/plain');
  console.dir(res);
  const validationErrors = [];
  const domains = ['https://auckland.instructure.com:443', 'https://auckland.beta.instructure.com:443'];
  if (validator.isEmpty(req.body.COURSE_ID)) validationErrors.push({ msg: 'Please enter your Course ID.' });
  if (validator.isInt(req.body.DOMAIN, { min: 0, max: domains.length - 1 })) validationErrors.push({ msg: 'Please enter a valid domain.' });
  if (validator.isEmpty(req.body.TOKEN)) validationErrors.push({ msg: 'Please enter a valid token.' });
  if (validator.isEmpty(req.body.filedata)) validationErrors.push({ msg: 'The file you uploaded did not contain valid data.' });
  if (validator.isEmpty(req.body.LOCK_DATE)) validationErrors.push({ msg: 'You must choose a date to lock the assignment on.' });
  if (validator.isEmpty(req.body.TOTAL_MARKS_PER_QUIZ)) validationErrors.push({ msg: 'You must give the total marks per quiz.' });
  if (validator.isEmpty(req.body.NUMBER_OF_QUESTIONS_PER_QUIZ)) validationErrors.push({ msg: 'You must give the number of questions per quiz.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    res.end({ error: 'something blew up' });
  }
  console.log(req.body.filedata);
  const s = new SwishSource({
    COURSE_ID: req.body.COURSE_ID,
    DOMAIN: domains[parseInt(req.body.DOMAIN, 10)],
    TOKEN: req.body.TOKEN,
    studentsQA: JSON.parse(req.body.filedata),
    ASSIGNMENT_TITLE: req.body.ASSIGNMENT_TITLE,
    NUMBER_OF_ATTEMPTS: req.body.NUMBER_OF_ATTEMPTS !== '' ? req.body.NUMBER_OF_ATTEMPTS : 0,
    LOCK_DATE: (new Date('2019/12/31 23:59:59')).toISOString(),
    TOTAL_MARKS_PER_QUIZ: req.body.TOTAL_MARKS_PER_QUIZ,
    NUMBER_OF_QUESTIONS_PER_QUIZ: req.body.NUMBER_OF_QUESTIONS_PER_QUIZ,
    MARKS_PER_QUESTION: req.body.TOTAL_MARKS_PER_QUIZ / req.body.NUMBER_OF_QUESTIONS_PER_QUIZ
  });
  console.log(s);

  function resHandler(p, msg, err = '') {
    console.log(res, err);
    if (err !== '') {
      console.error(`Error: ${err}`);
      res.write(`Error: ${err}\n`);
      return;
    }
    res.write(`${p.toFixed(2)}%: ${msg}\n`);
    console.log(`Progress: ${p.toFixed(2)}%`);
    console.log(`Message: ${msg}`);
    if (p >= 100) { res.end('Finished.'); }
  }
  s.start(resHandler);
};
