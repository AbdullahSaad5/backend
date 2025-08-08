
import { CommentController } from "@/controllers/comments.controller";

import { Router } from "express";


export const Comment = (router: Router) => {

   //Get comment by forum
  router.get(
    "/:forumId",
    CommentController.getCommentsByForum
  );

  //Add comment
  router.post (
    "/",
    CommentController.addComment
  );


//Reply to the specific parent Id
  router.post (
    "/reply/:parentId",
    CommentController.replyToComment
  );



  router.patch (
   "/like/:id",
   CommentController.likeComment
  );

   router.patch (
   "/dislike/:id",
   CommentController.dislikeComment
  );

  router.delete (
    "/:id",
    CommentController.deleteComment
  );


};
