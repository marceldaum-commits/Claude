# E-Mail-Vorlagen (Supabase → Authentication → Emails → Templates)

Absender: Nachtfalter <noreply@nachtfalter.tech> (SMTP über Brevo). Jeweils **Subject** und **Body** (HTML) einfügen.

## Confirm signup

Subject: `Bitte bestätige dein Nachtfalter-Konto`

```html
<h2>Willkommen bei Nachtfalter!</h2>
<p>Schön, dass du dabei bist. Bitte bestätige deine E-Mail-Adresse, damit dein Konto aktiv wird:</p>
<p><a href="{{ .ConfirmationURL }}">E-Mail-Adresse bestätigen</a></p>
<p>Wenn du dich nicht bei Nachtfalter registriert hast, kannst du diese E-Mail einfach ignorieren.</p>
<p>Viele Grüße<br>Nachtfalter · https://nachtfalter.tech</p>
```

## Reset password

Subject: `Neues Passwort für dein Nachtfalter-Konto`

```html
<h2>Passwort zurücksetzen</h2>
<p>Du hast ein neues Passwort für dein Nachtfalter-Konto angefordert. Hier kannst du es festlegen:</p>
<p><a href="{{ .ConfirmationURL }}">Neues Passwort festlegen</a></p>
<p>Der Link gilt nur kurze Zeit. Wenn du das nicht warst, ignoriere diese E-Mail – dein Passwort bleibt dann unverändert.</p>
<p>Viele Grüße<br>Nachtfalter · https://nachtfalter.tech</p>
```

## Change email address

Subject: `Bitte bestätige deine neue E-Mail-Adresse`

```html
<h2>Neue E-Mail-Adresse bestätigen</h2>
<p>Bitte bestätige, dass dein Nachtfalter-Konto künftig diese Adresse nutzen soll:</p>
<p><a href="{{ .ConfirmationURL }}">Neue Adresse bestätigen</a></p>
<p>Viele Grüße<br>Nachtfalter</p>
```
