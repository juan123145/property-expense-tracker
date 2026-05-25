export type CategoryGroup = {
  name: string;
  badgeClass: string;
  subcategories: string[];
};

export const CATEGORIES: CategoryGroup[] = [
  {
    name: "Income",
    badgeClass: "bg-green-100 text-green-800",
    subcategories: [
      "Rents", "Section 8 Rents", "Short Term Rents", "Application Fees",
      "Late Fees", "Pet Fees", "Laundry", "Storage", "Parking",
      "Tenant Pass-Throughs", "Insurance Proceeds", "Misc Income",
    ],
  },
  {
    name: "Admin & Other",
    badgeClass: "bg-zinc-100 text-zinc-700",
    subcategories: [
      "Advertising", "Background & Credit Checks", "Travel", "Mileage",
      "Meals", "Office Supplies & Postage", "Software Subscriptions", "HOA Dues",
      "Bank Fees", "Education", "Gifts", "Licenses", "Rent Concessions",
    ],
  },
  {
    name: "Legal & Professional",
    badgeClass: "bg-blue-100 text-blue-800",
    subcategories: [
      "Legal", "Accounting", "Court Fees", "Eviction Fees",
      "Inspections", "Surveys", "Appraisals",
    ],
  },
  {
    name: "Insurance",
    badgeClass: "bg-orange-100 text-orange-800",
    subcategories: [
      "Rental Dwelling", "Rental Condo", "Flood", "Hurricane",
      "Earthquake", "Liability", "Umbrella",
    ],
  },
  {
    name: "Management Fees",
    badgeClass: "bg-purple-100 text-purple-800",
    subcategories: [
      "Property Management", "Service Calls", "Leasing Commissions",
      "Booking & Platform Fees",
    ],
  },
  {
    name: "Repairs & Maintenance",
    badgeClass: "bg-yellow-100 text-yellow-800",
    subcategories: [
      "Cleaning & Janitorial", "Painting", "Electrical Repairs", "Plumbing Repairs",
      "HVAC Repairs", "Appliance Repairs", "Roof Repairs", "Door & Window Repairs",
      "Other Repairs", "Security/Locks/Keys", "Pest Control", "Gardening & Landscaping",
      "Pool & Spa", "Snow Removal", "R&M Supplies", "R&M Permits & Inspections",
      "Labor", "Consumables",
    ],
  },
  {
    name: "Taxes",
    badgeClass: "bg-red-100 text-red-800",
    subcategories: [
      "Property Taxes", "Special Assessments", "City/State/Local Taxes",
      "Short Term Occupancy Taxes", "Federal Taxes", "Tax Licenses & Registrations",
    ],
  },
  {
    name: "Utilities",
    badgeClass: "bg-cyan-100 text-cyan-800",
    subcategories: [
      "Gas", "Electric", "Gas & Electric", "Garbage & Recycling",
      "Telephone/Cable/Internet", "Water & Sewer", "Heating Oil",
    ],
  },
  {
    name: "Mortgages & Loans",
    badgeClass: "bg-indigo-100 text-indigo-800",
    subcategories: [
      "Mortgage Payments", "Mortgage Interest", "Mortgage Principal",
      "Other Loan Payment", "Other Interest", "Private Mortgage Insurance (PMI)",
    ],
  },
  {
    name: "Capital Expenses",
    badgeClass: "bg-amber-100 text-amber-800",
    subcategories: [
      "New Roof", "New Acquisitions", "New Appliances", "New HVAC",
      "New Flooring & Carpet", "New Doors & Windows", "New Landscaping",
      "New Plumbing & Electrical", "New Furniture & Equipment",
      "Remodeling", "Closing Costs", "Loan Costs",
    ],
  },
  {
    name: "Security Deposits",
    badgeClass: "bg-pink-100 text-pink-800",
    subcategories: [
      "Security Deposit Received", "Security Deposit Returned", "Security Deposit Interest",
    ],
  },
  {
    name: "Transfers",
    badgeClass: "bg-slate-100 text-slate-600",
    subcategories: [
      "Credit Card Payments", "Owner Distributions", "Owner Contributions",
      "Escrow Payments", "Down Payments", "Sale Proceeds",
    ],
  },
];

export function getCategoryBadgeClass(category: string | null): string {
  if (!category) return "bg-zinc-100 text-zinc-600";
  return CATEGORIES.find((g) => g.name === category)?.badgeClass ?? "bg-zinc-100 text-zinc-600";
}
