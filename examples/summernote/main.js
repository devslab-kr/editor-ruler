import $ from 'jquery';
import 'summernote/dist/summernote-lite.css';
import 'summernote/dist/summernote-lite.js';
import { defineRulerPlugin } from '@devslab/editor-ruler-summernote';

// Summernote attaches itself to the jQuery instance it finds, so hand it ours.
window.jQuery = window.$ = $;

defineRulerPlugin($);

$('#editor').summernote({
  height: 300,
  toolbar: [
    ['style', ['bold', 'italic', 'underline']],
    ['para', ['ul', 'ol']],
    ['table', ['table']],
    ['misc', ['ruler']],
  ],
  ruler: {
    unit: 'cm',
    verticalGutter: true, // reserve the vertical ruler's column up front
  },
  callbacks: {
    onInit() {
      $('#editor').summernote(
        'code',
        '<h3>editor-ruler + Summernote</h3>' +
          '<p style="margin-left: 60px;">왼쪽 여백 60px 문단 — 핸들을 끌어 보세요.</p>' +
          '<p>테이블 셀에 커서를 두면 줄자에 컬럼 마커가 뜨고, 여백 핸들은 테이블 전체를 밀어냅니다.</p>' +
          '<table style="width: 100%;"><tbody><tr><td>제품</td><td>수량</td><td>가격</td></tr>' +
          '<tr><td>editor-ruler</td><td>1</td><td>무료</td></tr></tbody></table>' +
          '<p>툴바의 줄자 드롭다운으로 세로 줄자·가이드 잠금/지우기·단위 전환이 됩니다.</p>',
      );
    },
  },
});
