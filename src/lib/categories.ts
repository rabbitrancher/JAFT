export const BASE_CATEGORIES = [
	// Income
	"Paycheck",
	"Reimbursement",
	"Gift Received",

	// Housing
	"Rent / Mortgage",
	"Utilities",
	"Internet",
	"Home Insurance",

	// Food
	"Groceries",
	"Restaurants",

	// Transport
	"Gas",
	"Parking",
	"Car Insurance",

	// Subscriptions
	"Streaming",
	"Phone Plan",
	"Software",
	"Gym / Fitness",

	// Health
	"Doctor / Dentist",
	"Pharmacy",

	// Shopping
	"Clothing",
	"Electronics",
	"Household",

	// Personal
	"Haircut / Grooming",
	"Entertainment",
	"Hobbies",

	// Savings
	"Transfer",

	// Other
	"Fees / Charges",
	"Gift Given",
	"Miscellaneous",
] as const;

export type Category = (typeof BASE_CATEGORIES)[number];
