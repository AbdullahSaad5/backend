import { Iblog } from "@/models/blog.model";

export const blogService = {
  createblog: (
    title: String,
    content: string,
    category: string,
    altText: string,
    seoTitle: string,
    authorName: string,
    coverImage: string,
    focusKeyword: [string]
  ) => {
    const newblog = new Iblog({
      title,
      content,
      category,
      altText,
      seoTitle,
      authorName,
      coverImage,
      focusKeyword,
    });
    return newblog.save();
  },

  editblog: (
    id: string,
    data: { title?: string; content?: string; category?: string }
  ) => {
    return Iblog.findByIdAndUpdate(id, data, { new: true });
  },
  deleteblog: (id: string) => {
    const blog = Iblog.findByIdAndDelete(id);
    if (!blog) {
      throw new Error("blog not found");
    }
    return blog;
  },

  getAllblog: () => {
    return Iblog.find();
  },

  getById: (id: string) => {
    return Iblog.findById(id);
  },
};
