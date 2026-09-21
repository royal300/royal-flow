# 🔌 3rd-Party Integration Guide: Expense Sync & Approval Webhook

Welcome to the **Royal 300 Expense Synchronization Guide**. This document is designed specifically for **3rd-party developers and external portals** (ad management tools, payment portals, CRMs, or external client dashboards) integrating with the Royal 300 system.

---

## 📋 Overview of the Synchronization Flow

```
[ Your 3rd-Party System ]                              [ Royal 300 System ]
          │                                                      │
          │ 1. Submit Expense (with your externalId & webhookUrl)│
          │    POST /api/external/add-pending-expense            │
          │─────────────────────────────────────────────────────>│ Stored in "Pending" queue
          │ <────────────────────────────────────────────────────│ Returns pendingExpenseId
          │                                                      │
          │ 2. User edits in your portal (While still Pending)   │
          │    PUT /api/external/update-pending-expense/:id      │
          │─────────────────────────────────────────────────────>│ Updates Pending record
          │                                                      │
          │                                                      │ 3. Royal 300 Admin reviews &
          │                                                      │    clicks "Approve"
          │                                                      │
          │ 4. Royal 300 fires Webhook (event: expense.approved) │
          │<─────────────────────────────────────────────────────│ POST to your webhookUrl
          │                                                      │
          │ 5. Your server updates local DB to "Approved"        │
          │    Your UI IMMEDIATELY removes the "Edit" button!    │
```

---

## 🔗 Base URL
All API requests must be sent to the live Royal 300 API server:
```http
https://staff.royal300.com
```

---

## 🛠️ Step-by-Step Implementation Guide

---

### Step 1: Submit an Expense with `externalId` and `webhookUrl`

When a transaction or ad top-up occurs in your system, send a `POST` request to Royal 300.

* **Endpoint**: `POST https://staff.royal300.com/api/external/add-pending-expense`
* **Headers**: `Content-Type: application/json`

#### 📥 Request Parameters
| Field | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `externalId` | String | **Recommended** | Your system's unique database ID for this transaction (e.g., `"TXN_98721"`). Used to link records across both systems. |
| `webhookUrl` | String | **Recommended** | Your HTTPS endpoint where Royal 300 should send a webhook notification the moment this expense is approved (e.g., `"https://your-site.com/api/webhooks/royal300"`). |
| `clientName` | String | **Yes** | Name of the client or company. |
| `date` | String | **Yes** | Date in `YYYY-MM-DD` format (e.g., `"2026-09-22"`). |
| `amount` | Number | **Yes** | Total gross amount in ₹. |
| `gst` | Boolean | No (Default: `false`)| Set to `true` if amount includes 18% GST (system auto-calculates base + GST). |
| `submittedBy` | String | No | Submitter or portal name (e.g., `"Portal User (Rahul)"`). |
| `category` | String | No (Default: `"Meta AD"`)| Expense category. |
| `bank` | String | No (Default: `"HDFC"`)| Bank account name. |
| `paymentMode` | String | No (Default: `"GPay"`)| Mode of payment (`"GPay"`, `"Online"`, `"NEFT"`). |
| `remarks` | String | No | Notes or transaction references. |
| `rfNo` | String | No | Reference number (can be left blank). |

#### 📨 Example Request
```json
{
  "externalId": "TXN_98721",
  "webhookUrl": "https://your-site.com/api/webhooks/royal300",
  "submittedBy": "Ad Manager System",
  "clientName": "Royal Gaming Corp",
  "date": "2026-09-22",
  "amount": 25000,
  "gst": true,
  "remarks": "Campaign recharge for Facebook/Instagram ads"
}
```

