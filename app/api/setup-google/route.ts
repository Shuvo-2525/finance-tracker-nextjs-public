import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

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
      return NextResponse.json(
        { error: "Failed to create Google Sheet." },
        { status: 500 }
      )
    }

    // 5. Move the Sheet into the new Folder
    try {
      // Retrieve the file to get its current parents
      const file = await drive.files.get({
        fileId: sheetId,
        fields: "parents",
      })
      const previousParents = file.data.parents?.join(",")

      // Move the file to the new folder
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

    // 6. Return the new IDs to the client
    return NextResponse.json({ folderId: folderId, sheetId: sheetId })
  } catch (error) {
    console.error("Full API error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}