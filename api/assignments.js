const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const AssignmentSchema = require('../models/assignments')
const SubmissionSchema = require('../models/submissions')

const { users } = require('../models/users')
const { courses } = require('../models/courses')
const { submissions } = require('../models/submissions')

const { getDbInstance } = require('../lib/mongo')

const { ObjectID, ListCollectionsCursor, ObjectId } = require('mongodb');
const e = require('express');

exports.router = router;
exports.assignments = assignments;


async function getAssignmentsById(id) {
    const db = getDbInstance();
    const collection = db.collection("assignments");
    console.log(id);
    const assignments = await collection
      .aggregate([{ $match: { Id: new ObjectId(id) } }])
      .toArray();
    console.log(assignments);
    return assignments;
}

async function getSubmissionsByAssignmentId(id) {
    const db = getDbInstance();
    const collection = db.collection("submissions");
    console.log(id);
    const submissions = await collection
      .aggregate([{ $match: { assignmentId: new ObjectId(id) } }])
      .toArray();
    console.log(submissions);
    return submissions;
}

async function insertNewSubmission(submission) {
    const db = getDbInstance();
    const collection = db.collection("submissions");
  
    submission = extractValidFields(submission, SubmissionSchema);
    const result = await collection.insertOne(submission);
    return result.insertedId;
  }

router.post('/', async(req, res) => {

});


router.get('/:id', async(req, res) => {
    const id = req.params.id;
    const assignments = await getAssignmentsById(id);
    if (assignments) {
        res.status(200).send(assignments);
    } else {
        next();
    }
});


router.patch('/:id', async(req, res) => {

});


router.delete('/:id', async(req, res) => {

});


router.get('/:id/submissions', async(req, res) => {
    const id = req.params.id;
    const submissions = await getSubmissionsByAssignmentId(id);
    if (submissions) {
        res.status(200).send(submissions);
    } else {
        next();
    }
});


router.post('/:id/submissions', async(req, res) => {
    if (req.admin !== "student") {
        res.status(400).send(
            { error: "Not an student" }
          )
        next();
      } else {
        const newSubmission = await insertNewSubmission(req.body);
        console.log("== req.headers:", req.headers);
        if (newSubmission) {
          res.status(200).send(newSubmission);
        } else {
          next();
        }
      }
});