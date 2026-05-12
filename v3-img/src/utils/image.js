import { createId } from "../services/storage";

export function base64ToBlob(base64Data, mimeType = "image/png") {
  const normalizedData = base64Data.includes(",") ? base64Data.split(",").pop() : base64Data;
  const byteString = window.atob(normalizedData);
  const bytes = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i += 1) {
    bytes[i] = byteString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

export function createObjectUrl(blob) {
  return URL.createObjectURL(blob);
}

export function fileToRenderData(file) {
  return {
    imageUrl: createObjectUrl(file),
    imageRef: {
      kind: "asset",
      assetId: createId("asset"),
      blob: file
    }
  };
}

export function imageDataToRenderData(imageData) {
  if (imageData?.type === "url") {
    return {
      imageUrl: imageData.value,
      imageRef: {
        kind: "remote",
        value: imageData.value
      }
    };
  }

  const blob = imageData?.type === "blob"
    ? imageData.value
    : base64ToBlob(imageData?.value || imageData);

  return {
    imageUrl: createObjectUrl(blob),
    imageRef: {
      kind: "asset",
      assetId: createId("asset"),
      blob
    }
  };
}

export function blobToImageFile(blob, name = "edit-source.png") {
  if (!blob) {
    return null;
  }

  if (blob instanceof File) {
    return blob;
  }

  return new File([blob], name, { type: blob.type || "image/png" });
}
