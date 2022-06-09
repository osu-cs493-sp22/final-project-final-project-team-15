const router = require("express").Router();
const {
  validateAgainstSchema,
  extractValidFields,
} = require("../lib/validation");

const { Parser } = require("json2csv");
const { getUserInfo } = require("../models/users");

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
  const assignments = await collection.find({ courseId: id }).toArray();
  console.log(assignments);
  return assignments;
}

async function getStudentsByCourseId(id) {
  const db = getDbInstance();
  const collection = db.collection("enrolled");
  console.log(id);
  const students = await collection.find({ courseId: id }).toArray();
  console.log(students);
  return students;
}

async function getStudentRoster(arr) {
  const db = getDbInstance();
  const collection = db.collection("users");
  console.log(arr);
  let students = [];
  var count = 0;
  console.log("array", arr);
  for (let i = 0; i < arr.length; i++) {
    console.log("arr[i]._id", arr[i]._id);
    let temp = await getUserInfo(arr[i].userId, false);
    // let temp = arr[i].userId;
    console.log("temp", temp);
    students[i] = temp;
  }
  // students = await arr.map(GetUserById);
  console.log("HERE", students);
  return students;
}

async function insertNewCourse(course) {
  const db = getDbInstance();
  const collection = db.collection("courses");

  //need to add to specific course. students list need help
  //course = extractValidFields(course, CourseSchema);
  const result = await collection.insertOne(course);
  console.log("COURSE IS ==", course);
  return result.insertedId;
}

async function insertNewStudent(student) {
  const db = getDbInstance();
  const collection = db.collection("enrolled");

  //need to add to specific course. students list need help
  //student = extractValidFields(student, EnrolledStudentsSchema);
  const result = await collection.insertOne(student);
  return result.insertedId;
}

async function updateCourseById(id, course) {
  const db = getDbInstance();
  const courseValues = {
    subject: course.subject,
    number: course.number,
    title: course.title,
    term: course.term,
    instructorId: course.instructorId,
  };

  const collection = db.collection("courses");
  const result = await collection.replaceOne(
    { _id: new ObjectId(id) },
    courseValues
  );
  return result.matchedCount > 0;
}

router.get("/", async (req, res) => {
  const coursesPage = await getCoursesPage(parseInt(req.query.page) || 1);
  res.status(200).send(coursesPage);
});

router.post("/", requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    // check correct permissions for admin or instructor creation -- (does not work right now)
    // if(req.body.role == 'admin' || req.body.role == 'instructor') {
    //   requireAuthentication(req, res);
    //   console.log(req.admin)
    //   if(req.admin != 'admin') res.status(401).send({ error: "Invalid permissions" })
    // }

    const id = await insertNewCourse(req.body);
    res.status(201).send({
      _id: id,
    });
  } else {
    res.status(400).send({
      error: "Request body does not contain a valid User.",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const course = await getCourseById(id);
  const assignments = await getAssignmentsByCourseId(id);
  if (course) {
    res.status(200).send({ course: course, assignments: assignments });
  } else {
    next();
  }
});

router.patch("/:id", requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    console.log("instructorID == ", req.body.instructorId);
    const updateSuccessful = await updateCourseById(req.params.id, req.body);
    console.log("UPDATED == ", updateSuccessful);
    if (updateSuccessful) {
      res.status(204).send();
    } else {
      next();
    }
  } else {
    res.status(400).send({
      err: "Request body does not contain a valid course.",
    });
  }
});

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
      res.status(200).send({ students: students });
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
  if (req.admin == "student" || !req.admin) {
    res.status(400).send({ error: "Not an Admin or instructor" });
    next();
  } else if (req.user != TID && req.admin != "admin") {
    res.status(400).send({ error: "Not the instructor for that class" });
    next();
  } else {
    console.log("req.body post student", req.body);
    const newStudent = await insertNewStudent(req.body);
    if (newStudent) {
      res.status(200).send({ id: newStudent });
    } else {
      res.status(400).send({ error: "Could not add student to class" });
      next();
    }
  }
});

router.get("/:id/roster", requireAuthentication, async (req, res) => {
  const id = req.params.id;
  console.log("roseter id", id);
  if (!req.admin || req.admin == "student") {
    res.status(400).send({ error: "Not an Admin or instructor" });
    next();
  } else {
    const listOfIds = await getStudentsByCourseId(id);
    const data = await getStudentRoster(listOfIds);
    const fields = ["name", "email", "role"];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    // console.log("data", csv);
    res.attachment("filename.csv");
    res.status(200).send(csv);
  }
});

router.get("/:id/assignments", async (req, res) => {
  const id = req.params.id;
  const assignments = await getAssignmentsByCourseId(id);
  if (assignments) {
    res.status(200).send({ assignments: assignments });
  } else {
    next();
  }
});
