import { Router } from "express";

// Routes
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
import { workshift } from "./workshift.route";
import { permissions } from "./permissions.route";
import { me } from "./me.route";
import { document } from "./documents.route"
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
import { amazon } from "./amazon.route";
import { complaintcategory } from "./complaintcategory.route";
import { expense } from "./expense.route";
import { expensecategory } from "./expensecategory.route";
import { complaint } from "./complaint.routes";
import { revenue } from "./revenue.routes";

// Create a new router to handle all routes
const router: Router = Router();

router.use("/discriminator", discriminatorRouter);

// Define all routes
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
  ticket,
  amazon,
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
  chat,
  revenue,
  // discriminator,
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