#### 📤 Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Pending expense added successfully from 3rd party website!",
  "pendingExpenseId": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721",
  "pendingExpense": {
    "id": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
    "externalId": "TXN_98721",
    "status": "Pending",
    "clientName": "Royal Gaming Corp",
    "amount": 25000,
    "isGst": true,
    "gstAmount": 3813.56,
    "withoutGstAmount": 21186.44,
    "createdAt": "2026-09-22T00:15:30.000Z"
  }
}
```

> **What to do in your database**: Save `pendingExpenseId` alongside your local transaction record, and store its status as `"Pending"`.

---

### Step 2: Set Up Your Webhook Receiver (To Receive Approval)

Create a public `POST` route on your server (matching the `webhookUrl` you provided in Step 1).

#### What Royal 300 Dispatches to Your Server:
* **Method**: `POST`
* **Headers**:
  * `Content-Type: application/json`
  * `User-Agent: Royal300-Webhook-Dispatcher/1.0`

#### Example Webhook Payload Sent by Royal 300:
```json
{
  "event": "expense.approved",
  "id": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721",
  "status": "Approved",
  "approvedAt": "2026-09-22T01:30:15.123Z",
  "amount": 25000,
  "clientName": "Royal Gaming Corp",
  "category": "Meta AD",
  "bank": "HDFC",
  "paymentMethod": "GPay",
  "rfNo": "HDFC-REF-4458",
  "isGst": true,
  "gstAmount": 3813.56,
  "withoutGstAmount": 21186.44,
  "month": "September",
  "year": "2026"
}
```

#### Code Examples for Your Webhook Receiver:

##### Node.js / Express Example:
```javascript
// POST /api/webhooks/royal300
app.post('/api/webhooks/royal300', express.json(), async (req, res) => {
  const { event, externalId, id, status, approvedAt } = req.body;

  if (event === 'expense.approved') {
    console.log(`Expense ${externalId || id} was APPROVED by Royal 300 Admin!`);

    // 1. Update status in your local database
    await db.expenses.update(
      { externalId: externalId },
      { $set: { status: 'Approved', approvedAt: approvedAt } }
    );

    // 2. Respond with 200 OK
    return res.status(200).json({ received: true });
  }

  res.status(200).json({ received: true });
});
```

##### PHP Example:
```php
<?php
// webhook.php
$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if ($data && isset($data['event']) && $data['event'] === 'expense.approved') {
    $externalId = $data['externalId'] ?? null;
    
    // Update local database record to Approved
    $stmt = $pdo->prepare("UPDATE transactions SET status = 'Approved', approved_at = :approved_at WHERE external_id = :id");
    $stmt->execute([
        ':approved_at' => $data['approvedAt'],
        ':id'          => $externalId
    ]);

    http_response_code(200);
    echo json_encode(['received' => true]);
    exit;
}

http_response_code(200);
echo json_encode(['received' => true]);
?>
```

##### Python / FastAPI Example:
```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/api/webhooks/royal300")
async def royal300_webhook(request: Request):
    data = await request.json()
    if data.get("event") == "expense.approved":
        external_id = data.get("externalId")
        # Update local DB record status to Approved
        await update_transaction_status(external_id=external_id, status="Approved")
    return {"received": True}
```

---

### Step 3: Remove the "Edit" Button in Your Frontend Panel

In your frontend user dashboard, check the transaction's status:

```jsx
// React / Vue / Angular / HTML Example
function ExpenseRow({ expense }) {
  const isApproved = expense.status === 'Approved';

  return (
    <tr>
      <td>{expense.date}</td>
      <td>{expense.clientName}</td>
      <td>₹{expense.amount}</td>
      <td>
        <span className={isApproved ? "badge-approved" : "badge-pending"}>
          {expense.status}
        </span>
      </td>
      <td>
        {/* HIDE OR REMOVE THE EDIT BUTTON ONCE APPROVED */}
        {!isApproved ? (
          <button onClick={() => openEditModal(expense)}>
            ✏️ Edit
          </button>
        ) : (
          <span className="text-muted">🔒 Locked (Approved)</span>
        )}
      </td>
    </tr>
  );
}
```

---

### Step 4: Allow Users to Edit While Still "Pending"

If a user clicks "Edit" in your portal before Royal 300 approves it, send a `PUT` request:

* **Endpoint**: `PUT https://staff.royal300.com/api/external/update-pending-expense/:id`
* **Note**: In `:id`, you can pass either your own `externalId` OR the Royal 300 `pendingExpenseId`.
* **Headers**: `Content-Type: application/json`

