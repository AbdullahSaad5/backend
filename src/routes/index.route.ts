import { Router } from "express";

// Routes
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { multer as files } from "./multer.route";
import { user } from "./user.route";
import { auth } from "./user-auth.route";
import { userCategory } from "./user-category.route";
import { supplier } from "./supplier.route";
import { supplierCategory } from "./supplier-category.routes";
import { productCategory } from "./product-category.route";
import { productBrand } from "./product-brand.route";
import { product } from "./product.route";
import { bundle } from "./bundle.route";
import { permissions } from "./permissions.route";
import { me } from "./me.route";
import { orderRoutes } from "./order.route";
import { cartRoutes } from "./cart.route";
import { variations } from "./variations.route";
import { paymentPolicy } from "./payment-policy.route";
import { descriminatorRouter } from "./descriminator.route";
import { faqsPolicy } from "./faqs-policy.route";
import { coupon } from "./coupon.route";
import { discount } from "./discount.route";
import { taxes } from "./taxes.route";
import { stock} from "./stock.route";

// Create a new router to handle all routes
const router: Router = Router();

router.use("/descriminator", descriminatorRouter);

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
  supplier,
  supplierCategory,
  stock,
  product,
  productCategory,
  productBrand,
  bundle,
  orderRoutes,
  cartRoutes,
  paymentPolicy,
  coupon,
  discount,
  taxes,
  faqsPolicy,
  // descriminator,
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
