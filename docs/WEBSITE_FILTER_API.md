# Website Filter API Documentation

This document describes the new filtering capabilities for the website listings API, enabling category-specific filtering and dynamic filter generation.

## Overview

The new filter system provides three main capabilities:

1. **Filtered Listings**: Get filtered results based on various criteria
2. **Category-Specific Filters**: Get available filters for a specific product category
3. **Global Filters**: Get all available filters across all categories

## API Endpoints

### 1. Filtered Listings

**POST** `/website/allListings/filter`

Get filtered website listings with advanced filtering options.

#### Request Body

```json
{
  "searchQuery": "gaming laptop",
  "status": "published",
  "listingType": "product",
  "productCategory": "64f8a1b2c3d4e5f6a7b8c9d0",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "isBlocked": false,
  "isFeatured": true,
  "page": 1,
  "limit": 20,
  "priceRange": {
    "min": 500,
    "max": 2000
  },
  "brand": ["Dell", "HP", "Lenovo"],
  "condition": ["new_new", "refurbished_refurbished"],
  "inStock": true,
  "attributes": {
    "processor": "Intel i7",
    "ram": ["8GB", "16GB"],
    "storage": "512GB SSD"
  },
  "sortBy": "price",
  "sortOrder": "asc"
}
```

#### Filter Parameters

| Parameter         | Type    | Description                                           | Example                    |
| ----------------- | ------- | ----------------------------------------------------- | -------------------------- |
| `searchQuery`     | string  | Search in product names, brands, and descriptions     | "gaming laptop"            |
| `status`          | string  | Product status: "draft" or "published"                | "published"                |
| `listingType`     | string  | Type: "product", "part", or "bundle"                  | "product"                  |
| `productCategory` | string  | Category ID or name                                   | "64f8a1b2c3d4e5f6a7b8c9d0" |
| `startDate`       | string  | Filter by creation date (ISO format)                  | "2024-01-01"               |
| `endDate`         | string  | Filter by creation date (ISO format)                  | "2024-12-31"               |
| `isBlocked`       | boolean | Filter blocked/unblocked products                     | false                      |
| `isFeatured`      | boolean | Filter featured products                              | true                       |
| `page`            | number  | Page number for pagination                            | 1                          |
| `limit`           | number  | Items per page                                        | 20                         |
| `priceRange.min`  | number  | Minimum price                                         | 500                        |
| `priceRange.max`  | number  | Maximum price                                         | 2000                       |
| `brand`           | array   | Array of brand names                                  | ["Dell", "HP"]             |
| `condition`       | array   | Array of condition types                              | ["new_new"]                |
| `inStock`         | boolean | Filter by stock availability                          | true                       |
| `attributes`      | object  | Dynamic technical attributes                          | {"processor": "Intel i7"}  |
| `sortBy`          | string  | Sort field: "price", "name", "createdAt", "updatedAt" | "price"                    |
| `sortOrder`       | string  | Sort direction: "asc" or "desc"                       | "asc"                      |

#### Response

```json
{
  "success": true,
  "message": "Filtered products fetched successfully",
  "data": {
    "products": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "sku": "LAPTOP-001",
        "name": "Gaming Laptop Dell XPS 15",
        "brand": "Dell",
        "category": {
          "id": "64f8a1b2c3d4e5f6a7b8c9d0",
          "name": "Laptops",
          "description": "High-performance laptops",
          "image": "laptop-category.jpg",
          "tags": ["computers", "portable"]
        },
        "description": "High-performance gaming laptop",
        "condition": "new",
        "pricing": {
          "retailPrice": 1299.99,
          "discountType": "percentage",
          "discountValue": 10,
          "currency": "GBP"
        },
        "stock": {
          "available": 15,
          "inStock": true
        },
        "technicalInfo": {
          "processor": "Intel i7-12700H",
          "ram": "16GB",
          "storage": "512GB SSD"
        }
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "totalPages": 3,
      "perPage": 20
    },
    "appliedFilters": {
      "searchQuery": "gaming laptop",
      "productCategory": "64f8a1b2c3d4e5f6a7b8c9d0"
    }
  }
}
```

### 2. Category-Specific Filters

**GET** `/website/filters/:categoryId`

Get available filters for a specific product category.

#### Path Parameters

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `categoryId` | string | MongoDB ObjectId of the category |

