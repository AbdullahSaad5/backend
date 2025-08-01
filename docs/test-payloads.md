# Test Payloads for Email Service

This document provides test payloads for manually testing the email endpoints using Postman.

## Instructions

1. **Set Base URL**: Start your server and note the base URL. For example, `http://localhost:5000` if running locally.
2. **Headers**: Ensure to include `Content-Type: application/json` in request headers.

## Test Payloads

### 1. Send Single Email

- **Endpoint**: `POST /mailbox/send`
- **Headers**:
  - `Content-Type: application/json`
- **Body** (JSON):
  ```json
  {
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "Hello, this is a test email.",
    "html": "<p>Hello, this is a <strong>test email</strong>.</p>",
    "from": "Sender Name <sender@example.com>",
    "replyTo": "sender@example.com",
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"]
  }
  ```

### 2. Send Bulk Emails

- **Endpoint**: `POST /mailbox/send-bulk`
- **Headers**:
  - `Content-Type: application/json`
- **Body** (JSON):
  ```json
  {
    "emails": [
      {
        "to": "recipient1@example.com",
        "subject": "Bulk Test Email 1",
        "body": "Hello, this is the first bulk email test.",
        "html": "<p>Hello, this is the first <strong>bulk email</strong> test.</p>"
      },
      {
        "to": "recipient2@example.com",
        "subject": "Bulk Test Email 2",
        "body": "Hello, this is the second bulk email test.",
        "html": "<p>Hello, this is the second <strong>bulk email</strong> test.</p>"
      }
    ]
  }
  ```

### 3. Test Connection

- **Endpoint**: `GET /mailbox/test-connection`

### 4. Get Service Status

- **Endpoint**: `GET /mailbox/service-status`

### 5. Retrieve Emails

- **Endpoint**: `GET /mailbox/emails`

### 6. Retrieve Email by ID

- **Endpoint**: `GET /mailbox/emails/:id`
  - **Replace `:id`** with the actual email ID you wish to retrieve.

## Postman Setup

1. **Create New Request**: Use Postman's `New` button to create a request.
2. **Select Method**: Choose appropriate HTTP method (GET or POST) for your test.
3. **Enter URL**: Input the endpoint URL with the base URL.
4. **Add Headers**: Click on `Headers` and add `Content-Type: application/json`.
5. **Input Body**: Click on `Body`, select `raw`, and copy the JSON payload from above examples.

Happy testing! For further assistance, feel free to ask.
