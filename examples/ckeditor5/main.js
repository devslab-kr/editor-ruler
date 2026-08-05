import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Table,
  TableToolbar,
} from 'ckeditor5';
import { EditorRulerPlugin } from '@devslab/editor-ruler-ckeditor5';
import 'ckeditor5/ckeditor5.css';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, Bold, Italic, Table, TableToolbar, EditorRulerPlugin],
  toolbar: ['heading', '|', 'bold', 'italic', 'insertTable'],
  editorRuler: { unit: 'cm' },
  initialData:
    '<h3>editor-ruler + CKEditor 5</h3>' +
    '<p style="margin-left:60px;">왼쪽 여백 60px 문단 — 핸들을 끌어 보세요.</p>' +
    '<p style="text-indent:40px;">첫 줄 40px 들여쓰기 문단. 기존 인라인 들여쓰기는 업캐스트되어 들어옵니다.</p>' +
    '<p>드래그 전체가 undo 한 단계입니다 (Ctrl+Z). getData() 출력은 순수 인라인 CSS입니다.</p>',
});
