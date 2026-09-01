# Supabase Auth email templates

Version-controlled copies of the Auth email bodies that live in the Supabase
Dashboard (Authentication → Emails). Editing a file here changes nothing on its
own — it has to be pushed to the project.

## Why these exist

The password-reset email used to send `{{ .ConfirmationURL }}` (a link). Every
client below asks the user to type the emailed code instead:

| client | screen | call | template |
| --- | --- | --- | --- |
| mobile | `Triqare-app/app/(auth)/forgot-password.tsx` | `verifyOtp({ type: 'recovery' })` | `recovery.html` |
| web | `web-production/src/app/auth/reset/page.tsx` | `verifyOtp({ type: 'recovery' })` | `recovery.html` |
| mobile | `Triqare-app/app/(auth)/sign-up.tsx` | `verifyOtp({ type: 'signup' })` | `confirmation.html` |

So both files must keep `{{ .Token }}`. A link-only template leaves the client
waiting for a code that never arrives.

None of the three screens assumes a length or an alphabet any more. They used to:
each pinned the code to exactly 8 digits with a numeric keyboard, a `maxLength`,
and an input filter that deleted every non-digit as it was typed — so a token
containing a letter could not be entered at all, whatever the Dashboard's
`mailer_otp_length` happened to be set to. They now accept 6–12 alphanumeric
characters and let `verifyOtp` decide.

## Applying

Either paste the file into Dashboard → Authentication → Emails → **Reset
Password** (subject: `Your Triqare password reset code`), or push it:

```bash
cd web-production
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-auth-email-templates.js --dry-run  # inspect live
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-auth-email-templates.js            # apply
```

The token is a personal access token (Dashboard → Account → Access Tokens); the
project ref is read from `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.

## Notes

- `recovery.html` says the code expires in 1 hour, which matches the default
  email OTP expiry. If Authentication → Sign In / Providers → Email OTP expiry is
  changed, change the copy too.
- The Dashboard subject for `confirmation.html` is
  `Your Triqare verification code`.
- Worth confirming in the Dashboard when a code is reported as unreadable:
  Authentication → Sign In / Providers → **Email OTP Length**. The clients no
  longer depend on it, but the email copy ("expires in 1 hour") tracks the
  neighbouring **Email OTP Expiration** setting.
