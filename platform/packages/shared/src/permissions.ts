// The fixed, real set of capabilities the backend actually enforces — this list is
// NOT admin-editable (a permission key only means something because real code checks
// for it), but WHICH roles hold which of these keys is fully dynamic, stored in the
// Role/RolePermission tables, and editable from the Roles & Permissions tab.
export const PERMISSIONS = [
  { key: "employees.view_sensitive", group: "Employees", label: "View salary, bank & SSN details" },
  { key: "employees.view_others", group: "Employees", label: "View another employee's full profile" },
  { key: "employees.create", group: "Employees", label: "Add a new employee" },
  { key: "employees.edit_others", group: "Employees", label: "Edit an employee's salary, bank & status" },
  { key: "employees.deactivate", group: "Employees", label: "Deactivate an employee" },
  { key: "roles.assign_basic", group: "Roles", label: "Change an Employee's or Manager's role" },
  {
    key: "roles.assign_senior",
    group: "Roles",
    label: "Assign a role that itself grants senior permissions, or change such an account's role",
  },
  { key: "roles.manage", group: "Roles", label: "Create, delete, and edit roles' permissions" },
  { key: "leave.view_all", group: "Leave", label: "View and cancel any employee's leave requests" },
  { key: "leave.approve", group: "Leave", label: "Approve or reject leave requests" },
  { key: "payroll.view_all", group: "Payroll", label: "View any employee's payroll records" },
  { key: "payroll.manage", group: "Payroll", label: "Create & process payroll runs" },
  { key: "payroll.delete", group: "Payroll", label: "Delete a payroll record" },
  { key: "medical_claims.view_all", group: "Medical Claims", label: "View any employee's medical claims" },
  { key: "medical_claims.decide", group: "Medical Claims", label: "Approve or reject claims" },
  { key: "announcements.view_read_counts", group: "Announcements", label: "See who has read an announcement" },
  { key: "announcements.create", group: "Announcements", label: "Post a new announcement" },
  {
    key: "announcements.manage_any",
    group: "Announcements",
    label: "Edit or delete any announcement or comment (not just their own)",
  },
  { key: "emergency_contacts.manage_any", group: "Employees", label: "View or edit anyone's emergency contacts" },
  { key: "uploads.announcement_images", group: "Announcements", label: "Upload an image for an announcement" },
  { key: "attendance.view_all", group: "Attendance", label: "View any employee's attendance records" },
  { key: "offices.manage", group: "Attendance", label: "Add, edit, or remove company office locations" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export const PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);
