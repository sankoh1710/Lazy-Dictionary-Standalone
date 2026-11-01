export function toLazy(word: string): string {
  let w = word.toLowerCase();

  // Protect digraphs by not modifying them where they shouldn't be
  // We'll apply rules sequentially.

  // 1. kn -> n
  w = w.replace(/kn/g, 'n');
  
  // 2. wr -> r
  w = w.replace(/wr/g, 'r');

  // 3. wh -> w
  w = w.replace(/wh/g, 'w');

  // 4. tion -> shon
  w = w.replace(/tion/g, 'shon');

  // 5. ough at end -> oo
  w = w.replace(/ough$/, 'oo');

  // 6. ough -> of
  w = w.replace(/ough/g, 'of');

  // 7. ph -> f
  w = w.replace(/ph/g, 'f');

  // 8. ck -> k
  w = w.replace(/ck/g, 'k');

  // 9. qu -> kw
  w = w.replace(/qu/g, 'kw');

  // 10. q -> k
  w = w.replace(/q/g, 'k');

  // 11. x -> ks
  w = w.replace(/x/g, 'ks');

  // 12. gh (silent usually, we just drop it)
  w = w.replace(/gh/g, '');

  // 13. soft c (c before e, i, y) -> s
  w = w.replace(/c([eiy])/g, 's$1');

  // 14. hard c (all other c, EXCEPT ch). We can use a negative lookahead for 'h'
  w = w.replace(/c(?!h)/g, 'k');

  // 15. double consonants -> single
  // ff, ll, ss, tt, dd, nn, pp, rr, gg, bb, mm, kk, zz
  w = w.replace(/([bdfgklmnprstz])\1/g, '$1');

  return w;
}

