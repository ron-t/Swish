'use strict'

const ASSIGNMENT_NAME_STARTSWITH = 'Files Assignment Q0000'
const TO_KEEP = [
  'Files Assignment Q0000 for 1111111',
  ''
]

const COURSE_ID = 00000 // Obtain from Canvas
const DOMAIN = 'https://auckland.beta.instructure.com:443'
const TOKEN = 'xxxxx' // Obtain from Canvas

const async = require('async')
const util = require('./util.js')
util.init(TOKEN)

const client = new (require('node-rest-client').Client)()
let assignmentIds = []

getMatchingAssignmentIds(`${DOMAIN}/api/v1/courses/${COURSE_ID}/assignments?per_page=100`)
// When getAssignment1Ids finishes recursing it calls deleteAssignments()

function deleteAssignments () {
  async.eachSeries(assignmentIds, (assignmentId, deleted) => {
    console.log(`Deleting assignment ${assignmentId}`)

    let url = `${DOMAIN}/api/v1/courses/${COURSE_ID}/assignments/${assignmentId}`

    client.delete(url, util.standardArgs(), (data, response) => {
      if (response.statusCode === 200) {
        deleted()
      } else {
        console.log(`Error deleting: ${DOMAIN}/api/v1/courses/${COURSE_ID}/assignments/${assignmentId}`)
      }
    })
  }, () => { // all assignments done
    console.log(`All done.`)
    process.exit()
  })
}

function getMatchingAssignmentIds (url) {
  client.get(url, util.standardArgs(), (data, response) => {
    console.log('got some assignment Ids')
    // add assignmentIds to list of ids to process
    data.forEach(a => {
      if (a.name.startsWith(ASSIGNMENT_NAME_STARTSWITH) && !TO_KEEP.includes(a.name)) {
        assignmentIds.push(a.id)
      }
    })

    // process next url
    let nextUrl = util.nextURL(response.headers.link)
    if (nextUrl) {
      console.log('getting more assignment Ids')
      getMatchingAssignmentIds(nextUrl)
    } else {
      // No more assignments
      deleteAssignments()
    }
  })
}
