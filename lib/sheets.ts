import { toast } from "sonner"
import { format } from "date-fns"
import { sheets_v4 } from "googleapis/build/src/apis/sheets/v4"

// This is the URL for the Google Sheets API
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets"

// =================================================================
// --- COMPANY TYPES ---
// =================================================================

export type Company = {
  rowIndex: number
  id: string
  name: string
  invoicePrefix: string
  logoUrl: string
}

// Data for CREATING a new company
export type CompanyData = {
  name: string
  invoicePrefix: string
  logoUrl?: string // Logo is optional on creation
}

// =================================================================
// --- CATEGORY TYPES ---
// =================================================================

export type Category = {
  id: string
  name: string
  type: "Income" | "Expense"
}

// =================================================================
// --- TRANSACTION TYPES ---
// =================================================================

export type Transaction = {
  rowIndex: number
  date: string
  company: string // This is the Company Name, not ID
  category: string
  description: string
  income: number
  expense: number
  receiptLink?: string
  invoiceId?: string // <-- ADDED
}

// This is the data shape for *adding/updating* a transaction
export type TransactionData = {
  date: Date
  company: string // This is the Company Name
  category: string
  description: string
  amount: number
  type: "Income" | "Expense"
  receiptLink?: string
  invoiceId?: string // <-- ADDED
}

// =================================================================
// --- BILL TYPES ---
// =================================================================

export type BillStatus = "Pending" | "Paid"

export type Bill = {
  rowIndex: number
  billId: string
  dueDate: string
  payee: string
  amount: number
  status: BillStatus
}

export type BillData = {
  dueDate: Date
  payee: string
  amount: number
}

// =================================================================
// --- INVOICE TYPES ---
// =================================================================

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Void"

export type Invoice = {
  rowIndex: number
  invoiceId: string // The generated ID, e.g., "INV-001"
  transactionId: string // The ID of the corresponding transaction
  companyId: string
  customerName: string
  customerAddress: string
  issueDate: string
  dueDate: string
  totalAmount: number
  status: InvoiceStatus
}

// Data for CREATING a new invoice
export type InvoiceData = {
  transactionId: string // We will generate this
  companyId: string
  customerName: string
  customerAddress: string
  issueDate: Date
  dueDate: Date
  totalAmount: number
}

// =================================================================
// --- HELPER FUNCTIONS ---
// =================================================================

/**
 * Helper to find the numeric sheetId for a given tab name.
 * We need this for delete operations.
 */
async function getSheetIdByTitle(
  spreadsheetId: string,
  accessToken: string,
  title: string
): Promise<number | null> {
  try {
    const url = `${SHEETS_API_URL}/${spreadsheetId}?fields=sheets(properties(sheetId,title))`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      console.error(
        `Failed to get sheet properties: ${response.statusText}`,
        await response.text()
      )
      throw new Error("Failed to get sheet properties.")
    }

    const spreadsheet = await response.json()
    const sheet = spreadsheet.sheets.find(
      (s: any) => s.properties.title === title
    )
    return sheet?.properties?.sheetId || null
  } catch (error) {
    console.error("Error finding sheet ID:", error)
    return null
  }
}

// =================================================================
// --- COMPANY FUNCTIONS ---
// =================================================================

/**
 * Fetches all companies from the 'Companies' tab.
 */
export async function getCompanies(
  sheetId: string,
  accessToken: string
): Promise<Company[]> {
  try {
    const range = "Companies!A2:D" // Read columns A, B, C, D
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch companies from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    return values
      .map((row: string[], index: number) => ({
        rowIndex: index + 2, // Row number in the sheet
        id: row[0],
        name: row[1],
        invoicePrefix: row[2] || "",
        logoUrl: row[3] || "",
      }))
      .filter((c: Company) => c.id && c.name) // Filter out empty rows
  } catch (error: any) {
    console.error("Error in getCompanies:", error)
    toast.error(error.message || "Could not load your companies.")
    return []
  }
}

/**
 * Adds a new company to the 'Companies' tab and initializes its invoice counter.
 */
