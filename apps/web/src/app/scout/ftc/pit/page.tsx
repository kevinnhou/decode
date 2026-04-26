"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Button } from "@decode/ui/components/button";
import { Checkbox } from "@decode/ui/components/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@decode/ui/components/form";
import { Input } from "@decode/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@decode/ui/components/select";
import { toast } from "@decode/ui/components/sonner";
import { Textarea } from "@decode/ui/components/textarea";
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, UploadIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTeamsMap } from "@/hooks/use-teams-map";
import { getConfig } from "@/lib/config";
import {
  CLIMB_LEVEL_OPTIONS,
  DRIVETRAIN_TYPE_OPTIONS,
  FTC_INTAKE_METHOD_OPTIONS,
  FTC_PIT_SECTION_CONFIG,
} from "@/lib/form/constants";
import type { PhotoPreview } from "@/lib/form/types";
import { formatNumberFieldProps } from "@/lib/form/utils";
import { type FtcPitFormSchema, ftcPitFormSchema } from "@/schema/scouting";
import { TeamCombobox } from "~/form/team-combobox";
import { setPitSectionsState } from "~/sidebar/pit-sections";
import { getPhotoUploadUrl, submitPit } from "./actions";

function CheckboxLabelRow({
  children,
  label,
  className = "space-x-3",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const { formItemId } = useFormField();
  return (
    <label
      className={`flex w-full cursor-pointer flex-row items-center ${className}`}
      htmlFor={formItemId}
    >
      {children}
      <span className="flex-1 cursor-pointer leading-none">{label}</span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

export default function PitScouting() {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<number>>(
    new Set()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewsRef = useRef(photoPreviews);
  photoPreviewsRef.current = photoPreviews;

  const pitEventCode = getConfig()?.eventCode ?? "";
  const teamsMap = useTeamsMap();
  const scoutedCounts = useQuery(
    api.submissions.getPitSubmissionCounts,
    pitEventCode ? { eventCode: pitEventCode } : "skip"
  );

  const form = useForm<FtcPitFormSchema>({
    resolver: zodResolver(ftcPitFormSchema),
    defaultValues: {
      teamNumber: 0,
      photos: [],
      robotDimensions: {
        length: undefined,
        width: undefined,
        height: undefined,
      },
      drivetrainType: undefined,
      weight: undefined,
      intakeMethods: [],
      maxClimbLevel: undefined,
      canShootDeep: false,
      autoCapabilities: "",
      notes: "",
    },
  });

  const currentSection = FTC_PIT_SECTION_CONFIG[activeSectionIndex];
  const isLastSection =
    activeSectionIndex === FTC_PIT_SECTION_CONFIG.length - 1;

  const handlePhotoUpload = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Photo upload with validation and error handling
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name} is not an image file`);
            continue;
          }

          const previewUrl = URL.createObjectURL(file);
          const previewId = crypto.randomUUID();

          setPhotoPreviews((prev) => [
            ...prev,
            {
              id: previewId,
              previewUrl,
              fileName: file.name,
              status: "uploading",
            },
          ]);

          try {
            const uploadResult = await getPhotoUploadUrl();
            if (!(uploadResult.success && uploadResult.uploadUrl)) {
              throw new Error(uploadResult.message);
            }
            const uploadUrl = uploadResult.uploadUrl;

            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              body: file,
              headers: { "Content-Type": file.type },
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }

            const { storageId } = (await uploadResponse.json()) as {
              storageId: string;
            };

            setPhotoPreviews((prev) =>
              prev.map((photo) =>
                photo.id === previewId
                  ? { ...photo, storageId, status: "uploaded" }
                  : photo
              )
            );

            const existingPhotos = form.getValues("photos") ?? [];
            form.setValue("photos", [...existingPhotos, storageId], {
              shouldDirty: true,
            });
          } catch (error) {
            setPhotoPreviews((prev) =>
              prev.map((photo) =>
                photo.id === previewId ? { ...photo, status: "failed" } : photo
              )
            );
            const message =
              error instanceof Error
                ? error.message
                : `Failed to upload ${file.name}`;
            toast.error(message);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload photos";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [form]
  );

  const handleRemovePhoto = useCallback(
    (index: number) => {
      setPhotoPreviews((prev) => {
        const removedPhoto = prev[index];
        if (removedPhoto) {
          URL.revokeObjectURL(removedPhoto.previewUrl);

          if (removedPhoto.storageId) {
            const existingPhotos = form.getValues("photos") ?? [];
            form.setValue(
              "photos",
              existingPhotos.filter((id) => id !== removedPhoto.storageId),
              { shouldDirty: true }
            );
          }
        }
        return prev.filter((_, i) => i !== index);
      });
    },
    [form]
  );

  const onReset = useCallback(() => {
    setPhotoPreviews((prev) => {
      for (const photo of prev) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return [];
    });

    form.reset({
      teamNumber: 0,
      photos: [],
      robotDimensions: {
        length: undefined,
        width: undefined,
        height: undefined,
      },
      drivetrainType: undefined,
      weight: undefined,
      intakeMethods: [],
      maxClimbLevel: undefined,
      canShootDeep: false,
      autoCapabilities: "",
      notes: "",
    });
    setActiveSectionIndex(0);
  }, [form]);

  useEffect(
    () => () => {
      for (const photo of photoPreviewsRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    },
    []
  );

  const handleContinue = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form submission with validation and data transformation
    async () => {
      const config = getConfig();
      const eventCode = config?.eventCode?.trim() || "UNKNOWN";

      if (isLastSection) {
        const isValid = await form.trigger();
        if (!isValid) {
          toast.error("Please fix validation errors before submitting");
          return;
        }

        setIsSubmitting(true);
        try {
          const values = form.getValues();
          const result = await submitPit({
            competitionType: "FTC",
            eventCode,
            eventName: undefined,
            teamNumber: values.teamNumber,
            source: "web",
            robotDimensions:
              values.robotDimensions?.length ||
              values.robotDimensions?.width ||
              values.robotDimensions?.height
                ? {
                    length: values.robotDimensions.length ?? 0,
                    width: values.robotDimensions.width ?? 0,
                    height: values.robotDimensions.height ?? 0,
                  }
                : undefined,
            drivetrainType: values.drivetrainType,
            photos:
              values.photos && values.photos.length > 0
                ? values.photos
                : undefined,
            notes: values.notes || undefined,
            intakeMethods:
              values.intakeMethods && values.intakeMethods.length > 0
                ? values.intakeMethods
                : undefined,
            maxClimbLevel: values.maxClimbLevel,
            canShootDeep: values.canShootDeep,
            autoCapabilities: values.autoCapabilities || undefined,
            weight: values.weight,
          });

          if (result.success) {
            toast.success(result.message);
            onReset();
          } else {
            toast.error(result.message);
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to submit pit scouting";
          toast.error(message);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        setActiveSectionIndex((prev) =>
          Math.min(prev + 1, FTC_PIT_SECTION_CONFIG.length - 1)
        );
      }
    },
    [isLastSection, form, onReset]
  );

  const handlePrevious = useCallback(() => {
    setActiveSectionIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setActiveSectionIndex(index);
  }, []);

  const checkSectionCompletion = useCallback(
    async (sectionIndex: number): Promise<boolean> => {
      switch (sectionIndex) {
        case 0: {
          const teamNumber = form.getValues("teamNumber");
          return teamNumber > 0;
        }
        case 1: {
          const dims = form.getValues("robotDimensions");
          return !!(
            dims?.length ||
            dims?.width ||
            dims?.height ||
            form.getValues("drivetrainType") ||
            form.getValues("weight")
          );
        }
        case 2: {
          return !!(
            (form.getValues("intakeMethods")?.length ?? 0) > 0 ||
            form.getValues("maxClimbLevel") !== undefined ||
            form.getValues("canShootDeep")
          );
        }
        case 3: {
          return !!(
            form.getValues("autoCapabilities") || form.getValues("notes")
          );
        }
        default:
          return false;
      }
    },
    [form]
  );

  useEffect(() => {
    async function updateCompletionStatus() {
      const newCompleted = new Set<number>();
      for (let i = 0; i < FTC_PIT_SECTION_CONFIG.length; i++) {
        const isComplete = await checkSectionCompletion(i);
        if (isComplete) {
          newCompleted.add(i);
        }
      }
      setCompletedSections(newCompleted);
    }

    const subscription = form.watch(() => {
      updateCompletionStatus();
    });

    updateCompletionStatus();

    return () => {
      subscription.unsubscribe();
    };
  }, [form, checkSectionCompletion]);

  useEffect(() => {
    setPitSectionsState({
      sections: FTC_PIT_SECTION_CONFIG.map((section, index) => ({
        id: section.id,
        label: section.label,
        completed: completedSections.has(index),
      })),
      activeIndex: activeSectionIndex,
      onNavigate: handleNavigate,
    });

    return () => {
      setPitSectionsState(null);
    };
  }, [activeSectionIndex, completedSections, handleNavigate]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Form {...form}>
        <form
          className="space-y-8"
          onSubmit={async (e) => {
            e.preventDefault();
            await handleContinue();
          }}
        >
          <div className="space-y-2">
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
              {activeSectionIndex + 1} / {FTC_PIT_SECTION_CONFIG.length}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${((activeSectionIndex + 1) / FTC_PIT_SECTION_CONFIG.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {activeSectionIndex === 0 ? (
            <Section title="Metadata">
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <FormField
                  control={form.control}
                  name="teamNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-base">
                        Team Number
                      </FormLabel>
                      <FormControl>
                        <TeamCombobox
                          onChange={(num) => field.onChange(num)}
                          scoutedCounts={scoutedCounts ?? undefined}
                          teamsMap={teamsMap}
                          value={field.value || undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel className="font-semibold text-base">
                    Photos
                  </FormLabel>
                  {photoPreviews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {photoPreviews.map((photo, index) => (
                        <div
                          className="group relative overflow-hidden rounded-lg border bg-muted"
                          key={photo.id}
                        >
                          {/** biome-ignore lint/performance/noImgElement: PASS */}
                          <img
                            alt={photo.fileName}
                            className="h-24 w-full object-cover"
                            height={96}
                            src={photo.previewUrl}
                            width={160}
                          />
                          <button
                            className="-right-2 -top-2 absolute flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                            onClick={() => handleRemovePhoto(index)}
                            type="button"
                          >
                            <X className="size-3" />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-background/75 px-2 py-1">
                            <p className="truncate text-[10px]">
                              {photo.fileName}
                            </p>
                            {photo.status === "uploading" ? (
                              <p className="text-[10px] text-muted-foreground">
                                Uploading...
                              </p>
                            ) : null}
                            {photo.status === "failed" ? (
                              <p className="text-[10px] text-destructive">
                                Upload failed
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <input
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    multiple
                    onChange={(e) => {
                      handlePhotoUpload(e.target.files);
                      e.currentTarget.value = "";
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <Button
                    className="w-full"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    variant="outline"
                  >
                    <UploadIcon className="mr-2 size-4" />
                    {isUploading ? "Uploading..." : "Upload Photos"}
                  </Button>
                </div>
              </div>
            </Section>
          ) : null}

          {activeSectionIndex === 1 ? (
            <Section title={currentSection.label}>
              <div className="space-y-4">
                <div>
                  <FormLabel className="mb-3 block font-semibold text-base">
                    Dimensions (cm)
                  </FormLabel>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="robotDimensions.length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...formatNumberFieldProps(field)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="robotDimensions.width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...formatNumberFieldProps(field)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="robotDimensions.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...formatNumberFieldProps(field)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...formatNumberFieldProps(field)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drivetrainType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drivetrain Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select drivetrain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DRIVETRAIN_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Section>
          ) : null}

          {activeSectionIndex === 2 ? (
            <Section title={currentSection.label}>
              <div className="space-y-4">
                <div>
                  <FormLabel className="mb-2 block font-medium text-sm">
                    Intake Methods
                  </FormLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FTC_INTAKE_METHOD_OPTIONS.map((method) => (
                      <FormField
                        control={form.control}
                        key={method.id}
                        name="intakeMethods"
                        render={({ field }) => {
                          const currentValue = field.value || [];
                          return (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-lg bg-muted/40 px-3 py-2.5">
                              <CheckboxLabelRow
                                className="space-x-2"
                                label={method.label}
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={currentValue.includes(
                                      method.id as "floor" | "outpost"
                                    )}
                                    onCheckedChange={(checked) => {
                                      const value = method.id as
                                        | "floor"
                                        | "outpost";
                                      return checked
                                        ? field.onChange([
                                            ...currentValue,
                                            value,
                                          ])
                                        : field.onChange(
                                            currentValue.filter(
                                              (v) => v !== value
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                              </CheckboxLabelRow>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="maxClimbLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Climb Level</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select climb level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLIMB_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="canShootDeep"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg bg-muted/40 px-3 py-2.5">
                      <CheckboxLabelRow label="Can Shoot Deep">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </CheckboxLabelRow>
                    </FormItem>
                  )}
                />
              </div>
            </Section>
          ) : null}

          {activeSectionIndex === 3 ? (
            <Section title={currentSection.label}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="autoCapabilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Autonomous Capabilities</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>
          ) : null}

          <div className="flex flex-col gap-4 border-t pt-6">
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                className="flex-1"
                disabled={activeSectionIndex === 0 || isSubmitting}
                onClick={handlePrevious}
                size="lg"
                type="button"
                variant="outline"
              >
                <ChevronLeft className="mr-2 size-4" />
                Previous
              </Button>
              {isLastSection ? (
                <Button
                  className="flex-1 font-mono"
                  disabled={isSubmitting}
                  key="submit"
                  size="lg"
                  type="submit"
                >
                  {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                </Button>
              ) : (
                <Button
                  className="flex-1 font-mono"
                  disabled={isSubmitting}
                  key="continue"
                  onClick={handleContinue}
                  size="lg"
                  type="button"
                >
                  CONTINUE
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                className="w-full sm:w-auto"
                disabled={isSubmitting}
                onClick={onReset}
                type="button"
                variant="ghost"
              >
                Reset
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
