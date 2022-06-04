const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const AssignmentSchema = require('../models/assignments')
const { users } = require('../models/users')
const { courses } = require('../models/courses')
const { submissions } = require('../models/submissions')

const { getDbInstance } = require('../lib/mongo')

const { ObjectID, ListCollectionsCursor, ObjectId } = require('mongodb');
const e = require('express');

exports.router = router;
exports.assignments = assignments;


router.post('/', async(req, res) => {

});


router.get('/:id', async(req, res) => {

});


router.patch('/:id', async(req, res) => {

});


router.delete('/:id', async(req, res) => {

});


router.get('/:id/submissions', async(req, res) => {

});


router.post('/:id/submissions', async(req, res) => {

});