export async function addCompany(
  sheetId: string,
  accessToken: string,
  companyData: CompanyData
): Promise<boolean> {
  try {
    const companyId =
      companyData.name.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`

    // 1. Append to Companies sheet
    const rangeCompanies = "Companies!A:D"
    const urlCompanies = `${SHEETS_API_URL}/${sheetId}/values/${rangeCompanies}:append?valueInputOption=USER_ENTERED`
    const bodyCompanies = {
      values: [
        [
          companyId,
          companyData.name,
          companyData.invoicePrefix,
          companyData.logoUrl || "",
        ],
      ],
    }

    const responseCompanies = await fetch(urlCompanies, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyCompanies),
    })

    if (!responseCompanies.ok) {
      throw new Error("Failed to add company to Google Sheet.")
    }

    // 2. Append to InvoiceCounter sheet
    const rangeCounter = "InvoiceCounter!A:B"
    const urlCounter = `${SHEETS_API_URL}/${sheetId}/values/${rangeCounter}:append?valueInputOption=USER_ENTERED`
    const bodyCounter = {
      values: [[companyId, "1"]], // Start invoice counter at 1
    }

    const responseCounter = await fetch(urlCounter, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyCounter),
    })

    if (!responseCounter.ok) {
      console.error(
        "Error adding invoice counter:",
        await responseCounter.json()
      )
      toast.error(
        "Company added, but failed to create invoice counter. Please contact support."
      )
      return false
    }

    toast.success(`Company "${companyData.name}" added successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in addCompany:", error)
    toast.error(error.message || "Could not add your company.")
    return false
  }
}

/**
 * Updates an existing company's details in the 'Companies' tab.
 * Note: Does not allow changing Company ID.
 */
export async function updateCompany(
  sheetId: string,
  accessToken: string,
  rowIndex: number,
  companyData: Pick<Company, "name" | "invoicePrefix" | "logoUrl"> // Use Pick
): Promise<boolean> {
  try {
    // Range to update: Name, Invoice Prefix, Logo URL (Columns B, C, D)
    const range = `Companies!B${rowIndex}:D${rowIndex}`
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`

    const body = {
      values: [
        [
          companyData.name,
          companyData.invoicePrefix,
          companyData.logoUrl || "",
        ],
      ],
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update company in Google Sheet.")
    }

    toast.success(`Company "${companyData.name}" updated successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in updateCompany:", error)
    toast.error(error.message || "Could not update your company.")
    return false
  }
}

/**
 * Deletes a company from 'Companies' and 'InvoiceCounter' sheets.
 */
