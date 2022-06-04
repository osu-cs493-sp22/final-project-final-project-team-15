const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const CourseSchema = require('../models/courses')
const { users } = require('./users');
const { assignments } = require('./assingments');
const { submissions } = require('./submissions');

const {generateAuthToken, requireAuthentication} = require('../lib/auth')
const { getDbInstance } = require('../lib/mongo')

const { ObjectID, ListCollectionsCursor, ObjectId } = require('mongodb');
const e = require('express');

exports.router = router;
exports.courses = courses;


router.get('/', async(req, res) => {

});

router.post('/', requireAuthentication, async(req, res) => {

});

router.get('/:id', async(req, res) => {

});

router.patch('/:id', requireAuthentication, async(req, res) => {

});

router.delete('/:id', requireAuthentication, async(req, res) => {

});

router.get('/:id/students', requireAuthentication, async(req, res) => {

});

router.post('/:id/students', requireAuthentication, async(req, res) => {

});

router.get('/:id/roster', requireAuthentication, async(req, res) => {

});

router.get('/:id/assignments', async(req, res) => {

});
