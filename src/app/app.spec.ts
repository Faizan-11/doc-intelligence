
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Helper: simulate selecting files in the browser.
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

  // Test 3: A supported file can be added.
  it('should add a supported file', () => {
    const file = new File(['sample content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([file]);

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

  // Test 5: A document can be removed.
  it('should remove a document', () => {
    const file = new File(['sample content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([file]);

    const id = component['documents']()[0].id;
    component['removeDocument'](id);

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

  // Test 8: Duplicate files in the same selection are skipped.
  it('should skip duplicate files selected together', () => {
    const first = new File(['same content'], 'notes.txt', {
      type: 'text/plain',
    });

    const second = new File(['same content'], 'notes.txt', {
      type: 'text/plain',
    });

    selectFiles([first, second]);

    expect(component['documents']()).toHaveLength(1);
    expect(component['errorMessage']())
      .toContain('duplicate file skipped');
  });

  // Test 9: Valid files are added even if another file is invalid.
  it('should add valid files and report invalid files in a mixed selection', () => {
    const validFile = new File(['hello'], 'notes.txt', {
      type: 'text/plain',
    });

    const invalidFile = new File(['program'], 'program.exe', {
      type: 'application/octet-stream',
    });

    selectFiles([validFile, invalidFile]);

    expect(component['documents']()).toHaveLength(1);
    expect(component['documents']()[0].name).toBe('notes.txt');
    expect(component['errorMessage']())
      .toContain('unsupported file type');
  });
});
