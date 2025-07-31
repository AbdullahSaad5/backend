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
import { marketing } from "./marketing.route";
import { mailbox } from "./mailbox.route";

const router: Router = Router();

router.use("/discriminator", discriminatorRouter);
router.use("/mailbox", mailbox);

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
  orderRoutes,
  cartRoutes,
  fulfillmentPolicy,
  paymentPolicy,
  coupon,
  discount,
  taxes,
  faqsPolicy,
  revenue,
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
  marketing,
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

router.all("*", (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: ReasonPhrases.NOT_FOUND,
    status: StatusCodes.NOT_FOUND,
  });
});

// Export the router
export { router };
