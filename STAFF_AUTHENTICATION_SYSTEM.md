# Staff Authentication System - LLM Context Documentation

## CRITICAL SYSTEM OVERVIEW
**Version**: RC-916.1514  
**Investment**: $1.8M+ development  
**Purpose**: Staff members can log in and access customer accounts via entity search  

## DATABASE ARCHITECTURE

### Core Table Relationship
```sql
-- LEFT OUTER JOIN structure for staff authentication
SELECT 
    a.*,
    s.privilege_value,
    s.staff_username,
    s.staff_id,
    CASE WHEN s.staff_id IS NOT NULL THEN true ELSE false END as is_staff
FROM accounts_lcmd a
LEFT OUTER JOIN staff s ON a.accountnumber = s.account_id
WHERE a.accountnumber = ? OR a.email_address = ?
```

### Key Tables
1. **accounts_lcmd** - Primary user accounts
2. **staff** - Staff members with privileges
3. **Relationship**: `accounts_lcmd.accountnumber = staff.account_id`

### Staff Table Structure (Critical Fields)
- `staff_id` - Primary key
- `account_id` - Links to accounts_lcmd.accountnumber
- `staff_username` - Staff login identifier
- `privilege_value` - Integer authorization level (CRITICAL for permissions)

## AUTHENTICATION FLOW

### Staff Login Process
1. **User enters identifier** (account number, email, or staff username)
2. **System performs LEFT OUTER JOIN** to check if account is staff
3. **If staff member**:
   - Capture `privilege_value` 
   - Show `SearchEntityModal` popup
   - Enable customer account selection
4. **If regular customer**:
   - Standard login flow

### Privilege System
- `privilege_value` determines staff permissions
- Higher values = more access
- Used throughout app for authorization checks
- **FUTURE**: Will control feature access, data visibility, admin functions

## CODE IMPLEMENTATION

### User Interface Updates
```typescript
// Updated User type with staff properties
interface User {
  // ... existing properties
  is_staff?: boolean;           // Flag from LEFT OUTER JOIN
  staff_username?: string;      // From staff table
  privilege_value?: number;     // CRITICAL for authorization
  staff_id?: number;           // Staff table primary key
}
```

### Authentication Context
```typescript
// AuthContext staff-related properties
const AuthContext = {
  isStaffUser: boolean;
  staffUsername: string | null;
  showSearchEntityModal: boolean;
  closeSearchEntityModal: () => void;
  selectCustomerAccount: (id: string, name: string) => Promise<boolean>;
}
```

### RPC Function (Database)
```sql
-- New function: authenticate_user_with_staff
-- Replaces: authenticate_user
-- Adds: LEFT OUTER JOIN with staff table
-- Returns: User data + staff privileges
```

## BUSINESS LOGIC

### Staff Authentication Rules
1. **Staff login** triggers entity search (not direct access)
2. **Privilege value** captured for all future authorization
3. **Customer selection** required for staff to access system
4. **Audit trail** maintained for staff actions

### SearchEntityModal Behavior
- **Appears automatically** when staff member logs in
- **Customer search** functionality
- **Account selection** required to proceed
- **Privilege inheritance** from staff to session

## INTEGRATION POINTS

### Components Affected
- `AuthContext.tsx` - Core authentication logic
- `Login.tsx` - Staff detection and modal trigger  
- `SearchEntityModal.tsx` - Staff customer selection
- `types/index.ts` - User interface updates

### Database Changes
- New RPC function with LEFT OUTER JOIN
- Staff table integration
- Privilege value capture
- Session management updates

## FUTURE DEVELOPMENT CONTEXT

### Privilege-Based Features (Planned)
- **Admin functions** - Based on privilege_value >= X
- **Data access** - Customer info visibility levels  
- **Feature gates** - UI elements shown/hidden by privilege
- **Reporting** - Staff activity tracking by privilege level
- **Security** - Escalated permissions for high-privilege staff

### Critical for AI Context
- **Privilege value** is the foundation for ALL future staff features
- **LEFT OUTER JOIN** pattern must be maintained in all staff queries
- **SearchEntityModal** is the gateway for staff system access
- **is_staff flag** determines authentication flow branching

## TECHNICAL DEBT & CONSIDERATIONS

### Current Implementation
- Staff detection via `staff_management` table (to be replaced)
- Hardcoded staff checks (to be refactored with privilege system)
- Manual privilege checking (to be automated)

### Security Requirements
- Staff actions require audit logging
- Privilege escalation prevention
- Customer data access restrictions
- Session management for impersonation

---

**THIS DOCUMENTATION PROVIDES COMPLETE CONTEXT FOR FUTURE AI DEVELOPMENT**
**ALL STAFF-RELATED FEATURES MUST REFERENCE THIS ARCHITECTURE**