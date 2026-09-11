import {
  defineAuth,
} from "@aws-amplify/backend";

import {
  postConfirmation,
} from "./post-confirmation/resource";

import {
  preSignUp,
} from "./pre-sign-up/resource";

export const auth =
  defineAuth({
    loginWith: {
      email: {
        verificationEmailStyle:
          "CODE",

        verificationEmailSubject:
          "Potwierdź konto w poprostumatma.pl",

        verificationEmailBody:
          (createCode) => `
        <!doctype html>
        <html lang="pl">
          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #020617;
              font-family: Arial, sans-serif;
              color: #f4f4f5;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              style="background-color: #020617; padding: 40px 16px;"
            >
              <tr>
                <td align="center">
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    style="
                      max-width: 560px;
                      background-color: #09090b;
                      border: 1px solid #27272a;
                      border-radius: 16px;
                      padding: 40px;
                    "
                  >
                    <tr>
                      <td>
                        <p
                          style="
                            margin: 0 0 24px;
                            color: #3b82f6;
                            font-size: 14px;
                            font-weight: 700;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                          "
                        >
                          Po prostu matma
                        </p>

                        <h1
                          style="
                            margin: 0 0 16px;
                            color: #fafafa;
                            font-size: 28px;
                            line-height: 1.25;
                          "
                        >
                          Potwierdź swój adres e-mail
                        </h1>

                        <p
                          style="
                            margin: 0 0 28px;
                            color: #a1a1aa;
                            font-size: 16px;
                            line-height: 1.6;
                          "
                        >
                          Wpisz poniższy kod na stronie weryfikacji,
                          aby dokończyć tworzenie konta.
                        </p>

                        <div
                          style="
                            margin: 0 0 28px;
                            padding: 18px;
                            background-color: #18181b;
                            border: 1px solid #3b82f6;
                            border-radius: 12px;
                            color: #60a5fa;
                            font-size: 30px;
                            font-weight: 700;
                            letter-spacing: 8px;
                            text-align: center;
                          "
                        >
                          ${createCode()}
                        </div>

                        <p
                          style="
                            margin: 0;
                            color: #71717a;
                            font-size: 13px;
                            line-height: 1.6;
                          "
                        >
                          Jeżeli nie zakładałeś konta, możesz zignorować
                          tę wiadomość.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      },
    },

    /*
     * MFA remains optional for normal platform users.
     *
     * ADMIN access is additionally guarded by the frontend so that
     * an administrator must configure TOTP before using /admin.
     */
    multifactor: {
      mode: "OPTIONAL",
      totp: true,
    },

    userAttributes: {
      "custom:terms_version": {
        dataType: "String",
        mutable: false,
        minLen: 1,
        maxLen: 16,
      },

      "custom:privacy_version": {
        dataType: "String",
        mutable: false,
        minLen: 1,
        maxLen: 16,
      },

      "custom:legal_accepted_at": {
        dataType: "String",
        mutable: false,
        minLen: 20,
        maxLen: 40,
      },
    },

    triggers: {
      preSignUp,
      postConfirmation,
    },

    senders: {
      email: {
        fromEmail:
          "noreply@poprostumatma.pl",

        fromName:
          "Po prostu matma",
      },
    },

    groups: [
      "ADMIN",
    ],
  });