import { ProjectData, AutofillOptions, AutofillResult } from "../shared/types";

export interface SiteAdapter {
  readonly name: string;
  readonly isEnabled: boolean;
  canHandle(url: string): boolean;
  extractProject(doc: Document): ProjectData | null;
  autofill(doc: Document, options: AutofillOptions): AutofillResult;
}
