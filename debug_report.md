# SaaS Dashboard Debug Report

## Issue Summary
The Dashboard is failing to load data because the backend API returns **401 Unauthorized** to the Browser, even though the same credentials and token work perfectly via `curl`.

## Status
*   **Login**: ✅ **Functional**. Returns a valid JWT.
*   **Token Storage**: ✅ **Functional**. Token is stored in Pinia and Cookie.
*   **Token Attachment**: ✅ **Functional**. Frontend logs confirm `Authorization: Bearer <token>` is attached.
*   **CORS**: ✅ **Verified**. Server returns `Access-Control-Allow-Origin` for `http://localhost:3000` and `http://localhost:3001`.
*   **Dashboard Data**: ❌ **Fails (Browser Only)**. Returns 401 on `/api/v1/nodes/`.

## Diagnostic Data

### 1. Working Request (Curl)
The backend **accepts** the token when sent via command line:
```bash
curl -v https://wp.zimpricecheck.com:8081/api/v1/nodes/ \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Origin: http://localhost:3000"
# Result: 200 OK, Returns JSON Array
```

### 2. Failing Request (Browser)
The backend **rejects** the token when sent from Chrome:
*   **URL**: `https://wp.zimpricecheck.com:8081/api/v1/nodes/`
*   **Method**: `GET`
*   **Headers**:
    *   `Authorization`: `Bearer <YOUR_TOKEN>` (Confirmed present)
    *   `Origin`: `http://localhost:3000`
    *   `Referer`: `http://localhost:3000/`
*   **Result**: `401 Unauthorized`

### 3. Token Inspection
The token being received is valid and has not expired:
```json
{
  "sub": "admin@example.com",
  "role": "super_admin",
  "exp": 1766670251  (Valid Future Timestamp)
}
```

## Suspected Causes & Recommendations

Since `curl` works but Browser fails, the Backend is likely rejecting the request based on a secondary factor or a browser-specific header mismatch.

1.  **Strict Referer/Origin Policy**:
    *   The firewall or API (WordOps / Nginx) might be blocking requests where the `Referer` header matches `localhost`.
    *   **Test**: Check Nginx error logs on `wp.zimpricecheck.com`.

2.  **Cookie Interference**:
    *   If the browser is sending other cookies (e.g. for the main domain `zimpricecheck.com`), they might be conflicting with the Auth header.
    *   **Test**: Try in Incognito mode.

3.  **WAF / Security Rules**:
    *   Cloudflare or a local security plugin might be flagging the browser signature as suspicious when accessing the API port directy.

## Next Step
Please check the **Nginx Error Logs** or **Application Logs** on the Master Server (`wp.zimpricecheck.com`) for the specific reason behind the previous 401s.
