import {
  defineStorage,
} from "@aws-amplify/backend";

import {
  deleteAdminCourse,
} from "../data/delete-admin-course/resource";

import {
  premiumLessonAssetUrl,
} from "../data/premium-lesson-asset-url/resource";

export const storage =
  defineStorage({
    name: "coursePlatformFiles",

    access: (allow) => ({
      "courses/*": [
        /*
         * Premium lesson assets stay private.
         *
         * ADMIN authors files directly. Premium users never receive broad
         * bucket permissions; premiumLessonAssetUrl brokers read access after
         * entitlement/publication checks in trusted backend code.
         */
        allow
          .groups(["ADMIN"])
          .to([
            "read",
            "write",
            "delete",
          ]),

        allow
          .resource(
            premiumLessonAssetUrl,
          )
          .to(["read"]),

        /*
         * Course deletion needs only object listing and deletion.
         *
         * Defining this grant here is intentional: Amplify Storage owns the
         * bucket and injects COURSE_PLATFORM_FILES_BUCKET_NAME into the Lambda.
         * This keeps the CloudFormation dependency one-way (Storage -> Data)
         * and avoids Data -> Storage -> Data circular dependencies.
         *
         * "list" is narrower than "read": the deletion Lambda can enumerate
         * keys under this prefix but is not granted GetObject/download access.
         */
        allow
          .resource(
            deleteAdminCourse,
          )
          .to([
            "list",
            "delete",
          ]),
      ],

      "course-thumbnails/*": [
        /*
         * Thumbnails are deliberately separated from premium lesson assets.
         * Public read on this namespace therefore does not expose videos or
         * downloadable course materials stored under courses/*.
         */
        allow
          .groups(["ADMIN"])
          .to([
            "read",
            "write",
            "delete",
          ]),

        allow
          .authenticated
          .to(["read"]),

        allow
          .guest
          .to(["read"]),

        /*
         * The same ADMIN course-deletion Lambda cleans the course thumbnail
         * namespace. Again, it receives list/delete only — no upload/read.
         */
        allow
          .resource(
            deleteAdminCourse,
          )
          .to([
            "list",
            "delete",
          ]),
      ],
    }),
  });
