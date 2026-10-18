const emojiPattern = () => /<a?:[A-Za-z0-9_]+:\d{17,20}>|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;

export function hasTranslatableText(text) {
  // URLs are shared verbatim without spending a translation request. Captions
  // outside a URL still take the normal translation path.
  return /[\p{L}\p{N}]/u.test(text.replace(/https?:\/\/[^\s<>]+/gi, '').replace(emojiPattern(), ''));
}

export function protectEmojis(text) {
  let prefix = 'ZZZ_EMOJI_';
  while (text.includes(prefix)) prefix += '_';
  const emojis = [];
  const masked = text.replace(emojiPattern(), emoji => {
    const token = `[[${prefix}${emojis.length}]]`;
    emojis.push({ token, emoji });
    return token;
  });
  return {
    text: masked,
    restore(output) {
      for (const { token, emoji } of emojis) {
        if (output.includes(token)) output = output.replace(token, emoji).replaceAll(token, '');
        else output = `${output.trimEnd()} ${emoji}`;
      }
      return output;
    },
  };
}
