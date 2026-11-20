/* RoboKids · AP CSP — shared page script (Python runner, MCQ blocks, homework) */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ASSET_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/rk\.js(\?.*)?$/, '');

  /* ---------- Python runner: Skulpt, loaded from this site's own assets folder ---------- */
  let skReady = null;
  function loadSk() {
    if (skReady) return skReady;
    skReady = new Promise((res, rej) => {
      const add = (src, next) => { const s = document.createElement('script'); s.src = ASSET_BASE + src; s.onload = next; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); };
      add('skulpt.min.js', () => add('skulpt-stdlib.js', res));
    });
    skReady.catch(() => { skReady = null; });
    return skReady;
  }
  const tplText = id => { const t = document.getElementById(id); return t ? t.textContent.replace(/^\n/, '') : ''; };
  function runPython(code, outEl, btn) {
    outEl.textContent = 'Running…';
    if (btn) btn.disabled = true;
    loadSk().then(() => {
      outEl.textContent = '';
      Sk.configure({
        output: t => { outEl.appendChild(document.createTextNode(t)); outEl.scrollTop = 1e9; },
        read: f => { if (!Sk.builtinFiles || Sk.builtinFiles.files[f] === undefined) throw "File not found: '" + f + "'"; return Sk.builtinFiles.files[f]; },
        inputfun: p => window.prompt(p || 'Input:') || '', inputfunTakesPrompt: true,
        __future__: Sk.python3, execLimit: 6000
      });
      return Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true));
    }).then(() => {
      if (!outEl.textContent) outEl.innerHTML = '<span class="py-muted">(the program finished with no output)</span>';
    }, e => {
      let m = String(e && e.toString ? e.toString() : e);
      if (/TimeLimitError/.test(m)) m = 'Stopped: the program ran for more than 6 seconds (an infinite loop?)';
      const sp = document.createElement('span'); sp.className = 'py-err';
      sp.textContent = (outEl.textContent ? '\n' : '') + m; outEl.appendChild(sp);
    }).finally(() => { if (btn) btn.disabled = false; });
  }
  function buildRunner(el) {
    if (el._built) return;
    el._built = true;
    el._code = tplText(el.dataset.tpl);
    el.innerHTML = '<div class="py-head"><span class="py-file">Python · runs in this page</span><span class="py-actions">' +
      '<button class="jr-btn run" data-act="run">▶ Run</button><button class="jr-btn" data-act="reset">Reset</button>' +
      '<button class="jr-btn" data-act="copy">Copy</button></span></div>' +
      '<textarea class="py-editor" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>' +
      '<div class="py-outlabel">Output</div><pre class="py-output"><span class="py-muted">Press ▶ Run (or Ctrl + Enter).</span></pre>';
    const ta = $('.py-editor', el);
    ta.value = el._code;
    if (!el.closest('.lab-dock')) ta.rows = Math.max(6, Math.min(18, el._code.split('\n').length + 2));
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 4;
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); runPython(ta.value, $('.py-output', el), $('[data-act=run]', el));
      } else if (e.key === 'Enter') {      // keep indentation
        const s = ta.selectionStart, line = ta.value.slice(0, s).split('\n').pop();
        let ind = (line.match(/^\s*/) || [''])[0];
        if (/:\s*$/.test(line)) ind += '    ';
        e.preventDefault();
        ta.value = ta.value.slice(0, s) + '\n' + ind + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 1 + ind.length;
      }
    });
  }
  function setCode(el, code) { buildRunner(el); $('.py-editor', el).value = code; }
  window.RK = { loadRunner: buildRunner, setCode, runPython };
  $$('.py-runner').forEach(buildRunner);

  // homework links point to the GitHub Pages site set in assets/config.js
  if (window.HW_BASE) {
    const base = window.HW_BASE.endsWith('/') ? window.HW_BASE : window.HW_BASE + '/';
    $$('.hw-link').forEach(a => { a.href = base + a.dataset.hw; a.style.display = ''; });
  }
  function copyText(text, btn, label) {
    const done = () => { btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = label, 1500); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done);
    else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); }
  }

  document.addEventListener('click', e => {
    const jb = e.target.closest('.jr-btn');
    if (jb && jb.dataset.act) {
      const el = jb.closest('.py-runner');
      const ta = $('.py-editor', el);
      if (jb.dataset.act === 'run') runPython(ta.value, $('.py-output', el), jb);
      if (jb.dataset.act === 'reset') ta.value = el._code;
      if (jb.dataset.act === 'copy') copyText(ta.value, jb, 'Copy');
    }
    // load a snippet into the page's main runner (lab dock)
    const lb = e.target.closest('[data-load]');
    if (lb) {
      const el = document.getElementById(lb.dataset.target || 'mainRunner') || $('.py-runner');
      setCode(el, tplText(lb.dataset.load));
      const old = lb.textContent; lb.textContent = 'Loaded ✓'; setTimeout(() => lb.textContent = old, 1400);
    }
    // reveal buttons (deck lab + page hint/solution)
    const r = e.target.closest('.reveal-btn, .toggle-btn');
    if (r) {
      const box = r.dataset.box ? document.getElementById(r.dataset.box) : r.nextElementSibling;
      const open = box.classList.toggle('show');
      r.textContent = r.textContent.replace(open ? 'Show' : 'Hide', open ? 'Hide' : 'Show').replace(open ? '▾' : '▴', open ? '▴' : '▾');
    }
  });

  /* ---------- MCQ blocks (mock + homework) ---------- */
  // Options are shuffled on every load, so explanations name the answer, never a letter.
  $$('.q[data-ans]').forEach(q => {
    if (q.hasAttribute('data-fixed')) return;
    const box = $('.quiz-options', q), opts = $$('.quiz-option', q);
    const ans = q.dataset.ans.split(',').map(Number);
    opts.forEach((o, i) => o.dataset.orig = i);
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    opts.forEach((o, i) => { box.appendChild(o); $('.letter', o).textContent = 'ABCDEF'[i]; });
    q.dataset.ans = opts.map((o, i) => ans.includes(+o.dataset.orig) ? i : -1).filter(i => i >= 0).join(',');
  });
  $$('.q .quiz-option').forEach(o => o.addEventListener('click', () => {
    const q = o.closest('.q');
    if (q.classList.contains('graded')) return;
    const multi = +(q.dataset.multi || 1);
    if (multi > 1) {
      q._order = (q._order || []).filter(x => x !== o);
      if (o.classList.contains('picked')) { o.classList.remove('picked'); return; }
      o.classList.add('picked'); q._order.push(o);
      while (q._order.length > multi) q._order.shift().classList.remove('picked');
    } else {
      $$('.quiz-option', q).forEach(x => x.classList.remove('picked'));
      o.classList.add('picked');
    }
    if (window.mockUpdateAnswered) window.mockUpdateAnswered();
  }));
  function gradeAll() {
    let right = 0, total = 0, blank = 0;
    $$('.q[data-ans]').forEach(q => {
      total++;
      const ans = q.dataset.ans.split(',').map(Number), opts = $$('.quiz-option', q);
      const picked = opts.map((o, i) => o.classList.contains('picked') ? i : -1).filter(i => i >= 0);
      if (!picked.length) blank++;
      q.classList.add('graded');
      opts.forEach(o => o.classList.add('locked'));
      ans.forEach(a => opts[a].classList.add('correct'));
      opts.forEach(o => o.classList.remove('picked'));
      const ok = picked.length === ans.length && picked.every(p => ans.includes(p));
      if (ok) { right++; q.classList.add('is-right'); }
      else { q.classList.add('is-wrong'); picked.filter(p => !ans.includes(p)).forEach(p => opts[p].classList.add('wrong')); }
      const w = $('.q-why', q); if (w) w.classList.add('show');
    });
    return { right, total, blank };
  }
  function band(pct) { return pct >= 0.85 ? ['band-5', 'Exam-ready on this topic'] : pct >= 0.6 ? ['band-3', 'Getting there: review the misses'] : ['band-1', 'Re-watch the lesson, then retry']; }
  const stamp = () => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  Object.assign(window.RK, { gradeAll, band, stamp });

  /* ---------- Homework ---------- */
  const hw = $('#hwRoot');
  if (hw) {
    let res = null;
    function upd() {
      const done = $$('.task-done:checked').length, tmax = $$('.task-done').length;
      $('#scoreBig').textContent = `MCQ ${res.right}/${res.total} · Tasks finished ${done}/${tmax}`;
      const [cls, msg] = band(res.right / res.total);
      $('#scoreSub').innerHTML = `<b>${($('#nameInput').value || 'Student')}</b> · ${hw.dataset.session} · ${stamp()}`;
      const b = $('#scoreBand'); b.className = 'score-band ' + cls; b.textContent = msg;
    }
    $('#checkHw').addEventListener('click', () => {
      if (res) return;
      const blank = $$('.q[data-ans]').filter(q => !$('.picked', q)).length;
      if (blank && !confirm(`You have ${blank} unanswered question(s). Check anyway?`)) return;
      res = gradeAll(); $('#checkHw').disabled = true;
      $('#scoreCard').classList.add('show'); upd();
      $('#scoreCard').scrollIntoView({ behavior: 'smooth' });
    });
    $$('.task-done').forEach(c => c.addEventListener('change', () => { if (res) upd(); }));
  }
})();