export async function deleteCompany(
  sheetId: string,
  accessToken: string,
  companyId: string,
  companyRowIndex: number
): Promise<boolean> {
  try {
    // 1. Find the numeric IDs for both sheets
    const companiesSheetId = await getSheetIdByTitle(
      sheetId,
      accessToken,
      "Companies"
    )
    const counterSheetId = await getSheetIdByTitle(
      sheetId,
      accessToken,
      "InvoiceCounter"
    )

    if (companiesSheetId === null || counterSheetId === null) {
      throw new Error("Could not find required sheets to delete company.")
    }

    // 2. Find the row index in 'InvoiceCounter' sheet
    const counterRange = "InvoiceCounter!A2:A"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${counterRange}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new Error("Could not read InvoiceCounter sheet.")
    }
    const data = await response.json()
    const counterValues: string[][] = data.values || []
    const counterRowIndex = counterValues.findIndex(
      (row) => row[0] === companyId
    )

    // 3. Build the batch delete request
    const requests: sheets_v4.Schema$Request[] = [
      {
        deleteDimension: {
          range: {
            sheetId: companiesSheetId,
            dimension: "ROWS",
            startIndex: companyRowIndex - 1, // 0-based index
            endIndex: companyRowIndex,
          },
        },
      },
    ]

    if (counterRowIndex !== -1) {
      const counterSheetRow = counterRowIndex + 2 // +2 because we started at A2
      requests.push({
        deleteDimension: {
          range: {
            sheetId: counterSheetId,
            dimension: "ROWS",
            startIndex: counterSheetRow - 1, // 0-based index
            endIndex: counterSheetRow,
          },
        },
      })
    }

    // 4. Execute the batch update
    const batchUrl = `${SHEETS_API_URL}/${sheetId}:batchUpdate`
    const batchResponse = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    })

    if (!batchResponse.ok) {
      throw new Error("Failed to delete company from Google Sheet.")
    }

    toast.success(`Company deleted successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in deleteCompany:", error)
    toast.error(error.message || "Could not delete your company.")
    return false
  }
}

// =================================================================
// --- CATEGORY FUNCTIONS ---
// =================================================================

/**
 * Fetches all categories from the 'Categories' tab.
 */
export async function getCategories(
  sheetId: string,
  accessToken: string
): Promise<Category[]> {
  try {
    const range = "Categories!A2:C"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch categories from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    return values
      .map((row: string[]) => ({
        id: row[0],
        name: row[1],
        type: row[2] === "Income" ? "Income" : "Expense",
      }))
      .filter((c: Category) => c.id && c.name && c.type)
  } catch (error: any) {
    console.error("Error in getCategories:", error)
    toast.error(error.message || "Could not load your categories.")
    return []
  }
}

/**
 * Adds a new category to the 'Categories' tab.
 */
export async function addCategory(
  sheetId: string,
  accessToken: string,
  categoryName: string,
  categoryType: "Income" | "Expense"
): Promise<boolean> {
  try {
    const range = "Categories!A:C"
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
      throw new Error("Failed to add category to Google Sheet.")
    }

    toast.success(`Category "${categoryName}" added successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in addCategory:", error)
    toast.error(error.message || "Could not add your category.")
    return false
  }
}

// =================================================================
// --- TRANSACTION FUNCTIONS ---
// =================================================================

/**
 * Fetches the 100 most recent transactions from the 'Transactions' tab.
 */
