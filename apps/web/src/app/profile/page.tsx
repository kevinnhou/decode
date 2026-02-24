"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Button } from "@decode/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@decode/ui/components/card";
import { Input } from "@decode/ui/components/input";
import { useMutation, useQuery } from "convex/react";
import { Building2, Check, LogOut, Mail, Pencil, User, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function ProfilePage() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.auth.getCurrentUserProfile);
  const updateName = useMutation(api.auth.updateDisplayName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/" as Route);
    router.refresh();
  }

  function handleEditName() {
    setNewName(profile?.displayName ?? "");
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

  if (!(user && profile)) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and organisation settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-muted-foreground text-sm">
                  Display Name
                </p>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 max-w-xs"
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
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-muted-foreground text-sm">
                  Email Address
                </p>
                <p className="text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-muted-foreground text-sm">
                  Organisation
                </p>
                <p className="text-foreground">
                  {profile.organisationName ?? "Unknown organisation"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="gap-2" onClick={handleSignOut} variant="destructive">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
