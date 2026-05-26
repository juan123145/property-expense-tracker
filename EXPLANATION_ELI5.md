# Explanation Like I'm 5 Years Old

## The Problem

Imagine you have a lemonade stand (the app), and you want to let your friend help run it while you're away.

**What's broken right now:**

1. Your friend can see the lemonade stand, but can't see any of the money you counted (transactions).
2. Your friend sees a button to "Edit the Stand" but can't really edit it - but that's confusing.
3. When your friend accepts to help, sometimes you have to reload the page for it to work.
4. The photos of your stand disappear sometimes after you share it.
5. When your friend uploads a receipt, it uses YOUR storage space, not theirs.
6. When you delete something, it might stay hidden in a file forever - nobody cleans it up.

## The Solution (Big Picture)

Think of the property (your lemonade stand) like a **lunchbox**.

- **The lunchbox = the property** (the lemonade stand)
- **Everything in the lunchbox = the data** (money counted, receipts, photos)
- **The kids who share the lunchbox = the shared users** (your friend helping)

**Key ideas:**

### 1. The Lunchbox Belongs to You
When you share the lunchbox with your friend, everything inside it is still in YOUR lunchbox.
- The money inside = all yours to track
- The receipts = go in your shared lunchbox
- Your friend can look in and help, but it's still your lunchbox

**Currently broken:** The app thinks each receipt belongs to whoever counted it. **FIX:** Make receipts belong to the lunchbox (property), not the person.

### 2. Different Friends Have Different Powers

There are 3 types of friends:

**Owner (You)**
- Can eat snacks from the lunchbox
- Can give the lunchbox to other friends
- Can say who can edit it
- Can take the lunchbox back

**Helper (Editor)**
- Can add snacks to the lunchbox
- Can eat snacks
- Can count the money
- But can't change WHICH lunchbox it is

**Watcher (Viewer)**
- Can look inside the lunchbox
- Can count the money
- But can't add or eat snacks

**Currently broken:** Friends can see buttons they shouldn't see. **FIX:** Only show buttons for what they're allowed to do.

### 3. Inviting Friends Works Better

**Currently:** You give your friend a magic link. They click it. Maybe it works, maybe the lunchbox doesn't show up.

**Fixed:** You tell them "I'm inviting you to help with my stand." They get an invitation that says "Yes, I'll help" or "No thanks." Once they say yes, the lunchbox appears.

### 4. Storage Counting is Fair

**Currently:** If your friend uploads a big photo, it uses YOUR storage.

**Fixed:** The lunchbox has storage space. When anyone puts something in the lunchbox, it counts toward the lunchbox's space, not individual people's space. Since it's YOUR lunchbox, it's YOUR space.

### 5. Cleanup Happens Automatically

**Currently:** When you delete something, it hides for 30 days. But nobody checks if 30 days have passed. It might stay hidden forever.

**Fixed:** A cleanup robot wakes up every day and checks: "Hey, has 30 days passed for these hidden items?" If yes, it removes them permanently and cleans up the trash.

## Why This Matters

**Before:** Sharing was broken because the app was designed for one person to use it alone.

**After:** Sharing works correctly because the app understands that a property is a container that many people can access.

## The Implementation (In Kids' Terms)

Think of rebuilding your lunchbox system:

1. **Build better lunchbox lockers** (new database tables)
   - A list of who can access each lunchbox
   - A list of pending invitations
   - A list of what storage belongs to which lunchbox
   - A list of items waiting to be cleaned up

2. **Change the rule system** (permissions)
   - Instead of "is this YOUR receipt?", ask "can YOU access THIS lunchbox?"
   - Define what each friend type can do

3. **Show the right buttons** (frontend)
   - Only show "edit" button to owners
   - Show "add item" button to helpers
   - Show "look" button to watchers

4. **Track everything** (audit trail)
   - Write down who put what in the lunchbox and when
   - Write down who changed permissions
   - Write down when things got deleted

5. **Fix the invitation system** (invitations)
   - When you send an invitation, it's saved in a waiting list
   - When your friend says "yes", they get added to the lunchbox team
   - When they say "no", it's recorded and you can send another invitation later

6. **Make sure cleanup happens** (background job)
   - Every day, a robot checks for expired items
   - If it's been 30 days, it permanently deletes them
   - If something goes wrong, the robot tries again the next day

## What's Different After The Fix

### For You (The Owner)
- ✅ Friends can see all your transactions, not just the ones they created
- ✅ You can see who has access and what they can do
- ✅ You can change your friend's permissions anytime
- ✅ You can invite new friends with just an email
- ✅ You can see an audit log of everything that happened

### For Your Friend (The Helper)
- ✅ When you share a property, they can see it without reloading
- ✅ They can see all transactions created by anyone on the team
- ✅ They can add transactions and upload receipts
- ✅ But they can't delete the whole property
- ✅ The storage they use counts against your account, not theirs

### For Your Friend (The Watcher)
- ✅ They can see the property
- ✅ They can see all transactions
- ✅ But they can't upload or edit anything
- ✅ And they can't accidentally break anything

## The Tech Stack (What We Use To Do This)

- **Database:** PostgreSQL - stores all the lunchbox info
- **Permissions:** RBAC (Role Based Access Control) - fancy name for "Owner/Helper/Watcher"
- **File Storage:** AWS R2 - stores photos and receipts
- **Background Job:** Node.js - the cleanup robot
- **Frontend:** React/Next.js - the buttons and screens
- **Backend:** Next.js Server Actions - the rules that decide what's allowed

## Why This Took Analysis First

Before I could tell you how to fix it, I had to:
1. Understand how the app currently works (read all the code)
2. Find all the broken parts (identified 10 critical bugs)
3. Find the root causes (permission system was too simple)
4. Trace through all the data flows (transactions, invitations, storage)
5. Design a new architecture (property-centric instead of user-centric)
6. Write down exactly how to fix it (28 detailed tasks with code)

This is why the analysis came first - it would have been wrong to code without understanding the problems thoroughly.

## Questions You Might Ask

**Q: Will my old data break?**
A: No. We migrate everything carefully. Old invites become new invites. Old permissions become new permissions.

**Q: How long will this take?**
A: The plan has 28 tasks with small steps. Each step is 2-5 minutes of work. Total: 3-5 days to complete and test.

**Q: Will users notice a difference?**
A: Yes, in good ways:
- Sharing works reliably
- No more missing images
- No confusing buttons
- Better performance
- Better security

**Q: What if something breaks?**
A: Each task is a commit. If something goes wrong, we can revert one small change instead of losing everything.

---

**TL;DR:** The app was designed for one person. We're redesigning it so multiple people can collaborate safely and reliably on shared properties. Everything gets traced, permissions work correctly, storage is tracked fairly, and cleanup happens automatically.
