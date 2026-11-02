import { adminImportExternalRefund } from "./admin-import-external-refund/resource";
import { adminListRefundReviews } from "./admin-list-refund-reviews/resource";
import {
  type ClientSchema,
  a,
  defineData,
  defineFunction,
} from "@aws-amplify/backend";

import {
  postConfirmation,
} from "../auth/post-confirmation/resource";

import { createComplaint } from "./create-complaint/resource";
import { getMyComplaints } from "./get-my-complaints/resource";
import { getMyPurchases } from "./get-my-purchases/resource";
import { adminListComplaints } from "./admin-list-complaints/resource";
import { adminResolveComplaint } from "./admin-resolve-complaint/resource";

import {
  checkoutStatus,
} from "./checkout-status/resource";

import {
  adminInitiateRefund,
} from "./admin-initiate-refund/resource";
import { adminReconcileRefund } from "./admin-reconcile-refund/resource";

import {
  createCheckoutSession,
} from "./create-checkout-session/resource";

import {
  deleteAdminCourse,
} from "./delete-admin-course/resource";

import {
  premiumLessonAssetUrl,
} from "./premium-lesson-asset-url/resource";

import {
  premiumLessonContent,
} from "./premium-lesson-content/resource";

import {
  premiumStatus,
} from "./premium-status/resource";

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
    name:
      "accept-current-legal",

    entry:
      "./accept-current-legal/handler.ts",

    resourceGroupName:
      "data",
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
      id:
        a.id().required(),

      title:
        a.string().required(),

      slug:
        a.string().required(),

      description:
        a.string(),

      subject:
        a.string(),

      level:
        a.string(),

      thumbnailPath:
        a.string(),

      order:
        a.integer().required(),
    }),

    /*
     * Public representation of a lesson.
     *
     * Premium fields such as video paths, materials paths, notes,
     * tasks, answers, and solutions are intentionally excluded.
     */
    PublicLesson: a.customType({
      id:
        a.id().required(),

      title:
        a.string().required(),

      slug:
        a.string().required(),

      description:
        a.string(),

      durationMinutes:
        a.integer(),

      order:
        a.integer().required(),
    }),

    /*
     * Public representation of a module and its published lessons.
     */
    PublicModule: a.customType({
      id:
        a.id().required(),

      title:
        a.string().required(),

      slug:
        a.string().required(),

      description:
        a.string(),

      order:
        a.integer().required(),

      lessons:
        a
          .ref(
            "PublicLesson",
          )
          .array(),
    }),

    /*
     * Public course syllabus.
     *
     * The backend handler enforces the publication hierarchy:
     * Course -> Module -> Lesson.
     */
    PublicCourseOutline: a.customType({
      id:
        a.id().required(),

      title:
        a.string().required(),

      slug:
        a.string().required(),

      description:
        a.string(),

      subject:
        a.string(),

      level:
        a.string(),

      thumbnailPath:
        a.string(),

      order:
        a.integer().required(),

      modules:
        a
          .ref(
            "PublicModule",
          )
          .array(),
    }),

    /*
     * Complaint DTO: never expose ADMIN's Cognito identifier to customers.
     * Protected via the per-operation auth rules and Lambda ownership checks.
     */
    ComplaintView: a.customType({
      complaintId: a.string().required(),
      stripeCheckoutSessionId: a.string().required(),
      userId: a.string().required(),
      subject: a.string().required(),
      description: a.string().required(),
      status: a.string().required(),
      createdAt: a.string().required(),
      updatedAt: a.string().required(),
      decisionReason: a.string(),
      decidedAt: a.string(),
    }),
    ComplaintSubmissionResult: a.customType({
      complaintId: a.string().required(),
      status: a.string().required(),
      createdAt: a.string().required(),
    }),
    ComplaintListResult: a.customType({
      items: a.ref("ComplaintView").array().required(),
      nextToken: a.string(),
    }),
    AdminResolveComplaintResult: a.customType({
      complaintId: a.string().required(),
      status: a.string().required(),
      decidedAt: a.string().required(),
    }),
    MyPurchaseView: a.customType({
      stripeCheckoutSessionId: a.string().required(),
      paidAt: a.string().required(),
      amountTotal: a.integer().required(),
      currency: a.string().required(),
      grantedUntil: a.string(),
    }),
    MyPurchasesResult: a.customType({
      items: a.ref("MyPurchaseView").array().required(),
      nextToken: a.string(),
    }),

    /*
     * C1 refund submission result. Not an acknowledgement that funds
     * were returned; the status is reconciled independently in C2.
     */
    AdminInitiateRefundResult: a.customType({
      status: a.string().required(),
      stripeRefundId: a.string(),
    }),

    /*
     * Result returned after redirecting back from Stripe Checkout.
     */
    MyCheckoutResult: a.customType({
      status:
        a.string().required(),

      accessUntil:
        a.datetime(),
    }),

    /*
     * Result of attempting to create a Stripe Checkout Session.
     *
     * READY:
     *   url contains the Stripe-hosted Checkout URL.
     *
     * RATE_LIMITED:
     *   retryAfterSeconds contains the remaining cooldown.
     */
    CreateCheckoutSessionResult:
      a.customType({
        status:
          a.string().required(),

        url:
          a.string(),

        retryAfterSeconds:
          a.integer(),
      }),

    /*
     * Result returned by the safe ADMIN-only course deletion flow.
     */
    DeleteAdminCourseResult:
      a.customType({
        status:
          a.string().required(),

        deletedModules:
          a.integer().required(),

        deletedLessons:
          a.integer().required(),

        deletedNotes:
          a.integer().required(),

        deletedTasks:
          a.integer().required(),
      }),

    /*
     * Premium lesson note DTO.
     */
    PremiumLessonNote: a.customType({
      id:
        a.id().required(),

      title:
        a.string().required(),

      content:
        a.string().required(),

      order:
        a.integer().required(),
    }),

    /*
     * Premium lesson task DTO.
     *
     * answer and solution are intentionally excluded.
     * They are fetched separately only when requested.
     */
    PremiumLessonTask: a.customType({
      id:
        a.id().required(),

      title:
        a.string().required(),

      content:
        a.string().required(),

      order:
        a.integer().required(),
    }),

    /*
     * Premium content attached to a published lesson.
     *
     * Physical S3 object paths are deliberately not exposed.
     * The frontend only learns whether an asset exists.
     */
    PremiumLessonContent: a.customType({
      lessonId:
        a.id().required(),

      hasVideo:
        a
          .boolean()
          .required(),

      hasMaterials:
        a
          .boolean()
          .required(),

      notes:
        a
          .ref(
            "PremiumLessonNote",
          )
          .array(),

      tasks:
        a
          .ref(
            "PremiumLessonTask",
          )
          .array(),
    }),

    /*
     * Current authenticated user's Premium status.
     *
     * Only fields safe for frontend display are exposed.
     */
    MyPremiumStatus: a.customType({
      active:
        a
          .boolean()
          .required(),

      accessUntil:
        a.datetime(),
    }),

    /*
     * Short answer for a single task.
     */
    TaskAnswer: a.customType({
      taskId:
        a.id().required(),

      answer:
        a.string(),
    }),

    /*
     * Full solution for a single task.
     */
    TaskSolution: a.customType({
      taskId:
        a.id().required(),

      solution:
        a.string(),
    }),

