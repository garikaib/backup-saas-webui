# CORS Misconfiguration Report

## The Issue
The Dashboard is failing with `401 Unauthorized` (or Network Error) in the browser because the Backend is returning an **Invalid CORS Configuration**.

## Findings
We tested the API using `curl` to simulate a browser request:

```bash
curl -v https://wp.zimpricecheck.com:8081/api/v1/nodes/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Origin: http://localhost:3000"
```

### Response Headers
The backend returned:
```http
HTTP/2 200 OK
access-control-allow-origin: *
access-control-allow-credentials: true
```

## Why this fails
According to the [MDN Web Docs on CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials):

> **Reason:** The value of the `Access-Control-Allow-Origin` header is `*`, which overrides the credential support.
>
> **Fix:** To allow credentials (cookies, authorization headers, TLS client certificates), **Access-Control-Allow-Origin must specify an explicit origin** (e.g., `http://localhost:3000`), not a wildcard (`*`).

## Required Fix (Backend)
The backend (`main.py` request handler) is likely configured to return `allow_origins=["*"]` or similar, but with `allow_credentials=True`.

It must be changed to **echo the request Origin** if it matches the whitelist, or explicitly list the allowed origins.

**Incorrect (Current):**
```python
CORSMiddleware(
    allow_origins=["*"],  # <--- CAUSES ERROR WITH CREDENTIALS
    allow_credentials=True,
    ...
)
```

**Correct:**
```python
CORSMiddleware(
    allow_origins=["http://localhost:3000", "https://zimpricecheck.com"], 
    allow_credentials=True,
    ...
)
```
