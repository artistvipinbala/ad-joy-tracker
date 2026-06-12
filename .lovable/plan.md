## Goal
Set the login credentials for the admin user to:
- Email: `artistvipinbala@gmail.com`
- Password: `artistvipinbala@gmail.com`

## Steps
1. Verify the user `artistvipinbala@gmail.com` exists in the backend auth users.
2. Update that user's password to `artistvipinbala@gmail.com` (hashed via bcrypt) and ensure the email is confirmed so login works immediately.
3. Confirm the update succeeded.

## Notes
- Password is identical to the email, which is weak. Recommend changing it later from Settings.
- No frontend code changes required — `LoginPage` already handles email/password sign-in.
