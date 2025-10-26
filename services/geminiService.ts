
import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const imageEditModel = 'gemini-2.5-flash-image';

const extractImage = (response: any): ImageFile | null => {
  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData) {
    return {
      base64: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    };
  }
  return null;
};

export const removeBackground = async (image: ImageFile): Promise<ImageFile | null> => {
  const response = await ai.models.generateContent({
    model: imageEditModel,
    contents: {
      parts: [
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
        { text: "Remove the background from this image. Make the background transparent so it can be used as a layer. The output must be a PNG image with a transparent background." },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
  return extractImage(response);
};

export const cartoonifyImage = async (image: ImageFile): Promise<ImageFile | null> => {
  const response = await ai.models.generateContent({
    model: imageEditModel,
    contents: {
      parts: [
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
        { text: "Convert the subject in this image to a vibrant cartoon style. Maintain the transparent background. The output must be a PNG image with a transparent background." },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
  return extractImage(response);
};

export const combineImageAndBackground = async (foreground: ImageFile, background: ImageFile): Promise<ImageFile | null> => {
  const response = await ai.models.generateContent({
    model: imageEditModel,
    contents: {
      parts: [
        { inlineData: { data: foreground.base64, mimeType: foreground.mimeType } },
        { inlineData: { data: background.base64, mimeType: background.mimeType } },
        { text: "Layer the first image (the subject) onto the second image (the background). Blend them naturally to create a cohesive final image." },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
  return extractImage(response);
};

export const combineImageAndColor = async (foreground: ImageFile, color: string): Promise<ImageFile | null> => {
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: {
        parts: [
            { inlineData: { data: foreground.base64, mimeType: foreground.mimeType } },
            { text: `Place the subject from this image onto a solid background with the hex color ${color}.` },
        ],
        },
        config: {
        responseModalities: [Modality.IMAGE],
        },
    });
    return extractImage(response);
};
