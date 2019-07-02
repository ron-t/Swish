'use strict'

const SEARCH_TERM = 'SQL Assignment'

const ASSIGNMENT_NAME_STARTSWITH = [
  'Files Assignment Q1-',
  'Files Assignment Q6-'
]
const TO_IGNORE = [
  '',
  ''
]

const OUT_PATH = 'reports'
const FILE_PATTERN = /([\w ]+ Q\d+-Q?\d+.*) for (\d+) Quiz/

const COURSE_ID = 00000 // Obtain from Canvas
const DOMAIN = 'https://auckland.instructure.com:443'
const TOKEN = 'xxxxx' // Obtain from Canvas

const _ = require('lodash')
const async = require('async')
const csvParse = require('csv-parse/lib/sync')
const datetime = require('node-datetime')
const download = require('download')
const fs = require('fs')
const path = require('path')
const util = require('./util.js')

util.init(TOKEN)

const client = new (require('node-rest-client').Client)()
let quizList = []
let retriesList = []
let retryCount = 0

getMatchingQuizIds(`${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes?&search_term=${SEARCH_TERM}&per_page=100`)
// When getMatchingQuizIds finishes recursing it calls generateReports()

function getMatchingQuizIds (url) {
  console.log(`Getting quiz ids for titles matching "${SEARCH_TERM}" + filtering on ASSIGNMENT_NAME_STARTSWITH and TO_IGNORE`)
  client.get(url, util.standardArgs(), (data, response) => {
    // add assignmentIds to list of ids to process
    data.forEach(q => {
      const startsWith = _.some(ASSIGNMENT_NAME_STARTSWITH, aNS => {
        return q.title.startsWith(aNS)
      })
      if (startsWith && !TO_IGNORE.includes(q.title)) {
        // title format assumed to be: SUBJECT Assignment Q for AUID
        const titleSplit = q.title.split(' for ')
        quizList.push({
          quizId: q.id,
          quizName: titleSplit[0],
          auid: titleSplit[1]
        })
      }
    })

    // // process next url
    let nextUrl = util.nextURL(response.headers.link)
    // nextUrl = false  // ******* DEBUGGING & TESTING ONLY
    if (nextUrl) {
      getMatchingQuizIds(nextUrl)
    } else {
      // No more quizzes
      console.log('Finished getting quiz ids')
      processQuizIds(quizList)
    }
  })
}

function processQuizIds (quizzes) {
  async.parallel([
    async.apply(generateDownloadReports, quizzes),
    async.apply(getStartTimes, quizzes)
  ], (err, results) => {
    if (err) {
    }
    writeStartTimes(results[1])
    combineReportCsvs()
    console.log('finished stats.csv and combining csvs.')
  })
}

