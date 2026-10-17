/* Auth: sign in, create an account, forgot / reset password, "Keep me
   signed in", and the Account dialog (change email or password). core.js
   creates the Supabase client with WK.authStorage, then calls
   WK.startAuth(); WK.enter(user) shows the site or the sign-in screen. */
(function(){
  const { $, store, toast } = WK;
  const here = () => location.origin + location.pathname;

  // "Keep me signed in": the session lives in localStorage (stays after the
  // browser closes) or sessionStorage (gone when the tab closes).
  const keep = () => store('wk_remember') !== 'no';
  const tryDo = fn => { try { return fn(); } catch (e) { return null; } };
  WK.authStorage = {
    getItem: k => tryDo(() => sessionStorage.getItem(k) || localStorage.getItem(k)),
    setItem: (k, v) => tryDo(() => {
      const [use, other] = keep() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      use.setItem(k, v);
      other.removeItem(k);
    }),
    removeItem: k => tryDo(() => { localStorage.removeItem(k); sessionStorage.removeItem(k); })
  };

  // Supabase's own wording, where a plainer one helps.
  function friendly(err){
    const m = (err && err.message) || String(err);
    if (/signups? not allowed/i.test(m)) return 'New accounts are switched off for now.';
    if (/invalid login credentials/i.test(m)) return 'That email and password don\'t match.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first: open the link that was sent to you.';
    if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a few minutes and try again.';
    return m;
  }

  // Disable a form's buttons while its request runs.
  async function busy(form, fn){
    const buttons = form.querySelectorAll('button');
    buttons.forEach(b => { b.disabled = true; });
    try { await fn(); }
    finally { buttons.forEach(b => { b.disabled = false; }); }
  }

  const matches = f => f.password.value === f.confirm.value;

  /* ----------------------------- Sign-in screen ----------------------------- */
  const say = (error, note) => { $('signin-error').textContent = error || ''; $('signin-note').textContent = note || ''; };

  function mode(name, keepMsg){
    document.querySelectorAll('#signin .auth-form').forEach(f => { f.hidden = f.dataset.mode !== name; });
    if (!keepMsg) say();
    const first = document.querySelector(`#signin [data-mode="${name}"] input`);
    if (first) first.focus();
  }

  let recovering = /type=recovery/.test(location.hash);

  WK.startAuth = function(){
    const db = WK.db;

    // A link from an email that has expired or was already used.
    const hash = new URLSearchParams(location.hash.slice(1));
    const linkError = hash.get('error_description');
    if (linkError){
      history.replaceState(null, '', here());
      say(linkError.replace(/\+/g, ' ') + '. Ask for a new link.');
    }

    $('signin-form').remember.checked = keep();
    document.querySelectorAll('#signin [data-auth]').forEach(b => { b.onclick = () => mode(b.dataset.auth); });

    // Show / hide a password while typing.
    document.addEventListener('click', e => {
      const b = e.target.closest('.pw-toggle');
      if (!b) return;
      const input = b.previousElementSibling;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? 'Hide' : 'Show';
      b.setAttribute('aria-pressed', String(show));
    });

    $('signin-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      say();
      store('wk_remember', f.remember.checked ? 'yes' : 'no');
      return busy(f, async () => {
        const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
        if (error) say(friendly(error));
        else { f.password.value = ''; }
      });
    };

    $('signup-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      say();
      if (!matches(f)) return say('The two passwords don\'t match.');
      const email = f.email.value.trim();
      return busy(f, async () => {
        const { data, error } = await db.auth.signUp({ email, password: f.password.value, options: { emailRedirectTo: here() } });
        if (error) return say(friendly(error));
        // Supabase answers an email that's already registered with a user that has no identities.
        if (data.user && data.user.identities && !data.user.identities.length)
          return say('There is already an account for that email. Sign in, or reset its password.');
        f.reset();
        if (!data.session){
          $('signin-form').email.value = email;
          mode('signin', true);
          say('', `Check ${email} for a link to confirm your account, then sign in.`);
        }
      });
    };

    $('forgot-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      say();
      const email = f.email.value.trim();
      return busy(f, async () => {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: here() });
        if (error) return say(friendly(error));
        f.reset();
        say('', `If there's an account for ${email}, a link to reset its password is on its way.`);
      });
    };

    $('newpass-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      say();
      if (!matches(f)) return say('The two passwords don\'t match.');
      return busy(f, async () => {
        const { data, error } = await db.auth.updateUser({ password: f.password.value });
        if (error) return say(friendly(error));
        f.reset();
        recovering = false;
        history.replaceState(null, '', here());
        mode('signin');
        toast('Password changed');
        WK.enter(data.user);
      });
    };

    $('sign-out').onclick = () => db.auth.signOut();

    /* ----------------------------- Account dialog ----------------------------- */
    const sayAcct = (error, note) => { $('account-error').textContent = error || ''; $('account-note').textContent = note || ''; };

    $('account-open').onclick = () => {
      sayAcct();
      $('email-form').reset();
      $('password-form').reset();
      $('account-email').textContent = WK.user ? WK.user.email : '';
      $('password-form').username.value = WK.user ? WK.user.email : '';
      $('account-dialog').showModal();
    };
    $('account-close').onclick = () => $('account-dialog').close();

    $('email-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      sayAcct();
      const email = f.email.value.trim();
      if (WK.user && email.toLowerCase() === (WK.user.email || '').toLowerCase()) return sayAcct('That is already your email.');
      return busy(f, async () => {
        const { error } = await db.auth.updateUser({ email }, { emailRedirectTo: here() });
        if (error) return sayAcct(friendly(error));
        f.reset();
        sayAcct('', `Open the link sent to ${email} to confirm the change. Until then, keep signing in with your current email.`);
      });
    };

    $('password-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      sayAcct();
      if (!matches(f)) return sayAcct('The two new passwords don\'t match.');
      return busy(f, async () => {
        // Check the current password before changing it.
        const check = await db.auth.signInWithPassword({ email: WK.user.email, password: f.current.value });
        if (check.error) return sayAcct('Your current password is not right.');
        const { error } = await db.auth.updateUser({ password: f.password.value });
        if (error) return sayAcct(friendly(error));
        f.reset();
        sayAcct('', 'Password changed.');
      });
    };

    /* --------------------------- Session changes --------------------------- */
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') recovering = true;
      const user = session ? session.user : null;
      WK.user = user;
      // Arrived from a reset-password email: set the new password before going in.
      if (user && recovering){
        WK.enter(null);
        $('newpass-form').username.value = user.email || '';
        mode('newpass');
        return;
      }
      if (!user){
        recovering = false;
        if ($('account-dialog').open) $('account-dialog').close();
      }
      WK.enter(user);
    });
  };
})();
