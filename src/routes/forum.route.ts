import { ForumController } from "@/controllers/forum.controller";
import { Router } from "express";


export const Forum = (router: Router) => {
  router.post(
    "/",

    ForumController.createForum
  );

  router.get(
    "/",
    ForumController.getAllForums
  );

  router.put(
    "/:id",
    ForumController.updateForum
  );

  router.delete (
    "/:id",
    ForumController.deleteForum
  )

  router.get(
    "/:id",
    ForumController.getForumById
  )

};
