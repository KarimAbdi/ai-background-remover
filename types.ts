
export interface ImageFile {
  base64: string;
  mimeType: string;
}

export type BackgroundType = 'preset' | 'color' | 'upload';

export interface BackgroundOption {
  type: BackgroundType;
  value: string;
}
