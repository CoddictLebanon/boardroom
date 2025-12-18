"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckSquare,
  FileText,
  Users,
  Vote,
  DollarSign,
  Settings,
  LayoutDashboard,
  Plus,
  Search,
} from "lucide-react";
import { Command } from "cmdk";

const groups = [
  {
    heading: "Navigation",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { name: "Meetings", icon: Calendar, href: "/meetings" },
      { name: "Action Items", icon: CheckSquare, href: "/action-items" },
      { name: "Resolutions", icon: Vote, href: "/resolutions" },
      { name: "Documents", icon: FileText, href: "/documents" },
      { name: "Financials", icon: DollarSign, href: "/financials" },
      { name: "Board Members", icon: Users, href: "/members" },
      { name: "Settings", icon: Settings, href: "/settings" },
    ],
  },
  {
    heading: "Quick Actions",
    items: [
      { name: "New Meeting", icon: Plus, href: "/meetings/new" },
      { name: "New Action Item", icon: Plus, href: "/action-items/new" },
      { name: "New Resolution", icon: Plus, href: "/resolutions/new" },
      { name: "Upload Document", icon: Plus, href: "/documents/upload" },
    ],
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border bg-background shadow-lg">
            <Command className="overflow-hidden rounded-lg" loop>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {groups.map((group) => (
                  <Command.Group key={group.heading} heading={group.heading}>
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.name}
                        value={item.name}
                        onSelect={() => {
                          runCommand(() => router.push(item.href));
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
