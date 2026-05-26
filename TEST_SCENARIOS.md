# Complete End-to-End Test Scenarios

## CRITICAL: All tests must be performed in a browser, not via curl

The workflows below MUST be tested with actual user interactions because they involve:
- Authentication flows
- Session management
- Real-time UI updates
- Form submissions
- Image rendering
- Cache invalidation

## Setup for Manual Testing

### Create Multiple Test Users

You need 3+ test users to run all scenarios. Use the app's authentication (NextAuth):

1. **owner@test.local** - Will be property owner
2. **editor@test.local** - Will be editor member
3. **viewer@test.local** - Will be viewer member
4. **other@test.local** - For unauthorized access tests

### Browser Setup

- Use 3 separate browser instances or incognito windows
- Keep them open simultaneously so you can test concurrent access
- Window 1: Owner user
- Window 2: Editor user  
- Window 3: Viewer user

---

## SCENARIO 1: Transaction Inheritance (CRITICAL BUG #5 FIX)

### Prerequisites
- Owner user created and signed in
- Property "Apartment A" created by owner
- Transaction created: "Rent Payment - $1500" (created by owner on 2026-05-01)

### Test Steps

```
Step 1: Owner Views Property
- Owner opens /properties/[apartment-a-id]
- Verify transaction "Rent Payment - $1500" appears in transaction list
- Verify summary shows Income: $1500

Step 2: Owner Shares Property
- Click "Share" button
- Invite editor@test.local as EDITOR with canShare=false
- Invite viewer@test.local as VIEWER with canShare=true

Step 3: Editor Accepts Invite
- Switch to Editor browser window
- Editor receives email invitation
- Editor clicks invite link (or goes to /invite/[token])
- Editor accepts invitation
- Editor is redirected to /properties/[apartment-a-id]

Step 4: Editor Views Transactions (CRITICAL TEST)
- Editor on property page
- MUST see "Rent Payment - $1500" transaction created by owner
- MUST see summary showing Income: $1500
- BUG FIX VERIFICATION: This would have been broken before the fix

Step 5: Viewer Accepts and Views
- Switch to Viewer browser window
- Viewer accepts invitation
- Viewer navigates to property
- MUST see all transactions including owner's "Rent Payment"

Step 6: Owner Creates New Transaction
- Owner creates new transaction: "Utilities - $100"
- Owner is on property page

Step 7: Verify Real-Time Visibility
- Editor refreshes page (or should auto-update)
- MUST see new "Utilities - $100" transaction
- MUST see summary updated to Income: $1600
- Viewer refreshes page
- MUST see "Utilities - $100" as well
```

### Expected Outcomes
- ✅ All users see ALL transactions on shared property
- ✅ Transaction list is NOT user-scoped
- ✅ Summary totals are accurate and consistent
- ✅ New transactions immediately visible to all members

### Failure Scenarios (Would indicate bug)
- ❌ Editor only sees their own transactions
- ❌ Viewer only sees viewer's transactions
- ❌ Totals show per-user instead of per-property
- ❌ New transactions don't appear for other members

---

## SCENARIO 2: Manage Access Page (Critical UI Feature)

### Prerequisites
- Owner has "Apartment A" property
- Property has invited editor@test.local (PENDING) and viewer@test.local (ACCEPTED)

### Test Steps

