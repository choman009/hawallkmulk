# Record saves and administrator deletion

1. Trace record form payloads through repository and SQL. Reproduce database save failures and retain meaningful error categories across properties, requests, offices and assignments. Never silently discard a second phone to make a save appear successful.
2. Add a repeatable incremental migration for administrator deletion. Use private tombstones so removal is reversible by database maintenance and does not destroy contact history or private image files. Removed rows, related assignments and updates must disappear from queries, scoped contacts and storage policies. Removing an office preserves its properties and requests.
3. Add a translated confirmation dialog and delete actions to record details and task cards. Enforce active owner/admin and write permission in PostgreSQL as well as UI. Keep demo behavior consistent.
4. Test SQL access after removal, role denial and related-record behavior; verify form errors, UI, production build, then review and push to the existing private repository. Document migration order and live verification limits.
