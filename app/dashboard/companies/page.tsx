"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
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
// 1. Import RefreshCw icon
import { PlusCircle, Loader2, RefreshCw } from "lucide-react"

// 2. Import the dashboard context and sheet functions
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import { getCompanies, addCompany, type Company } from "@/lib/sheets"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CompaniesPage() {
  // 3. Get data and functions from our dashboard context
  const { sheetId, getGoogleAccessToken } = useDashboard()

  // 4. Set up state for the page
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [newCompanyName, setNewCompanyName] = React.useState("")
  const [isFetching, setIsFetching] = React.useState(false) // Set initial fetching to false
  const [isAdding, setIsAdding] = React.useState(false)

  // 5. Function to fetch companies from the sheet
  const fetchCompanies = React.useCallback(async () => {
    if (!sheetId) return

    setIsFetching(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      // The getGoogleAccessToken function now handles its own toasts
      setIsFetching(false)
      return
    }

    const fetchedCompanies = await getCompanies(sheetId, accessToken)
    setCompanies(fetchedCompanies)
    setIsFetching(false)
  }, [sheetId, getGoogleAccessToken])

  // 6. We remove the automatic fetch from useEffect
  React.useEffect(() => {
    // We no longer fetch on load
    // fetchCompanies()
  }, []) // Empty array, this runs once

  // 7. Function to handle adding a new company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !newCompanyName.trim()) {
      toast.error("Please enter a company name.")
      return
    }

    setIsAdding(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      // getGoogleAccessToken handles its own toasts
      setIsAdding(false)
      return
    }

    const success = await addCompany(sheetId, accessToken, newCompanyName)

    if (success) {
      setNewCompanyName("") // Clear the input
      await fetchCompanies() // Refresh the list
    }

    setIsAdding(false)
  }

  // 8. NEW function to handle manual refresh click
  const handleRefreshClick = () => {
    // This function is triggered by a user click,
    // so the popup will not be blocked.
    fetchCompanies()
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Add New Company Card */}
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle>Add New Company</CardTitle>
          <CardDescription>
            Create a new entity to track finances for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 9. Update the form (no changes, just for context) */}
          <form onSubmit={handleAddCompany} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., My Side Hustle"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isAdding || !newCompanyName.trim()}
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isAdding ? "Creating..." : "Create Company"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 10. Update the Company List Card */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          {/* 11. Add a flex container for title and refresh button */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Companies</CardTitle>
              <CardDescription>
                You are currently tracking {companies.length} entities.
              </CardDescription>
            </div>
            {/* 12. Add the refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshClick}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  isFetching && "animate-spin"
                )}
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
              {/* 13. Update the logic to show a "click refresh" message */}
              {companies.length > 0 ? (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between rounded-md border bg-background p-4"
                  >
                    <span className="font-medium">{company.name}</span>
                    {company.id === "default" && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        Default
                      </span>
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
  )
}