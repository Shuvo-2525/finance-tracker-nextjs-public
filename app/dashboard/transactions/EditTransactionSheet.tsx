"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
// --- ERROR FIX: Use relative paths ---
import { useDashboard } from "../context/DashboardContext"
import {
  updateTransaction,
  type Company,
  type Category,
  type Transaction,
  type TransactionData,
} from "../../../lib/sheets"
// --- END ERROR FIX ---

// Define the props for our new component
interface EditTransactionSheetProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  transaction: Transaction | null
  companies: Company[]
  categories: Category[]
  onTransactionUpdated: () => void // Callback to refresh the list
}

export function EditTransactionSheet({
  isOpen,
  setIsOpen,
  transaction,
  companies,
  categories,
  onTransactionUpdated,
}: EditTransactionSheetProps) {
  const { sheetId, getGoogleAccessToken } = useDashboard()
  const [isUpdating, setIsUpdating] = React.useState(false)

  // State for the edit form
  const [formType, setFormType] = React.useState<"Income" | "Expense">(
    "Expense"
  )
  const [formDate, setFormDate] = React.useState<Date | undefined>(new Date())
  const [formCompany, setFormCompany] = React.useState<string>("")
  const [formCategory, setFormCategory] = React.useState<string>("")
  const [formAmount, setFormAmount] = React.useState<string>("")
  const [formDescription, setFormDescription] = React.useState<string>("")

  // When the 'transaction' prop changes, pre-fill the form state
  React.useEffect(() => {
    if (transaction) {
      const type = transaction.income > 0 ? "Income" : "Expense"
      const amount =
        type === "Income" ? transaction.income : transaction.expense
      
      // Parse the date string (MM/dd/yyyy) into a Date object
      const parsedDate = parse(transaction.date, "MM/dd/yyyy", new Date())

      setFormType(type)
      setFormDate(parsedDate)
      setFormCompany(transaction.company)
      setFormCategory(transaction.category)
      setFormAmount(String(amount))
      setFormDescription(transaction.description)
    }
  }, [transaction])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // --- Validation ---
    if (
      !sheetId ||
      !transaction ||
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

    setIsUpdating(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsUpdating(false)
      return
    }

    // Prepare the data payload
    const transactionData: TransactionData = {
      date: formDate,
      company: formCompany,
      category: formCategory,
      description: formDescription,
      amount: amount,
      type: formType,
    }

    // Call our NEW updateTransaction function
    const success = await updateTransaction(
      sheetId,
      accessToken,
      transaction.rowIndex, // Pass the all-important rowIndex
      transactionData
    )

    if (success) {
      onTransactionUpdated() // Trigger the callback to refresh the list
      setIsOpen(false) // Close the sheet
    }

    setIsUpdating(false)
  }

  // Filter categories based on the selected form type
  const availableCategories = categories.filter((c) => c.type === formType)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
            <SheetDescription>
              Update the details for this transaction. Click save when
              you&apos;re done.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
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
                  disabled={isUpdating}
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
                  disabled={isUpdating}
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
                    disabled={isUpdating}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, "PPP") : <span>Pick a date</span>}
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
                disabled={isUpdating}
              />
            </div>

            {/* Company Select */}
            <div>
              <Label htmlFor="company">Company</Label>
              <Select
                value={formCompany}
                onValueChange={setFormCompany}
                disabled={isUpdating}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Select a company..." />
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={formCategory}
                onValueChange={setFormCategory}
                disabled={isUpdating || !formType}
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
                disabled={isUpdating}
              />
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}