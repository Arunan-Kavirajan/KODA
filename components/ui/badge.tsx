import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "outline" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-medium",
        {
          "border-primary/30 bg-primary/10 text-primary": variant === "default",
          "border-border bg-transparent text-muted-foreground": variant === "outline",
          "border-transparent bg-muted text-muted-foreground": variant === "muted",
        },
        className
      )}
      {...props}
    />
  );
}
