# Frontend Integration Guide

This guide shows how to integrate the email client system with your frontend application.

## Frontend Flow Implementation

### Step 1: Choose Mail Provider (Initial Page)

```jsx
// EmailProviderSelection.jsx
import React from "react";

const EmailProviderSelection = () => {
  const handleProviderSelect = async (provider) => {
    try {
      const response = await fetch("/api/email-account/oauth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          isPrimary: false, // Can be set based on user choice
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Redirect to OAuth URL
        window.location.href = data.data.oauthUrl;
      }
    } catch (error) {
      console.error("Error initiating OAuth:", error);
    }
  };

  return (
    <div className="email-provider-selection">
      <h2>Add Email Account</h2>

      <div className="provider-options">
        <button onClick={() => handleProviderSelect("gmail")} className="provider-btn gmail">
          <i className="fab fa-google"></i>
          Add Gmail Account
        </button>

        <button onClick={() => handleProviderSelect("outlook")} className="provider-btn outlook">
          <i className="fab fa-microsoft"></i>
          Add Outlook Account
        </button>

        <button onClick={() => setShowManualForm(true)} className="provider-btn manual">
          <i className="fas fa-server"></i>
          Add Other Mail Account
        </button>
      </div>
    </div>
  );
};
```

### Step 2a: OAuth Flow (Gmail/Outlook)

```jsx
// OAuthCallback.jsx
import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const provider = searchParams.get("provider");
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    if (error) {
      // Handle OAuth error
      navigate("/email-accounts/error", {
        state: { error, provider },
      });
    } else {
      // Handle OAuth success
      navigate("/email-accounts/success", {
        state: { provider, email },
      });
    }
  }, [searchParams, navigate]);

  return <div>Processing OAuth callback...</div>;
};
```

### Step 2b: Manual Account Form

```jsx
// ManualAccountForm.jsx
import React, { useState, useEffect } from "react";

const ManualAccountForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    accountName: "",
    emailAddress: "",
    password: "",
    isPrimary: false,
    incomingServer: {
      host: "",
      port: 993,
      security: "ssl",
      username: "",
    },
    outgoingServer: {
      host: "",
      port: 587,
      security: "tls",
      username: "",
      requiresAuth: true,
    },
  });

  const [detectedProvider, setDetectedProvider] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Auto-detect provider when email changes
  useEffect(() => {
    const detectProvider = async (email) => {
      if (!email || !email.includes("@")) return;

      setIsDetecting(true);
      try {
        const response = await fetch("/api/email-account/detect-provider", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emailAddress: email }),
        });

        const data = await response.json();
        if (data.success) {
          setDetectedProvider(data.data);

          // Auto-fill form with detected settings
          if (data.data.defaultConfig) {
            setFormData((prev) => ({
              ...prev,
              accountType: data.data.defaultConfig.accountType,
              incomingServer: {
                ...data.data.defaultConfig.incomingServer,
                username: email,
              },
              outgoingServer: {
                ...data.data.defaultConfig.outgoingServer,
                username: email,
              },
              settings: data.data.defaultConfig.settings,
            }));
          }
        }
      } catch (error) {
        console.error("Error detecting provider:", error);
      } finally {
        setIsDetecting(false);
      }
    };

    if (formData.emailAddress) {
      detectProvider(formData.emailAddress);
    }
  }, [formData.emailAddress]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/email-account/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          userId: currentUser.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess(data.data);
      }
    } catch (error) {
      console.error("Error creating manual account:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="manual-account-form">
      <h3>Add Custom Email Account</h3>

      <div className="form-group">
        <label>Account Name</label>
        <input
          type="text"
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="My Work Email"
          required
        />
      </div>

      <div className="form-group">
        <label>Email Address</label>
        <div className="email-input-container">
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
            placeholder="user@yourdomain.com"
            required
          />
          {isDetecting && <span className="detecting-indicator">Detecting provider...</span>}
        </div>
        {detectedProvider && (
          <div className="provider-detected">
            <span className="provider-badge">{detectedProvider.detectedProvider?.name || "Custom Provider"}</span>
            {detectedProvider.detectedProvider?.note && (
              <small className="provider-note">{detectedProvider.detectedProvider.note}</small>
            )}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Password or App Password"
          required
        />
        <small>If 2FA is enabled, use an App Password from your mail provider's security settings.</small>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.isPrimary}
            onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
          />
          Set as Primary Account
        </label>
      </div>

      <button type="submit" className="btn-primary">
        Connect Account
      </button>
    </form>
  );
};
```

## Email Client Dashboard

### Account Management

