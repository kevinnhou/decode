"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Badge, badgeVariants } from "@decode/ui/components/badge";
import { Button } from "@decode/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@decode/ui/components/dropdown-menu";
import { Input } from "@decode/ui/components/input";
import { Label } from "@decode/ui/components/label";
import { useTheme, useThemeConfig } from "@decode/ui/components/providers";
import { Separator } from "@decode/ui/components/separator";
import { toast } from "@decode/ui/components/sonner";
import { Tabs } from "@decode/ui/components/tabs";
import { baseColours } from "@decode/ui/lib/colours";
import { cn } from "@decode/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, LogOut, Pencil, RefreshCw, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { authClient } from "@/lib/auth-client";
import {
  formatShortcutKey,
  type ScoutingShortcuts,
  SHORTCUT_LABELS,
} from "@/lib/form/shortcuts";
import { DutiesAssignment } from "~/duties/assignment";
import { DutiesManagement } from "~/duties/management";

interface PersonalTabProps {
  profile: {
    displayName: string;
    role: string;
  };
  userEmail: string;
}

function PersonalTab({ profile, userEmail }: PersonalTabProps) {
  const updateName = useMutation(api.auth.updateDisplayName);
  const { theme: themeMode, setTheme, resolvedTheme } = useTheme();
  const { activeTheme, setActiveTheme } = useThemeConfig();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  function handleEditName() {
    setNewName(profile.displayName);
    setIsEditingName(true);
  }

  async function handleSaveName() {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      await updateName({ displayName: newName.trim() });
      toast.success("Name updated");
      setIsEditingName(false);
    } catch {
      toast.error("Failed to update name");
    }
  }

  function handleCancelEdit() {
    setIsEditingName(false);
    setNewName("");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-muted-foreground">Display Name</Label>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="h-9"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveName();
                }
                if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              placeholder="Enter your name"
              value={newName}
            />
            <Button
              className="size-9"
              onClick={handleSaveName}
              size="icon"
              variant="ghost"
            >
              <Check className="size-4" />
            </Button>
            <Button
              className="size-9"
              onClick={handleCancelEdit}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-foreground">{profile.displayName}</p>
            <Button
              className="h-8 w-8"
              onClick={handleEditName}
              size="icon"
              variant="ghost"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-muted-foreground">Email</Label>
        <p className="text-foreground text-sm">{userEmail}</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-muted-foreground">Appearance</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            className={cn(
              "relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:border-primary/50",
              themeMode === "light"
                ? "border-primary bg-white shadow-lg dark:bg-zinc-50"
                : "border-border"
            )}
            onClick={() => setTheme("light")}
            type="button"
          >
            <div className="rounded-xl bg-white p-4">
              <div className="mb-3 flex items-center gap-2 border-gray-200 border-b pb-2">
                <div className="h-2 w-16 rounded bg-gray-200" />
                <div className="ml-auto h-2 w-2 rounded-full bg-gray-300" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-24 rounded bg-gray-200" />
                <div className="h-2 w-32 rounded bg-gray-100" />
                <div className="h-2 w-20 rounded bg-gray-100" />
              </div>
            </div>
            <div className="absolute right-3 bottom-3 font-medium text-gray-700 text-sm">
              Light
            </div>
          </button>

          <button
            className={cn(
              "relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:border-primary/50",
              themeMode === "dark"
                ? "border-primary bg-zinc-950 shadow-lg"
                : "border-border"
            )}
            onClick={() => setTheme("dark")}
            type="button"
          >
            <div className="rounded-xl bg-zinc-950 p-4">
              <div className="mb-3 flex items-center gap-2 border-zinc-800 border-b pb-2">
                <div className="h-2 w-16 rounded bg-zinc-700" />
                <div className="ml-auto h-2 w-2 rounded-full bg-zinc-600" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-24 rounded bg-zinc-700" />
                <div className="h-2 w-32 rounded bg-zinc-800" />
                <div className="h-2 w-20 rounded bg-zinc-800" />
              </div>
            </div>
            <div className="absolute right-3 bottom-3 font-medium text-sm text-zinc-300">
              Dark
            </div>
          </button>

          <button
            className={cn(
              "relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:border-primary/50",
              themeMode === "system"
                ? "border-primary shadow-md"
                : "border-border"
            )}
            onClick={() => setTheme("system")}
            type="button"
          >
            <div className="rounded-xl bg-linear-to-br from-white to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-950">
              <div className="mb-3 flex items-center gap-2 border-gray-200 border-b pb-2 dark:border-zinc-700">
                <div className="h-2 w-16 rounded bg-linear-to-r from-gray-200 to-zinc-600" />
                <div className="ml-auto h-2 w-2 rounded-full bg-linear-to-r from-gray-300 to-zinc-500" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-24 rounded bg-linear-to-r from-gray-200 to-zinc-600" />
                <div className="h-2 w-32 rounded bg-linear-to-r from-gray-100 to-zinc-700" />
                <div className="h-2 w-20 rounded bg-linear-to-r from-gray-100 to-zinc-700" />
              </div>
            </div>
            <div className="absolute right-3 bottom-3 font-medium text-gray-700 text-sm dark:text-zinc-300">
              System
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {baseColours.map((colour) => {
            const isActive = activeTheme === colour.name;
            const colourValue =
              colour.activeColour[resolvedTheme === "dark" ? "dark" : "light"];
            return (
              <Button
                className={cn(
                  "h-10 justify-start",
                  isActive ? "border-2 border-primary" : ""
                )}
                key={colour.name}
                onClick={() => setActiveTheme(colour.name)}
                style={
                  {
                    "--theme-primary": colourValue,
                  } as React.CSSProperties
                }
                variant="secondary"
              >
                <span
                  className="mr-2 flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--theme-primary)" }}
                >
                  {isActive ? <Check className="size-3 text-white" /> : null}
                </span>
                {colour.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface KeyCaptureButtonProps {
  action: keyof ScoutingShortcuts;
  currentKey: string;
  onCapture: (action: keyof ScoutingShortcuts, key: string) => void;
}

function KeyCaptureButton({
  action,
  currentKey,
  onCapture,
}: KeyCaptureButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    setIsCapturing(true);
    buttonRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!isCapturing) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsCapturing(false);
        return;
      }

      const key = e.key === " " ? " " : e.key.toLowerCase();
      onCapture(action, key);
      setIsCapturing(false);
    },
    [isCapturing, action, onCapture]
  );

  const handleBlur = useCallback(() => {
    setIsCapturing(false);
  }, []);

  return (
    <button
      className={cn(
        "inline-flex h-8 min-w-16 items-center justify-center rounded-md border px-3 font-mono text-sm transition-colors",
        isCapturing
          ? "border-primary bg-primary/10 text-primary outline-none ring-2 ring-primary/30"
          : "border-border bg-muted/50 text-foreground hover:bg-muted"
      )}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={buttonRef}
      type="button"
    >
      {isCapturing ? "Press a key…" : formatShortcutKey(currentKey)}
    </button>
  );
}