#### Response

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Laptops",
      "description": "High-performance laptops"
    },
    "filters": {
      "priceRange": {
        "min": 299.99,
        "max": 2999.99
      },
      "brands": ["Acer", "Dell", "HP", "Lenovo", "MSI"],
      "conditions": ["new_new", "refurbished_refurbished", "used_good"],
      "stockStatus": [true, false],
      "attributes": {
        "processor": ["Intel i5", "Intel i7", "Intel i9", "AMD Ryzen 5", "AMD Ryzen 7"],
        "ram": ["8GB", "16GB", "32GB", "64GB"],
        "storage": ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"],
        "screen_size": ["13.3\"", "14\"", "15.6\"", "17.3\""]
      }
    },
    "totalProducts": 156
  }
}
```

### 3. Global Filters

**GET** `/website/filters`

Get all available filters across all categories.

#### Response

```json
{
  "success": true,
  "data": {
    "globalFilters": {
      "priceRange": {
        "min": 9.99,
        "max": 4999.99
      },
      "brands": ["Acer", "Apple", "Dell", "HP", "Lenovo", "MSI", "Samsung"],
      "conditions": ["new_new", "refurbished_refurbished", "used_good", "used_like_new"],
      "listingTypes": ["product", "part", "bundle"],
      "stockStatus": [true, false]
    },
    "categoryFilters": {
      "64f8a1b2c3d4e5f6a7b8c9d0": {
        "category": {
          "id": "64f8a1b2c3d4e5f6a7b8c9d0",
          "name": "Laptops",
          "description": "High-performance laptops"
        },
        "filters": {
          "priceRange": {
            "min": 299.99,
            "max": 2999.99
          },
          "brands": ["Acer", "Dell", "HP", "Lenovo", "MSI"],
          "conditions": ["new_new", "refurbished_refurbished", "used_good"],
          "attributes": {
            "processor": ["Intel i5", "Intel i7", "Intel i9"],
            "ram": ["8GB", "16GB", "32GB"]
          }
        },
        "totalProducts": 156
      },
      "64f8a1b2c3d4e5f6a7b8c9d1": {
        "category": {
          "id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "name": "Smartphones",
          "description": "Mobile devices"
        },
        "filters": {
          "priceRange": {
            "min": 99.99,
            "max": 1299.99
          },
          "brands": ["Apple", "Samsung", "Google"],
          "conditions": ["new_new", "refurbished_refurbished"],
          "attributes": {
            "storage": ["64GB", "128GB", "256GB", "512GB"],
            "color": ["Black", "White", "Blue", "Red"]
          }
        },
        "totalProducts": 89
      }
    },
    "totalProducts": 245
  }
}
```

## Dynamic Attributes

The system automatically detects and provides filters for technical attributes stored in the `prodTechInfo` field. These attributes vary by category and product type.

### Common Technical Attributes

- **Laptops**: processor, ram, storage, screen_size, graphics_card
- **Smartphones**: storage, color, camera_resolution, battery_capacity
- **Parts**: compatibility, dimensions, material, weight
- **Bundles**: included_items, package_contents

## Usage Examples

### Example 1: Filter Gaming Laptops by Price and Brand

```javascript
const response = await fetch("/website/allListings/filter", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    productCategory: "64f8a1b2c3d4e5f6a7b8c9d0", // Laptops category
    priceRange: {
      min: 800,
      max: 2000,
    },
    brand: ["Dell", "HP", "Lenovo"],
    attributes: {
      processor: ["Intel i7", "Intel i9"],
      ram: ["16GB", "32GB"],
    },
    inStock: true,
    sortBy: "price",
    sortOrder: "asc",
  }),
});
```

### Example 2: Get Available Filters for Electronics Category

```javascript
const response = await fetch("/website/filters/64f8a1b2c3d4e5f6a7b8c9d0");
const filters = await response.json();

// Use filters to populate filter UI
const priceRange = filters.data.filters.priceRange;
const brands = filters.data.filters.brands;
const conditions = filters.data.filters.conditions;
```

### Example 3: Build Dynamic Filter UI

```javascript
// Get all available filters
const response = await fetch("/website/filters");
const allFilters = await response.json();

// Build category selector
const categories = Object.values(allFilters.data.categoryFilters);
categories.forEach((category) => {
  const option = document.createElement("option");
  option.value = category.category.id;
  option.textContent = category.category.name;
  categorySelect.appendChild(option);
});

// Update filters when category changes
categorySelect.addEventListener("change", async (e) => {
  const categoryId = e.target.value;
  const categoryFilters = await getCategoryFilters(categoryId);
  updateFilterUI(categoryFilters);
});
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid parameters (e.g., invalid category ID)
- `404 Not Found`: Category not found
- `500 Internal Server Error`: Server-side error

## Performance Considerations

- **Pagination**: Always use pagination for large result sets
- **Indexing**: Ensure proper database indexes on frequently filtered fields
- **Caching**: Consider caching filter results for frequently accessed categories
- **Query Optimization**: The system automatically optimizes queries based on provided filters

## Best Practices

1. **Start with Category Filters**: Get available filters for a category before building the filter UI
2. **Use Pagination**: Implement pagination for better user experience
3. **Validate Inputs**: Validate filter parameters on the client side
4. **Cache Results**: Cache filter results to reduce API calls
5. **Progressive Enhancement**: Start with basic filters and add advanced ones progressively

## Migration from Old API

The existing `/website/allListings` endpoint remains unchanged for backward compatibility. The new filter system is additive and doesn't break existing functionality.

## Support

For questions or issues with the filter API, please refer to the main API documentation or contact the development team.
