"use client"

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, BookOpen, BookText, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/vocabulary",
      label: "Vocabulary",
      icon: <BookText className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/vocabulary"),
    },
    {
      href: "/reading-writing",
      label: "Reading & Writing",
      icon: <BookOpen className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/reading-writing"),
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
      active: pathname.startsWith("/dashboard"),
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">SAT Study</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center transition-colors hover:text-foreground/80 ${
                  route.active ? "text-foreground" : "text-foreground/60"
                }`}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <Link href="/" className="flex items-center mb-8" onClick={() => setOpen(false)}>
                <span className="font-bold text-xl">SAT Study</span>
              </Link>
              <nav className="flex flex-col space-y-4">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center py-2 text-sm font-medium transition-colors hover:text-foreground/80 ${
                      route.active ? "text-foreground" : "text-foreground/60"
                    }`}
                  >
                    {route.icon}
                    {route.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center">
            <span className="font-bold text-xl">SAT Study</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
