export interface PublicationPatch {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface PublicationAdapter {
  preview(patch: PublicationPatch): Promise<PublicationPatch>;
  simulateSave(patch: PublicationPatch): Promise<{ saved: true }>;
}

