import {
  defineStorage,
} from "@aws-amplify/backend";

import {
  premiumLessonAssetUrl,
} from "../data/premium-lesson-asset-url/resource";

export const storage =
  defineStorage({
    name: "coursePlatformFiles",

    access: (allow) => ({
      "courses/*": [
        /*
         * ADMIN needs direct Storage access for course authoring:
         * preview, upload, replacement and deletion.
         */
        allow
          .groups(["ADMIN"])
          .to([
            "read",
            "write",
            "delete",
          ]),

        /*
         * Premium asset broker.
         *
         * The Lambda can only read course assets. It cannot upload
         * or delete objects.
         */
        allow
          .resource(
            premiumLessonAssetUrl,
          )
          .to(["read"]),
      ],
    }),
  });