# Royal 300 Staff Management - External Integration API Documentation

Welcome to the **Royal 300 Staff Management External API Integration Guide**. This document outlines how third-party portals, payment pages, and external systems can automatically submit expense data directly into the Royal 300 system.

---

## 🔗 Base URL
All API requests must be sent over HTTPS to our live server:
```http
https://staff.royal300.com
```

---

## 1. Add Direct Approved Expense Endpoint
Use this endpoint when an expense should immediately be recorded as **Approved** directly into the main `Expense` table.

* **URL**: `/api/external/add-expense`
* **Method**: `POST`
* **Headers**:
  * `Content-Type: application/json`

### Request Parameters (`JSON Body`)
| Parameter | Type | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | String | **Yes** | — | Date of expense in `YYYY-MM-DD` format (e.g., `"2026-07-22"`). |
| `clientName` | String | **Yes** | — | Name of the client or company (e.g., `"ABC Corporation"`). |
| `category` | String | **Yes** | — | Category name (e.g., `"Ad Expense"`, `"Office Rent"`). |
| `amount` | Number | **Yes** | — | Total gross amount paid in ₹ (numeric value only, e.g., `5000`). |
| `gst` | Boolean | No | `false` | Set to `true` if the amount includes 18% GST. The system will automatically calculate `withoutGstAmount = amount / 1.18` and `gstAmount = amount - withoutGstAmount`. |
| `bank` | String | No | `"HDFC"` | Bank account associated with the payment. |
| `paymentMethod` | String | No | `"GPay"` | Payment mode used (`"GPay"`, `"Online"`, `"NEFT"`, etc.). |
| `remarks` | String | No | `""` | Additional notes or payment details. |
| `rfNo` | String | No | `""` | Bank reference number (normally kept blank (`""`) so Admin can verify later). |

#### Example JSON Request Body (`POST /api/external/add-expense`)
```json
{
  "date": "2026-07-22",
  "clientName": "ABC Corporation",
  "category": "Ad Expense",
  "amount": 5000,
  "gst": true,
  "bank": "HDFC",
  "paymentMethod": "GPay",
  "remarks": "Payment confirmed via simple payment portal"
}
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Expense added successfully from external website!",
  "expenseId": "c3a8e912-4b67-4f11-9a21-88f1d2e3c4b5",
  "expense": {
    "id": "c3a8e912-4b67-4f11-9a21-88f1d2e3c4b5",
    "staffId": "website_user",
    "staffName": "Website Portal (xyz.com)",
    "status": "Approved",
    "date": "2026-07-22",
    "category": "Ad Expense",
    "paymentMethod": "GPay",
    "bank": "HDFC",
    "clientName": "ABC Corporation",
    "rfNo": "",
    "amount": 5000,
    "isGst": true,
    "gstAmount": 762.71,
    "withoutGstAmount": 4237.29,
    "month": "July",
    "year": "2026",
    "remarks": "Payment confirmed via simple payment portal",
    "createdAt": "2026-07-22T11:42:15.123Z"
  }
}
```

---

## 2. Add Pending Expense Endpoint (Requires Admin Approval)
Use this endpoint when data submitted by a 3rd party website or team member should be placed in the **Pending Expenses Table** so an Admin can review, verify, and approve it later.

* **URL**: `/api/external/add-pending-expense`
* **Method**: `POST`
* **Headers**:
  * `Content-Type: application/json`

### Request Parameters (`JSON Body`)
| Parameter | Type | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `submittedBy` | String | No | `"3rd Party Portal"` | Name of the person, portal, or system submitting (e.g., `"Rahul (Ad Manager)"`). |
| `clientName` | String | **Yes** | — | Name of the client or company. |
| `date` | String | **Yes** | — | Date of expense (`YYYY-MM-DD`). |
| `amount` | Number | **Yes** | — | Total gross amount paid in ₹. |
| `category` | String | No | `"Meta AD"` | Automatically defaults to `"Meta AD"` if not passed. |
| `bank` | String | No | `"HDFC"` | Automatically defaults to `"HDFC"` if not passed. |
| `paymentMode` / `paymentMethod` | String | No | `"GPay"` | Payment mode (`"GPay"`, `"Online"`, etc.). |
| `gst` | Boolean | No | `false` | Set to `true` to enable automatic 18% inclusive GST calculation. |
| `remarks` | String | No | `""` | Optional notes or ad account details. |
| `rfNo` | String | No | `""` | Bank reference or transaction ID. Kept blank (`""`) if omitted. |