```jsx
// EmailDashboard.jsx
import React, { useState, useEffect } from "react";

const EmailDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's email accounts
  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/email-account/accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
        if (data.data.length > 0) {
          setSelectedAccount(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  // Fetch emails from selected account
  const fetchEmails = async (accountId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email-client/emails/${accountId}?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setEmails(data.data.emails);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchEmails(selectedAccount._id);
    }
  }, [selectedAccount]);

  return (
    <div className="email-dashboard">
      <div className="sidebar">
        <h3>Email Accounts</h3>
        {accounts.map((account) => (
          <div
            key={account._id}
            className={`account-item ${selectedAccount?._id === account._id ? "active" : ""}`}
            onClick={() => setSelectedAccount(account)}
          >
            <div className="account-info">
              <strong>{account.accountName}</strong>
              <span>{account.emailAddress}</span>
              {account.isPrimary && <span className="primary-badge">Primary</span>}
            </div>
            <div className="account-status">
              <span className={`status ${account.connectionStatus}`}>{account.connectionStatus}</span>
            </div>
          </div>
        ))}

        <button onClick={() => navigate("/add-email-account")} className="add-account-btn">
          + Add Account
        </button>
      </div>

      <div className="main-content">
        {selectedAccount && (
          <>
            <div className="email-header">
              <h2>{selectedAccount.accountName}</h2>
              <button onClick={() => setShowCompose(true)}>Compose</button>
            </div>

            <div className="email-list">
              {loading ? (
                <div>Loading emails...</div>
              ) : (
                emails.map((email) => (
                  <EmailItem key={email.seqno} email={email} onSelect={() => setSelectedEmail(email)} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

### Compose Email

```jsx
// ComposeEmail.jsx
import React, { useState } from "react";

const ComposeEmail = ({ onSend, onCancel }) => {
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    text: "",
    html: "",
    cc: "",
    bcc: "",
  });

  const handleSend = async () => {
    try {
      const response = await fetch("/api/email-client/send/primary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();
      if (data.success) {
        onSend(data.data);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  return (
    <div className="compose-email">
      <div className="compose-header">
        <h3>New Message</h3>
        <button onClick={onCancel}>×</button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className="form-group">
          <label>To:</label>
          <input
            type="email"
            value={emailData.to}
            onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Subject:</label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Message:</label>
          <textarea
            value={emailData.text}
            onChange={(e) => setEmailData({ ...emailData, text: e.target.value })}
            rows={10}
            required
          />
        </div>

        <div className="compose-actions">
          <button type="submit" className="btn-send">
            Send
          </button>
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
```

### Email Actions (Reply/Forward)

```jsx
// EmailActions.jsx
import React, { useState } from "react";

const EmailActions = ({ email, accountId }) => {
  const [showReply, setShowReply] = useState(false);
  const [showForward, setShowForward] = useState(false);

  const handleReply = async (replyData) => {
    try {
      const response = await fetch(`/api/email-client/reply/${accountId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalEmailId: email.headers.from,
          subject: `Re: ${email.headers.subject}`,
          text: replyData.text,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowReply(false);
        // Show success message
      }
    } catch (error) {
      console.error("Error replying to email:", error);
    }
  };

  const handleForward = async (forwardData) => {
    try {
      const response = await fetch(`/api/email-client/forward/${accountId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalEmailId: email.headers.from,
          to: forwardData.to,
          subject: `Fwd: ${email.headers.subject}`,
          text: forwardData.text,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowForward(false);
        // Show success message
      }
    } catch (error) {
      console.error("Error forwarding email:", error);
    }
  };

  return (
    <div className="email-actions">
      <button onClick={() => setShowReply(true)}>Reply</button>
      <button onClick={() => setShowForward(true)}>Forward</button>

      {showReply && <ReplyModal email={email} onSend={handleReply} onCancel={() => setShowReply(false)} />}

      {showForward && <ForwardModal email={email} onSend={handleForward} onCancel={() => setShowForward(false)} />}
    </div>
  );
};
```

## API Integration Examples

### Get All Emails from All Accounts

```javascript
const fetchAllEmails = async () => {
  try {
    const response = await fetch("/api/email-client/emails?limit=50&offset=0", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      // data.data.emails contains emails from all accounts
      // data.data.accountResults contains sync results for each account
      return data.data;
    }
  } catch (error) {
    console.error("Error fetching all emails:", error);
  }
};
```

### Send Email from Specific Account

```javascript
const sendEmailFromAccount = async (accountId, emailData) => {
  try {
    const response = await fetch(`/api/email-client/send/${accountId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(emailData),
    });

    const data = await response.json();
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
```

### Get Account Statistics

```javascript
const getAccountStats = async () => {
  try {
    const response = await fetch("/api/email-client/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error("Error getting account stats:", error);
  }
};
```

## Error Handling

```jsx
// ErrorBoundary.jsx
import React from "react";

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);

      // Log error to your error tracking service
      console.error("Email client error:", error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="error-boundary">
        <h3>Something went wrong</h3>
        <p>Please try refreshing the page or contact support.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  return children;
};
```

## CSS Styling Examples

```css
/* Email Dashboard Styles */
.email-dashboard {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 300px;
  border-right: 1px solid #eee;
  padding: 20px;
}

.account-item {
  padding: 10px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  cursor: pointer;
  border-radius: 4px;
}

.account-item.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.account-item:hover {
  background-color: #f5f5f5;
}

.primary-badge {
  background-color: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.status.connected {
  background-color: #4caf50;
  color: white;
}

.status.disconnected {
  background-color: #f44336;
  color: white;
}

.status.error {
  background-color: #ff9800;
  color: white;
}

.main-content {
  flex: 1;
  padding: 20px;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.compose-email {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.compose-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-send {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancel {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
```

This integration guide provides a complete foundation for building a full-featured email client frontend that works seamlessly with your OAuth-based email account system.
