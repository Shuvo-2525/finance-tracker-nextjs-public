"use client"

import * as React from "react"
import { Loader2, RefreshCw } from "lucide-react"
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
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import {
  getCompanies,
  getCategories,
  getTransactions,
  type Company,
  type Category,
  type Transaction,
} from "@/lib/sheets"

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
  const [transactions, setTransactions] = React.useState<Transaction[]>([])

  // State for loading
  const [isLoadingData, setIsLoadingData] = React.useState(false)

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
    toast.success("Dashboard data loaded!")
  }, [sheetId, getGoogleAccessToken])

  // Calculate financial totals
  const { totalIncome, totalExpense, netIncome } = React.useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0

    for (const t of transactions) {
      totalIncome += t.income
      totalExpense += t.expense
    }

    const netIncome = totalIncome - totalExpense
    return { totalIncome, totalExpense, netIncome }
  }, [transactions])

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">
          Welcome, {userData?.displayName || "User"}!
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAllData}
          disabled={isLoadingData}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoadingData && "animate-spin")}
          />
          Load Data
        </Button>
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

      {/* --- Empty State --- */}
      {!isLoadingData && transactions.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              No data loaded
            </h3>
            <p className="text-sm text-muted-foreground">
              Click the "Load Data" button to fetch your financial summary.
            </p>
          </div>
        </div>
      )}

      {/* --- Data Display State --- */}
      {!isLoadingData && transactions.length > 0 && (
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
                Across all {companies.length} companies
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
                Across all {categories.length} categories
              </p>
            </CardContent>
          </Card>
          {/* Net Income */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
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
      )}

      {/* --- Recent Transactions List --- */}
      {!isLoadingData && transactions.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your 5 most recent transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((t, index) => (
                <div
                  key={index}
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
                    <p className="text-sm text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}