function generateDownloadReports (quizzes, cb) {
  async.eachSeries(quizzes, (quizObj, done) => {
    console.log(`Request or generate report for quiz ${quizObj.quizId} (auid ${quizObj.auid})`)

    let url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes/${quizObj.quizId}/reports`

    client.post(url, util.newReportArgs(), (data, response) => {
      if (response.statusCode === 200) {
        // check if file is present; download if so, otherwise add to list to retry later.
        if (data.file && data.file.url) {
          download(data.file.url).then(csv => {
            fs.writeFileSync(path.join(OUT_PATH, data.file.display_name), csv)
            done()
          })
        } else {
          retriesList.push(quizObj)
          done()
        }
      } else {
        console.log(`Error POSTing: ${url}`)
      }
    })
  }, () => {
    // retry reports for which there were no files.
    if (retriesList.length > 0) {
      retryCount += 1
      console.log(`Retrying ${retriesList.length} quizzes (retry count = ${retryCount})`)
      const retry = retriesList
      retriesList = []
      generateDownloadReports(retry, cb)
    } else {
      cb(null)
    }
  })
}

function getStartTimes (quizzes, cb) {
  async.eachSeries(quizzes, (quizObj, quizDone) => {
    console.log(`Getting submission for quiz ${quizObj.quizId} (auid ${quizObj.auid})`)

    async.series([
      function getSubmissionId (submissionIdDone) { // use quiz Id to get submissionId
        const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes/${quizObj.quizId}/submissions`
        client.get(url, util.standardArgs(), (data, response) => {
          if (response.statusCode === 200 && data.quiz_submissions[0]) {
            quizObj.submissionId = data.quiz_submissions[0].id
          } else {
            console.log(`Error GETting: ${url}`)
          }
          submissionIdDone(null)
        })
      },
      function getAttemptOneEvent (getAttemptOneEventDone) { // with submissionId, get events for first attempt
        if (!quizObj.submissionId) { // no first attempt yet.
          getAttemptOneEventDone(null)
          return
        }

        console.log(`Getting events for submission ${quizObj.submissionId} (auid ${quizObj.auid})`)
        const url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/quizzes/${quizObj.quizId}/submissions/${quizObj.submissionId}/events?attempt=1`
        client.get(url, util.standardArgs(), (data, response) => {
          if (response.statusCode === 200 && data.quiz_submission_events.length > 1) {
            const sessionStartEvent = _.find(data.quiz_submission_events, e => {
              return e.event_type === 'session_started'
            })
            if (sessionStartEvent) {
              quizObj.attemptOneStart = datetime.create(sessionStartEvent.created_at)
            }
          } else {
            console.log(`Error GETting: ${url}`)
            quizObj.attemptOneStart = null
          }
          getAttemptOneEventDone(null)
        })
      }
    ], quizDone)
  }, (err) => {
    if (!err) {
      cb(null, quizzes)
    } else {
      console.err(err)
    }
  })
}

function writeStartTimes (stats) {
  const header = `quiz,auid,start,quizId,submissionId\n`
  const lines = stats.map(s => {
    let dt = ''
    if (s.attemptOneStart) {
      dt = `${s.attemptOneStart.format('d/m/Y')} ${s.attemptOneStart.format('H:M')}`
    }
    return `${s.quizName},${s.auid},${dt},${s.quizId},${s.submissionId}`
  }).join(`\n`)

  fs.writeFileSync(path.join(OUT_PATH, `stats.csv`), header + lines)
}

// combineReportCsvs()
function combineReportCsvs () {
  let attempts = []
  const fileNames = fs.readdirSync(path.normalize(OUT_PATH))

  // populate rows per quiz.
  fileNames.forEach(f => {
    const match = FILE_PATTERN.exec(f)
    if (match === null) {
      return
    }
    const quizName = match[1]
    const auid = match[2]

    if (quizName && auid) {
      const lines = fs.readFileSync(path.join(OUT_PATH, f)).toString().split(`\n`)
      const report = {
        quizName: quizName,
        auid: auid,
        lines: lines
      }
      attempts.push(report)
    } else {
      console.error(`**** shouldn't happen yo***`)
    }
  })

  // group by quiz name (assignment questions)
  attempts = _.groupBy(attempts, 'quizName')

  // create output file for each quiz
  Object.keys(attempts).forEach(quizName => {
    const outputLines = []
    const header = `quizName,${attempts[quizName][0].lines[0]},submittedXlDateTime` // use first row from first student as header; add Excel-friendly time
    outputLines.push(header)

    attempts[quizName].forEach(student => {
      for (let i = 1; i < student.lines.length; i++) { // skip first row (header row)
        if (student.lines[i].length > 0) {
          // append an Excel-friendly version of the submitted time
          // 6 is the index of the "submitted" column
          // const submittedText = student.lines[i].split(',')[6]
          const submittedText = csvParse(student.lines[i])[0][6]
          outputLines.push(`${quizName},${student.lines[i]},${datetime.create(submittedText).format('d/m/Y H:M')}`)
        }
      }
    })

    fs.writeFileSync(path.join(OUT_PATH, `${quizName} combined.csv`), outputLines.join(`\n`))
  })
}
