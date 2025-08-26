# eBay Chat API Testing Guide

## Overview
This system works directly with eBay's API - no database storage. All data comes from and goes to eBay in real-time.

## Base URL
```
http://localhost:3000/api/ebay-chat
```

## Required Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## 1. Get Conversations from eBay
**GET** `/conversations`

**Description**: Fetches all conversations from eBay orders and messages
- Gets orders from last 25 days
- Fetches messages for each order/item
- Groups by buyer
- Shows unread counts

**Response**:
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "ebayItemId": "123456789",
        "orderId": "ORDER123",
        "buyerUsername": "buyer123",
        "sellerUsername": "seller123",
        "itemTitle": "iPhone 13",
        "itemPrice": 999.99,
        "lastMessage": "When will you ship?",
        "lastMessageAt": "2024-01-15T10:30:00Z",
        "unreadCount": 2,
        "totalMessages": 5
      }
    ],
    "unreadCount": 2,
    "total": 1
  }
}
```

---

## 2. Send Message to Buyer
**POST** `/send`

**Body**:
```json
{
  "ebayItemId": "123456789",
  "buyerUsername": "buyer123",
  "content": "Your order has been shipped!",
  "sellerUsername": "seller123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "ebayItemId": "123456789",
    "buyerUsername": "buyer123",
    "sellerUsername": "seller123",
    "content": "Your order has been shipped!",
    "messageType": "SELLER_TO_BUYER",
    "status": "SENT",
    "sentAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## 3. Get Messages for Specific Item/Buyer
**GET** `/messages/{ebayItemId}/{buyerUsername}`

**Example**: `/messages/123456789/buyer123`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response**:
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "ebayItemId": "123456789",
        "buyerUsername": "buyer123",
        "sellerUsername": "seller123",
        "content": "When will you ship?",
        "messageType": "BUYER_TO_SELLER",
        "status": "DELIVERED",
        "sentAt": "2024-01-15T10:30:00Z",
        "isRead": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1
    }
  }
}
```

---

## 4. Search Messages
**GET** `/search?query=shipping`

**Response**:
```json
{
  "success": true,
  "message": "Messages found",
  "data": [
    {
      "ebayItemId": "123456789",
      "buyerUsername": "buyer123",
      "content": "When will you ship?",
      "messageType": "BUYER_TO_SELLER",
      "sentAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 5. Get Unread Count
**GET** `/unread-count`

**Response**:
```json
{
  "success": true,
  "message": "Unread count retrieved",
  "data": 5
}
```

---

## 6. Sync Messages (Optional)
**POST** `/sync`

**Description**: Fetches fresh data from eBay (same as conversations endpoint)

**Response**:
```json
{
  "success": true,
  "message": "Messages synced successfully"
}
```

---

## 7. Mark Message as Read
**PATCH** `/messages/{messageId}/read`

**Response**:
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

---

## 8. Mark Conversation as Read
**PATCH** `/conversations/{ebayItemId}/{buyerUsername}/read`

**Response**:
```json
{
  "success": true,
  "message": "Conversation marked as read"
}
```

---

## Testing Flow

1. **Start with Conversations**: `GET /conversations`
   - This will show you all available conversations from eBay

2. **Send a Test Message**: `POST /send`
   - Use a real eBay item ID and buyer username

3. **Get Messages**: `GET /messages/{itemId}/{buyer}`
   - View the conversation history

4. **Search**: `GET /search?query=test`
   - Search through all messages

---

## Important Notes

- **Real eBay Data**: Only works if you have actual eBay orders with messages
- **Token Required**: Make sure your eBay access token is valid
- **Environment**: Uses sandbox by default (`EBAY_TOKEN_ENV=sandbox`)
- **No Database**: All data comes directly from eBay API
- **Real-time**: Every request fetches fresh data from eBay

---

## Error Responses

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

Common errors:
- `No valid eBay access token available`
- `Missing required fields`
- `Failed to get orders from eBay`
- `Failed to send message to eBay`
