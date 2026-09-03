import {
  type ClientSchema,
  a,
  defineData,
  defineFunction,
} from "@aws-amplify/backend";

import {
  postConfirmation,
} from "../auth/post-confirmation/resource";

import {
  premiumLessonAssetUrl,
} from "./premium-lesson-asset-url/resource";

import {
  premiumLessonContent,
} from "./premium-lesson-content/resource";

import {
  publicCatalog,
} from "./public-catalog/resource";

import {
  publicCourseOutline,
} from "./public-course-outline/resource";

import {
  taskAnswer,
} from "./task-answer/resource";

import {
  taskSolution,
} from "./task-solution/resource";

export const acceptCurrentLegal =
  defineFunction({
    name: "accept-current-legal",
    entry:
      "./accept-current-legal/handler.ts",
    resourceGroupName: "data",
  });

const schema = a
  .schema({
    /*
     * Public API DTO used by the public course catalog.
     *
     * This is intentionally separate from the raw Course model.
     * Only fields safe for public exposure are included here.
     */
    PublicCourse: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      subject: a.string(),
      level: a.string(),
      thumbnailPath: a.string(),
      order: a.integer().required(),
    }),

    /*
     * Public representation of a lesson.
     *
     * Premium fields such as video paths, materials paths, notes,
     * tasks, answers, and solutions are intentionally excluded.
     */
    PublicLesson: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      durationMinutes: a.integer(),
      order: a.integer().required(),
    }),

    /*
     * Public representation of a module and its published lessons.
     */
    PublicModule: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      order: a.integer().required(),
      lessons: a
        .ref("PublicLesson")
        .array(),
    }),

    /*
     * Public course syllabus.
     *
     * The backend handler enforces the publication hierarchy:
     * Course -> Module -> Lesson.
     */
    PublicCourseOutline: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      slug: a.string().required(),
      description: a.string(),
      subject: a.string(),
      level: a.string(),
      thumbnailPath: a.string(),
      order: a.integer().required(),
      modules: a
        .ref("PublicModule")
        .array(),
    }),

    /*
     * Premium lesson note DTO.
     */
    PremiumLessonNote: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      content: a.string().required(),
      order: a.integer().required(),
    }),

    /*
     * Premium lesson task DTO.
     *
     * answer and solution are intentionally excluded.
     * They are fetched separately only when requested.
     */
    PremiumLessonTask: a.customType({
      id: a.id().required(),
      title: a.string().required(),
      content: a.string().required(),
      order: a.integer().required(),
    }),

    /*
     * Premium content attached to a published lesson.
     *
     * Physical S3 object paths are deliberately not exposed.
     * The frontend only learns whether an asset exists.
     */
    PremiumLessonContent: a.customType({
      lessonId: a.id().required(),
      hasVideo: a
        .boolean()
        .required(),
      hasMaterials: a
        .boolean()
        .required(),
      notes: a
        .ref("PremiumLessonNote")
        .array(),
      tasks: a
        .ref("PremiumLessonTask")
        .array(),
    }),

    /*
     * Short answer for a single task.
     */
    TaskAnswer: a.customType({
      taskId: a.id().required(),
      answer: a.string(),
    }),

    /*
     * Full solution for a single task.
     */
    TaskSolution: a.customType({
      taskId: a.id().required(),
      solution: a.string(),
    }),

    /*
     * Public course catalog endpoint.
     */
    listPublishedCourses: a
      .query()
      .returns(
        a.ref("PublicCourse").array(),
      )
      .authorization((allow) => [
        allow.publicApiKey(),
      ])
      .handler(
        a.handler.function(
          publicCatalog,
        ),
      ),

    /*
     * Public syllabus endpoint for a single course.
     */
    getPublishedCourseOutline: a
      .query()
      .arguments({
        slug: a.string().required(),
      })
      .returns(
        a.ref("PublicCourseOutline"),
      )
      .authorization((allow) => [
        allow.publicApiKey(),
      ])
      .handler(
        a.handler.function(
          publicCourseOutline,
        ),
      ),

    /*
     * Premium lesson content endpoint.
     *
     * Before subscription entitlements are implemented,
     * access is intentionally restricted to ADMIN only.
     */
    getPremiumLessonContent: a
      .query()
      .arguments({
        lessonId: a.id().required(),
      })
      .returns(
        a.ref("PremiumLessonContent"),
      )
      .authorization((allow) => [
        allow.group("ADMIN"),
      ])
      .handler(
        a.handler.function(
          premiumLessonContent,
        ),
      ),

    /*
     * Returns a short-lived S3 URL for one premium lesson asset.
     *
     * The caller provides only lessonId and asset type.
     * The S3 path is resolved exclusively by the backend.
     */
    getPremiumLessonAssetUrl: a
      .query()
      .arguments({
        lessonId: a.id().required(),
        assetType:
          a.string().required(),
      })
      .returns(a.string())
      .authorization((allow) => [
        allow.group("ADMIN"),
      ])
      .handler(
        a.handler.function(
          premiumLessonAssetUrl,
        ),
      ),

    /*
     * Task answer endpoint.
     */
    getTaskAnswer: a
      .query()
      .arguments({
        taskId: a.id().required(),
      })
      .returns(
        a.ref("TaskAnswer"),
      )
      .authorization((allow) => [
        allow.group("ADMIN"),
      ])
      .handler(
        a.handler.function(
          taskAnswer,
        ),
      ),

    /*
     * Full task solution endpoint.
     */
    getTaskSolution: a
      .query()
      .arguments({
        taskId: a.id().required(),
      })
      .returns(
        a.ref("TaskSolution"),
      )
      .authorization((allow) => [
        allow.group("ADMIN"),
      ])
      .handler(
        a.handler.function(
          taskSolution,
        ),
      ),

    /*
     * Raw Course model.
     *
     * Direct model access is restricted to ADMIN.
     */
    Course: a
      .model({
        title: a.string().required(),
        slug: a.string().required(),
        description: a.string(),
        subject: a.enum([
          "MATHEMATICS",
          "PHYSICS",
          "COMPUTER_SCIENCE",
        ]),
        level: a.enum([
          "BASIC",
          "EXTENDED",
        ]),
        thumbnailPath: a.string(),
        order: a.integer().required(),
        published: a
          .boolean()
          .default(false),
        modules: a.hasMany(
          "Module",
          "courseId",
        ),
      })
      .authorization((allow) => [
        allow.group("ADMIN"),
      ]),

    /*
     * Raw Module model.
     */
    Module: a
      .model({
        courseId: a.id().required(),
        title: a.string().required(),
        slug: a.string().required(),
        description: a.string(),
        order: a.integer().required(),
        published: a
          .boolean()
          .default(false),
        course: a.belongsTo(
          "Course",
          "courseId",
        ),
        lessons: a.hasMany(
          "Lesson",
          "moduleId",
        ),
      })
      .authorization((allow) => [
        allow.group("ADMIN"),
      ]),

    /*
     * Raw Lesson model.
     *
     * videoPath and materialsPath remain internal fields used by
     * ADMIN and backend asset-access functions.
     */
    Lesson: a
      .model({
        moduleId: a.id().required(),
        title: a.string().required(),
        slug: a.string().required(),
        description: a.string(),
        durationMinutes: a.integer(),
        order: a.integer().required(),
        videoPath: a.string(),
        materialsPath: a.string(),
        published: a
          .boolean()
          .default(false),
        module: a.belongsTo(
          "Module",
          "moduleId",
        ),
        notes: a.hasMany(
          "LessonNote",
          "lessonId",
        ),
        tasks: a.hasMany(
          "LessonTask",
          "lessonId",
        ),
      })
      .authorization((allow) => [
        allow.group("ADMIN"),
      ]),

    /*
     * Raw lesson notes.
     */
    LessonNote: a
      .model({
        lessonId: a.id().required(),
        title: a.string().required(),
        content: a
          .string()
          .required(),
        order: a.integer().required(),
        lesson: a.belongsTo(
          "Lesson",
          "lessonId",
        ),
      })
      .authorization((allow) => [
        allow.group("ADMIN"),
      ]),

    /*
     * Raw lesson tasks.
     *
     * This model contains answer and solution and is ADMIN only.
     */
    LessonTask: a
      .model({
        lessonId: a.id().required(),
        title: a.string().required(),
        content: a
          .string()
          .required(),
        answer: a.string(),
        solution: a.string(),
        order: a.integer().required(),
        lesson: a.belongsTo(
          "Lesson",
          "lessonId",
        ),
      })
      .authorization((allow) => [
        allow.group("ADMIN"),
      ]),

    LegalAcceptance: a
      .model({
        userId: a.string().required(),
        owner: a.string().required(),
        termsVersion: a
          .string()
          .required(),
        privacyVersion: a
          .string()
          .required(),
        acceptedAt: a
          .datetime()
          .required(),
      })
      .authorization((allow) => [
        allow
          .ownerDefinedIn("owner")
          .to(["read"]),
        allow
          .group("ADMIN")
          .to(["read"]),
      ]),

    acceptCurrentLegal: a
      .mutation()
      .arguments({
        termsVersion:
          a.string().required(),
        privacyVersion:
          a.string().required(),
      })
      .returns(a.boolean())
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          acceptCurrentLegal,
        ),
      ),
  })
  .authorization((allow) => [
    allow
      .resource(postConfirmation)
      .to(["mutate"]),
  ]);

export type Schema =
  ClientSchema<typeof schema>;

export const data = defineData({
  schema,

  authorizationModes: {
    defaultAuthorizationMode:
      "userPool",

    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});