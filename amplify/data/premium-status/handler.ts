import {
  getPremiumAccessStatus,
} from "../../shared/premium-access";

import type {
  Schema,
} from "../resource";

export const handler:
  Schema["getMyPremiumStatus"]["functionHandler"] =
  async (event) => {
    const entitlementTableName =
      process.env
        .ENTITLEMENT_TABLE_NAME
        ?.trim();

    if (
      !entitlementTableName
    ) {
      console.error(
        "Premium status table configuration is incomplete.",
      );

      throw new Error(
        "Nie udało się pobrać statusu Premium.",
      );
    }

    try {
      const status =
        await getPremiumAccessStatus({
          identity:
            event.identity,

          entitlementTableName,
        });

      return {
        active:
          status.active,

        accessUntil:
          status.accessUntil,
      };
    } catch (error) {
      console.error(
        "Failed to load premium status.",
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );

      throw new Error(
        "Nie udało się pobrać statusu Premium.",
      );
    }
  };