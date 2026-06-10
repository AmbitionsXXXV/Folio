import type { SlashCommandItem } from "@folionote/editor-react"
import type { Editor, Range } from "@tiptap/core"
import { toast } from "sonner"

export type ImageUploadFn = (file: File) => Promise<{ publicUrl: string }>

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
]

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB

interface CreateImageCommandOptions {
  t: (key: string) => string
  uploadImage: ImageUploadFn
}

function openFileDialog(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.addEventListener(
      "change",
      () => {
        resolve(input.files?.[0] ?? null)
      },
      { once: true }
    )
    input.addEventListener("cancel", () => resolve(null), { once: true })
    input.click()
  })
}

/**
 * Create a /image slash command that opens a file picker,
 * uploads the selected image, and inserts it into the editor.
 */
export function createImageCommand(
  options: CreateImageCommandOptions
): SlashCommandItem {
  const { t, uploadImage } = options

  return {
    id: "image",
    title: t("editor.slashCommand.image"),
    description: t("editor.slashCommand.imageDesc"),
    iconId: "image",
    keywords: ["image", "img", "picture", "photo", "图片", "图像", "插图"],
    group: t("editor.slashCommand.basicBlocks"),
    command: ({ editor, range }: { editor: Editor; range: Range }) => {
      editor.chain().focus().deleteRange(range).run()

      const accept = ACCEPTED_IMAGE_TYPES.join(",")

      openFileDialog(accept)
        .then(async (file) => {
          if (!file) {
            return
          }

          if (file.size > MAX_IMAGE_SIZE) {
            const maxMB = MAX_IMAGE_SIZE / 1024 / 1024
            throw new Error(
              t("editor.imageUpload.fileTooLarge").replace(
                "{{maxMB}}",
                String(maxMB)
              )
            )
          }

          toast.loading(t("editor.imageUpload.uploading"), {
            id: "image-upload"
          })

          const { publicUrl } = await uploadImage(file)

          toast.dismiss("image-upload")

          editor
            .chain()
            .focus()
            .setImage({ src: publicUrl, alt: file.name })
            .run()
        })
        .catch((error: unknown) => {
          toast.dismiss("image-upload")
          const message =
            error instanceof Error ? error.message : "Upload failed"
          toast.error(message)
        })
    }
  }
}
