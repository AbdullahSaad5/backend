
import { ForumTopicController } from "@/controllers/forum-topic.controller";
import { Router } from "express";


export const ForumTopic = (router: Router) => {
  router.post(
    "/",

    ForumTopicController.createForumTopic

  );

  router.get(
    "/",
    ForumTopicController.getAllForumTopics
  );

  router.put(
    "/:id",
    ForumTopicController.updateForumTopic
  );

  router.delete(
    "/:id",
    ForumTopicController.deleteForumTopic
  );

   router.get(
      "/:id",
      ForumTopicController.getForumTopicById
    );


};