interface SettingsTabProps {
  onSignOut: () => Promise<void>;
}

function SettingsTab({ onSignOut }: SettingsTabProps) {
  const { shortcuts, setShortcut, resetShortcuts } = useShortcuts();

  const shortcutActions = Object.keys(
    SHORTCUT_LABELS
  ) as (keyof ScoutingShortcuts)[];

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Keyboard Shortcuts</h3>
          </div>
          <button
            className="text-muted-foreground text-xs underline-offset-4 transition-colors hover:text-foreground hover:underline"
            onClick={resetShortcuts}
            type="button"
          >
            Reset
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border">
          {shortcutActions.map((action, i) => (
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                i !== shortcutActions.length - 1 && "border-b"
              )}
              key={action}
            >
              <span className="text-sm">{SHORTCUT_LABELS[action]}</span>
              <KeyCaptureButton
                action={action}
                currentKey={shortcuts[action]}
                onCapture={setShortcut}
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div>
          <h3 className="font-medium text-sm">Account</h3>
        </div>
        <Button className="gap-2" onClick={onSignOut} variant="destructive">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </section>
    </div>
  );
}

interface OrganisationTabProps {
  profile: {
    organisationName: string | null;
  };
  organisation:
    | {
        name: string;
        inviteCode: string;
      }
    | null
    | undefined;
  members:
    | Array<{
        _id: string;
        userId: string;
        role: string;
        displayName: string;
      }>
    | undefined;
  userId: string;
  isAdmin: boolean;
  canManage: boolean;
}