export async function getTransactions(
  sheetId: string,
  accessToken: string
): Promise<Transaction[]> {
  try {
    const range = "Transactions!A2:H" // <-- MODIFIED (was A2:G)
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?majorDimension=ROWS`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch transactions from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    const transactions: Transaction[] = values
      .map((row: any[], index: number) => ({
        rowIndex: index + 2,
        date: row[0] || "",
        company: row[1] || "",
        category: row[2] || "",
        description: row[3] || "",
        income: parseFloat(row[4]) || 0,
        expense: parseFloat(row[5]) || 0,
        receiptLink: row[6] || "",
        invoiceId: row[7] || "", // <-- ADDED
      }))
      .filter(
        (t: Transaction) =>
          t.date || t.company || t.category || t.income || t.expense
      ) // Filter out empty rows

    return transactions.reverse().slice(0, 100)
  } catch (error: any) {
    console.error("Error in getTransactions:", error)
    toast.error(error.message || "Could not load your transactions.")
    return []
  }
}

/**
 * Adds a new transaction to the 'Transactions' tab.
 */
export async function addTransaction(
  sheetId: string,
  accessToken: string,
  transaction: TransactionData
): Promise<boolean> {
  try {
    const range = "Transactions!A:H" // <-- MODIFIED (was A:G)
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`

    const formattedDate = format(transaction.date, "MM/dd/yyyy")

    const newRow = [
      formattedDate,
      transaction.company,
      transaction.category,
      transaction.description,
      transaction.type === "Income" ? transaction.amount : "",
      transaction.type === "Expense" ? transaction.amount : "",
      transaction.receiptLink || "",
      transaction.invoiceId || "", // <-- ADDED
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
      throw new Error("Failed to add transaction to Google Sheet.")
    }

    toast.success(`Transaction added successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in addTransaction:", error)
    toast.error(error.message || "Could not add your transaction.")
    return false
  }
}

/**
 * Updates a specific transaction row in the 'Transactions' tab.
 */
export async function updateTransaction(
  sheetId: string,
  accessToken: string,
  rowIndex: number,
  transaction: TransactionData
): Promise<boolean> {
  try {
    const range = `Transactions!A${rowIndex}:H${rowIndex}` // <-- MODIFIED (was A:G)
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`

    const formattedDate = format(transaction.date, "MM/dd/yyyy")
    const updatedRow = [
      formattedDate,
      transaction.company,
      transaction.category,
      transaction.description,
      transaction.type === "Income" ? transaction.amount : "",
      transaction.type === "Expense" ? transaction.amount : "",
      transaction.receiptLink || "",
      transaction.invoiceId || "", // <-- ADDED
    ]

    const body = {
      values: [updatedRow],
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update transaction in Google Sheet.")
    }

    toast.success(`Transaction updated successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in updateTransaction:", error)
    toast.error(error.message || "Could not update your transaction.")
    return false
  }
}

/**
 * Deletes a specific row from the 'Transactions' tab.
 */
export async function deleteTransaction(
  sheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<boolean> {
  try {
    const transactionsSheetId = await getSheetIdByTitle(
      sheetId,
      accessToken,
      "Transactions"
    )
    if (transactionsSheetId === null) {
      throw new Error("Could not find 'Transactions' sheet.")
    }

    const url = `${SHEETS_API_URL}/${sheetId}:batchUpdate`
    const body = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: transactionsSheetId, // Use the numeric ID
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based index
              endIndex: rowIndex,
            },
          },
        },
      ],
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
      throw new Error("Failed to delete transaction from Google Sheet.")
    }

    toast.success(`Transaction deleted successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in deleteTransaction:", error)
    toast.error(error.message || "Could not delete your transaction.")
    return false
  }
}

// =================================================================
// --- BILL FUNCTIONS ---
// =================================================================

/**
 * Fetches all bills from the 'Bills' tab.
 */
export async function getBills(
  sheetId: string,
  accessToken: string
): Promise<Bill[]> {
  try {
    const range = "Bills!A2:E"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?majorDimension=ROWS`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch bills from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    const bills: Bill[] = values
      .map((row: any[], index: number) => ({
        rowIndex: index + 2,
        billId: row[0] || "",
        dueDate: row[1] || "",
        payee: row[2] || "",
        amount: parseFloat(row[3]) || 0,
        status: row[4] === "Paid" ? "Paid" : "Pending",
      }))
      .filter((b: Bill) => b.billId && b.payee && b.amount > 0)

    return bills.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
  } catch (error: any) {
    console.error("Error in getBills:", error)
    toast.error(error.message || "Could not load your bills.")
    return []
  }
}

/**
 * Adds a new bill to the 'Bills' tab.
 */
export async function addBill(
  sheetId: string,
  accessToken: string,
  bill: BillData
): Promise<boolean> {
  try {
    const range = "Bills!A:E"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`

    const formattedDate = format(bill.dueDate, "MM/dd/yyyy")
    const billId = `bill-${Date.now()}`
    const status = "Pending"

    const newRow = [billId, formattedDate, bill.payee, bill.amount, status]

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
      throw new Error("Failed to add bill to Google Sheet.")
    }

    toast.success(`Bill for ${bill.payee} added successfully!`)
    return true
  } catch (error: any) {
    console.error("Error in addBill:", error)
    toast.error(error.message || "Could not add your bill.")
    return false
  }
}

/**
 * Updates the status of a specific bill (e.g., "Pending" to "Paid").
 */
export async function updateBillStatus(
  sheetId: string,
  accessToken: string,
  rowIndex: number,
  status: BillStatus
): Promise<boolean> {
  try {
    const range = `Bills!E${rowIndex}` // Target only the Status cell
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`

    const body = {
      values: [[status]],
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update bill status in Google Sheet.")
    }

    toast.success(`Bill status updated to ${status}!`)
    return true
  } catch (error: any) {
    console.error("Error in updateBillStatus:", error)
    toast.error(error.message || "Could not update bill status.")
    return false
  }
}

/**
 * Deletes a specific row from the 'Bills' tab.
 */
export async function deleteBill(
  sheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<boolean> {
  try {
    const billsSheetId = await getSheetIdByTitle(sheetId, accessToken, "Bills")
    if (billsSheetId === null) {
      throw new Error("Could not find 'Bills' sheet.")
    }

    const url = `${SHEETS_API_URL}/${sheetId}:batchUpdate`
    const body = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: billsSheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based index
              endIndex: rowIndex,
            },
          },
        },
      ],
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
      throw new Error("Failed to delete bill from Google Sheet.")
    }

    toast.success(`Bill deleted successfully!`)
    return true
  } catch (error: unknown) {
    console.error("Error in deleteBill:", error)
    const message = error instanceof Error ? error.message : String(error)
    toast.error(message || "Could not delete your bill.")
    return false
  }
}

// =================================================================
// --- INVOICE FUNCTIONS (NEW) ---
// =================================================================

/**
 * Fetches the next invoice number for a specific company.
 * @returns The row index and the next number (e.g., { rowIndex: 3, nextNumber: 5 })
 */
async function getNextInvoiceNumber(
  sheetId: string,
  accessToken: string,
  companyId: string
): Promise<{ rowIndex: number; nextNumber: number } | null> {
  try {
    const range = "InvoiceCounter!A2:B"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new Error("Could not read InvoiceCounter sheet.")
    }

    const data = await response.json()
    const values: string[][] = data.values || []

    const rowIndex = values.findIndex((row) => row[0] === companyId)
    if (rowIndex === -1) {
      throw new Error("Company not found in InvoiceCounter sheet.")
    }

    const nextNumber = parseInt(values[rowIndex][1], 10)
    if (isNaN(nextNumber)) {
      throw new Error("Invalid invoice number in counter sheet.")
    }

    return {
      rowIndex: rowIndex + 2, // +2 because we start at A2
      nextNumber: nextNumber,
    }
  } catch (error: any) {
    console.error("Error in getNextInvoiceNumber:", error)
    toast.error(error.message || "Could not get next invoice number.")
    return null
  }
}

/**
 * Increments the invoice number for a specific company.
 */
async function incrementInvoiceNumber(
  sheetId: string,
  accessToken: string,
  counterRowIndex: number,
  newNumber: number
): Promise<boolean> {
  try {
    const range = `InvoiceCounter!B${counterRowIndex}`
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`
    const body = {
      values: [[newNumber]],
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update invoice counter.")
    }
    return true
  } catch (error: any) {
    console.error("Error in incrementInvoiceNumber:", error)
    toast.error(error.message || "Could not update invoice counter.")
    return false
  }
}

/**
 * Creates a new transaction, generates an invoice ID, creates an invoice record,
 * and updates the transaction with the new invoice ID.
 * This is a multi-step process.
 */
export async function createTransactionAndInvoice(
  sheetId: string,
  accessToken: string,
  transactionData: Omit<TransactionData, "invoiceId">,
  invoiceData: Omit<InvoiceData, "transactionId" | "totalAmount">,
  company: Company // Pass the full company object
): Promise<boolean> {
  try {
    // 1. Get the next invoice number
    const counter = await getNextInvoiceNumber(
      sheetId,
      accessToken,
      company.id
    )
    if (!counter) {
      return false // Error toast already shown
    }

    const { rowIndex: counterRowIndex, nextNumber } = counter
    const formattedInvoiceId = `${company.invoicePrefix}${String(
      nextNumber
    ).padStart(3, "0")}`
    const transactionId = `txn-${Date.now()}` // Simple unique ID for the transaction

    // 2. Add the Transaction
    const fullTransactionData: TransactionData = {
      ...transactionData,
      invoiceId: formattedInvoiceId,
    }
    const transactionSuccess = await addTransaction(
      sheetId,
      accessToken,
      fullTransactionData
    )
    if (!transactionSuccess) {
      throw new Error("Failed to create the transaction.")
    }

    // 3. Add the Invoice
    const rangeInvoices = "Invoices!A:I"
    const urlInvoices = `${SHEETS_API_URL}/${sheetId}/values/${rangeInvoices}:append?valueInputOption=USER_ENTERED`
    const newInvoiceRow = [
      formattedInvoiceId,
      transactionId, // This is a new ID we generate
      invoiceData.companyId,
      invoiceData.customerName,
      invoiceData.customerAddress,
      format(invoiceData.issueDate, "MM/dd/yyyy"),
      format(invoiceData.dueDate, "MM/dd/yyyy"),
      transactionData.amount, // Use the amount from the transaction
      "Draft", // All new invoices start as Draft
    ]

    const invoiceBody = {
      values: [newInvoiceRow],
    }

    const invoiceResponse = await fetch(urlInvoices, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceBody),
    })

    if (!invoiceResponse.ok) {
      // Ideally, we'd roll back the transaction here.
      // For now, we'll toast an error.
      throw new Error(
        "Transaction created, but failed to create invoice record."
      )
    }

    // 4. Increment the invoice counter
    const incrementSuccess = await incrementInvoiceNumber(
      sheetId,
      accessToken,
      counterRowIndex,
      nextNumber + 1
    )
    if (!incrementSuccess) {
      throw new Error(
        "Transaction and invoice created, but failed to update invoice counter."
      )
    }

    toast.success(
      `Transaction added and Invoice ${formattedInvoiceId} created!`
    )
    return true
  } catch (error: any) {
    console.error("Error in createTransactionAndInvoice:", error)
    toast.error(error.message || "Could not create invoice.")
    return false
  }
}

