"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TestPage() {
  return (
    <div className="p-8 space-y-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">shadcn/ui Component Test</h1>

      {/* Button */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Button</h2>
        <div className="flex gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      {/* Input + Label */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Input + Label</h2>
        <div className="space-y-1">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" placeholder="0.00" />
        </div>
      </section>

      {/* Select */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Select</h2>
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Badge */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Badge</h2>
        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>

      {/* Card */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Card</h2>
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Expense</CardTitle>
            <CardDescription>Monthly electricity bill</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$142.00</p>
          </CardContent>
        </Card>
      </section>

      {/* Skeleton */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Skeleton</h2>
        <div className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
      </section>

      {/* Table */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>2026-05-01</TableCell>
              <TableCell>Electricity</TableCell>
              <TableCell className="text-right">$142.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2026-05-05</TableCell>
              <TableCell>Plumber</TableCell>
              <TableCell className="text-right">$320.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Dialog */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open Dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>
                Record a new property expense.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Dialog content goes here.</p>
          </DialogContent>
        </Dialog>
      </section>

      {/* Sheet */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Sheet</h2>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Open Sheet
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Expense Details</SheetTitle>
              <SheetDescription>
                View and edit expense information.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </section>

      {/* Dropdown Menu */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Dropdown Menu</h2>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Actions
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Toast (Sonner) */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Toast (Sonner)</h2>
        <Button onClick={() => toast("Expense saved successfully!")}>
          Show Toast
        </Button>
      </section>

      <Toaster />
    </div>
  );
}