#### Example JSON Request Body (`POST /api/external/add-pending-expense`)
```json
{
  "submittedBy": "Amit (Meta Ad Team)",
  "clientName": "Royal300 Gaming Corp",
  "date": "2026-07-22",
  "amount": 25000,
  "gst": true,
  "remarks": "Meta ad campaign top-up from 3rd party portal"
}
```
*(Notice how `category`, `bank`, and `paymentMethod` are automatically set to their default values `"Meta AD"`, `"HDFC"`, and `"GPay"` when omitted).*

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Pending expense added successfully from 3rd party website!",
  "pendingExpenseId": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
  "pendingExpense": {
    "id": "f9b8c7d6-e5a4-3b2c-1d0e-9f8e7d6c5b4a",
    "staffId": "external_user",
    "staffName": "Amit (Meta Ad Team)",
    "status": "Pending",
    "date": "2026-07-22",
    "category": "Meta AD",
    "paymentMethod": "GPay",
    "bank": "HDFC",
    "clientName": "Royal300 Gaming Corp",
    "rfNo": "",
    "amount": 25000,
    "isGst": true,
    "gstAmount": 3813.56,
    "withoutGstAmount": 21186.44,
    "month": "July",
    "year": "2026",
    "remarks": "Meta ad campaign top-up from 3rd party portal",
    "createdAt": "2026-07-22T12:05:01.456Z"
  }
}
```

---

## 💻 Code Examples for 3rd Party Developers

### 1. JavaScript (Frontend Fetch / Node.js)
```javascript
async function submitExpense() {
  const url = "https://staff.royal300.com/api/external/add-pending-expense";
  const payload = {
    submittedBy: "Payment Portal System",
    clientName: "Global Tech Inc",
    date: new Date().toISOString().split('T')[0], // Today's date (YYYY-MM-DD)
    amount: 11800,
    gst: true,
    remarks: "Auto-submitted after user confirmation"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      console.log("✅ Success! Record ID:", result.pendingExpenseId);
    } else {
      console.error("❌ API Error:", result.error);
    }
  } catch (error) {
    console.error("❌ Network Error:", error);
  }
}
```

### 2. cURL (Command Line / Shell)
```bash
curl -X POST https://staff.royal300.com/api/external/add-pending-expense \
  -H "Content-Type: application/json" \
  -d '{
    "submittedBy": "3rd Party Payment Script",
    "clientName": "Royal VIP Account",
    "date": "2026-07-22",
    "amount": 5000,
    "gst": true,
    "remarks": "Campaign recharge"
  }'
```

### 3. PHP (cURL Integration for Websites)
```php
<?php
$url = 'https://staff.royal300.com/api/external/add-pending-expense';

$data = [
    'submittedBy' => 'PHP Payment Backend',
    'clientName'  => 'Client XYZ',
    'date'        => date('Y-m-d'),
    'amount'      => 7500,
    'gst'         => true,
    'remarks'     => 'Transaction completed online'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);
if ($httpCode === 200 && $result['success']) {
    echo "Expense added successfully! ID: " . $result['pendingExpenseId'];
} else {
    echo "Error adding expense: " . ($result['error'] ?? 'Unknown error');
}
?>
```

### 4. Python (requests)
```python
import requests
from datetime import date

url = "https://staff.royal300.com/api/external/add-pending-expense"
payload = {
    "submittedBy": "Python Automation Bot",
    "clientName": "Omega Traders",
    "date": date.today().strftime("%Y-%m-%d"),
    "amount": 10000,
    "gst": True,
    "remarks": "Automated ledger entry"
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    data = response.json()
    print(f"✅ Record saved! ID: {data.get('pendingExpenseId')}")
else:
    print(f"❌ Failed: {response.text}")
```

---

## ⚠️ Error Handling
If mandatory fields are missing (`date`, `clientName`, or `amount`) or invalid, the API returns a `400 Bad Request`:
```json
{
  "error": "Please provide date, clientName, and amount"
}
```
If a server-side error occurs during database save, it returns a `500 Internal Server Error`:
```json
{
  "error": "Failed to add external pending expense record"
}
```

---

## 🛠️ Key Automated Rules & Calculations
1. **GST Formula**: When `gst: true`, the server calculates:
   * $\text{withoutGstAmount} = \text{round}(\frac{\text{amount}}{1.18}, 2)$
   * $\text{gstAmount} = \text{round}(\text{amount} - \text{withoutGstAmount}, 2)$
2. **Date Breakdown**: The server automatically parses your `date` string and sets `month` (`"January"`, `"February"`, etc.) and `year` (`"2026"`) to perfectly align with analytics and reporting tables.
3. **Reference Number (`rfNo`)**: Kept blank (`""`) by default if omitted, allowing Admin staff to verify and enter the bank/transaction reference number during audit.
