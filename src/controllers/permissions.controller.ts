import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const permissionsController = {
  getPermissions: (req: Request, res: Response) => {
    // ! Permissions spell should exactly match with permissions in sidebar array of frontend
    try {
      const permissions = {
        dashboard: {
          parent: "DASHBOARD",
        },
        userManagement: {
          parent: "MANAGE_USERS",
          children: [
            "ADD_USERS_CATEGORY",
            "VIEW_USERS_CATEGORY",
            "ADD_USERS",
            "VIEW_USERS",
          ],
        },
        supplierManagement: {
          parent: "MANAGE_SUPPLIERS",
          children: [
            "ADD_SUPPLIERS_CATEGORY",
            "VIEW_SUPPLIERS_CATEGORY",
            "ADD_SUPPLIERS",
            "VIEW_SUPPLIERS",
          ],
        },
        inventoryManagement: {
          parent: "MANAGE_INVENTORY",
          children: [
            "ADD_INVENTORY_CATEGORY",
            "VIEW_INVENTORY_CATEGORY",
            "ADD_INVENTORY",
            "VIEW_INVENTORY",
            "MANAGE_VARIATION",
            "MANAGE_DISCOUNTS",
          ],
        },
        // discountAndTaxes: {
        //   parent: "MANAGE_TAXES_AND_DISCOUNTS",
        //   children: [
        //     "ADD_TAXES",
        //     "VIEW_TAXES",
        //     "ADD_DISCOUNTS",
        //     "VIEW_DISCOUNTS",
        //   ],
        // },
        gamersCommunity: {
          parent: "GAMERS_COMMUNITY",
          children: ["VIEW_GAMERS_COMMUNITY", "VIEW_BLOGS"],
        },
        policies: {
          parent: "MANAGE_POLICIES",
          children: [
            "VIEW_POLICIES",
            "VIEW_PAYMENT_POLICIES",
            "VIEW_POSTAGE_POLICIES",
            "VIEW_SUBSCRIPTIONS",
            "VIEW_FAQS",
          ],
        },
        setting: {
          parent: "SETTINGS",
        },
      };
      // console.log(permissions);

      res.status(StatusCodes.CREATED).json({
        success: true,
        permissions,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting permissions",
      });
    }
  },
};
