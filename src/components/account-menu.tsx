"use client";

import { ChevronsUpDownIcon, EllipsisIcon, LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "sidebar" sits at the foot of the sidebar with the signed-in email, like the
// account row in Mail or Linear, and opens upward; "toolbar" is the ⋯ button
// phones get in its place, having no sidebar.
export function AccountMenu({
  email,
  variant,
  className,
}: {
  email?: string;
  variant: "sidebar" | "toolbar";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      {variant === "sidebar" ? (
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-sidebar-accent/60",
            className,
          )}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground uppercase"
          >
            {email?.[0] ?? "?"}
          </span>
          <span className="flex-1 truncate">{email ?? "Account"}</span>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              variant="glass"
              size="icon-lg"
              aria-label="More"
              className={cn("size-12 md:size-9 [&_svg]:size-5 md:[&_svg]:size-4", className)}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={variant === "sidebar" ? "top" : "bottom"}
        align={variant === "sidebar" ? "start" : "end"}
        className="w-56"
      >
        {email && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => signOut())}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