#### 📥 Updatable Fields (Send only what changed):
`amount`, `clientName`, `date`, `gst`, `remarks`, `category`, `bank`, `paymentMethod`, `rfNo`.

#### 📨 Example Edit Request:
```http
PUT https://staff.royal300.com/api/external/update-pending-expense/TXN_98721
Content-Type: application/json

{
  "amount": 30000,
  "remarks": "Corrected ad spend budget from client request"
}
```

#### ✅ If Still Pending (`200 OK` Success):
```json
{
  "success": true,
  "message": "Pending expense updated successfully!",
  "pendingExpenseId": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721",
  "pendingExpense": {
    "amount": 30000,
    "isGst": true,
    "gstAmount": 4576.27,
    "withoutGstAmount": 25423.73,
    "remarks": "Corrected ad spend budget from client request",
    "updatedAt": "2026-09-22T00:25:00.000Z"
  }
}
```

#### 🔒 If Already Approved (`403 Forbidden` Locked):
If the Royal 300 Admin approved the expense before your user clicked Save, Royal 300 protects against stale edits by rejecting the request:
```json
HTTP/1.1 403 Forbidden

{
  "success": false,
  "error": "Expense has already been approved by Admin and cannot be modified.",
  "status": "Approved",
  "expenseId": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721"
}
```
> **Action**: If you receive a `403 Forbidden`, immediately mark the record as `Approved` in your UI and notify the user: *"This expense was just approved by the admin and cannot be changed."*

---

### Step 5: Check Status & Editability Anytime (Optional Fallback)

If your webhook receiver was offline or you want to check the status when a user opens the edit modal:

* **Endpoint**: `GET https://staff.royal300.com/api/external/expense-status/:id`
* **Note**: Pass your `externalId` or Royal 300 ID in `:id`.

#### Response When Still Pending:
```json
{
  "success": true,
  "id": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721",
  "status": "Pending",
  "canEdit": true,
  "amount": 25000,
  "clientName": "Royal Gaming Corp"
}
```

#### Response When Already Approved:
```json
{
  "success": true,
  "id": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "externalId": "TXN_98721",
  "status": "Approved",
  "canEdit": false,
  "amount": 25000,
  "clientName": "Royal Gaming Corp",
  "approvedAt": "2026-09-22T01:30:15.123Z"
}
```

---

## 🏁 3rd-Party Developer Checklist

| Task | Description | Status |
| :--- | :--- | :---: |
| 1. Store ID | Include `externalId` when sending `POST /api/external/add-pending-expense`. | ⬜ |
| 2. Webhook URL | Include `webhookUrl` in the payload pointing to your HTTPS listener. | ⬜ |
| 3. Create Listener | Create a `POST` handler for the webhook on your server to receive `expense.approved`. | ⬜ |
| 4. Update Status | When webhook is received, update local record status to `Approved`. | ⬜ |
| 5. Conditional UI | In your frontend UI, display the "Edit" button **only** when `status !== 'Approved'`. | ⬜ |
| 6. Edit Route | Wire up user edits to `PUT /api/external/update-pending-expense/:id`. | ⬜ |
| 7. Handle 403 | If the edit API returns `403 Forbidden`, hide the edit button and alert user. | ⬜ |

---

## 💬 Support & Troubleshooting
* Base URL: `https://staff.royal300.com`
* If a webhook fails to deliver due to network timeouts, the Royal 300 server retries and logs the event, but your system can always poll `GET /api/external/expense-status/:id` as a fallback.
