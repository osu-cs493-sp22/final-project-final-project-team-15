const SubmissionSchema = {
  assignmentId: { required: true },
  studentId: { required: true },
  timestamp: { required: true },
  grade: { required: true },
  file: { required: true },
}; // file is the going to be the url to where the submission file can be downloaded

exports.SubmissionSchema = SubmissionSchema;
