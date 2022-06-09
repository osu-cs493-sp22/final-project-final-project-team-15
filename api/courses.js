const router = require("express").Router();
const {
  validateAgainstSchema,
  extractValidFields,
} = require("../lib/validation");

const CourseSchema = require("../models/courses");
const EnrolledStudentsSchema = require("../models/enrolledStudents");
const { users } = require("./users");
// const { assignments } = require("./assingments");
// const { submissions } = require("./submissions");

const { generateAuthToken, requireAuthentication } = require("../lib/auth");
const { getDbInstance } = require("../lib/mongo");

const { ObjectID, ListCollectionsCursor, ObjectId } = require("mongodb");
const e = require("express");

exports.router = router;
// exports.courses = courses;

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

exports.getCourseById = getCourseById;

async function deleteCourseById(id) {
  const db = getDbInstance();
  const collection = db.collection("courses");
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
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

async function getStudentsByCourseId(id) {
  const db = getDbInstance();
  const collection = db.collection("enrolled");
  console.log(id);
  const students = await collection
    .aggregate([{ $match: { courseId: new ObjectId(id) } }])
    .toArray();
  console.log(students);
  return students;
}

async function insertNewCourse(course) {
  const db = getDbInstance();
  const collection = db.collection("courses");

  // course = extractValidFields(course, CourseSchema);
  console.log("new course ==>", course);
  const result = await collection.insertOne(course);
  console.log("result", result);
  return result.insertedId;
}

async function insertNewStudent(student) {
  const db = getDbInstance();
  const collection = db.collection("enrolled");

  //need to add to specific course. students list need help
  student = extractValidFields(student, EnrolledStudentsSchema);
  const result = await collection.insertOne(student);
  return result.insertedId;
}

router.get("/", async (req, res) => {
  const coursesPage = await getCoursesPage(parseInt(req.query.page) || 1);
  res.status(200).send(coursesPage);
});

router.post("/", requireAuthentication, async (req, res) => {
  if (req.admin !== "admin") {
    res.status(400).send({ error: "Not an Admin" });
    next();
  } else if (validateAgainstSchema(req.body, CourseSchema)) {
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
  const id = req.params.id;
  const course = await getCourseById(id);
  if (course) {
    res.status(200).send(course);
  } else {
    next();
  }
});

router.patch("/:id", requireAuthentication, async (req, res) => {});

router.delete("/:id", requireAuthentication, async (req, res) => {
  if (req.admin !== "admin") {
    res.status(400).send({ error: "Not an Admin" });
    next();
  } else {
    const id = req.params.id;
    const deleteSuccessful = await deleteCourseById(id);

    if (deleteSuccessful) {
      res.status(204).send();
    } else {
      next();
    }
  }
});

router.get("/:id/students", requireAuthentication, async (req, res) => {
  if (req.admin == "student") {
    res.status(400).send({ error: "Not an Admin or instructor" });
    next();
  } else {
    const id = req.params.id;
    const course = await getCourseById(id);
    const students = await getStudentsByCourseId(id);
    if (students) {
      res.status(200).send(students);
    } else {
      res.status(400).send({ error: "Could not find students for that id" });
      next();
    }
  }
});

router.post("/:id/students", requireAuthentication, async (req, res) => {
  const id = req.params.id;
  const course = getCourseById(id);
  const TID = course.instructorId;
  if (req.admin == "student") {
    res.status(400).send({ error: "Not an Admin or instructor" });
    next();
  } else if (req.user != TID && req.admin != "admin") {
    res.status(400).send({ error: "Not the instructor for that class" });
    next();
  } else {
    //need help
    const newStudent = await insertNewStudent(req.body);
    if (newStudent) {
      res.status(200).send(newStudent);
    } else {
      res.status(400).send({ error: "Could not add student to class" });
      next();
    }
  }
});

router.get("/:id/roster", requireAuthentication, async (req, res) => {});

router.get("/:id/assignments", async (req, res) => {
  const id = req.params.id;
  const assignments = await getAssignmentsByCourseId(id);
  if (assignments) {
    res.status(200).send(assignments);
  } else {
    next();
  }
});