/*
 * Creates a Stripe-hosted Checkout Session for an authenticated
 * user.
 *
 * The browser selects only a trusted plan code and explicitly
 * confirms the checkout-specific digital-content declarations.
 *
 * Price, identity, access duration, legal versions, timestamps and
 * the billing contract are resolved exclusively by the backend.
 */
createCheckoutSession: a
  .mutation()
  .arguments({
    planCode:
      a.string().required(),

    immediateDeliveryConsent:
      a.boolean().required(),

    withdrawalRightLossAcknowledged:
      a.boolean().required(),
  })
  .returns(
    a.ref(
      "CreateCheckoutSessionResult",
    ),
  )
  .authorization((allow) => [
    allow.authenticated(),
  ])
  .handler(
    a.handler.function(
      createCheckoutSession,
    ),
  ),

    /*
     * Safely deletes one draft course and all DynamoDB descendants.
     *
     * The caller must be in the ADMIN Cognito group. The Lambda
     * repeats the ADMIN check as defense in depth.
     *
     * confirmationSlug is validated against the stored course slug
     * before any destructive operation starts.
     */
    deleteAdminCourse: a
      .mutation()
      .arguments({
        courseId:
          a.id().required(),

        confirmationSlug:
          a.string().required(),
      })
      .returns(
        a.ref(
          "DeleteAdminCourseResult",
        ),
      )
      .authorization((allow) => [
        allow
          .group(
            "ADMIN",
          ),
      ])
      .handler(
        a.handler.function(
          deleteAdminCourse,
        ),
      ),

    /*
     * Package B - Complaints, separate from Stripe refund processing.
     * Identity and resource ownership are checked again inside Lambda.
     */
    createComplaint: a.mutation()
      .arguments({
        stripeCheckoutSessionId: a.string().required(),
        submissionId: a.string().required(),
        subject: a.string().required(),
        description: a.string().required(),
      })
      .returns(a.ref("ComplaintSubmissionResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(createComplaint)),

    getMyComplaints: a.query()
      .arguments({ nextToken: a.string() })
      .returns(a.ref("ComplaintListResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(getMyComplaints)),

    getMyPurchases: a.query()
      .arguments({ nextToken: a.string() })
      .returns(a.ref("MyPurchasesResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(getMyPurchases)),

    adminListComplaints: a.query()
      .arguments({ status: a.string().required(), nextToken: a.string() })
      .returns(a.ref("ComplaintListResult"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminListComplaints)),

    adminResolveComplaint: a.mutation()
      .arguments({
        complaintId: a.string().required(),
        decision: a.string().required(),
        decisionReason: a.string().required(),
      })
      .returns(a.ref("AdminResolveComplaintResult"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminResolveComplaint)),

    /*
     * Financially sensitive, ADMIN-only C1 mutation.
     * A separate backend group/identity check is mandatory.
     * REFUND_EXECUTION_ENABLED remains false until C2/C3.
     */
    adminInitiateRefund: a
      .mutation()
      .arguments({
        complaintId: a.string().required(),
        stripeCheckoutSessionId: a.string().required(),
        confirmationSessionId: a.string().required(),
      })
      .returns(a.ref("AdminInitiateRefundResult"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminInitiateRefund)),

    ExternalRefundReview: a.customType({ eventId: a.string().required(), stripeRefundId: a.string().required(), outcome: a.string().required() }),
    ExternalRefundReviewPage: a.customType({ items: a.ref("ExternalRefundReview").array().required(), nextToken: a.string() }),
    adminListRefundReviews: a.query()
      .arguments({ nextToken: a.string() })
      .returns(a.ref("ExternalRefundReviewPage"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminListRefundReviews)),
    adminImportExternalRefund: a.mutation()
      .arguments({ stripeCheckoutSessionId: a.string().required(), stripeRefundId: a.string().required(), confirmationSessionId: a.string().required(), confirmationRefundId: a.string().required() })
      .returns(a.ref("AdminInitiateRefundResult"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminImportExternalRefund)),

    /* ADMIN-only Stripe GET reconciliation; no new refund is issued. */
    adminReconcileRefund: a
      .mutation()
      .arguments({
        stripeCheckoutSessionId: a.string().required(),
      })
      .returns(a.ref("AdminInitiateRefundResult"))
      .authorization((allow) => [allow.group("ADMIN")])
      .handler(a.handler.function(adminReconcileRefund)),

    /*
     * Returns the current authenticated user's Premium status.
     *
     * The caller does not provide a userId. The Lambda resolves the
     * user exclusively from the authenticated Cognito identity.
     */
    getMyPremiumStatus: a
      .query()
      .returns(
        a.ref(
          "MyPremiumStatus",
        ),
      )
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          premiumStatus,
        ),
      ),

    /*
     * Returns the processing result of one Checkout Session belonging
     * to the currently authenticated user.
     */
    getMyCheckoutResult: a
      .query()
      .arguments({
        sessionId:
          a.string().required(),
      })
      .returns(
        a.ref(
          "MyCheckoutResult",
        ),
      )
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          checkoutStatus,
        ),
      ),

    /*
     * Public course catalog endpoint.
     */
    listPublishedCourses: a
      .query()
      .returns(
        a
          .ref(
            "PublicCourse",
          )
          .array(),
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
        slug:
          a.string().required(),
      })
      .returns(
        a.ref(
          "PublicCourseOutline",
        ),
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
     * AppSync requires an authenticated Cognito user.
     * The Lambda performs the actual premium authorization using
     * the user's current Entitlement record.
     *
     * ADMIN users are allowed by the Lambda without a billing
     * entitlement.
     */
    getPremiumLessonContent: a
      .query()
      .arguments({
        lessonId:
          a.id().required(),
      })
      .returns(
        a.ref(
          "PremiumLessonContent",
        ),
      )
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          premiumLessonContent,
        ),
      ),

    /*
     * Returns a short-lived S3 URL for one premium lesson asset.
     *
     * AppSync requires authentication. The Lambda then verifies
     * premium entitlement and the full publication hierarchy.
     *
     * The caller provides only lessonId and asset type.
     * The S3 path is resolved exclusively by the backend.
     */
    getPremiumLessonAssetUrl: a
      .query()
      .arguments({
        lessonId:
          a.id().required(),

        assetType:
          a.string().required(),
      })
      .returns(
        a.string(),
      )
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          premiumLessonAssetUrl,
        ),
      ),

    /*
     * Task answer endpoint.
     *
     * Authentication is enforced by AppSync.
     * Premium authorization is enforced by the Lambda.
     */
    getTaskAnswer: a
      .query()
      .arguments({
        taskId:
          a.id().required(),
      })
      .returns(
        a.ref(
          "TaskAnswer",
        ),
      )
      .authorization((allow) => [
        allow.authenticated(),
      ])
      .handler(
        a.handler.function(
          taskAnswer,
        ),
      ),

    /*
     * Full task solution endpoint.
     *
     * Authentication is enforced by AppSync.
     * Premium authorization is enforced by the Lambda.
     */
    getTaskSolution: a
      .query()
      .arguments({
        taskId:
          a.id().required(),
      })
      .returns(
        a.ref(
          "TaskSolution",
        ),
      )
      .authorization((allow) => [
        allow.authenticated(),
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
        title:
          a.string().required(),

        slug:
          a.string().required(),

        description:
          a.string(),

        subject:
          a.enum([
            "MATHEMATICS",
            "PHYSICS",
            "COMPUTER_SCIENCE",
          ]),

        level:
          a.enum([
            "BASIC",
            "EXTENDED",
          ]),

        thumbnailPath:
          a.string(),

        order:
          a.integer().required(),

        published:
          a
            .boolean()
            .default(false),

        modules:
          a.hasMany(
            "Module",
            "courseId",
          ),
      })

      /*
       * Public outline access pattern:
       *
       * slug -> Course
       *
       * Only attributes required by the public course DTO and the
       * publication check are projected into the index.
       */
      .secondaryIndexes((index) => [
        index("slug")
          .name(
            "gsi-Course.slug",
          )
          .projection(
            "INCLUDE",
            [
              "title",
              "description",
              "subject",
              "level",
              "thumbnailPath",
              "order",
              "published",
            ],
          ),
      ])

      .authorization((allow) => [
        allow
          .group(
            "ADMIN",
          )
          .to([
            "create",
            "read",
            "update",
          ]),
      ]),

    /*
     * Raw Module model.
     */
    Module: a
      .model({
        courseId:
          a.id().required(),

        title:
          a.string().required(),

        slug:
          a.string().required(),

        description:
          a.string(),

        order:
          a.integer().required(),

        published:
          a
            .boolean()
            .default(false),

        course:
          a.belongsTo(
            "Course",
            "courseId",
          ),

        lessons:
          a.hasMany(
            "Lesson",
            "moduleId",
          ),
      })
      .authorization((allow) => [
        allow
          .group(
            "ADMIN",
          )
          .to([
            "create",
            "read",
            "update",
          ]),
      ]),

    /*
     * Raw Lesson model.
     *
     * videoPath and materialsPath remain internal fields used by
     * ADMIN and backend asset-access functions.
     */
    Lesson: a
      .model({
        moduleId:
          a.id().required(),

        title:
          a.string().required(),

        slug:
          a.string().required(),

        description:
          a.string(),

        durationMinutes:
          a.integer(),

        order:
          a.integer().required(),

        videoPath:
          a.string(),

        materialsPath:
          a.string(),

        published:
          a
            .boolean()
            .default(false),

        module:
          a.belongsTo(
            "Module",
            "moduleId",
          ),

        notes:
          a.hasMany(
            "LessonNote",
            "lessonId",
          ),

        tasks:
          a.hasMany(
            "LessonTask",
            "lessonId",
          ),
      })
      .authorization((allow) => [
        allow
          .group(
            "ADMIN",
          )
          .to([
            "create",
            "read",
            "update",
          ]),
      ]),

    /*
     * Raw lesson notes.
     */
    LessonNote: a
      .model({
        lessonId:
          a.id().required(),

        title:
          a.string().required(),

        content:
          a
            .string()
            .required(),

        order:
          a.integer().required(),

        lesson:
          a.belongsTo(
            "Lesson",
            "lessonId",
          ),
      })
      .authorization((allow) => [
        allow.group(
          "ADMIN",
        ),
      ]),

    /*
     * Raw lesson tasks.
     *
     * This model contains answer and solution and is ADMIN only.
     */
    LessonTask: a
      .model({
        lessonId:
          a.id().required(),

        title:
          a.string().required(),

        content:
          a
            .string()
            .required(),

        answer:
          a.string(),

        solution:
          a.string(),

        order:
          a.integer().required(),

        lesson:
          a.belongsTo(
            "Lesson",
            "lessonId",
          ),
      })
      .authorization((allow) => [
        allow.group(
          "ADMIN",
        ),
      ]),

    /*
     * Legal document acceptance history.
     */
    LegalAcceptance: a
      .model({
        userId:
          a.string().required(),

        owner:
          a.string().required(),

        termsVersion:
          a
            .string()
            .required(),

        privacyVersion:
          a
            .string()
            .required(),

        acceptedAt:
          a
            .datetime()
            .required(),
      })
      .authorization((allow) => [
        allow
          .ownerDefinedIn(
            "owner",
          )
          .to([
            "read",
          ]),

        allow
          .group(
            "ADMIN",
          )
          .to([
            "read",
          ]),
      ]),

    /*
     * Accepts the current legal document versions.
     */
    acceptCurrentLegal: a
      .mutation()
      .arguments({
        termsVersion:
          a.string().required(),

        privacyVersion:
          a.string().required(),
      })
      .returns(
        a.boolean(),
      )
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
      .resource(
        postConfirmation,
      )
      .to([
        "mutate",
      ]),
  ]);

export type Schema =
  ClientSchema<
    typeof schema
  >;

export const data =
  defineData({
    schema,

    authorizationModes: {
      defaultAuthorizationMode:
        "userPool",

      apiKeyAuthorizationMode: {
        expiresInDays:
          365,
      },
    },
  });