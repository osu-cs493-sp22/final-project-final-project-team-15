const router = require("express").Router();
const {
  validateAgainstSchema,
  extractValidFields,
} = require("../lib/validation");

const CourseSchema = require("../models/courses");
const { users } = require("./users");
const { assignments } = require("./assingments");
const { submissions } = require("./submissions");

const { generateAuthToken, requireAuthentication } = require("../lib/auth");
const { getDbInstance } = require("../lib/mongo");

const { ObjectID, ListCollectionsCursor, ObjectId } = require("mongodb");
const e = require("express");

exports.router = router;
exports.courses = courses;

async function getCoursesPage(page) {
  const db = getDbInstance();
  const collection = db.collection("courses");
  const count = await collection.countDocuments();
  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;
  const results = await collection
    .find({})
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    courses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count,
  };
}

async function getCourseById(id) {
  const db = getDbInstance();
  const collection = db.collection("courses");
  console.log(id);
  const courses = await collection
    .aggregate([{ $match: { _id: new ObjectId(id) } }])
    .toArray();
  console.log(courses);
  return courses[0];
}

async function getAssignmentsByCourseId(id) {
  const db = getDbInstance();
  const collection = db.collection("assignments");
  console.log(id);
  const assignments = await collection
    .aggregate([{ $match: { courseId: new ObjectId(id) } }])
    .toArray();
  console.log(assignments);
  return assignments;
}

async function insertNewCourse(course) {
  const db = getDbInstance();
  const collection = db.collection("courses");

  course = extractValidFields(course, CourseSchema);
  const result = await collection.insertOne(course);
  return result.insertedId;
}

router.get("/", async (req, res) => {
  const coursesPage = await getCoursesPage(parseInt(req.query.page) || 1);
  res.status(200).send(coursesPage);
});

router.post("/", requireAuthentication, async (req, res) => {
  if (req.admin !== "admin") {
    next();
  } else {
    const newCourse = await insertNewCourse(req.body);
    console.log("== req.headers:", req.headers);
    if (newCourse) {
      res.status(200).send(newCourse);
    } else {
      next();
    }
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.businessid;
  const course = await getCourseById(id);
  if (course) {
    res.status(200).send(course);
  } else {
    next();
  }
});

router.patch("/:id", requireAuthentication, async (req, res) => {});

router.delete("/:id", requireAuthentication, async (req, res) => {});

router.get("/:id/students", requireAuthentication, async (req, res) => {});

router.post("/:id/students", requireAuthentication, async (req, res) => {});

router.get("/:id/roster", requireAuthentication, async (req, res) => {});

router.get("/:id/assignments", async (req, res) => {
  const id = req.params.businessid;
  const assignments = await getAssignmentsByCourseId(id);
  if (assignments) {
    res.status(200).send(assignments);
  } else {
    next();
  }
});
