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
import { PlusCircle, Loader2 } from "lucide-react"

// 1. Import the dashboard context and sheet functions
import { useDashboard } from "@/app/dashboard/context/DashboardContext"
import { getCompanies, addCompany, type Company } from "@/lib/sheets"
import { toast } from "sonner"

export default function CompaniesPage() {
  // 2. Get data and functions from our dashboard context
  const { sheetId, getGoogleAccessToken } = useDashboard()

  // 3. Set up state for the page
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [newCompanyName, setNewCompanyName] = React.useState("")
  const [isFetching, setIsFetching] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)

  // 4. Function to fetch companies from the sheet
  const fetchCompanies = React.useCallback(async () => {
    if (!sheetId) return

    setIsFetching(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      toast.error("Authentication failed. Please try again.")
      setIsFetching(false)
      return
    }

    const fetchedCompanies = await getCompanies(sheetId, accessToken)
    setCompanies(fetchedCompanies)
    setIsFetching(false)
  }, [sheetId, getGoogleAccessToken])

  // 5. Fetch companies when the page first loads
  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // 6. Function to handle adding a new company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetId || !newCompanyName.trim()) {
      toast.error("Please enter a company name.")
      return
    }

    setIsAdding(true)
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      toast.error("Authentication failed. Please try again.")
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
          {/* 7. Update the form */}
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

      {/* 8. Update the Company List Card */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Your Companies</CardTitle>
          <CardDescription>
            You are currently tracking {companies.length} entities.
          </CardDescription>
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
                    <span className="font-medium">{company.name}</span>
                    {company.id === "default" && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        Default
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  You haven&apos;t added any companies yet, other than "Personal".
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}