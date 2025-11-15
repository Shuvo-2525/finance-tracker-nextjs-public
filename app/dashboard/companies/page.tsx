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
import { PlusCircle } from "lucide-react"

export default function CompaniesPage() {
  // We will fetch and display companies here in the next step
  const companies = [
    { id: "default", name: "Personal" },
    // This is just placeholder data for now
  ]

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
          <form className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="e.g., My Side Hustle" />
            </div>
            <Button className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Company
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List Existing Companies */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Your Companies</CardTitle>
          <CardDescription>
            You are currently tracking {companies.length} entities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between rounded-md border bg-background p-4"
              >
                <span className="font-medium">{company.name}</span>
                {company.id === "default" && (
                  <span className="text-xs text-muted-foreground">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}