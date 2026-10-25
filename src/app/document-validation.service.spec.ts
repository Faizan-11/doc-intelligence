
import { TestBed } from '@angular/core/testing';
import { DocumentValidationService } from './document-validation.service';

describe('DocumentValidationService', () => {
  let service: DocumentValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should accept a supported PDF file', () => {
    const file = new File(['sample'], 'report.pdf', {
      type: 'application/pdf',
    });

    expect(service.validateFile(file)).toBeNull();
  });

  it('should accept supported extensions regardless of case', () => {
    const file = new File(['sample'], 'REPORT.PDF', {
      type: 'application/pdf',
    });

    expect(service.validateFile(file)).toBeNull();
  });

  it('should reject an unsupported extension', () => {
    const file = new File(['sample'], 'program.exe', {
      type: 'application/octet-stream',
    });

    expect(service.validateFile(file))
      .toContain('unsupported file type');
  });

  it('should accept a file exactly at the size limit', () => {
    const file = new File(
      [new Uint8Array(service.maxFileSize)],
      'report.pdf',
      { type: 'application/pdf' },
    );

    expect(service.validateFile(file)).toBeNull();
  });

  it('should reject a file above the size limit', () => {
    const file = new File(
      [new Uint8Array(service.maxFileSize + 1)],
      'report.pdf',
      { type: 'application/pdf' },
    );

    expect(service.validateFile(file))
      .toContain('exceeds the 10 MiB limit');
  });

  it('should create a document with the original file details', () => {
    const file = new File(['sample'], 'notes.txt', {
      type: 'text/plain',
    });

    const document = service.createDocument(file);

    expect(document.name).toBe('notes.txt');
    expect(document.size).toBe(file.size);
    expect(document.type).toBe('text/plain');
    expect(document.file).toBe(file);
    expect(document.id).toBeTruthy();
  });

  it('should reject a filename without an extension', () => {
  const file = new File(['sample'], 'README', {
    type: 'text/plain',
  });

  expect(service.validateFile(file))
    .toContain('unsupported file type');
});

it('should reject a filename ending with a dot', () => {
  const file = new File(['sample'], 'report.', {
    type: 'application/pdf',
  });

  expect(service.validateFile(file))
    .toContain('unsupported file type');
});

it('should reject an unsupported extension even if the MIME type claims PDF', () => {
  const file = new File(['sample'], 'program.exe', {
    type: 'application/pdf',
  });

  expect(service.validateFile(file))
    .toContain('unsupported file type');
});
});
