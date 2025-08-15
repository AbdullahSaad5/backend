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

  editblog: (id: string, data: { title?: string; content?: string; category?: string }) => {
    return Iblog.findByIdAndUpdate(id, data, { new: true });
  },
  deleteblog: (id: string) => {
    const blog = Iblog.findByIdAndDelete(id);
    if (!blog) {
      throw new Error("blog not found");
    }
    return blog;
  },

  getAllblog: async (
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      category?: string;
      search?: string;
    } = {}
  ) => {
    const { page = 1, limit = 10, sortBy = "date", sortOrder = "desc", category, search } = options;

    // Build query
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const blogs = await Iblog.find(query).sort(sort).skip(skip).limit(limit).lean();

    // Get total count for pagination
    const total = await Iblog.countDocuments(query);

    return {
      blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  },

  getById: (id: string) => {
    return Iblog.findById(id);
  },
};
