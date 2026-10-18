// UI brackets are formatting, not part of a name someone must type in chat.
export function nameAliases(preferred, category) {
  const aliases = new Set();
  const add = value => {
    if (!value) return;
    aliases.add(value);
    const plain = value.replace(/^(?:\[|「|『|【)(.*)(?:\]|」|』|】)$/u, '$1').trim();
    if (plain.length >= 2) aliases.add(plain);
    if (/\p{Script=Hangul}/u.test(plain) && plain.length >= 2) aliases.add(plain.replace(/\s+/g, ''));
  };
  for (const name of Object.values(preferred)) {
    add(name);
    if (category === 'skill') {
      const short = name.split(/[:：]/).slice(1).join(':').trim();
      if (short.length >= 2) add(short);
    }
  }
  return [...aliases];
}
