import { Router } from "express";

import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { multer as files } from "./multer.route";
import { user } from "./user.route";
import { auth } from "./user-auth.route";
import { userCategory } from "./user-category.route";
import { supplier } from "./supplier.route";
import { supplierCategory } from "./supplier-category.routes";
import { blogCategory } from "./blog-category.route";
import { productCategory } from "./product-category.route";
import { productBrand } from "./product-brand.route";
import { listing } from "./listing.route";
import { inventory } from "./inventory.route";
import { bundle } from "./bundle.route";
import { permissions } from "./permissions.route";
import { me } from "./me.route";
import { document } from "./documents.route";
import { blog } from "./blog.route";
import { orderRoutes } from "./order.route";
import { cartRoutes } from "./cart.route";
import { ticket } from "./ticket.route";
import { variations } from "./variations.route";
import { gamerComunity } from "./gamer-comunity.route";
import { paymentPolicy } from "./payment-policy.route";
import { discriminatorRouter } from "./discriminator.route";
import { faqsPolicy } from "./faqs-policy.route";
import { coupon } from "./coupon.route";
import { discount } from "./discount.route";
import { taxes } from "./taxes.route";
import { stock } from "./stock.route";
import { customPolicy } from "./custom-policy.route";
import { fulfillmentPolicy } from "./fulfillment-policy.route";
import { returnPolicy } from "./return-policy.route";
import { chat } from "./chat.route";
import { ebay } from "./ebay.route";
import { multer } from "./multer.route";
import { ebayChat } from "./ebay-chat.route";
import { ebayChatSandbox } from "./ebay-chat-sandbox.route";
import { amazon } from "./amazon.route";
import { amazonChat } from "./amazon-chat.route";
import { complaintcategory } from "./complaintcategory.route";
import { expense } from "./expense.route";
import { workshift } from "./workshift.route";
import { expensecategory } from "./expensecategory.route";
import { complaint } from "./complaint.routes";
import { revenue } from "./revenue.routes";
import { recurringExpense } from "./recurring-expense.route";
import { financialReporting } from "./financial-reporting.route";
import { profitReporting } from "./profit-reporting.route";
import { guidescategory } from "./guidescategory.route";
import { guide } from "./guide.route";
import { faqcategory } from "./faqcategory.route";
import { faq } from "./faq.route";
import { gtin } from "./gtin.route";
import { newsletter } from "./newsletter.route";
import { employee } from "./employee.route";
import { workmode } from "./workmode.route";
import { attendance } from "./attendance.route";
import { leaveRequest } from "./leave-request.route";
import { payroll } from "./payroll.route";
import { processedpayroll } from "./processedpayroll.route";
import { leadscategory } from "./leadscategory.route";
import { lead } from "./lead.route";
import { task } from "./task.route";
import { heroSlider } from "./hero-slider.routes";
import { featuredCategory } from "./featured-category.routes";
import { featuredSale } from "./featured-sale.routes";
import { marketing } from "./marketing.route";
import { mailbox } from "./mailbox.route";
import { Forum } from "./forum.route";
import { ForumTopic } from "./forum-topic.route";
import { team } from "./team.route";
import { emailAccount } from "./email-account.route";
import { announcementBar } from "./announcement-bar.routes";
import { emailClient } from "./email-client.route";
import { documentation } from "./documentation.route";
import { orderTaskType as orderTaskTypes } from "./order-task-type.route";
import { productTypeWorkflow as productTypeWorkflows } from "./product-type-workflow.route";
import { orderRoutes as orders } from "./order.route";
import { globalPayrollSettings } from "./global-payroll-settings.route";
import tokenManagement from "./token-management.route";

import { ForumCategory } from "./forum-category.route";
import { Comment } from "./comment.route";
import { gmailWebhook } from "./gmail-webhook.route";
import { multiInstanceGmail } from "./multi-instance-gmail.route";
import { website } from "./website.route";
import { deals } from "./deal.route";
const router: Router = Router();

router.use("/discriminator", discriminatorRouter);
router.use("/tokens", tokenManagement);

const routes: {
  [key: string]: (router: Router) => void;
} = {
  me,
  files,
  permissions,
  user,
  auth,
  userCategory,
  variations,
  complaint,
  blog,
  multer,
  expense,
  document,
  expensecategory,
  workshift,
  supplier,
  complaintcategory,
  supplierCategory,
  stock,
  listing,
  inventory,
  ebay,
  ebayChat,
  ebayChatSandbox,
  ticket,
  gtin,
  amazon,
  amazonChat,
  productCategory,
  gamerComunity,
  blogCategory,
  productBrand,
  customPolicy,
  returnPolicy,
  bundle,
  orders,
  cartRoutes,
  fulfillmentPolicy,
  paymentPolicy,
  coupon,
  discount,
  taxes,
  faqsPolicy,
  revenue,
  recurringExpense,
  financialReporting,
  profitReporting,
  guidescategory,
  guide,
  faqcategory,
  faq,
  newsletter,
  leadscategory,
  lead,
  chat,
  employee,
  workmode,
  attendance,
  leaveRequest,
  payroll,
  processedpayroll,
  task,
  heroSlider,
  featuredCategory,
  featuredSale,
  marketing,
  mailbox,
  Forum,
  ForumTopic,

  ForumCategory,
  Comment,
  team,
  emailAccount,
  announcementBar,
  emailClient,
  documentation,
  orderTaskTypes,
  productTypeWorkflows,
  globalPayrollSettings,
  multiInstanceGmail,
  website,
  deals,
};

// Loop through all routes and pass the router to each route
for (const route in routes) {
  // Add the route to the router
  const routeHandler = routes[route];
  const basePath = `/${route.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
  const tempRouter = Router();

  routeHandler(tempRouter);
  router.use(basePath, tempRouter);
}

// Add Gmail webhook route with correct path
const gmailWebhookRouter = Router();
gmailWebhook(gmailWebhookRouter);
router.use("/gmail-webhook", gmailWebhookRouter);

router.all("*", (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: ReasonPhrases.NOT_FOUND,
    status: StatusCodes.NOT_FOUND,
  });
});

// Export the router
export { router };
