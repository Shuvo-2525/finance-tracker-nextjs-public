"use client"

import * as React from "react"
// --- 1. IMPORT NEW COMPONENTS & HELPERS ---
import { format, subDays, parse, startOfDay, endOfDay } from "date-fns" // Import startOfDay and endOfDay
import { Calendar as CalendarIcon, Loader2, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
// --- END IMPORTS ---

// --- FIX: Use tsconfig.json aliases ---
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  getCompanies,
  getCategories,
  getTransactions,
  type Company,
  type Category,
  type Transaction,
} from "@/lib/sheets"
// --- END FIX ---

// Helper to format currency
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export default function DashboardPage() {
  const { sheetId, getGoogleAccessToken, userData } = useDashboard()

  // State for data
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([])

  // State for loading
  const [isLoadingData, setIsLoadingData] = React.useState(true) // Load on mount

  // --- 2. NEW STATE FOR FILTERS (WITH FIX) ---
  const [selectedCompany, setSelectedCompany] = React.useState<string>("all")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)), // Use startOfDay for the 'from' date
    to: endOfDay(new Date()), // Use endOfDay for the 'to' date
  })
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
    setAllTransactions(fetchedTransactions)
    setIsLoadingData(false)
    toast.success("Dashboard data loaded!")
  }, [sheetId, getGoogleAccessToken])

  // --- 3. AUTO-FETCH DATA ON PAGE LOAD ---
  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])
  // --- END AUTO-FETCH ---

  // --- 4. UPDATE MEMOS TO USE FILTERS (WITH FIX) ---
  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter((t) => {
      // Filter by company
      const companyMatch =
        selectedCompany === "all" || t.company === selectedCompany

      // Filter by date
      let dateMatch = true
      const transactionDate = parse(t.date, "MM/dd/yyyy", new Date())

      // --- LOGIC FIX IS HERE ---
      if (dateRange?.from) {
        // If we have a 'from' date
        const startDate = startOfDay(dateRange.from)
        // If we also have a 'to' date, use it. Otherwise, use the 'from' date as the end date.
        const endDate = endOfDay(dateRange.to || dateRange.from)
        
        dateMatch = transactionDate >= startDate && transactionDate <= endDate
      } else {
        // No date range selected, so all dates match
        dateMatch = true
      }
      // --- END LOGIC FIX ---

      return companyMatch && dateMatch
    })
  }, [allTransactions, selectedCompany, dateRange])

  // Calculate financial totals
  const { totalIncome, totalExpense, netIncome } = React.useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0

    // Use filteredTransactions instead of allTransactions
    for (const t of filteredTransactions) {
      totalIncome += t.income
      totalExpense += t.expense
    }

    const netIncome = totalIncome - totalExpense
    return { totalIncome, totalExpense, netIncome }
  }, [filteredTransactions]) // Depend on filteredTransactions

  const recentTransactions = filteredTransactions.slice(0, 5)
  // --- END UPDATED MEMOS ---

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* --- Header --- */}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">
          Welcome, {userData?.displayName || "User"}!
        </h1>
        {/* --- 5. NEW FILTER CONTROLS --- */}
        <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row">
          {/* Company Filter */}
          <Select
            value={selectedCompany}
            onValueChange={setSelectedCompany}
            disabled={isLoadingData}
          >
            <SelectTrigger className="w-full min-w-[180px] md:w-auto">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.name}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full min-w-[240px] justify-start text-left font-normal md:w-auto",
                  !dateRange && "text-muted-foreground"
                )}
                disabled={isLoadingData}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange} // This is correct, it provides the new range
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            disabled={isLoadingData}
            className="w-full md:w-auto"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoadingData && "animate-spin")}
            />
            Load Data
          </Button>
        </div>
        {/* --- END FILTER CONTROLS --- */}
      </div>

      {/* --- Loading State --- */}
      {isLoadingData && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <h3 className="text-xl font-bold tracking-tight">
              Loading your financial data...
            </h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we connect to your Google Sheet.
            </p>
          </div>
        </div>
      )}

      {/* --- Empty State (with data loaded) --- */}
      {!isLoadingData && allTransactions.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              No transactions found
            </h3>
            <p className="text-sm text-muted-foreground">
              {/* 7. Updated text for empty state */}
              Go to the "Transactions" page to add your first one, or try
              adjusting your filters.
            </p>
          </div>
        </div>
      )}

      {/* --- Data Display State --- */}
      {!isLoadingData && allTransactions.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Total Income */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Income
                </CardTitle>
                <span className="text-2xl text-green-600">↑</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {currencyFormatter.format(totalIncome)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {/* 6. Dynamic Description */}
                  {selectedCompany === "all"
                    ? `Across all ${companies.length} companies`
                    : `For ${selectedCompany}`}
                </p>
              </CardContent>
            </Card>
            {/* Total Expense */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expense
                </CardTitle>
                <span className="text-2xl text-red-600">↓</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {currencyFormatter.format(totalExpense)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCompany === "all"
                    ? `Across all ${categories.length} categories`
                    : `For ${selectedCompany}`}
                </p>
              </CardContent>
            </Card>
            {/* Net Income */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Net Income
                </CardTitle>
                <span className="text-2xl">💰</span>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-3xl font-bold",
                    netIncome >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {currencyFormatter.format(netIncome)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total income minus total expenses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* --- Recent Transactions List --- */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                {/* 7. Dynamic Description */}
                Your 5 most recent transactions matching the filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 8. Check filtered list length */}
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((t) => (
                    <div
                      key={t.rowIndex}
                      className="flex items-center justify-between"
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
                        <p className="text-sm text-muted-foreground">
                          {t.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No transactions found matching your filters.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}