```
Step 1: Access Manage Access Page
- Owner on property page for "Apartment A"
- Click "Manage Access" button (next to Share button)
- Should navigate to /properties/[apartment-a-id]/manage-access

Step 2: Verify Active Members Section
- Should show section: "Active Members (1)"
- Shows: viewer@test.local
- Shows role: "Viewer"
- Shows "Can Share" toggle: checked (true)
- Shows "Joined" timestamp

Step 3: Verify Pending Invitations Section
- Should show section: "Pending Invitations (1)"
- Shows: editor@test.local
- Shows role: "Editor"
- Shows "Can Share" badge
- Shows expiration date (30 days from now)

Step 4: Edit Viewer's Can Share Permission
- In Active Members, find viewer@test.local
- Toggle "Can Share" checkbox from ON to OFF
- Save should auto-submit
- Page refreshes or updates
- Verify toggle is now OFF

Step 5: Change Viewer to Editor
- In Active Members, dropdown showing "Viewer"
- Click dropdown and select "Editor"
- Page updates
- Verify dropdown now shows "Editor"

Step 6: History Section
- Scroll to "History & Revoked Access"
- Should be empty (no history yet)

Step 7: Revoke Access
- In Active Members, click trash icon for viewer@test.local
- Alert dialog appears asking for confirmation
- Confirm revocation
- Page updates
- viewer@test.local disappears from Active Members
- viewer@test.local appears in History section under "Revoked Members"

Step 8: Verify Revoked User Cannot Access
- Switch to Viewer browser window
- Viewer tries to access property (/properties/[apartment-a-id])
- Should get 404 or "Not Found" response
- Verify revoked user lost access
```

### Expected Outcomes
- ✅ Manage Access page loads and displays correct data
- ✅ Active Members section shows accepted members
- ✅ Pending Invitations section shows awaiting acceptance
- ✅ Can revoke member access
- ✅ Can change member role
- ✅ Can toggle Can Share permission
- ✅ History section tracks revoked members
- ✅ Revoked users cannot access property anymore

---

## SCENARIO 3: Permission Enforcement

### Prerequisites
- Property "Building B" shared between owner and editor (EDITOR role)
- Property has transactions

### Test Steps

```
Step 1: Editor Cannot Edit Property
- Editor on property detail page
- Look for "Edit Property" button
- Button should NOT be visible (owner only)
- Verify no way to edit property details

Step 2: Editor Cannot Archive Property  
- Look for "Archive Property" button
- Button should NOT be visible (owner only)

Step 3: Viewer Cannot Edit Property
- Viewer on same property
- Verify Edit Property button is NOT visible
- Verify Archive Property button is NOT visible

Step 4: Editor CAN Create Transaction
- Editor on property page
- Should see "Add Transaction" button
- Click it
- Create transaction: "Door Repair - $200"
- Save transaction

Step 5: Viewer CANNOT Create Transaction
- Viewer on property page
- Should NOT see "Add Transaction" button
- Verify button is not visible or disabled

Step 6: Verify Backend Blocks Unauthorized Edit
- Owner edits property name to "Building B Updated"
- Editor tries to access /api/properties/[id] with update payload
  - Via browser console or Postman
  - Send: POST to updateProperty action with new name
- Should get 403 Forbidden or similar error
- Verify backend rejects unauthorized update

Step 7: Verify Backend Blocks Unauthorized Delete
- Viewer tries to delete a transaction
  - Via browser console or Postman
  - Send: POST to deleteTransaction action
- Should get 403 Forbidden
- Transaction should not be deleted
```

### Expected Outcomes
- ✅ UI controls are properly hidden based on role
- ✅ Backend rejects unauthorized operations
- ✅ Editors can create but not edit property
- ✅ Viewers can only read

---

## SCENARIO 4: Property Image Visibility

### Prerequisites
- Owner uploaded a property image (property has imageUrl set)
- Property is shared with editor and viewer

### Test Steps

```
Step 1: Owner Sees Image
- Owner navigates to property page
- Property image should display at top
- No errors in DevTools Network tab

Step 2: Editor Sees Image
- Switch to Editor browser
- Navigate to same property
- Image MUST load successfully
- Open DevTools Network tab
- Check image request:
  - Status should be 200 (not 403 or 404)
  - Verify it's fetching correct S3/R2 URL
  
Step 3: Viewer Sees Image
- Switch to Viewer browser
- Navigate to property
- Image MUST load successfully
- DevTools Network should show 200 status

Step 4: Debug If Image Fails
- If image shows 403:
  - Issue: Bucket is private, need signed URLs
  - Fix: Update imageUrl to use signed URL
  - Root cause: R2 bucket authorization
- If image shows 404:
  - Issue: Wrong file path in database
  - Check: properties.imageUrl in database
  - Check: StorageOwnership table for correct paths
```

