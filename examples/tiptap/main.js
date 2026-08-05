import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { EditorRuler } from '@devslab/editor-ruler-tiptap';

new Editor({
  element: document.getElementById('editor'),
  extensions: [StarterKit, Image.configure({ inline: true, allowBase64: true }), EditorRuler.configure({ unit: 'cm' })],
  content:
    '<h3>editor-ruler + Tiptap</h3>' +
    '<p style="margin-left: 60px;">왼쪽 여백 60px 문단 — 핸들을 끌어 보세요.</p>' +
    '<p style="text-indent: 40px;">첫 줄 40px 들여쓰기 문단. 기존 인라인 들여쓰기는 그대로 파싱되어 들어옵니다.</p>' +
    '<p>드래그 전체가 undo 한 단계입니다 (Ctrl+Z). getHTML() 출력은 순수 인라인 CSS입니다.</p>',
});
