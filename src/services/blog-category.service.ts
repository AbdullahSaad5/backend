import { BlogCategory } from "@/models/blog-category.model";

export const BlogCategoryService = {
  createCategory: (name: String, description: string, image: string) => {
    const newBlogCategory = new BlogCategory({ name, description, image });
    return newBlogCategory.save();
  },

  editCategory: (
    id: string,
    data: { name?: string; description?: string; image?: string }
  ) => {
    return BlogCategory.findByIdAndUpdate(id, data, { new: true });
  },

  deleteCategory: (id: string) => {
    const category = BlogCategory.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  },

  getAllCategory: async (
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      category?: string;
      search?: string;
    } = {}
  ) => {
    const {
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "desc",
      category,
      search,
    } = options;

    // Build query
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const blogCategories = await BlogCategory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await BlogCategory.countDocuments(query);

    return {
      blogCategories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
    // return BlogCategory.find();
  },

  getById: (id: string) => {
    return BlogCategory.findById(id);
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await BlogCategory.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );
    if (!updatedCategory) {
      throw new Error("Category not found");
    }
    return updatedCategory;
  },
};
