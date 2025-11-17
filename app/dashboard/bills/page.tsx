"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import {
  Calendar as CalendarIcon,
  Loader2,
  PlusCircle,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Circle,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  // Bill functions
  getBills,
  addBill,
  deleteBill,
  updateBillStatus,
  // Other functions needed
  getCompanies,
  getCategories,
  addTransaction,
  // Types
  type Bill,
  type BillData,
  type Company,
  type Category,
  type TransactionData,
} from "@/lib/sheets"

// Helper to format currency
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export default function BillsPage() {
  const { sheetId, getGoogleAccessToken } = useDashboard()

  // --- State for Data ---
  const [bills, setBills] = React.useState<Bill[]>([])
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [expenseCategories, setExpenseCategories] = React.useState<Category[]>(
    []
  )

  // --- State for Forms ---
  const [formPayee, setFormPayee] = React.useState("")
  const [formAmount, setFormAmount] = React.useState("")
  const [formDueDate, setFormDueDate] = React.useState<Date | undefined>(
    new Date()
  )

  // --- State for Modals ---
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false)
  const [isMarkAsPaidSheetOpen, setIsMarkAsPaidSheetOpen] =
    React.useState(false)

  // --- State for "Mark as Paid" Form ---
  const [markAsPaidCompany, setMarkAsPaidCompany] = React.useState("")
  const [markAsPaidCategory, setMarkAsPaidCategory] = React.useState("")

  // --- State for UI ---
  const [isLoading, setIsLoading] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isMarkingAsPaid, setIsMarkingAsPaid] = React.useState(false)

  // Fetch all data required for this page
  const fetchData = React.useCallback(async () => {
    if (!sheetId) return

    setIsLoading(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    const [fetchedBills, fetchedCompanies, fetchedCategories] =
      await Promise.all([
        getBills(sheetId, accessToken),
        getCompanies(sheetId, accessToken),
        getCategories(sheetId, accessToken),
      ])

    setBills(fetchedBills)
    setCompanies(fetchedCompanies)
    setExpenseCategories(
      fetchedCategories.filter((c) => c.type === "Expense")
    )
    setIsLoading(false)
  }, [sheetId, getGoogleAccessToken])

  // Function to only refresh the bills list
  const refreshBills = React.useCallback(async () => {
    if (!sheetId) return

    const accessToken = await getGoogleAccessToken()
    if (!accessToken) return

    const fetchedBills = await getBills(sheetId, accessToken)
    setBills(fetchedBills)
  }, [sheetId, getGoogleAccessToken])

  // Fetch data on page load
  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Form Handlers ---
  const resetForm = () => {
    setFormPayee("")
    setFormAmount("")
    setFormDueDate(new Date())
  }

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !formDueDate || !formPayee || !formAmount) {
      toast.error("Please fill out all required fields.")
      return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid, positive amount.")
      return
    }

    setIsAdding(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsAdding(false)
      return
    }

    const billData: BillData = {
      dueDate: formDueDate,
      payee: formPayee,
      amount: amount,
    }

    const success = await addBill(sheetId, accessToken, billData)
    if (success) {
      resetForm()
      await refreshBills()
    }
    setIsAdding(false)
  }

  // --- Action Handlers ---
  const handleDeleteClick = (bill: Bill) => {
    setSelectedBill(bill)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!sheetId || !selectedBill) return

    setIsDeleting(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsDeleting(false)
      return
    }

    const success = await deleteBill(
      sheetId,
      accessToken,
      selectedBill.rowIndex
    )
    if (success) {
      await refreshBills()
    }

    setIsDeleting(false)
    setIsDeleteAlertOpen(false)
    setSelectedBill(null)
  }

  const handleMarkAsPaidClick = (bill: Bill) => {
    setSelectedBill(bill)
    setIsMarkAsPaidSheetOpen(true)
    // Pre-select company if only one exists
    if (companies.length === 1) {
      setMarkAsPaidCompany(companies[0].name)
    }
  }

  const confirmMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !selectedBill || !markAsPaidCompany || !markAsPaidCategory) {
      toast.error("Please select a company and category for the transaction.")
      return
    }

    setIsMarkingAsPaid(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsMarkingAsPaid(false)
      return
    }

    // 1. Create the new expense transaction
    const transactionData: TransactionData = {
      date: new Date(), // Use today's date for payment
      company: markAsPaidCompany,
      category: markAsPaidCategory,
      description: `Payment for bill: ${selectedBill.payee}`,
      amount: selectedBill.amount,
      type: "Expense",
    }

    const transactionSuccess = await addTransaction(
      sheetId,
      accessToken,
      transactionData
    )

    if (!transactionSuccess) {
      toast.error("Failed to create expense transaction. Please try again.")
      setIsMarkingAsPaid(false)
      return
    }

    // 2. Update the bill status to "Paid"
    const statusSuccess = await updateBillStatus(
      sheetId,
      accessToken,
      selectedBill.rowIndex,
      "Paid"
    )

    if (statusSuccess) {
      await refreshBills()
      setIsMarkAsPaidSheetOpen(false)
      setSelectedBill(null)
      setMarkAsPaidCompany("")
      setMarkAsPaidCategory("")
    }

    setIsMarkingAsPaid(false)
  }

  // --- Data Filtering ---
  const pendingBills = bills.filter((b) => b.status === "Pending")
  const paidBills = bills.filter((b) => b.status === "Paid").slice(0, 10) // Show last 10 paid

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- Add New Bill Card --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add New Bill</CardTitle>
            <CardDescription>
              Log an upcoming bill you need to pay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddBill} className="space-y-4">
              {/* Payee */}
              <div>
                <Label htmlFor="payee">Payee</Label>
                <Input
                  id="payee"
                  placeholder="e.g., Power Company"
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                  disabled={isAdding}
                />
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
                  disabled={isAdding}
                />
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="date">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formDueDate && "text-muted-foreground"
                      )}
                      disabled={isAdding}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formDueDate ? (
                        format(formDueDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formDueDate}
                      onSelect={setFormDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isAdding}>
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isAdding ? "Adding..." : "Add Bill"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* --- Bill List Card --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bill Tracker</CardTitle>
                <CardDescription>
                  Manage your upcoming and recently paid bills.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-8 w-8 animate-spin text-muted-foreground"
                />
                <p className="ml-2">Loading all data...</p>
              </div>
            ) : bills.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No bills found. Add one to get started!
              </p>
            ) : (
              <div className="space-y-6">
                {/* Pending Bills */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Pending</h3>
                  {pendingBills.length > 0 ? (
                    <div className="space-y-4">
                      {pendingBills.map((bill) => (
                        <BillItem
                          key={bill.billId}
                          bill={bill}
                          onMarkAsPaid={handleMarkAsPaidClick}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No pending bills. You're all caught up!
                    </p>
                  )}
                </div>

                <Separator />

                {/* Recently Paid Bills */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recently Paid</h3>
                  {paidBills.length > 0 ? (
                    <div className="space-y-4">
                      {paidBills.map((bill) => (
                        <BillItem
                          key={bill.billId}
                          bill={bill}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recently paid bills found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Mark as Paid Sheet --- */}
      <Sheet
        open={isMarkAsPaidSheetOpen}
        onOpenChange={setIsMarkAsPaidSheetOpen}
      >
        <SheetContent className="sm:max-w-lg">
          <form onSubmit={confirmMarkAsPaid}>
            <SheetHeader>
              <SheetTitle>Mark Bill as Paid</SheetTitle>
              <SheetDescription>
                This will create a new expense transaction for{" "}
                <b>{selectedBill?.payee}</b> in the amount of{" "}
                <b>{currencyFormatter.format(selectedBill?.amount || 0)}</b>.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-6">
              {/* Company Select */}
              <div>
                <Label htmlFor="markAsPaidCompany">Company</Label>
                <Select
                  value={markAsPaidCompany}
                  onValueChange={setMarkAsPaidCompany}
                  disabled={isMarkingAsPaid}
                >
                  <SelectTrigger id="markAsPaidCompany">
                    <SelectValue placeholder="Pay from which company?" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.name}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Select */}
              <div>
                <Label htmlFor="markAsPaidCategory">Expense Category</Label>
                <Select
                  value={markAsPaidCategory}
                  onValueChange={setMarkAsPaidCategory}
                  disabled={isMarkingAsPaid}
                >
                  <SelectTrigger id="markAsPaidCategory">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.length > 0 ? (
                      expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No expense categories found.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isMarkingAsPaid}>
                {isMarkingAsPaid ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isMarkingAsPaid ? "Processing..." : "Confirm & Pay"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- Delete Alert Portal --- */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              bill from your Google Sheet.
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
              {isDeleting ? "Deleting..." : "Delete Bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Sub-component for Bill Item ---
function BillItem({
  bill,
  onMarkAsPaid,
  onDelete,
}: {
  bill: Bill
  onMarkAsPaid?: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  const isPending = bill.status === "Pending"
  const dueDate = parse(bill.dueDate, "MM/dd/yyyy", new Date())
  const isOverdue = isPending && new Date() > dueDate

  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-4">
      <div className="flex items-center gap-3">
        {isPending ? (
          <Circle
            className={cn(
              "h-5 w-5",
              isOverdue ? "text-red-500" : "text-muted-foreground"
            )}
          />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        <div>
          <p className="font-medium">{bill.payee}</p>
          <p
            className={cn(
              "text-sm",
              isPending ? "text-muted-foreground" : "text-green-500"
            )}
          >
            {isPending ? "Due " : "Paid "}
            {format(dueDate, "PPP")}
            {isOverdue && " (Overdue)"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold">
            {currencyFormatter.format(bill.amount)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPending && onMarkAsPaid && (
              <DropdownMenuItem onClick={() => onMarkAsPaid(bill)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(bill)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}