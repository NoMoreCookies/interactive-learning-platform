import {
  type ClientSchema,
  a,
  defineData,
  defineFunction,
} from "@aws-amplify/backend";

import { postConfirmation } from "../auth/post-confirmation/resource";

const acceptCurrentLegal =
  defineFunction({
    name: "accept-current-legal",
    entry:
      "./accept-current-legal/handler.ts",
  });

const schema = a
  .schema({
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
        allow
          .authenticated()
          .to(["read"]),
        allow.guest().to(["read"]),
        allow
          .authenticated(
            "identityPool",
          )
          .to(["read"]),
      ]),

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
        allow
          .authenticated()
          .to(["read"]),
        allow.guest().to(["read"]),
        allow
          .authenticated(
            "identityPool",
          )
          .to(["read"]),
      ]),

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
        allow
          .authenticated()
          .to(["read"]),
        allow.guest().to(["read"]),
        allow
          .authenticated(
            "identityPool",
          )
          .to(["read"]),
      ]),

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
        allow
          .authenticated()
          .to(["read"]),
      ]),

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
        allow
          .authenticated()
          .to(["read"]),
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
      .returns(a.string())
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
    allow.resource(postConfirmation),

    allow
      .resource(acceptCurrentLegal)
      .to(["mutate"]),
  ]);

export type Schema =
  ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode:
      "userPool",
  },
});