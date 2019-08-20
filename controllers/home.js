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
  console.log(req.body);
  const s = new SwishSource();
  console.log(s);
  // const validationErrors = [];
  // if (validator.isEmpty(req.body.name)) validationErrors.push({ msg: 'Please enter your name' });
  // if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
  // if (validator.isEmpty(req.body.message)) validationErrors.push({ msg: 'Please enter your message.' });

  // if (validationErrors.length) {
  //   req.flash('errors', validationErrors);
  //   return res.redirect('/');
  // }
  // return res.redirect('/');
}