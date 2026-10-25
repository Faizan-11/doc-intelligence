
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

  
it('should create the app', () => {
  expect(component).toBeTruthy();
});

it('should render the document intelligence title', () => {
  const compiled = fixture.nativeElement as HTMLElement;

  expect(compiled.querySelector('h1')?.textContent)
    .toContain('Document Intelligence');
});

it('should add a supported file', () => {
  const file = new File(['sample content'], 'notes.txt', {
    type: 'text/plain',
  });

  const input = document.createElement('input');
  input.type = 'file';

  Object.defineProperty(input, 'files', {
    value: [file],
  });

  component['onFilesSelected']({ target: input } as unknown as Event);

  expect(component['documents']()).toHaveLength(1);
  expect(component['documents']()[0].name).toBe('notes.txt');
});

it('should reject an unsupported file type', () => {
  const file = new File(['sample content'], 'program.exe', {
    type: 'application/octet-stream',
  });

  const input = document.createElement('input');
  input.type = 'file';

  Object.defineProperty(input, 'files', {
    value: [file],
  });

  component['onFilesSelected']({ target: input } as unknown as Event);

  expect(component['documents']()).toHaveLength(0);
  expect(component['errorMessage']()).toContain('unsupported file type');
});

it('should remove a document', () => {
  const file = new File(['sample content'], 'notes.txt', {
    type: 'text/plain',
  });

  const input = document.createElement('input');
  input.type = 'file';

  Object.defineProperty(input, 'files', {
    value: [file],
  });

  component['onFilesSelected']({ target: input } as unknown as Event);

  const id = component['documents']()[0].id;
  component['removeDocument'](id);

  expect(component['documents']()).toHaveLength(0);
});

});