/**
 * Fetches all invoices from the 'Invoices' tab.
 */
export async function getInvoices(
  sheetId: string,
  accessToken: string
): Promise<Invoice[]> {
  try {
    const range = "Invoices!A2:I"
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?majorDimension=ROWS`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch invoices from Google Sheet.")
    }

    const data = await response.json()
    const values = data.values || []

    const invoices: Invoice[] = values
      .map((row: any[], index: number) => ({
        rowIndex: index + 2,
        invoiceId: row[0] || "",
        transactionId: row[1] || "",
        companyId: row[2] || "",
        customerName: row[3] || "",
        customerAddress: row[4] || "",
        issueDate: row[5] || "",
        dueDate: row[6] || "",
        totalAmount: parseFloat(row[7]) || 0,
        status: (row[8] as InvoiceStatus) || "Draft",
      }))
      .filter((inv: Invoice) => inv.invoiceId && inv.companyId)

    return invoices.reverse()
  } catch (error: any) {
    console.error("Error in getInvoices:", error)
    toast.error(error.message || "Could not load your invoices.")
    return []
  }
}

/**
 * Updates the status of a specific invoice.
 */
export async function updateInvoiceStatus(
  sheetId: string,
  accessToken: string,
  rowIndex: number,
  status: InvoiceStatus
): Promise<boolean> {
  try {
    const range = `Invoices!I${rowIndex}` // Target only the Status cell (Column I)
    const url = `${SHEETS_API_URL}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`

    const body = {
      values: [[status]],
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error("Failed to update invoice status in Google Sheet.")
    }

    toast.success(`Invoice status updated to ${status}!`)
    return true
  } catch (error: any) {
    console.error("Error in updateInvoiceStatus:", error)
    toast.error(error.message || "Could not update invoice status.")
    return false
  }
}

/**
 * Deletes a specific row from the 'Invoices' tab.
 * Note: This does NOT delete the associated transaction.
 */
export async function deleteInvoice(
  sheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<boolean> {
  try {
    const invoicesSheetId = await getSheetIdByTitle(
      sheetId,
      accessToken,
      "Invoices"
    )
    if (invoicesSheetId === null) {
      throw new Error("Could not find 'Invoices' sheet.")
    }

    const url = `${SHEETS_API_URL}/${sheetId}:batchUpdate`
    const body = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: invoicesSheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based index
              endIndex: rowIndex,
            },
          },
        },
      ],
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
      throw new Error("Failed to delete invoice from Google Sheet.")
    }

    toast.success(`Invoice deleted successfully!`)
    return true
  } catch (error: unknown) {
    console.error("Error in deleteInvoice:", error)
    const message = error instanceof Error ? error.message : String(error)
    toast.error(message || "Could not delete your invoice.")
    return false
  }
}