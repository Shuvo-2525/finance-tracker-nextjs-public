"use client"

import * as React from "react"
import {
  PlusCircle,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Building,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  getCompanies,
  addCompany,
  deleteCompany,
  type Company,
  type CompanyData,
} from "@/lib/sheets"
import { EditCompanySheet } from "./EditCompanySheet" // Import the new component

export default function CompaniesPage() {
  const { sheetId, getGoogleAccessToken, uploadFileToDrive } = useDashboard()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // --- State for Data ---
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isFetching, setIsFetching] = React.useState(false)

  // --- State for Forms ---
  const [formName, setFormName] = React.useState("")
  const [formPrefix, setFormPrefix] = React.useState("")
  const [formLogoFile, setFormLogoFile] = React.useState<File | null>(null)

  // --- State for UI ---
  const [isAdding, setIsAdding] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // --- State for Modals ---
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(
    null
  )
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)

  // Function to fetch companies from the sheet
  const fetchCompanies = React.useCallback(async () => {
    if (!sheetId) return

    setIsFetching(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsFetching(false)
      return
    }

    const fetchedCompanies = await getCompanies(sheetId, accessToken)
    setCompanies(fetchedCompanies)
    setIsFetching(false)
  }, [sheetId, getGoogleAccessToken])

  // We no longer fetch on load, user must click "Refresh"
  React.useEffect(() => {
    // fetchCompanies()
  }, [])

  // Function to handle manual refresh click
  const handleRefreshClick = () => {
    fetchCompanies()
  }

  // Reset the add-company form
  const resetForm = () => {
    setFormName("")
    setFormPrefix("")
    setFormLogoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File is too large. Max 5MB.")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type. Please upload an image.")
        return
      }
      setFormLogoFile(file)
    }
  }

  // Function to handle adding a new company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !formName.trim() || !formPrefix.trim()) {
      toast.error("Please enter a Company Name and Invoice Prefix.")
      return
    }

    setIsAdding(true)
    let logoUrl: string | null = null

    // 1. Upload logo if it exists
    if (formLogoFile) {
      setIsUploading(true)
      logoUrl = await uploadFileToDrive(formLogoFile)
      setIsUploading(false)

      if (!logoUrl) {
        toast.error("Logo upload failed. Company not added.")
        setIsAdding(false)
        return
      }
    }

    // 2. Get Access Token
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsAdding(false)
      return
    }

    // 3. Prepare Company Data
    const companyData: CompanyData = {
      name: formName,
      invoicePrefix: formPrefix,
      logoUrl: logoUrl || undefined,
    }

    // 4. Add Company
    const success = await addCompany(sheetId, accessToken, companyData)

    if (success) {
      resetForm()
      await fetchCompanies() // Refresh the list
    }

    setIsAdding(false)
  }

  // --- Action Handlers ---
  const handleEditClick = (company: Company) => {
    setSelectedCompany(company)
    setIsEditSheetOpen(true)
  }

  const handleDeleteClick = (company: Company) => {
    if (company.id === "default") {
      toast.error("The 'Personal' company cannot be deleted.")
      return
    }
    setSelectedCompany(company)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!sheetId || !selectedCompany) return

    setIsDeleting(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsDeleting(false)
      return
    }

    const success = await deleteCompany(
      sheetId,
      accessToken,
      selectedCompany.id,
      selectedCompany.rowIndex
    )

    if (success) {
      await fetchCompanies() // Refresh list
    }

    setIsDeleting(false)
    setIsDeleteAlertOpen(false)
    setSelectedCompany(null)
  }

  const isFormDisabled = isAdding || isUploading || isFetching

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* --- Add New Company Card --- */}
        <Card className="flex flex-col justify-between lg:col-span-1">
          <CardHeader>
            <CardTitle>Add New Company</CardTitle>
            <CardDescription>
              Create a new entity with its own invoice prefix and logo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCompany} className="space-y-4">
              {/* Company Name */}
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., My Side Hustle"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={isFormDisabled}
                  required
                />
              </div>

              {/* Invoice Prefix */}
              <div>
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  placeholder="e.g., HUSTLE-"
                  value={formPrefix}
                  onChange={(e) => setFormPrefix(e.target.value)}
                  disabled={isFormDisabled}
                  required
                />
              </div>

              {/* Logo Upload */}
              <div>
                <Label htmlFor="logo">Company Logo (Optional)</Label>
                {formLogoFile ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="flex-1 truncate text-sm text-muted-foreground">
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
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="logo"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isFormDisabled}
                    accept="image/png, image/jpeg, image/webp"
                    className="mt-1"
                  />
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isFormDisabled}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isUploading
                  ? "Uploading Logo..."
                  : isAdding
                  ? "Creating..."
                  : "Create Company"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* --- Company List Card --- */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Companies</CardTitle>
                <CardDescription>
                  You are currently tracking {companies.length} entities.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshClick}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading companies...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between rounded-md border bg-background p-4"
                    >
                      <div className="flex items-center gap-3">
                        {company.logoUrl ? (
                          <ImageIcon
                            src={company.logoUrl}
                            alt={company.name}
                            className="h-8 w-8 rounded-sm object-contain"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted">
                            <Building className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Prefix: {company.invoicePrefix}
                          </p>
                        </div>
                      </div>

                      {company.id === "default" ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          Default
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(company)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(company)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    Click the "Refresh" button to load your companies.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Edit Sheet --- */}
      <EditCompanySheet
        isOpen={isEditSheetOpen}
        setIsOpen={setIsEditSheetOpen}
        company={selectedCompany}
        onCompanyUpdated={fetchCompanies}
      />

      {/* --- Delete Alert --- */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              company and its invoice counter. Transactions associated with this
              company will NOT be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}