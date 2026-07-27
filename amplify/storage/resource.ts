import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "coursePlatformFiles",

  access: (allow) => ({
    "courses/*": [
      allow.authenticated.to(["read"]),
      allow.groups(["ADMIN"]).to([
        "read",
        "write",
        "delete",
      ]),
    ],
  }),
});