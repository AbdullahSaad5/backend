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
            "ADD_STOCK",
            "VIEW_STOCK",
            "VIEW_LISTING",
            "ADD_LISTING",
            "MANAGE_DISCOUNTS",
          ],
        },
        bundleManagement: {
          parent: "MANAGE_BUNDLES",
          children: [
            // "ADD_SUPPLIERS_CATEGORY",
            // "VIEW_SUPPLIERS_CATEGORY",
            "ADD_BUNDLES",
            "VIEW_BUNDLES",
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
          children: [
            "VIEW_BLOGS_CATEGORY",
            "ADD_BLOGS_CATEGORY",
            "VIEW_BLOGS",
            "ADD_BLOGS",
            "VIEW_GAMERS_COMMUNITY",
            "ADD_GAMERS_COMMUNITY",
          ],
        },

         accountingManagement: {
          parent: "MANAGE_ACCOUNTING",
          children: [
            "ADD_EXPENSE_CATEGORY",
            "VIEW_EXPENSE_CATEGORY",
            "ADD_EXPENSE",
            "VIEW_EXPENSE",
            "VIEW_REVENUE",
            "ADD_REVENUE",
            "VIEW_INVENTORY_PURCHASES",
          ],
        },
        hrManagement: {
          parent: "HR_MANAGEMENET",
          children: [
            "VIEW_EMPLOYEES",
            "ADD_EMPLOYEES",
            "VIEW_WORK_SHIFT",
            "ADD_WORK_SHIFT",
            "VIEW_ATTENDANCE",
          ],
        },
        complaintsManagement: {
          parent: "COMPLAINTS_MANAGEMENET",
          children: [
            "VIEW_COMPLAINTS_CATEGORY",
            "ADD_COMPLAINTS_CATEGORY",
            "VIEW_COMPLAINTS",
            "ADD_COMPLAINTS",
          ],
        },
        guideManagement: {
          parent: "MANAGE_GUIDES",
          children: [
            "VIEW_GUIDES_CATEGORY",
            "ADD_GUIDE_CATEGORY",
            "VIEW_GUIDES",
            "ADD_GUIDES",
          ],
        },
        ticketing: {
          parent: "MANAGE_TICKETING",
        },
        documents: {
          parent: "MANAGE_DOCUMENTS",
        },
        policies: {
          parent: "MANAGE_POLICIES",
          children: [
            "VIEW_CUSTOM_POLICIES",
            "ADD_CUSTOM_POLICIES",
            "VIEW_PAYMENT_POLICIES",
            "ADD_PAYMENT_POLICIES",
            "VIEW_FULFILLMENT_POLICIES",
            "ADD_FULFILLMENT_POLICIES",
            "VIEW_RETURN_POLICIES",
            "ADD_RETURN_POLICIES",
            "ADD_SUBSCRIPTIONS",
            "VIEW_SUBSCRIPTIONS",
            "ADD_FAQ_CATEGORY",
            "VIEW_FAQ_CATEGORY",
            "ADD_FAQS",
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
