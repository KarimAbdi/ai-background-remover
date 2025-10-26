
import { ImageFile } from '../types';

export const fileToImageFile = async (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result.split(',')[1],
        mimeType: file.type,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const urlToImageFile = async (url: string): Promise<ImageFile> => {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], "background.jpg", { type: blob.type });
  return fileToImageFile(file);
};
