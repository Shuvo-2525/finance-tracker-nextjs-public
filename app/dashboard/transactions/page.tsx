"use client"

import * as React from "react"
import Link from "next/link" // <-- Import Link
import { format } from "date-fns"
import {
  Calendar as CalendarIcon,
  Loader2,
  PlusCircle,
  RefreshCw,
  MoreHorizontal, // For the ... button
  Trash2, // Delete icon
  Pencil, // Edit icon
  LinkIcon, // <-- ADD THIS
  X, // <-- ADD THIS for clearing file
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  getCategories,
  getTransactions,
  addTransaction,
  deleteTransaction, // Import delete function
  type Company,
  type Category,
  type Transaction,
  type TransactionData, // <-- Import TransactionData
} from "@/lib/sheets"
// Import the new Edit sheet
import { EditTransactionSheet } from "./EditTransactionSheet"

// Helper to format currency
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export default function TransactionsPage() {
  const { sheetId, getGoogleAccessToken, uploadFileToDrive } = useDashboard() // <-- Get uploadFileToDrive
  const fileInputRef = React.useRef<HTMLInputElement>(null) // <-- Ref for file input

  // State for data
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])

  // State for loading
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false) // <-- ADD THIS
  const [isDeleting, setIsDeleting] = React.useState(false)

  // State for the new transaction form
  const [formType, setFormType] = React.useState<"Income" | "Expense">(
    "Expense"
  )
  const [formDate, setFormDate] = React.useState<Date | undefined>(new Date())
  const [formCompany, setFormCompany] = React.useState<string>("")
  const [formCategory, setFormCategory] = React.useState<string>("")
  const [formAmount, setFormAmount] = React.useState<string>("")
  const [formDescription, setFormDescription] = React.useState<string>("")
  const [formReceiptFile, setFormReceiptFile] = React.useState<File | null>(null) // <-- ADD THIS

  // --- NEW STATE FOR EDIT & DELETE ---
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  // --- END NEW STATE ---

  // Fetch all data (companies, categories, transactions)
  const fetchAllData = React.useCallback(async () => {
    if (!sheetId) return

    setIsLoadingData(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsLoadingData(false)
      return
    }

    // Fetch all three in parallel
    const [fetchedCompanies, fetchedCategories, fetchedTransactions] =
      await Promise.all([
        getCompanies(sheetId, accessToken),
        getCategories(sheetId, accessToken),
        getTransactions(sheetId, accessToken),
      ])

    setCompanies(fetchedCompanies)
    setCategories(fetchedCategories)
    setTransactions(fetchedTransactions)
    setIsLoadingData(false)
  }, [sheetId, getGoogleAccessToken])

  // --- NEW: Handle just refreshing transactions (after an update/delete) ---
  const refreshTransactions = React.useCallback(async () => {
    if (!sheetId) return

    // We don't need to set the big loader, just update in background
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) return

    const fetchedTransactions = await getTransactions(sheetId, accessToken)
    setTransactions(fetchedTransactions)
  }, [sheetId, getGoogleAccessToken])
  // --- END NEW ---

  // Reset the form fields
  const resetForm = () => {
    setFormDate(new Date())
    setFormCompany("")
    setFormCategory("")
    setFormAmount("")
    setFormDescription("")
    setFormType("Expense")
    setFormReceiptFile(null) // <-- ADD THIS
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // <-- ADD THIS
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Optional: Check file size or type
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File is too large. Max 10MB.")
        return
      }
      setFormReceiptFile(file)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // --- Validation ---
    if (
      !sheetId ||
      !formDate ||
      !formCompany ||
      !formCategory ||
      !formAmount
    ) {
      toast.error("Please fill out all required fields.")
      return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid, positive amount.")
      return
    }
    // --- End Validation ---

    setIsAdding(true)
    let receiptUrl: string | null = null

    // --- NEW: File Upload Logic ---
    if (formReceiptFile) {
      setIsUploading(true)
      receiptUrl = await uploadFileToDrive(formReceiptFile)
      setIsUploading(false)

      if (!receiptUrl) {
        // Upload failed, stop the submission
        toast.error("Receipt upload failed. Transaction not added.")
        setIsAdding(false)
        return
      }
    }
    // --- END: File Upload Logic ---

    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsAdding(false)
      return
    }

    // --- MODIFIED: Pass receiptUrl to addTransaction ---
    const transactionData: TransactionData = {
      date: formDate,
      company: formCompany,
      category: formCategory,
      description: formDescription,
      amount: amount,
      type: formType,
      receiptLink: receiptUrl || undefined, // Add the link if it exists
    }

    const success = await addTransaction(sheetId, accessToken, transactionData)

    if (success) {
      resetForm()
      // Fetch only new transactions to update the list
      await refreshTransactions()
    }

    setIsAdding(false)
  }

  // --- NEW: Functions to handle actions ---
  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsEditSheetOpen(true)
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!sheetId || !selectedTransaction) return

    setIsDeleting(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsDeleting(false)
      return
    }

    const success = await deleteTransaction(
      sheetId,
      accessToken,
      selectedTransaction.rowIndex
    )

    if (success) {
      await refreshTransactions()
    }

    setIsDeleting(false)
    setIsDeleteAlertOpen(false)
    setSelectedTransaction(null)
  }
  // --- END NEW ---

  // Filter categories based on the selected form type
  const availableCategories = categories.filter((c) => c.type === formType)

  // Disable all form fields if any operation is in progress
  const isFormDisabled = isAdding || isUploading || isLoadingData

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- Add Transaction Card --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add New Transaction</CardTitle>
            <CardDescription>
              Log your latest income or expense.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div>
                <Label>Transaction Type</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formType === "Income" ? "default" : "outline"}
                    onClick={() => {
                      setFormType("Income")
                      setFormCategory("") // Reset category on type change
                    }}
                    disabled={isFormDisabled}
                  >
                    Income
                  </Button>
                  <Button
                    type="button"
                    variant={formType === "Expense" ? "default" : "outline"}
                    onClick={() => {
                      setFormType("Expense")
                      setFormCategory("") // Reset category on type change
                    }}
                    disabled={isFormDisabled}
                  >
                    Expense
                  </Button>
                </div>
              </div>

              {/* Date Picker */}
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formDate && "text-muted-foreground"
                      )}
                      disabled={isFormDisabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formDate ? (
                        format(formDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formDate}
                      onSelect={setFormDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  disabled={isFormDisabled}
                />
              </div>

              {/* Company Select */}
              <div>
                <Label htmlFor="company">Company</Label>
                <Select
                  value={formCompany}
                  onValueChange={setFormCompany}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.rowIndex} value={company.name}> {/* <-- FIX: Use rowIndex */}
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Select */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formCategory}
                  onValueChange={setFormCategory}
                  disabled={isFormDisabled || !formType}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No {formType.toLowerCase()} categories found.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Monthly software subscription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={isFormDisabled}
                />
              </div>

              {/* --- NEW: File Upload --- */}
              <div>
                <Label htmlFor="receipt">Receipt (Optional)</Label>
                {formReceiptFile ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {formReceiptFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setFormReceiptFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      disabled={isFormDisabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="receipt"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isFormDisabled}
                    accept="image/*,application/pdf" // Optional: restrict file types
                    className="mt-1"
                  />
                )}
              </div>
              {/* --- END: File Upload --- */}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isFormDisabled}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isUploading
                  ? "Uploading Receipt..."
                  : isAdding
                  ? "Adding..."
                  : "Add Transaction"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* --- Recent Transactions Card --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Showing your last {transactions.length} transactions.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllData}
                disabled={isLoadingData}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    isLoadingData && "animate-spin"
                  )}
                />
                Load Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-8 w-8 animate-spin text-muted-foreground"
                />
                <p className="ml-2">Loading all data...</p>
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Click "Load Data" to see your transactions.
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((t) => (
                  <div
                    key={t.rowIndex} // Use rowIndex as the key
                    className="flex items-center justify-between rounded-md border bg-background p-4"
                  >
                    {/* Transaction Info */}
                    <div>
                      <p className="font-medium">{t.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.company}
                        {t.description && ` - ${t.description}`}
                      </p>
                      {/* --- NEW: View Receipt Link --- */}
                      {t.receiptLink && (
                        <Button
                          asChild
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs text-blue-500 hover:text-blue-600"
                        >
                          <Link
                            href={t.receiptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkIcon className="mr-1 h-3 w-3" />
                            View Receipt
                          </Link>
                        </Button>
                      )}
                      {/* --- END: View Receipt Link --- */}
                    </div>

                    {/* Amount, Date, and Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-semibold",
                            t.income > 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {t.income > 0
                            ? currencyFormatter.format(t.income)
                            : currencyFormatter.format(t.expense * -1)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t.date}
                        </p>
                      </div>

                      {/* --- Action Dropdown Menu --- */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(t)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {/* --- NEW: Add Receipt Link to Dropdown --- */}
                          {t.receiptLink && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={t.receiptLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                View Receipt
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {/* --- END: Add Receipt Link --- */}
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(t)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* --- END --- */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Edit Sheet Portal --- */}
      <EditTransactionSheet
        isOpen={isEditSheetOpen}
        setIsOpen={setIsEditSheetOpen}
        transaction={selectedTransaction}
        companies={companies}
        categories={categories}
        onTransactionUpdated={refreshTransactions}
      />

      {/* --- Delete Alert Portal --- */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction from your Google Sheet.
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