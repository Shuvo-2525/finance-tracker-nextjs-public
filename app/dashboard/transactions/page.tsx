"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, PlusCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  getCompanies,
  getCategories,
  getTransactions,
  addTransaction,
  type Company,
  type Category,
  type Transaction,
} from "@/lib/sheets"

// Helper to format currency
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export default function TransactionsPage() {
  const { sheetId, getGoogleAccessToken } = useDashboard()

  // State for data
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])

  // State for loading
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  // State for the new transaction form
  const [formType, setFormType] = React.useState<"Income" | "Expense">(
    "Expense"
  )
  const [formDate, setFormDate] = React.useState<Date | undefined>(new Date())
  const [formCompany, setFormCompany] = React.useState<string>("")
  const [formCategory, setFormCategory] = React.useState<string>("")
  const [formAmount, setFormAmount] = React.useState<string>("")
  const [formDescription, setFormDescription] = React.useState<string>("")

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

  // Reset the form fields
  const resetForm = () => {
    setFormDate(new Date())
    setFormCompany("")
    setFormCategory("")
    setFormAmount("")
    setFormDescription("")
    setFormType("Expense")
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
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsAdding(false)
      return
    }

    const success = await addTransaction(sheetId, accessToken, {
      date: formDate,
      company: formCompany,
      category: formCategory,
      description: formDescription,
      amount: amount,
      type: formType,
    })

    if (success) {
      resetForm()
      // Fetch only new transactions to update the list
      const fetchedTransactions = await getTransactions(sheetId, accessToken)
      setTransactions(fetchedTransactions)
    }

    setIsAdding(false)
  }

  // Filter categories based on the selected form type
  const availableCategories = categories.filter((c) => c.type === formType)

  return (
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
                  disabled={isAdding}
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
                  disabled={isAdding}
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
                    disabled={isAdding}
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
                disabled={isAdding}
              />
            </div>

            {/* Company Select */}
            <div>
              <Label htmlFor="company">Company</Label>
              <Select
                value={formCompany}
                onValueChange={setFormCompany}
                disabled={isAdding || isLoadingData}
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
                disabled={isAdding || isLoadingData || !formType}
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
            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Monthly software subscription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={isAdding}
              />
            </div>
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isAdding}>
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isAdding ? "Adding..." : "Add Transaction"}
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
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2">Loading all data...</p>
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Click "Load Data" to see your transactions.
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((t, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border bg-background p-4"
                >
                  <div>
                    <p className="font-medium">{t.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.company}
                      {t.description && ` - ${t.description}`}
                    </p>
                  </div>
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
                    <p className="text-sm text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}