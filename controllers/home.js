/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  res.render('home', {
    title: 'Home'
  })
}

exports.sup = (req, res) => {
  console.log(req.body.domain)
  console.log(`req body       =======================`)
  console.log(req.body)
  console.log(`uploaded file  =======================`)
  if (req.file !== undefined || req.file) {
    console.log(req.file.originalname)
  }
  console.log(`               =======================`)

  const formData = {
    title: 'Quiz setup inputs',
    token: req.body.token,
    domain: req.body.domain,
    course_id: req.body.course_id,
    assignmentTitle: req.body.assignmentTitle,
    totalMarks: req.body.totalMarks,
    numQuestions: req.body.numQuestions,
    lock: req.body.lock,
    attempts: req.body.attempts,
    // can't "reset" the Q&A file value
    errthing: JSON.stringify(req.body, null, 2) +
      '\n Q&A File \n' +
      JSON.stringify(req.file, null, 2)
  }

  res.render('sup', formData)
}
