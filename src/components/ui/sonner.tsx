"use client"

import { useTheme } from "next-themes"
import { LOCALES, useLocale, useT } from "@/lib/i18n"
import { ui } from "@/messages/ui"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // Sonner only knows light and dark; the kids themes are light.
  const { resolvedTheme } = useTheme()
  const [locale] = useLocale()
  const t = useT(ui)

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      dir={LOCALES[locale].dir}
      containerAriaLabel={t("notifications")}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: t("closeToast"),
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
