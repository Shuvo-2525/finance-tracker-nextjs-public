import { toast } from "sonner"
import { format } from "date-fns"

// This is the URL for the Google Sheets API
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets"

// Define the shape of a Company object, matching our sheet
export type Company = {
  id: string
  name: string
}

// 1. DEFINE THE CATEGORY TYPE
export type Category = {
  id: string
  name: string
  type: "Income" | "Expense"
}

// 2. DEFINE THE TRANSACTION TYPE
export type Transaction = {
  date: string
  company: string
  category: string
  description: string
  income: number
  expense: number
}

/**
 * Fetches all companies from the 'Companies' tab in the Google Sheet.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @returns A promise that resolves to an array of Company objects.
 */
export async function getCompanies(
  sheetId: string,
  accessToken: string
): Promise<Company[]> {
  try {
    const range = "Companies!A2:B" // Start from row 2 (A2) to skip the header
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching companies:", errorData)
      throw new Error("Failed to fetch companies from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    // Map the 2D array [["id1", "name1"], ["id2", "name2"]]
    // into an array of objects [{id: "id1", name: "name1"}, ...]
    return values.map((row: string[]) => ({
      id: row[0],
      name: row[1],
    }))
  } catch (error) {
    console.error("Error in getCompanies:", error)
    toast.error("Could not load your companies.")
    return [] // Return an empty array on failure
  }
}

/**
 * Adds a new company to the 'Companies' tab.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @param companyName The name of the new company to add.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function addCompany(
  sheetId: string,
  accessToken: string,
  companyName: string
): Promise<boolean> {
  try {
    const range = "Companies!A:B" // Append to the first empty row in columns A and B
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`

    // Generate a simple unique ID (in a real app, you might use a library like nanoid)
    const companyId =
      companyName.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`

    const body = {
      values: [[companyId, companyName]],
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error adding company:", errorData)
      throw new Error("Failed to add company to Google Sheet.")
    }

    toast.success(`Company "${companyName}" added successfully!`)
    return true
  } catch (error) {
    console.error("Error in addCompany:", error)
    toast.error("Could not add your company.")
    return false
  }
}

// 2. ADD GETCATEGORIES FUNCTION
/**
 * Fetches all categories from the 'Categories' tab in the Google Sheet.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @returns A promise that resolves to an array of Category objects.
 */
export async function getCategories(
  sheetId: string,
  accessToken: string
): Promise<Category[]> {
  try {
    const range = "Categories!A2:C" // Start from row 2 (A2) to skip the header
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching categories:", errorData)
      throw new Error("Failed to fetch categories from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    // Map the 2D array [["id", "name", "type"], ...]
    // into an array of objects [{id: "id1", name: "name1", type: "Expense"}, ...]
    return values.map((row: string[]) => ({
      id: row[0],
      name: row[1],
      type: row[2] === "Income" ? "Income" : "Expense", // Ensure type is valid
    }))
  } catch (error) {
    console.error("Error in getCategories:", error)
    toast.error("Could not load your categories.")
    return [] // Return an empty array on failure
  }
}

// 3. ADD ADDCATEGORY FUNCTION
/**
 * Adds a new category to the 'Categories' tab.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @param categoryName The name of the new category.
 * @param categoryType The type of the new category ("Income" or "Expense").
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function addCategory(
  sheetId: string,
  accessToken: string,
  categoryName: string,
  categoryType: "Income" | "Expense"
): Promise<boolean> {
  try {
    const range = "Categories!A:C" // Append to the first empty row
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`

    const categoryId =
      categoryName.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`

    const body = {
      values: [[categoryId, categoryName, categoryType]],
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error adding category:", errorData)
      throw new Error("Failed to add category to Google Sheet.")
    }

    toast.success(`Category "${categoryName}" added successfully!`)
    return true
  } catch (error) {
    console.error("Error in addCategory:", error)
    toast.error("Could not add your category.")
    return false
  }
}

// 3. ADD GETTRANSACTIONS FUNCTION
/**
 * Fetches the 100 most recent transactions from the 'Transactions' tab.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export async function getTransactions(
  sheetId: string,
  accessToken: string
): Promise<Transaction[]> {
  try {
    // Fetches rows from the bottom up (most recent)
    const range = "Transactions!A2:F"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?majorDimension=ROWS`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching transactions:", errorData)
      throw new Error("Failed to fetch transactions from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    // Map rows to objects and reverse to get most recent first
    const transactions: Transaction[] = values.map((row: any[]) => ({
      date: row[0] || "",
      company: row[1] || "",
      category: row[2] || "",
      description: row[3] || "",
      income: parseFloat(row[4]) || 0,
      expense: parseFloat(row[5]) || 0,
    }))

    return transactions.reverse().slice(0, 100) // Return 100 most recent
  } catch (error) {
    console.error("Error in getTransactions:", error)
    toast.error("Could not load your transactions.")
    return []
  }
}

// 4. ADD ADDTRANSACTION FUNCTION
/**
 * Adds a new transaction to the 'Transactions' tab.
 * @param sheetId The ID of the Google Sheet.
 * @param accessToken A valid Google API access token.
 * @param transaction The transaction data to add.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function addTransaction(
  sheetId: string,
  accessToken: string,
  transaction: {
    date: Date
    company: string
    category: string
    description: string
    amount: number
    type: "Income" | "Expense"
  }
): Promise<boolean> {
  try {
    const range = "Transactions!A:F" // Append to the first empty row
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`

    // Format date to "MM/dd/yyyy"
    const formattedDate = format(transaction.date, "MM/dd/yyyy")
    
    // Prepare row data based on transaction type
    const newRow = [
      formattedDate,
      transaction.company,
      transaction.category,
      transaction.description,
      transaction.type === "Income" ? transaction.amount : "",
      transaction.type === "Expense" ? transaction.amount : "",
    ]

    const body = {
      values: [newRow],
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error adding transaction:", errorData)
      throw new Error("Failed to add transaction to Google Sheet.")
    }

    toast.success(`Transaction added successfully!`)
    return true
  } catch (error) {
    console.error("Error in addTransaction:", error)
    toast.error("Could not add your transaction.")
    return false
  }
}