### Expected Outcomes
- ✅ Image loads for all authorized users (status 200)
- ✅ No 403 Forbidden errors
- ✅ No 404 Not Found errors
- ✅ Image renders correctly in browser

### Failure Scenarios
- ❌ 403 error → Need signed URLs
- ❌ 404 error → Wrong path stored in DB
- ❌ No image displayed → Storage attribution broken

---

## SCENARIO 5: Can Share Permission Enforcement

### Prerequisites
- Property with:
  - Editor member with canShare=TRUE
  - Viewer member with canShare=FALSE

### Test Steps

```
Step 1: Editor WITH canShare Can Share
- Editor on property detail page
- Should see "Share" button (can share)
- Click "Share"
- Invite new-person@test.local as VIEWER
- Invitation should be created successfully

Step 2: Viewer WITHOUT canShare Cannot Share
- Viewer on property detail page  
- Should NOT see "Share" button
- Verify button is not visible or disabled

Step 3: Verify Backend Blocks Unauthorized Share
- Viewer tries to call shareProperty server action
  - Via browser console: fetch('/api/shares', {method: 'POST', ...})
  - Or through form submission via DevTools override
- Should get error: "You are not authorized to share this property"
- Invitation should not be created
```

### Expected Outcomes
- ✅ Only users with canShare=true can see Share button
- ✅ Backend rejects unauthorized share attempts
- ✅ UI properly reflects canShare permission

---

## SCENARIO 6: Invitation Lifecycle

### Prerequisites
- Owner of "Apartment C"

### Test Steps

```
Step 1: Invite New User
- Owner on Manage Access page
- Click invite form (or use existing share sheet)
- Invite brand-new-person@test.local as VIEWER
- Click "Send Invitation"
- Should see success message

Step 2: Verify Pending Invitation Appears
- Manage Access shows "Pending Invitations (1)"
- Shows: brand-new-person@test.local
- Shows role: VIEWER
- Shows expiration: 30 days from now

Step 3: Send Invitation Email
- Verify email was sent (check logs or email backend)
- Email contains accept/decline links

Step 4: Accept Invitation
- Click accept link from email
- Or manually navigate to /invite/[token]
- Should show "Accept Invitation" page
- Click "Accept"
- Redirected to property page

Step 5: Verify Membership Created
- Owner checks Manage Access page
- brand-new-person@test.local moved from "Pending" to "Active Members"
- Shows joined date

Step 6: Decline Invitation (separate test)
- Owner invites another-person@test.local
- In Manage Access, another-person shows as PENDING
- Click "Decline" on invite (if UI has this)
- Or navigate to /invite/[token] and click Decline
- Verify status changes to "DECLINED" in history

Step 7: Expired Invitation
- Owner invites expire-test@test.local
- Wait 30 days (or manually test by updating expiresAt in DB)
- Verify status changes to "EXPIRED" in history section

Step 8: Resend Invitation
- Owner has pending invitation to retry@test.local
- In Manage Access, click "Resend" button
- New invitation created with new token
- Old token should be invalidated or replaced
```

### Expected Outcomes
- ✅ Invitations created and sent
- ✅ Status transitions: PENDING → ACCEPTED/DECLINED
- ✅ Expired invitations handled correctly
- ✅ Users can resend invitations
- ✅ Accepted users get ACTIVE membership

---

## SCENARIO 7: Attachment Inheritance

### Prerequisites
- Property with owner and editor
- Owner created transaction with attachment (receipt)

### Test Steps

```
Step 1: Owner Sees Attachment
- Owner on property page
- Sees transaction with receipt attachment
- Can click to preview/download

Step 2: Editor Sees Same Attachment
- Editor on same property
- Sees same transaction
- Attachment is visible and downloadable
- Verify it's the SAME file (same URL/path)

Step 3: Viewer Can See Attachment But Not Edit
- Viewer on property
- Can see transaction and attachment
- Can preview/download
- But cannot delete attachment
- Cannot edit transaction containing attachment

Step 4: Storage Attribution
- Verify attachment was attributed to owner in StorageOwnership table
- Check: StorageOwnership.userId = property owner
- Not the user who uploaded it
```