function OrganisationTab({
  profile,
  organisation,
  members,
  userId,
  isAdmin,
  canManage,
}: OrganisationTabProps) {
  const updateOrgName = useMutation(api.auth.updateOrganisationName);
  const regenerateCode = useMutation(api.auth.regenerateInviteCode);
  const updateRole = useMutation(api.auth.updateUserRole);

  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  function handleEditOrgName() {
    setNewOrgName(organisation?.name ?? "");
    setIsEditingOrgName(true);
  }

  async function handleSaveOrgName() {
    if (!newOrgName.trim()) {
      toast.error("Organisation name cannot be empty");
      return;
    }

    try {
      await updateOrgName({ name: newOrgName.trim() });
      toast.success("Organisation name updated");
      setIsEditingOrgName(false);
    } catch {
      toast.error("Failed to update organisation name");
    }
  }

  function handleCancelOrgEdit() {
    setIsEditingOrgName(false);
    setNewOrgName("");
  }

  async function handleCopyInviteCode() {
    if (organisation?.inviteCode) {
      await navigator.clipboard.writeText(organisation.inviteCode);
      toast.success("Invite code copied");
    }
  }

  async function handleRegenerateInviteCode() {
    try {
      await regenerateCode();
      toast.success("Invite code regenerated");
    } catch {
      toast.error("Failed to regenerate invite code");
    }
  }

  async function handleRoleChange(targetUserId: string, newRole: string) {
    try {
      await updateRole({
        targetUserId,
        newRole: newRole as "admin" | "leadScout" | "scout",
      });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  }

  const showEditOrgName = isEditingOrgName && isAdmin;
  const hasMembers = members ? members.length > 0 : false;

  if (!organisation) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-muted-foreground">Organisation Name</Label>
        {showEditOrgName ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="h-9"
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveOrgName();
                }
                if (e.key === "Escape") {
                  handleCancelOrgEdit();
                }
              }}
              placeholder="Enter organisation name"
              value={newOrgName}
            />
            <Button
              className="size-9"
              onClick={handleSaveOrgName}
              size="icon"
              variant="ghost"
            >
              <Check className="size-4" />
            </Button>
            <Button
              className="size-9"
              onClick={handleCancelOrgEdit}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-foreground">
              {profile.organisationName ?? "Unknown organisation"}
            </p>
            {isAdmin ? (
              <Button
                className="h-8 w-8"
                onClick={handleEditOrgName}
                size="icon"
                variant="ghost"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-muted-foreground">Invite Code</Label>
        <div className="flex items-center gap-2">
          <button
            className="cursor-pointer rounded-md border bg-muted px-3 py-1.5 font-mono text-sm transition-colors hover:bg-muted/80"
            onClick={handleCopyInviteCode}
            type="button"
          >
            {organisation.inviteCode}
          </button>
          {isAdmin ? (
            <Button
              className="size-9"
              onClick={handleRegenerateInviteCode}
              size="icon"
              variant="ghost"
            >
              <RefreshCw className="size-4" />
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Share this code with others to invite them to your organisation
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-muted-foreground">Members</Label>
        <div className="space-y-3">
          {hasMembers
            ? members?.map((member) => {
                const canEditRole =
                  isAdmin === true && member.userId !== userId;
                return (
                  <div
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                    key={member._id}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {member.displayName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEditRole ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                badgeVariants({ variant: "outline" }),
                                "cursor-pointer gap-1 capitalize"
                              )}
                              type="button"
                            >
                              {member.role === "leadScout"
                                ? "Lead Scout"
                                : member.role}
                              <ChevronDown className="size-3 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {[
                              { value: "scout", label: "Scout" },
                              { value: "leadScout", label: "Lead Scout" },
                              { value: "admin", label: "Admin" },
                            ].map((role) => (
                              <DropdownMenuItem
                                key={role.value}
                                onClick={() =>
                                  handleRoleChange(member.userId, role.value)
                                }
                              >
                                {role.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge className="capitalize" variant="outline">
                          {member.role === "leadScout"
                            ? "Lead Scout"
                            : member.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </div>

      <DutiesAssignment />

      {canManage ? (
        <>
          <Separator />

          <DutiesManagement />
        </>
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.auth.getCurrentUserProfile);
  const organisation = useQuery(api.auth.getOrganisation);
  const members = useQuery(api.auth.getOrganisationMembers);

  const [activeTab, setActiveTab] = useState("personal");

  const isAdmin = profile?.role === "admin";
  const canManage = profile?.role === "admin" || profile?.role === "leadScout";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/" as Route);
    router.refresh();
  }

  if (!(user && profile)) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="flex gap-12">
        <div className="shrink-0">
          <h1 className="mb-6 font-semibold text-2xl tracking-tight">
            Profile
          </h1>
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { id: "personal", label: "Personal" },
              { id: "settings", label: "Settings" },
              { id: "organisation", label: "Organisation" },
            ]}
          />
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === "personal" ? (
            <PersonalTab profile={profile} userEmail={user.email} />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsTab onSignOut={handleSignOut} />
          ) : null}

          {activeTab === "organisation" ? (
            <OrganisationTab
              canManage={canManage}
              isAdmin={isAdmin}
              members={members}
              organisation={organisation}
              profile={profile}
              userId={user._id}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
