import {
  RATE_LIMIT_POLL_INTERVAL_LIMITED,
  RATE_LIMIT_POLL_INTERVAL_NORMAL,
  RATE_LIMIT_STALE_TIME
} from "@folionote/constants"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { client } from "@/utils/orpc"

import type { AllowedAvatarMimeType, CropArea } from "./types"
import { ALLOWED_AVATAR_TYPES } from "./types"
import { compressImage, fileToBase64, getCroppedImage } from "./utils"

/**
 * Hook to manage avatar configuration
 */
export function useAvatarConfig() {
  return useQuery({
    queryKey: ["storage", "avatarConfig"],
    queryFn: () => client.storage.getAvatarConfig(),
    staleTime: Number.POSITIVE_INFINITY
  })
}

/**
 * Hook to manage rate limiting for avatar updates
 */
export function useAvatarRateLimit() {
  const { data: rateLimitStatus, refetch: refetchRateLimit } = useQuery({
    queryKey: ["storage", "rateLimitStatus", "update"],
    queryFn: () => client.storage.getRateLimitStatus({ action: "update" }),
    staleTime: RATE_LIMIT_STALE_TIME,
    refetchInterval: (query) => {
      const { data } = query.state
      if (data?.isLimited) {
        return RATE_LIMIT_POLL_INTERVAL_LIMITED
      }
      return RATE_LIMIT_POLL_INTERVAL_NORMAL
    }
  })

  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!rateLimitStatus?.isLimited) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((rateLimitStatus.resetAt - Date.now()) / 1000)
      )
      setCountdown(remaining)
      if (remaining === 0) {
        refetchRateLimit()
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [rateLimitStatus?.isLimited, rateLimitStatus?.resetAt, refetchRateLimit])

  const isRateLimited = rateLimitStatus?.isLimited ?? false

  return {
    rateLimitStatus,
    refetchRateLimit,
    countdown,
    isRateLimited
  }
}

/**
 * Hook to manage avatar upload mutation
 */
export function useAvatarUpload(
  onAvatarChange?: (newUrl: string | null) => void,
  refetchRateLimit?: () => void
) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const compressedFile = await compressImage(file)
      const base64 = await fileToBase64(compressedFile)
      return client.storage.updateAvatar({
        fileData: base64,
        contentType: compressedFile.type as AllowedAvatarMimeType,
        filename: compressedFile.name
      })
    },
    onSuccess: (data) => {
      toast.success(t("avatar.uploadSuccess"))
      setPreviewUrl(null)
      onAvatarChange?.(data.imageUrl)
      queryClient.invalidateQueries({ queryKey: ["session"] })
      refetchRateLimit?.()
    },
    onError: (error) => {
      if (error.message.includes("Rate limit")) {
        refetchRateLimit?.()
      }
      toast.error(
        t("avatar.uploadError", {
          message: error.message
        })
      )
      setPreviewUrl(null)
    }
  })

  return {
    uploadMutation,
    previewUrl,
    setPreviewUrl
  }
}

/**
 * Hook to manage avatar delete mutation
 */
export function useAvatarDelete(
  onAvatarChange?: (newUrl: string | null) => void,
  refetchRateLimit?: () => void
) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => client.storage.deleteAvatar(),
    onSuccess: () => {
      toast.success(t("avatar.deleteSuccess"))
      onAvatarChange?.(null)
      queryClient.invalidateQueries({ queryKey: ["session"] })
      refetchRateLimit?.()
    },
    onError: (error) => {
      if (error.message.includes("Rate limit")) {
        refetchRateLimit?.()
      }
      toast.error(
        t("avatar.deleteError", {
          message: error.message
        })
      )
    }
  })

  return { deleteMutation }
}

/**
 * Hook to manage avatar cropping state and logic
 */
export function useAvatarCropper(
  uploadMutation: ReturnType<typeof useAvatarUpload>["uploadMutation"],
  setPreviewUrl: (url: string | null) => void
) {
  const { t } = useTranslation()
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null
  )
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const onCropComplete = useCallback(
    (_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCropConfirm = useCallback(async () => {
    if (!(cropImageSrc && croppedAreaPixels && originalFile)) {
      return
    }

    try {
      const croppedFile = await getCroppedImage(
        cropImageSrc,
        croppedAreaPixels,
        originalFile.name
      )

      const preview = URL.createObjectURL(croppedFile)
      setPreviewUrl(preview)

      setCropDialogOpen(false)
      setCropImageSrc(null)
      setOriginalFile(null)

      uploadMutation.mutate(croppedFile)
    } catch {
      toast.error(t("avatar.cropError"))
    }
  }, [
    cropImageSrc,
    croppedAreaPixels,
    originalFile,
    uploadMutation,
    setPreviewUrl,
    t
  ])

  const handleCropCancel = useCallback(() => {
    setCropDialogOpen(false)
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropImageSrc(null)
    setOriginalFile(null)
  }, [cropImageSrc])

  const openCropper = useCallback((file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setCropImageSrc(imageUrl)
    setOriginalFile(file)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropDialogOpen(true)
  }, [])

  return {
    cropDialogOpen,
    setCropDialogOpen,
    cropImageSrc,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    handleCropConfirm,
    handleCropCancel,
    openCropper
  }
}

/**
 * Hook to validate avatar files
 */
export function useAvatarValidation() {
  const { t } = useTranslation()
  const { data: config } = useAvatarConfig()

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!config) {
        return null
      }

      if (!ALLOWED_AVATAR_TYPES.includes(file.type as AllowedAvatarMimeType)) {
        return t("avatar.invalidType")
      }

      if (file.size > config.maxSize) {
        return t("avatar.fileTooLarge", {
          size: config.maxSizeMB
        })
      }

      return null
    },
    [config, t]
  )

  return { validateFile, config }
}
