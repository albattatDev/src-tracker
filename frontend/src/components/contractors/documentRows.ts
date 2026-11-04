import { DOC_TYPES, type CurrentDocument, type DocType } from "../../api/contractors";
import { documentDaysNote, documentStatus } from "../../utils/documents";

// One of the five fixed document rows: its type, the current file (if any), how many earlier
// files sit behind it, and the status and note to show. Computed once here, so the table and the
// cards only render.
export interface DocumentRow {
  docType: DocType;
  document: CurrentDocument | undefined;
  historyCount: number;
  status: ReturnType<typeof documentStatus>;
  note: string | null;
}

// Always all five types, in order, whether or not a file was uploaded.
export function documentRows(documents: CurrentDocument[]): DocumentRow[] {
  const byType = new Map(documents.map((document) => [document.doc_type, document]));
  return DOC_TYPES.map((docType) => {
    const document = byType.get(docType);
    return {
      docType,
      document,
      historyCount: document ? document.upload_count - 1 : 0,
      status: documentStatus(document),
      note: documentDaysNote(document),
    };
  });
}