### Expected Outcomes
- ✅ Attachments visible to all members
- ✅ Correct user can download/preview
- ✅ Storage attributed to owner, not uploader
- ✅ Unauthorized members cannot delete

---

## SCENARIO 8: Soft Delete and Cleanup

### Prerequisites
- Property with transaction

### Test Steps

```
Step 1: Delete Transaction
- Owner deletes transaction
- Transaction should disappear from view (soft deleted)

Step 2: Check SoftDeleteQueue
- In database, verify SoftDeleteQueue has entry
- scheduled_permanent_delete_at = now() + 30 days

Step 3: Verify Shared Users Cannot See Deleted
- Editor refreshes property page
- Deleted transaction should not appear
- (Implementation decision: might show as "deleted" during retention window)

Step 4: Manual Job Trigger
- POST to /api/jobs/process-deletions
- Background job should process deletions

Step 5: Verify Cleanup
- After job completes, check database
- Transaction marked as deleted should be permanently removed
- Associated attachments should be removed from R2
- SoftDeleteQueue entry should be removed

Step 6: Test Retry Logic
- Create scenario where deletion fails (permission error, etc.)
- Verify SoftDeleteQueue.retry_count increments
- Job runs again and retries
- After max retries (5), marked as failed
```

### Expected Outcomes
- ✅ Soft delete hides transaction
- ✅ Permanent deletion after 30 days
- ✅ R2 files cleaned up
- ✅ Retry logic handles failures

---

## Critical Test Matrix

| Feature | Test Case | Status | Notes |
|---------|-----------|--------|-------|
| Transaction Inheritance | All users see all property transactions | [ ] | Core feature, must work |
| Manage Access Page | Access page, view members, invitations | [ ] | Core UI feature |
| Role Enforcement | Editor can't edit property | [ ] | Security critical |
| Permission UI | Buttons show/hide by role | [ ] | User experience |
| Can Share Toggle | Restrictions enforced | [ ] | Permission model |
| Invitation Flow | Create, accept, decline, expire | [ ] | Collaboration feature |
| Image Visibility | All users can see property image | [ ] | Known issue to fix |
| Authorization Checks | Backend rejects unauthorized ops | [ ] | Security critical |

---

## Test Execution Instructions

### Running Tests

1. **Open 3 browser windows** (or incognito tabs):
   - Window A: Owner user
   - Window B: Editor user
   - Window C: Viewer user

2. **Run scenarios sequentially**:
   - Start with Scenario 1 (Transaction Inheritance)
   - Move to Scenario 2 (Manage Access)
   - Continue through all scenarios

3. **Document failures**:
   - Note exact step where failure occurs
   - Capture screenshots if possible
   - Record error messages from DevTools

4. **For each failure**:
   - Check browser DevTools Console (JavaScript errors)
   - Check Network tab (HTTP status codes)
   - Check database state if needed

5. **Report format**:
   - Feature: [Feature name]
   - Scenario: [Scenario number]
   - Step: [Step number]
   - Expected: [What should happen]
   - Actual: [What actually happened]
   - Error: [Error message if any]
   - Fix: [Action taken to fix]

---

## Post-Testing Checklist

After all scenarios are completed:

- [ ] All 8 scenarios passed
- [ ] No JavaScript errors in console
- [ ] No 500 errors in network tab
- [ ] All authorization checks working
- [ ] Transaction inheritance verified
- [ ] Manage Access fully functional
- [ ] No broken links or missing pages
- [ ] Performance is acceptable
- [ ] Images load correctly
- [ ] All workflows are user-friendly

If any failures exist, document them and create fix tasks.

---

## Success Criteria

- ✅ 100% of scenarios pass
- ✅ No security issues detected
- ✅ All workflows are intuitive
- ✅ No data inconsistencies
- ✅ Performance acceptable
- ✅ Ready for production

