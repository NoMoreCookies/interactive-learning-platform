import {
  defineBackend,
} from "@aws-amplify/backend";

import {
  auth,
} from "./auth/resource";

import {
  acceptCurrentLegal,
  data,
} from "./data/resource";

import {
  premiumLessonAssetUrl,
} from "./data/premium-lesson-asset-url/resource";

import {
  premiumLessonContent,
} from "./data/premium-lesson-content/resource";

import {
  publicCatalog,
} from "./data/public-catalog/resource";

import {
  publicCourseOutline,
} from "./data/public-course-outline/resource";

import {
  taskAnswer,
} from "./data/task-answer/resource";

import {
  taskSolution,
} from "./data/task-solution/resource";

import {
  storage,
} from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  acceptCurrentLegal,
  publicCatalog,
  publicCourseOutline,
  premiumLessonContent,
  premiumLessonAssetUrl,
  taskAnswer,
  taskSolution,
});

/*
 * DynamoDB tables.
 */

const courseTable =
  backend.data.resources.tables[
    "Course"
  ];

const moduleTable =
  backend.data.resources.tables[
    "Module"
  ];

const lessonTable =
  backend.data.resources.tables[
    "Lesson"
  ];

const lessonNoteTable =
  backend.data.resources.tables[
    "LessonNote"
  ];

const lessonTaskTable =
  backend.data.resources.tables[
    "LessonTask"
  ];

const legalAcceptanceTable =
  backend.data.resources.tables[
    "LegalAcceptance"
  ];

/*
 * Legal acceptance writer.
 */
legalAcceptanceTable.grant(
  backend
    .acceptCurrentLegal
    .resources
    .lambda,
  "dynamodb:PutItem",
);

backend.acceptCurrentLegal.addEnvironment(
  "LEGAL_ACCEPTANCE_TABLE_NAME",
  legalAcceptanceTable.tableName,
);

/*
 * Public course catalog.
 */
courseTable.grant(
  backend
    .publicCatalog
    .resources
    .lambda,
  "dynamodb:Scan",
);

backend.publicCatalog.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

/*
 * Public course outline.
 */
courseTable.grant(
  backend
    .publicCourseOutline
    .resources
    .lambda,
  "dynamodb:Scan",
);

moduleTable.grant(
  backend
    .publicCourseOutline
    .resources
    .lambda,
  "dynamodb:Scan",
);

lessonTable.grant(
  backend
    .publicCourseOutline
    .resources
    .lambda,
  "dynamodb:Scan",
);

backend.publicCourseOutline.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

backend.publicCourseOutline.addEnvironment(
  "MODULE_TABLE_NAME",
  moduleTable.tableName,
);

backend.publicCourseOutline.addEnvironment(
  "LESSON_TABLE_NAME",
  lessonTable.tableName,
);

/*
 * Premium lesson content.
 */
courseTable.grant(
  backend
    .premiumLessonContent
    .resources
    .lambda,
  "dynamodb:GetItem",
);

moduleTable.grant(
  backend
    .premiumLessonContent
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTable.grant(
  backend
    .premiumLessonContent
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonNoteTable.grant(
  backend
    .premiumLessonContent
    .resources
    .lambda,
  "dynamodb:Scan",
);

lessonTaskTable.grant(
  backend
    .premiumLessonContent
    .resources
    .lambda,
  "dynamodb:Scan",
);

backend.premiumLessonContent.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

backend.premiumLessonContent.addEnvironment(
  "MODULE_TABLE_NAME",
  moduleTable.tableName,
);

backend.premiumLessonContent.addEnvironment(
  "LESSON_TABLE_NAME",
  lessonTable.tableName,
);

backend.premiumLessonContent.addEnvironment(
  "LESSON_NOTE_TABLE_NAME",
  lessonNoteTable.tableName,
);

backend.premiumLessonContent.addEnvironment(
  "LESSON_TASK_TABLE_NAME",
  lessonTaskTable.tableName,
);

/*
 * Premium lesson asset URL.
 *
 * The function can read only the publication hierarchy from
 * DynamoDB. S3 read access is granted separately and narrowly
 * through storage/resource.ts.
 */
courseTable.grant(
  backend
    .premiumLessonAssetUrl
    .resources
    .lambda,
  "dynamodb:GetItem",
);

moduleTable.grant(
  backend
    .premiumLessonAssetUrl
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTable.grant(
  backend
    .premiumLessonAssetUrl
    .resources
    .lambda,
  "dynamodb:GetItem",
);

backend.premiumLessonAssetUrl.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

backend.premiumLessonAssetUrl.addEnvironment(
  "MODULE_TABLE_NAME",
  moduleTable.tableName,
);

backend.premiumLessonAssetUrl.addEnvironment(
  "LESSON_TABLE_NAME",
  lessonTable.tableName,
);

/*
 * Task answer reader.
 *
 * Read-only access to the requested task and its publication
 * hierarchy.
 */
courseTable.grant(
  backend
    .taskAnswer
    .resources
    .lambda,
  "dynamodb:GetItem",
);

moduleTable.grant(
  backend
    .taskAnswer
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTable.grant(
  backend
    .taskAnswer
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTaskTable.grant(
  backend
    .taskAnswer
    .resources
    .lambda,
  "dynamodb:GetItem",
);

backend.taskAnswer.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

backend.taskAnswer.addEnvironment(
  "MODULE_TABLE_NAME",
  moduleTable.tableName,
);

backend.taskAnswer.addEnvironment(
  "LESSON_TABLE_NAME",
  lessonTable.tableName,
);

backend.taskAnswer.addEnvironment(
  "LESSON_TASK_TABLE_NAME",
  lessonTaskTable.tableName,
);

/*
 * Task solution reader.
 *
 * Read-only access to the requested task and its publication
 * hierarchy.
 */
courseTable.grant(
  backend
    .taskSolution
    .resources
    .lambda,
  "dynamodb:GetItem",
);

moduleTable.grant(
  backend
    .taskSolution
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTable.grant(
  backend
    .taskSolution
    .resources
    .lambda,
  "dynamodb:GetItem",
);

lessonTaskTable.grant(
  backend
    .taskSolution
    .resources
    .lambda,
  "dynamodb:GetItem",
);

backend.taskSolution.addEnvironment(
  "COURSE_TABLE_NAME",
  courseTable.tableName,
);

backend.taskSolution.addEnvironment(
  "MODULE_TABLE_NAME",
  moduleTable.tableName,
);

backend.taskSolution.addEnvironment(
  "LESSON_TABLE_NAME",
  lessonTable.tableName,
);

backend.taskSolution.addEnvironment(
  "LESSON_TASK_TABLE_NAME",
  lessonTaskTable.tableName,
);