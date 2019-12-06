'use strict'

let init = false
let auth
const initErrMsg = `util.js has not been initiated with a valid Canvas API access token
Call init(token) first.`

const fs = require('fs')
const path = require('path')
const EOL = require('os').EOL // use Windows EOL

exports.init = (token) => {
  auth = `Bearer ${token}`
  init = true
}

function getStandardHeader () {
  if (!init) {
    throw Error(initErrMsg)
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': auth
  }
}

exports.nextURL = linkText => {
  var url = null
  if (linkText) {
    var links = linkText.split(',')
    var nextRegEx = new RegExp('^<(.*)>; rel="next"$')
    for (var i = 0; i < links.length; i++) {
      var matches = nextRegEx.exec(links[i])
      if (matches) {
        url = matches[1]
      }
    }
  }
  return url
}

exports.standardArgs = () => {
  return { headers: getStandardHeader() }
}

exports.newReportArgs = () => {
  return {
    headers: getStandardHeader(),
    data: {
      include: 'file',
      quiz_report: {
        includes_all_versions: true,
        report_type: 'student_analysis'
      }
    }
  }
}

exports.newQuizArgs = (title, description, pointsPossible, numberOfAttempts) => {
  return {
    headers: getStandardHeader(),
    data: {
      quiz: {
        title: `${title}`,
        description: `${description}`,
        type: 'assignment',
        points_possible: `${pointsPossible}`,
        scoring_policy: 'keep_highest',
        show_correct_answers: false,
        allowed_attempts: `${numberOfAttempts}`,
        published: false,
        only_visible_to_overrides: true
      }
    }
  }
}

exports.editQuizArgs = (quizObject) => {
  return {
    headers: getStandardHeader(),
    data: {
      quiz: quizObject
    }
  }
}

exports.saveQuizArgs = (id) => {
  return {
    headers: getStandardHeader(),
    data: {
      quizzes: [id]
    }
  }
}

exports.newQuestionArgs = (position, questionName, pointsPossible, q, a) => {
  return {
    headers: getStandardHeader(),
    data: {
      question: {
        position: position,
        name: questionName,
        question_type: 'short_answer_question',
        question_text: `<p>${q}</p>`,
        points_possible: `${pointsPossible}`,
        answers: [ {
          answer_text: `${a}`,
          answer_weight: 100
        } ]
      }
    }
  }
}

exports.editQuestionArgs = (questionObject) => {
  return {
    headers: getStandardHeader(),
    data: {
      question: questionObject
    }
  }
}

exports.newOverrideArgs = (lockDate, studentId) => {
  return {
    headers: getStandardHeader(),
    data: {
      assignment_override: {
        lock_at: `${lockDate}`,
        student_ids: [studentId]
      }
    }
  }
}

exports.newPublishQuizArgs = () => {
  return {
    headers: getStandardHeader(),
    data: {
      quiz: {
        published: true,
        notify_of_update: false
      }
    }
  }
}

exports.loadStudentQaFile = (file) => {
  return JSON.parse(
    fs.readFileSync(file).toString()
  )
}

const header = {
  fileid: 0,
  fileName: 1,
  url: 2,
  auid: 3
}
// csv header: fileid,fileName,url,auid
//             0      1        2   3
const auidRE = /\d{7,9}/
exports.loadStudentFilesUrls = (file) => {
  const students = {}
  fs.readFileSync(file)
    .toString()
    .split(EOL) // usually generated on windows (so split on \r\n)
    .forEach(line => {
      const row = line.split(',')
      const auid = row[header.auid]
      if (!auidRE.test(auid)) {
        return
      }

      const fileName = row[header.fileName]
      const url = row[header.url]
      students[auid] = {
        fileName: fileName,
        fileUrl: url
      }
    })

  return students
}

exports.generateIdOutputFileName = (fileName, assignmentName) => {
  return `${path.basename(fileName, '.json')}-${assignmentName}-quizIds.txt`
}

/**
 * @param {object} QaObject
 * @return {object}
 */
exports.checkTruthy = (QaObject) => {
  const qRE = /q$/
  const answerDescRE = /(\da|description)$/

  const result = {}

  for (let auid in QaObject) {
    // check QA values
    for (var key in QaObject[auid]) {
      // for each "q" make sure a matching "a" exists and is truthy or 0.
      if (qRE.test(key)) {
        const aKey = key.replace(/.$/, 'a') // replace last letter ('q') with an 'a'
        const aVal = QaObject[auid][aKey]

        if (!aVal && aVal !== 0) {
          addError(result, `${auid}-${aKey}: ${QaObject[auid][aKey]}`)
        }
      } else if (!answerDescRE.test(key)) {
        // if it's also not an "a" or "description" field then it's not a valid property.
        console.log(`${auid} :: invalid field found: ${key}`)
      }
    }

    // Check each student has a non-empty description.
    if (!QaObject[auid].description) {
      addError(result, `${auid}: missing or empty description`)
    }
  }

  return result
}

function addError (resultObject, msg) {
  if (!resultObject.errors) {
    resultObject.errors = []
  }

  resultObject.errors.push(msg)
}
