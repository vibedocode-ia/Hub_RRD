-- Um documento oficial possui no máximo um PDF oficial imutável.
-- Anexos de campo continuam permitidos sem interferir nesta garantia.
CREATE UNIQUE INDEX IF NOT EXISTS attachments_one_official_pdf_per_document
  ON attachments (document_id)
  WHERE file_type = 'OFFICIAL_DOCUMENT_PDF';
