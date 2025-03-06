import { Router } from "express";
import { customPolicyController } from "@/controllers";
import { authGuard } from "@/guards"; // Assuming you have an authentication guard

const router = Router();

export const customPolicy= (router: Router) => {
  // Optionally, protect routes with authentication
  // router.use(authGuard.isAuth);
  
    router.post("/", customPolicyController.create); // Create policy in both DB & eBay
    router.put("/:id", customPolicyController.update); // Update policy in both DB & eBay
  
    // Separate GET requests
    router.get("/", customPolicyController.getAll); // Fetch all policies (DB & eBay)
    router.get("/:id", customPolicyController.getById); // Fetch single policy from DB only
  };
  
