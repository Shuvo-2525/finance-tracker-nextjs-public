import { NextRequest, NextResponse } from "next/server"
import { google, sheets_v4 } from "googleapis"

// Define a type for our Sheets API client
type SheetsApi = sheets_v4.Sheets

/**
 * Sets up the required sheets, headers, and protected ranges
 * in the newly created spreadsheet.
 */
async function initializeSheet(sheetsApi: SheetsApi, spreadsheetId: string) {
  try {
    // 1. Define the new sheets we want to create
    const requests: sheets_v4.Schema$Request[] = [
      // Rename the default 'Sheet1' to 'Transactions'
      {
        updateSheetProperties: {
          properties: {
            sheetId: 0, // 'Sheet1' is always sheetId 0
            title: "Transactions",
          },
          fields: "title",
        },
      },
      // Add a new sheet for 'Companies'
      {
        addSheet: {
          properties: {
            title: "Companies",
            gridProperties: {
              rowCount: 100,
              columnCount: 2,
            },
          },
        },
      },
      // Add a new sheet for 'Categories'
      {
        addSheet: {
          properties: {
            title: "Categories",
            gridProperties: {
              rowCount: 100,
              columnCount: 3, // e.g., Name, Type (Income/Expense)
            },
          },
        },
      },
    ]

    // Execute the batch update to create/rename sheets
    const batchUpdateResponse = await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: requests,
      },
    })

    // 2. Now we need the new sheet IDs to add headers and protections
    const newSheets = batchUpdateResponse.data.replies
      ?.map((reply) => reply.addSheet?.properties)
      .filter(Boolean) as sheets_v4.Schema$SheetProperties[]

    const companiesSheetId =
      newSheets.find((s) => s.title === "Companies")?.sheetId || 0
    const categoriesSheetId =
      newSheets.find((s) => s.title === "Categories")?.sheetId || 0

    // 3. Define the header values for each sheet
    const headerData: sheets_v4.Schema$ValueRange[] = [
      {
        range: "Transactions!A1:F1",
        values: [
          [
            "Date",
            "Company",
            "Category",
            "Description",
            "Amount (Income)",
            "Amount (Expense)",
          ],
        ],
      },
      {
        range: "Companies!A1:B1",
        values: [["Company ID", "Company Name"]],
      },
      {
        range: "Categories!A1:C1",
        values: [["Category ID", "Category Name", "Type"]],
      },
      // Add a default "Personal" company
      {
        range: "Companies!A2:B2",
        values: [["default", "Personal"]],
      },
      // Add some default categories
      {
        range: "Categories!A2:C4",
        values: [
          ["salary", "Salary", "Income"],
          ["rent", "Rent", "Expense"],
          ["groceries", "Groceries", "Expense"],
        ],
      },
    ]

    // Write all header data
    await sheetsApi.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: headerData,
      },
    })

    // 4. Define protections for the header rows
    const protectionRequests: sheets_v4.Schema$Request[] = [
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: 0, // Transactions
              startRowIndex: 0,
              endRowIndex: 1,
            },
            description: "Protect Transactions Headers",
            warningOnly: false,
            editors: {
              users: [
                /* only the app can edit */
              ],
            },
          },
        },
      },
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: companiesSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            description: "Protect Companies Headers",
            warningOnly: false,
          },
        },
      },
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: categoriesSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            description: "Protect Categories Headers",
            warningOnly: false,
          },
        },
      },
    ]

    // Apply the protections
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: protectionRequests,
      },
    })

    console.log("Successfully initialized and protected spreadsheet.")
  } catch (err) {
    console.error("Error initializing sheet:", err)
    // We'll just log the error but not fail the whole request,
    // as the sheet/folder were still created.
    // In a real app, you might want more robust retry logic.
  }
}

// --- MAIN API ROUTE ---

export async function POST(req: NextRequest) {
  try {
    // 1. Get the access token from the client
    const { accessToken } = await req.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      )
    }

    // 2. Set up the Google API clients
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const drive = google.drive({ version: "v3", auth: oauth2Client })
    const sheets = google.sheets({ version: "v4", auth: oauth2Client })

    let folderId = ""
    let sheetId = ""

    // 3. Create the "Finance Tracker" folder
    try {
      const folderMetadata = {
        name: "SaaS Finance Tracker",
        mimeType: "application/vnd.google-apps.folder",
      }
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
      })
      folderId = folder.data.id!
    } catch (err) {
      console.error("Error creating folder:", err)
      return NextResponse.json(
        { error: "Failed to create Google Drive folder." },
        { status: 500 }
      )
    }

    // 4. Create the Google Sheet
    try {
      const spreadsheetMetadata = {
        properties: {
          title: "Finance Tracker - Data",
        },
      }
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: spreadsheetMetadata,
        fields: "spreadsheetId",
      })
      sheetId = spreadsheet.data.spreadsheetId!
    } catch (err) {
      console.error("Error creating sheet:", err)
      // If sheet creation fails, try to delete the folder we just made
      await drive.files.delete({ fileId: folderId })
      return NextResponse.json(
        { error: "Failed to create Google Sheet." },
        { status: 500 }
      )
    }

    // 5. Move the Sheet into the new Folder
    try {
      const file = await drive.files.get({
        fileId: sheetId,
        fields: "parents",
      })
      const previousParents = file.data.parents?.join(",")
      await drive.files.update({
        fileId: sheetId,
        addParents: folderId,
        removeParents: previousParents,
        fields: "id, parents",
      })
    } catch (err) {
      console.error("Error moving sheet into folder:", err)
      return NextResponse.json(
        { error: "Failed to move Google Sheet into folder." },
        { status: 500 }
      )
    }

    // *** THIS IS THE NEW PART ***
    // 6. Initialize the sheet with tabs, headers, and protections
    await initializeSheet(sheets, sheetId)

    // 7. Return the new IDs to the client
    return NextResponse.json({ folderId: folderId, sheetId: sheetId })
  } catch (error) {
    console.error("Full API error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}