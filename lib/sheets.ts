import { toast } from "sonner"

// This is the URL for the Google Sheets API
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets"

// Define the shape of a Company object, matching our sheet
export type Company = {
  id: string
  name: string
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
    const companyId = companyName.toLowerCase().replace(/\s+/g, "-") + `-${Date.now()}`

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