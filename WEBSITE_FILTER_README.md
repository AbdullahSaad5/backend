# Website Filter System

This document explains the new filtering capabilities added to the website listings API, enabling dynamic, category-specific filtering for different product types.

## 🚀 New Features

### 1. **Advanced Filtering Endpoint**

- **POST** `/website/allListings/filter` - Get filtered results with category-specific filters
- Supports dynamic technical attributes based on product categories
- Advanced sorting and pagination

### 2. **Category-Specific Filter Discovery**

- **GET** `/website/filters/:categoryId` - Get available filters for a specific category
- Automatically detects technical attributes and available values
- Provides price ranges, brands, conditions, and stock status

### 3. **Global Filter Overview**

- **GET** `/website/filters` - Get all available filters across categories
- Helps build comprehensive filter UIs
- Shows category-specific filter variations

## 🔧 How It Works

### Dynamic Filter Generation

The system automatically analyzes your product data to generate relevant filters:

```javascript
// For a "Laptops" category, you might get:
{
  "filters": {
    "priceRange": { "min": 299.99, "max": 2999.99 },
    "brands": ["Dell", "HP", "Lenovo", "MSI"],
    "conditions": ["new_new", "refurbished_refurbished"],
    "attributes": {
      "processor": ["Intel i5", "Intel i7", "Intel i9"],
      "ram": ["8GB", "16GB", "32GB"],
      "storage": ["256GB SSD", "512GB SSD", "1TB SSD"]
    }
  }
}

// For a "Smartphones" category, you might get:
{
  "filters": {
    "priceRange": { "min": 99.99, "max": 1299.99 },
    "brands": ["Apple", "Samsung", "Google"],
    "attributes": {
      "storage": ["64GB", "128GB", "256GB"],
      "color": ["Black", "White", "Blue", "Red"]
    }
  }
}
```

### Smart Attribute Detection

The system automatically detects technical attributes from your `prodTechInfo` field and makes them available as filters. This means:

- **No manual configuration** needed for new product types
- **Automatic updates** when you add new technical specifications
- **Category-specific relevance** - only shows relevant attributes per category

## 📱 Frontend Integration

### Step 1: Get Available Filters

```javascript
// Get filters for a specific category
const getCategoryFilters = async (categoryId) => {
  const response = await fetch(`/website/filters/${categoryId}`);
  const data = await response.json();
  return data.data.filters;
};

// Get all available filters
const getAllFilters = async () => {
  const response = await fetch("/website/filters");
  const data = await response.json();
  return data.data;
};
```

### Step 2: Build Dynamic Filter UI

```javascript
const buildFilterUI = (filters) => {
  // Price range slider
  const priceSlider = createPriceRangeSlider(filters.priceRange.min, filters.priceRange.max);

  // Brand checkboxes
  const brandCheckboxes = filters.brands.map((brand) => createCheckbox("brand", brand, brand));

  // Dynamic technical attributes
  const attributeFilters = Object.entries(filters.attributes).map(([key, values]) => {
    if (Array.isArray(values)) {
      return createMultiSelect(key, values, key);
    } else {
      return createInput(key, key);
    }
  });

  return { priceSlider, brandCheckboxes, attributeFilters };
};
```

### Step 3: Apply Filters

```javascript
const applyFilters = async (filters) => {
  const response = await fetch("/website/allListings/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });

  const data = await response.json();
  return data.data.products;
};

// Example usage
const results = await applyFilters({
  productCategory: "64f8a1b2c3d4e5f6a7b8c9d0",
  priceRange: { min: 500, max: 2000 },
  brand: ["Dell", "HP"],
  attributes: {
    processor: "Intel i7",
    ram: "16GB",
  },
  inStock: true,
  sortBy: "price",
  sortOrder: "asc",
});
```

## 🎯 Use Cases

### E-commerce Product Browsing

- **Category pages** with relevant filters
- **Search results** with advanced filtering
- **Product comparison** tools
- **Wishlist** and **favorites** filtering

### Inventory Management

- **Stock filtering** by availability
- **Price range** analysis
- **Category performance** tracking
- **Product attribute** analysis

### Customer Experience

- **Smart recommendations** based on filters
- **Personalized search** results
- **Mobile-friendly** filter interfaces
- **Accessibility** features

## 🔍 Filter Types

### Basic Filters

- **Search**: Text search in names, brands, descriptions
- **Status**: Draft/Published
- **Type**: Product/Part/Bundle
- **Category**: Product category
- **Date Range**: Creation date filtering
- **Featured/Blocked**: Boolean flags

### Advanced Filters

- **Price Range**: Min/max price with validation
- **Brand**: Multiple brand selection
- **Condition**: Product condition types
- **Stock**: In-stock availability
- **Sorting**: Price, name, date sorting

### Dynamic Filters

- **Technical Attributes**: Automatically detected from `prodTechInfo`
- **Category-Specific**: Relevant attributes per category
- **Real-time**: Updates automatically with data changes

## 🚦 Getting Started

### 1. Test the API

```bash
# Run the test script
node scripts/test-website-filters.js

# Or test manually with curl
curl -X POST http://localhost:3000/website/allListings/filter \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "laptop", "page": 1, "limit": 10}'
```

### 2. Check Available Filters

```bash
# Get filters for a specific category
curl http://localhost:3000/website/filters/YOUR_CATEGORY_ID

# Get all available filters
curl http://localhost:3000/website/filters
```

### 3. Integrate with Frontend

- Use the filter discovery endpoints to build dynamic UIs
- Implement progressive enhancement for better UX
- Add caching for frequently accessed filter data

## 📊 Performance Tips

### Database Optimization

- Ensure proper indexes on frequently filtered fields
- Use compound indexes for common filter combinations
- Monitor query performance with MongoDB explain

### Caching Strategy

- Cache filter results for categories
- Implement Redis caching for frequently accessed data
- Use browser caching for static filter data

### Frontend Optimization

- Debounce filter changes to avoid excessive API calls
- Implement virtual scrolling for large result sets
- Use progressive loading for filter options

## 🐛 Troubleshooting

### Common Issues

1. **No filters returned**
   - Check if category has products
   - Verify `publishToWebsite: true` on listings
   - Ensure `isBlocked: false` on listings

2. **Filters not updating**
   - Check if new products have been added
   - Verify technical attributes are in `prodTechInfo`
   - Clear any cached filter data

3. **Performance issues**
   - Check database indexes
   - Implement pagination
   - Use appropriate `limit` values

### Debug Mode

Enable detailed logging by checking the console output:

```javascript
// The API logs detailed query information
console.log("Filtered Website listings query:", JSON.stringify(query, null, 2));
```

## 🔮 Future Enhancements

### Planned Features

- **Filter presets** for common searches
- **Saved searches** for users
- **Filter analytics** and insights
- **AI-powered** filter suggestions
- **Multi-language** filter support

### Customization Options

- **Filter priority** configuration
- **Custom filter** definitions
- **Filter grouping** and organization
- **Conditional filter** display

## 📚 Additional Resources

- [API Documentation](./docs/WEBSITE_FILTER_API.md)
- [Test Scripts](./scripts/test-website-filters.js)
- [Database Schema](./src/models/)
- [Service Implementation](./src/services/website.service.ts)

## 🤝 Support

For questions or issues:

1. Check the troubleshooting section above
2. Review the API documentation
3. Run the test scripts to verify functionality
4. Contact the development team

---

**Happy Filtering! 🎉**
