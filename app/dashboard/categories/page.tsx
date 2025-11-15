"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Loader2, RefreshCw } from "lucide-react"
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import { getCategories, addCategory, type Category } from "@/lib/sheets"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CategoriesPage() {
  const { sheetId, getGoogleAccessToken } = useDashboard()

  const [categories, setCategories] = React.useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = React.useState("")
  const [newCategoryType, setNewCategoryType] = React.useState<
    "Income" | "Expense"
  >("Expense")
  const [isFetching, setIsFetching] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  // Function to fetch categories from the sheet
  const fetchCategories = React.useCallback(async () => {
    if (!sheetId) return

    setIsFetching(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsFetching(false)
      return
    }

    const fetchedCategories = await getCategories(sheetId, accessToken)
    setCategories(fetchedCategories)
    setIsFetching(false)
  }, [sheetId, getGoogleAccessToken])

  // We won't fetch on load, user will click "Refresh"
  React.useEffect(() => {
    // fetchCategories()
  }, [])

  // Function to handle adding a new category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !newCategoryName.trim()) {
      toast.error("Please enter a category name.")
      return
    }

    setIsAdding(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      setIsAdding(false)
      return
    }

    const success = await addCategory(
      sheetId,
      accessToken,
      newCategoryName,
      newCategoryType
    )

    if (success) {
      setNewCategoryName("") // Clear the input
      await fetchCategories() // Refresh the list
    }

    setIsAdding(false)
  }

  // Function to handle manual refresh click
  const handleRefreshClick = () => {
    fetchCategories()
  }

  // Filter categories into two lists
  const incomeCategories = categories.filter((c) => c.type === "Income")
  const expenseCategories = categories.filter((c) => c.type === "Expense")

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Add New Category Card */}
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
          <CardDescription>
            Create a new category for your transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="space-y-4">
            {/* Category Name Input */}
            <div>
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                placeholder="e.g., Office Supplies"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isAdding}
              />
            </div>

            {/* Category Type Toggle */}
            <div>
              <Label>Category Type</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newCategoryType === "Income" ? "default" : "outline"}
                  onClick={() => setNewCategoryType("Income")}
                  disabled={isAdding}
                >
                  Income
                </Button>
                <Button
                  type="button"
                  variant={newCategoryType === "Expense" ? "default" : "outline"}
                  onClick={() => setNewCategoryType("Expense")}
                  disabled={isAdding}
                >
                  Expense
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isAdding || !newCategoryName.trim()}
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isAdding ? "Creating..." : "Create Category"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List Existing Categories */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Categories</CardTitle>
              <CardDescription>
                You are currently tracking {categories.length} categories.
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
              <p className="ml-2">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Click the "Refresh" button to load your categories.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Income List */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">Income</h3>
                <div className="space-y-2">
                  {incomeCategories.length > 0 ? (
                    incomeCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-md border bg-background p-3"
                      >
                        <span className="font-medium">{category.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No income categories found.
                    </p>
                  )}
                </div>
              </div>

              {/* Expense List */}
              <div>
                <h3 className="mb-2 text-lg font-semibold">Expenses</h3>
                <div className="space-y-2">
                  {expenseCategories.length > 0 ? (
                    expenseCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-md border bg-background p-3"
                      >
                        <span className="font-medium">{category.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No expense categories found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}