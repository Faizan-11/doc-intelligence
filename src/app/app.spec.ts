
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let httpTestingController: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Mock the initial backend health check and document listing.
    httpTestingController.expectOne(`${apiUrl}/health`).flush({
      status: 'UP',
      application: 'DocuMind API',
    });

    httpTestingController.expectOne(`${apiUrl}/documents`).flush([]);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  // Simulate selecting files in the browser.
  function selectFiles(files: File[]): void {
    const input = document.createElement('input');
    input.type = 'file';

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: files,
    });

    component['onFilesSelected']({
      target: input,
    } as unknown as Event);
  }

  // Mock a successful backend upload.
  function completeUpload(file: File): void {
    const request = httpTestingController.expectOne(
      `${apiUrl}/documents`,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('file')).toBe(file);

    request.flush({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || null,
      storageFileName: `${crypto.randomUUID()}.txt`,
      uploadedAt: new Date().toISOString(),
    });
  }

  // Test 1: Angular creates the component.
  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  // Test 2: The correct dashboard heading is displayed.
  it('should render the document intelligence title', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent)
      .toContain('Document Intelligence');
  });

  // Test 3: A supported file is added after backend confirmation.
  it('should add a supported file after successful upload', () => {
    const file = new File(['sample content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([file]);
    expect(component['documents']()).toHaveLength(0);

    completeUpload(file);

    expect(component['documents']()).toHaveLength(1);
    expect(component['documents']()[0].name).toBe('notes.txt');
  });

  // Test 4: An unsupported file is rejected.
  it('should reject an unsupported file type', () => {
    const file = new File(['program'], 'program.exe', {
      type: 'application/octet-stream',
    });

    selectFiles([file]);

    expect(component['documents']()).toHaveLength(0);
    expect(component['errorMessage']())
      .toContain('unsupported file type');
  });

  // Test 5: A document is removed after backend confirmation.
  it('should remove a document after successful deletion', () => {
    const file = new File(['sample content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([file]);
    completeUpload(file);

    const id = component['documents']()[0].id;

    component['removeDocument'](id);

    const request = httpTestingController.expectOne(
      `${apiUrl}/documents/${id}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    expect(component['documents']()).toHaveLength(0);
  });

  // Test 6: A file exactly at the 10 MiB limit is accepted.
  it('should accept a file exactly at the 10 MiB limit', () => {
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024)],
      'boundary.pdf',
      { type: 'application/pdf' },
    );

    selectFiles([file]);
    completeUpload(file);

    expect(component['documents']()).toHaveLength(1);
    expect(component['errorMessage']()).toBe('');
  });

  // Test 7: A file one byte over the limit is rejected.
  it('should reject a file one byte over the 10 MiB limit', () => {
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'oversized.pdf',
      { type: 'application/pdf' },
    );

    selectFiles([file]);

    expect(component['documents']()).toHaveLength(0);
    expect(component['errorMessage']())
      .toContain('exceeds the 10 MiB limit');
  });

  // Test 8: Duplicate files in one selection are skipped.
  it('should skip duplicate files selected together', () => {
    const first = new File(['same content'], 'notes.txt', {
      type: 'text/plain',
    });

    const second = new File(['same content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([first, second]);
    completeUpload(first);

    expect(component['documents']()).toHaveLength(1);
    expect(component['documents']()[0].name).toBe('notes.txt');
    expect(component['errorMessage']())
      .toContain('duplicate file skipped');
  });

  // Test 9: A valid file uploads while an invalid file is rejected.
  it('should add valid files and report invalid files in a mixed selection', () => {
    const validFile = new File(['hello'], 'notes.txt', {
      type: 'text/plain',
    });

    const invalidFile = new File(['program'], 'program.exe', {
      type: 'application/octet-stream',
    });

    selectFiles([validFile, invalidFile]);
    completeUpload(validFile);

    expect(component['documents']()).toHaveLength(1);
    expect(component['documents']()[0].name).toBe('notes.txt');
    expect(component['errorMessage']())
      .toContain('unsupported file type');
  });

  // Test 10: A failed upload must not add a document to the dashboard.
  it('should report an upload failure without adding the document', () => {
    const file = new File(['sample content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([file]);

    const request = httpTestingController.expectOne(
      `${apiUrl}/documents`,
    );
    request.flush(
      { message: 'Upload failed' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(component['documents']()).toHaveLength(0);
    expect(component['errorMessage']())
      .toContain('unable to upload');
  });
});
