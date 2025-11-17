"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Save, LinkIcon, X, Upload } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"

import { useDashboard } from "../context/DashboardContext"
import { updateCompany, type Company } from "../../../lib/sheets"

// Define the props for our new component
interface EditCompanySheetProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  company: Company | null
  onCompanyUpdated: () => void // Callback to refresh the list
}

export function EditCompanySheet({
  isOpen,
  setIsOpen,
  company,
  onCompanyUpdated,
}: EditCompanySheetProps) {
  const { sheetId, getGoogleAccessToken, uploadFileToDrive } = useDashboard()
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // State for the edit form
  const [formName, setFormName] = React.useState("")
  const [formPrefix, setFormPrefix] = React.useState("")
  const [formLogoUrl, setFormLogoUrl] = React.useState("")
  const [formLogoFile, setFormLogoFile] = React.useState<File | null>(null)

  // When the 'company' prop changes, pre-fill the form state
  React.useEffect(() => {
    if (company) {
      setFormName(company.name)
      setFormPrefix(company.invoicePrefix)
      setFormLogoUrl(company.logoUrl || "")
      setFormLogoFile(null) // Reset file input on change
    }
  }, [company])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit for logos
        toast.error("File is too large. Max 5MB.")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type. Please upload an image.")
        return
      }
      setFormLogoFile(file)
      setFormLogoUrl("") // Clear existing link if new file is selected
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sheetId || !company || !formName || !formPrefix) {
      toast.error("Please fill out all required fields.")
      return
    }

    setIsUpdating(true)
    let finalLogoUrl = formLogoUrl // Start with the existing link

    // --- File Upload Logic ---
    if (formLogoFile) {
      setIsUploading(true)
      const newLogoUrl = await uploadFileToDrive(formLogoFile)
      setIsUploading(false)

      if (!newLogoUrl) {
        toast.error("Logo upload failed. Company not updated.")
        setIsUpdating(false)
        return
      }
      finalLogoUrl = newLogoUrl // Set the link to the newly uploaded file
    }
    // --- END: File Upload Logic ---

    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsUpdating(false)
      return
    }

    // Prepare the data payload
    const companyData = {
      name: formName,
      invoicePrefix: formPrefix,
      logoUrl: finalLogoUrl || "",
    }

    // Call our updateCompany function
    const success = await updateCompany(
      sheetId,
      accessToken,
      company.rowIndex, // Pass the rowIndex
      companyData
    )

    if (success) {
      onCompanyUpdated() // Trigger the callback to refresh the list
      setIsOpen(false) // Close the sheet
    }

    setIsUpdating(false)
  }

  const isFormDisabled = isUpdating || isUploading

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Edit Company: {company?.name}</SheetTitle>
            <SheetDescription>
              Update the details for this company. Click save when you&apos;re
              done.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            {/* Company Name */}
            <div>
              <Label htmlFor="edit-companyName">Company Name</Label>
              <Input
                id="edit-companyName"
                placeholder="e.g., My Side Hustle"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isFormDisabled}
                required
              />
            </div>

            {/* Invoice Prefix */}
            <div>
              <Label htmlFor="edit-invoicePrefix">Invoice Prefix</Label>
              <Input
                id="edit-invoicePrefix"
                placeholder="e.g., INV-"
                value={formPrefix}
                onChange={(e) => setFormPrefix(e.target.value)}
                disabled={isFormDisabled}
                required
              />
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="edit-logo">Company Logo (Optional)</Label>
              <div className="mt-1 space-y-2">
                {formLogoUrl ? (
                  // State 1: Show existing link
                  <div className="flex items-center justify-between gap-2 rounded-md border border-input p-2">
                    <div className="flex items-center gap-2 truncate">
                      <Image
                        src={formLogoUrl}
                        alt="Logo"
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-sm object-contain"
                      />
                      <span className="truncate text-sm text-muted-foreground">
                        Current Logo
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setFormLogoUrl("")} // Remove link
                      disabled={isFormDisabled}
                      aria-label="Remove current logo"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : formLogoFile ? (
                  // State 2: Show selected file
                  <div className="flex items-center justify-between gap-2 rounded-md border border-input p-2">
                    <span className="truncate text-sm text-muted-foreground">
                      {formLogoFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setFormLogoFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      disabled={isFormDisabled}
                      aria-label="Clear selected file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // State 3: Show file input
                  <Input
                    id="edit-logo-file"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isFormDisabled}
                    accept="image/png, image/jpeg, image/webp"
                  />
                )}
              </div>
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isFormDisabled}>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isUploading
                ? "Uploading..."
                : isUpdating
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}