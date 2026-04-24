# Security Specification - Police Theft Tracker

## 1. Data Invariants
- An incident must have a valid `id`.
- The `recordedAt` and `occurrenceAt` must be valid formats.
- The `createdBy` field must match the `request.auth.uid`.
- Only authenticated users with verified emails (standard for police identity) can access.
- `location` must have lat/lng numbers.

## 2. The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create an incident with `createdBy` set to another user's UID.
2. **Unauthenticated Read**: Attempt to read the `/incidents` collection without being signed in.
3. **Ghost Field Write**: Attempt to add a field `isVerifiedByChief: true` to a document.
4. **ID Poisoning**: Attempt to create a document with a 2KB string as ID.
5. **PII Leak**: Unauthenticated user trying to `get` a specific incident document.
6. **State Skip**: (Not applicable yet, but potentially skipping forensics check?).
7. **Large Array Attack**: Sending a `stolenItems` list with 10,000 elements.
8. **Invalid Coordinate**: Sending `location: { lat: "high", lng: "low" }`.
9. **Update Immutable**: Attempt to change `recordedAt` after creation.
10. **Malicious Enum**: Setting `status` to "Deleted_By_Hacker".
11. **Resource Exhaustion**: Sending a 500kb string into `modusOperandi`.
12. **Anonymous Access**: User with `isAnonymous: true` trying to write.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these. (I will implement the rules to block these).
