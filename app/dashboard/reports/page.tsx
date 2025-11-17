"use client"

import * as React from "react"
import { format, subDays, parse, startOfDay, endOfDay } from "date-fns"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Loader2,
  FileText,
  Printer,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { Separator } from "@/components/ui/separator"

import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  getCompanies,
  getCategories,
  getTransactions,
  type Company,
  type Category,
  type Transaction,
} from "@/lib/sheets"

// --- Data Types for Report ---
type ReportData = {
  totalIncome: number
  totalExpense: number
  netIncome: number
  incomeByCategory: { name: string; value: number }[]
  expenseByCategory: { name: string; value: number }[]
  transactionCount: number
}

// Helper to format currency
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export default function ReportsPage() {
  const { sheetId, getGoogleAccessToken, userData } = useDashboard()

  // --- State for Filters ---
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCompany, setSelectedCompany] = React.useState<string>("all")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  })

  // --- State for Data & UI ---
  const [isLoading, setIsLoading] = React.useState(false)
  const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([])
  const [reportData, setReportData] = React.useState<ReportData | null>(null)

  // Fetch companies and categories just once on load
  React.useEffect(() => {
    async function fetchInitialData() {
      if (!sheetId) return

      const accessToken = await getGoogleAccessToken()
      if (!accessToken) return

      setIsLoading(true)
      const [fetchedCompanies, fetchedCategories] = await Promise.all([
        getCompanies(sheetId, accessToken),
        getCategories(sheetId, accessToken),
      ])
      setCompanies(fetchedCompanies)
      setCategories(fetchedCategories)
      setIsLoading(false)
    }
    fetchInitialData()
  }, [sheetId, getGoogleAccessToken])

  // --- Function to Generate Report ---
  const handleGenerateReport = async () => {
    if (!sheetId) return

    setIsLoading(true)
    setReportData(null) // Clear previous report

    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    // 1. Fetch all transactions
    // In a larger app, you might filter by date in the API call
    const transactions = await getTransactions(sheetId, accessToken)
    setAllTransactions(transactions)

    // 2. Filter transactions based on UI state
    const filteredTransactions = transactions.filter((t) => {
      const companyMatch =
        selectedCompany === "all" || t.company === selectedCompany
      let dateMatch = true

      if (!t.date || t.date.split("/").length !== 3) return false
      const transactionDate = parse(t.date, "MM/dd/yyyy", new Date())

      if (dateRange?.from) {
        const startDate = startOfDay(dateRange.from)
        const endDate = endOfDay(dateRange.to || dateRange.from)
        dateMatch = transactionDate >= startDate && transactionDate <= endDate
      }
      return companyMatch && dateMatch
    })

    // 3. Process filtered data
    let totalIncome = 0
    let totalExpense = 0
    const incomeMap = new Map<string, number>()
    const expenseMap = new Map<string, number>()

    for (const t of filteredTransactions) {
      totalIncome += t.income
      totalExpense += t.expense

      if (t.income > 0 && t.category) {
        const currentTotal = incomeMap.get(t.category) || 0
        incomeMap.set(t.category, currentTotal + t.income)
      }
      if (t.expense > 0 && t.category) {
        const currentTotal = expenseMap.get(t.category) || 0
        expenseMap.set(t.category, currentTotal + t.expense)
      }
    }

    const netIncome = totalIncome - totalExpense
    const incomeByCategory = Array.from(incomeMap, ([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value)

    const expenseByCategory = Array.from(expenseMap, ([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value)

    // 4. Set report data
    setReportData({
      totalIncome,
      totalExpense,
      netIncome,
      incomeByCategory,
      expenseByCategory,
      transactionCount: filteredTransactions.length,
    })

    setIsLoading(false)
    toast.success("Report generated successfully!")
  }

  // --- Handle Print ---
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* --- 1. Report Filters Card --- */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Generate a New Report</CardTitle>
          <CardDescription>
            Select your filters and click "Generate" to see a report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Company Filter */}
            <div>
              <Label>Company</Label>
              <Select
                value={selectedCompany}
                onValueChange={setSelectedCompany}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.rowIndex} value={company.name}> {/* <-- FIX: Use rowIndex */}
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                    disabled={isLoading}
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* --- 2. Report Display Area --- */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !reportData && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm print:hidden">
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-bold tracking-tight">
              Your report will appear here
            </h3>
            <p className="text-sm text-muted-foreground">
              Select your filters above and click "Generate Report".
            </p>
          </div>
        </div>
      )}

      {reportData && (
        <Card id="report-content" className="print:shadow-none print:border-none">
          <CardHeader className="flex-row items-center justify-between print:hidden">
            <div>
              <CardTitle>Generated Report</CardTitle>
              <CardDescription>
                Report for{" "}
                {selectedCompany === "all"
                  ? "All Companies"
                  : selectedCompany}{" "}
                from {format(dateRange?.from || new Date(), "PPP")} to{" "}
                {format(dateRange?.to || new Date(), "PPP")}.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Printable Header */}
            <div className="hidden print:block mb-8 text-center">
              <h1 className="text-2xl font-bold">Financial Report</h1>
              <p className="text-lg">
                {selectedCompany === "all"
                  ? "All Companies"
                  : selectedCompany}
              </p>
              <p className="text-muted-foreground">
                {format(dateRange?.from || new Date(), "PPP")} -{" "}
                {format(dateRange?.to || new Date(), "PPP")}
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold border-b pb-1">
                Financial Summary
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {currencyFormatter.format(reportData.totalIncome)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Expense</p>
                  <p className="text-2xl font-bold text-red-600">
                    {currencyFormatter.format(reportData.totalExpense)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Net Income</p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      reportData.netIncome >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {currencyFormatter.format(reportData.netIncome)}
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Income Breakdown */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold border-b pb-1">
                  Income by Category
                </h2>
                {reportData.incomeByCategory.length > 0 ? (
                  <div className="space-y-1">
                    {reportData.incomeByCategory.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-green-600">
                          {currencyFormatter.format(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-2">
                    No income recorded for this period.
                  </p>
                )}
              </div>

              {/* Expense Breakdown */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold border-b pb-1">
                  Expenses by Category
                </h2>
                {reportData.expenseByCategory.length > 0 ? (
                  <div className="space-y-1">
                    {reportData.expenseByCategory.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-red-600">
                          {currencyFormatter.format(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-2">
                    No expenses recorded for this period.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}