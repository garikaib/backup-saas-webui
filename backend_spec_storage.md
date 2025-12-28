# Backend Specification: Storage Management

To ensure accurate reporting on the dashboard, the backend needs to implement the following logic for Storage Management endpoints.

## 1. Storage Provider Model
Update the `StorageProvider` database model to include a capacity limit.

- **Field**: `storage_limit_gb` (Float/Integer)
- **Description**: The maximum capacity of the storage provider in GB.
- **Default**: `0` (implies Unlimited or Unknown).

## 2. API: Add/Update Provider
Ensure the `POST /storage/providers` and `PUT /storage/providers/{id}` endpoints accept and save this new field.

**Payload Example:**
```json
{
  "name": "S3 Production",
  "type": "s3",
  "storage_limit_gb": 1000,
  ...
}
```

## 3. API: Storage Summary
The `GET /storage/summary` endpoint is the source of truth for the dashboard. It must perform real-time calculations (or use cached counters) to return accurate totals.

**Response Structure & Logic:**

```json
{
  "total_quota_gb": 500,       // Logic: SUM(node.storage_quota_gb) for all active nodes
  "total_used_gb": 125.5,      // Logic: SUM(backup.size_gb) for all valid backups across system
  "nodes_count": 10,           // Logic: COUNT(nodes)
  "storage_providers": [
    {
      "id": 1,
      "name": "S3 Prod",
      "type": "s3",
      "storage_limit_gb": 1000, // From DB (set by user)
      "used_gb": 125.5,         // Logic: SUM(backup.size_gb) WHERE backup.provider_id = 1
      "is_default": true
    }
  ],
  "nodes_summary": [
    {
      "hostname": "client-1",
      "quota_gb": 50,
      "used_gb": 12.5,          // Logic: SUM(backup.size_gb) WHERE backup.node_id = client-1
      "usage_percentage": 25    // Logic: (used_gb / quota_gb) * 100
    }
  ]
}
```

### Calculation Notes:
1.  **Total Used Storage**: This should be the sum of the actual size of all backups currently stored in the system. If this returns `0`, the dashboard will show "0 GB Used".
2.  **Provider Usage**: Ideally, calculate usage per provider. This allows us to show if a specific bucket is nearing its 1TB limit even if the global system is fine.
3.  **Performance**: If iterating all backups is slow, consider maintaining a running counter on the `nodes` and `storage_providers` tables that updates whenever a backup is successfully uploaded or deleted.

## 4. Frontend Integration
The frontend is already updated to send `storage_limit_gb` and display these values. Once the backend returns non-zero values for `total_used_gb` and `used_gb`, the dashboard will automatically reflect the correct status.
