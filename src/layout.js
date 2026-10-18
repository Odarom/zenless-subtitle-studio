import { UserError } from './config.js';

// Protect logical line breaks, not visual wrapping caused by channel width.
// One AI request still handles the whole message and every target language.
export function protectLayout(text) {
  let prefix = 'ZZZ_BREAK_';
  while (text.includes(prefix)) prefix += '_';
  const breaks = [];
  const masked = text.replace(/(?:\r\n|\n|\r)[ \t]*/g, separator => {
    const token = `[[${prefix}${breaks.length}]]`;
    breaks.push({ token, separator });
    return `${token}\n`;
  });
  return {
    text: masked,
    restore(output) {
      if (!breaks.length) return output;
      const pieces = []; let cursor = 0;
      for (const { token, separator } of breaks) {
        const index = output.indexOf(token, cursor);
        if (index < 0 || output.indexOf(token, index + token.length) >= 0) {
          throw new UserError('AI가 원문의 줄바꿈 구조를 누락하거나 변경했습니다. 잘못된 결과는 전송하지 않았습니다.');
        }
        // Trim the model's whitespace around markers, then restore the exact
        // original separator and indentation, including consecutive blank lines.
        let piece = output.slice(cursor, index);
        if (cursor) piece = piece.replace(/^[ \t\r\n]+/, '');
        piece = piece.replace(/[ \t\r\n]+$/, '');
        if (piece.includes(`[[${prefix}`)) throw new UserError('AI가 원문의 줄바꿈 순서를 변경했습니다. 잘못된 결과는 전송하지 않았습니다.');
        pieces.push(piece, separator);
        cursor = index + token.length;
      }
      const tail = output.slice(cursor).replace(/^[ \t\r\n]+/, '');
      if (tail.includes(`[[${prefix}`)) throw new UserError('AI가 원문의 줄바꿈 구조를 변경했습니다. 잘못된 결과는 전송하지 않았습니다.');
      pieces.push(tail);
      return pieces.join('');
    },
  };
}
