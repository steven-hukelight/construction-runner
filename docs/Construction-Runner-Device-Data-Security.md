# Construction Runner — Device & data security (for users)

**Who this is for:** People installing Construction Runner on a **personal phone** (bring your own device), and anyone who wants a clear picture of how the app protects their privacy and work data.

**Short answer:** Construction Runner is a work app for site attendance and safety. On your phone it runs in its own private space (a sandbox), the same way other official store apps do — so it cannot reach into your other apps or personal files just by being installed. Passwords are hashed (not stored as plain text). Connections use HTTPS. Work data lives in our secured backend and is only available after you sign in. We strongly recommend a **strong unique password** plus **Biometric app lock** (Face ID / fingerprint) so the app asks for biometrics every time it is opened.

---

## 1. Will this app hack my phone or see my personal data?

**No — not in the way people usually fear.**

On a normal install from the **Google Play Store** or **Apple App Store**:

- The app runs in its **own sandbox** (a private space created by the phone’s operating system).
- It **cannot** open or read other apps’ data (messages, email, photos in other apps, and so on) just because it is installed.
- It **cannot** “take over” the device or install hidden spyware simply by being installed from the official store.

That protection comes from **Apple and Google**, not from the size of the company that built the app. A small team’s store app and a large brand’s app follow the **same sandbox rules**.

### What the app *can* see

Only:

- Information you enter or use **inside Construction Runner** (for example name, work email, site attendance, induction, safety documents, photos you take *in the app*).
- Device features you **explicitly allow** (for example location for site check-in, camera for a near-miss or delivery photo, notifications).

You can refuse permissions you are uncomfortable with; some features may then be limited.

---

## 2. “It wasn’t built by a big-name developer — is that a risk?”

It’s reasonable to ask. What matters for phone safety is:

| Factor | Construction Runner |
|--------|---------------------|
| Distributed via Play Store / App Store | Yes (install only from the official listing) |
| App sandbox (OS isolation) | Yes — same as other store apps |
| Encrypted connection (HTTPS) | Yes |
| Passwords stored hashed | Yes (via Supabase Auth) |
| Work data behind login | Yes |

“Not a huge agency” does **not** give an app special power to break Android or iPhone security. Sideloading a random APK from a link *would* be riskier — please don’t do that. Use the official store only.

---

## 3. Passwords — are they safe? Are they hashed?

**Yes. Passwords are hashed, not stored as readable text.**

- Sign-in uses **Supabase Auth** (an established authentication platform).
- Your password is checked using a **one-way hash** (bcrypt). The system stores the hash, not the password itself.
- We (and the app) **cannot look up** your password.
- Reset flows use secure reset links — we do not email you your old password.

**Please:** use a **strong unique password** (do not reuse the same password you use for other important accounts), keep your phone locked with a PIN or biometrics, and turn on **Biometric app lock** in Construction Runner (see below). Biometrics are an extra layer — they do **not** replace a strong password.

---

## 4. Biometric app lock (recommended with a strong password)

Construction Runner can require **Face ID** (iPhone) or **fingerprint / device biometrics** (Android) **every time you open the app**, even if you stayed signed in. That helps if someone picks up an unlocked phone and tries to open Construction Runner.

**Use both together:**

1. A **strong unique password** for your Construction Runner account  
2. **Biometric app lock** so opening the app needs your face or fingerprint  

Biometric app lock protects access *to the app on that device*. Your password still protects the account itself (sign-in, resets, new devices).

### How to turn on Biometric app lock

1. Open the **Construction Runner** app and sign in with your email and password (first time).  
2. Open the menu (⋮ / Profile) and go to **Settings** (sometimes labelled **User Settings**).  
3. Find **Biometric app lock** (Android) or **Face ID app lock** (iPhone).  
4. Turn the switch **On**.  
5. Confirm with your fingerprint or Face ID when asked.  

After this is on, each time you open Construction Runner you will be asked for biometrics before you see your work screens.

You can also turn on **Use Face ID / device biometrics to sign in** in the same Settings screen for quicker sign-in — that is separate from app lock. For personal-device peace of mind, **Biometric / Face ID app lock** is the setting that locks the app every time it opens.

**Tip:** Enrol Face ID or a fingerprint in your phone’s system Settings first if you have not already. Construction Runner uses the biometrics already set up on the device.

---

## 5. Encryption and HTTPS (data in transit)

- The website uses **HTTPS** (`https://www.construction-runner.com`).
- The mobile app talks to our servers over **HTTPS**.
- Auth and database traffic to our backend provider also uses **HTTPS / TLS**.

That means traffic between your phone and our systems is **encrypted in transit**. Someone on public Wi‑Fi cannot simply read your password or API traffic in plain text.

---

## 6. Backend security (where work data lives)

After you sign in:

| Layer | Purpose |
|-------|---------|
| **Login** | Confirms it is you (hashed password check). |
| **Sessions / tokens** | Keeps you signed in securely; your password is not sent on every request. |
| **Row Level Security (RLS)** | Database rules so access is limited to the right company / permissions. |
| **Server-only secret key** | Used on our servers only — **never** shipped inside the mobile app. |
| **Publishable client key** | May be in the app; **RLS** still limits what data can be reached. |

So protection is not “hope nobody finds the URL.” It is **authentication + encrypted transport + database access rules**.

Work information (attendance, induction, RAMS acknowledgements, and so on) is held for your employer’s site operations. It stays inside Construction Runner’s secured systems — separate from your other personal apps.

---

## 7. Real risks (honest, bounded)

These are the same kinds of risks you already accept with everyday apps on a personal phone — for example **WhatsApp**, **Instagram**, **Facebook**, email (Gmail / Outlook), or a work chat tool like **Teams** or **Slack**:

1. **Data inside Construction Runner** — Work-related information you use in the product is stored in our systems for your employer’s operations (just as WhatsApp holds your chats on its systems, or Instagram holds your account content).
2. **Permissions you grant** — Location, camera, notifications, and so on. WhatsApp and Instagram ask for similar permissions when you use camera or location features. Only approve what you need for the job.
3. **Unlocked or stolen phone** — Anyone who can unlock your device may open apps that are already signed in, including WhatsApp, Instagram, or Construction Runner. Use a strong **device** lock, turn on **Biometric app lock** in Construction Runner, and sign out if you share the phone.
4. **Fake apps** — Only install from the official Play Store / App Store listing for Construction Runner (the same advice as for any well-known app).
5. **Shared or weak passwords** — Use a strong unique password for Construction Runner and pair it with biometric app lock — the same good habit as for email or social accounts.

None of this means Construction Runner can break into the rest of your phone or your other apps, any more than Instagram can open WhatsApp or read your email.

---

## 8. Practical tips for personal devices

- Install **only** from Google Play or the App Store.
- Use a **strong unique** Construction Runner password.
- Turn on **Biometric app lock** / **Face ID app lock** in **Settings** so the app asks for biometrics every time you open it (steps in section 4).
- Keep **device lock** (PIN / fingerprint / Face ID) on for the whole phone.
- Review **permissions** and allow only what you need.
- Sign out if you hand the phone to someone else.
- If your company offers a **work phone** or Android **work profile**, that is an extra comfort option — not because this app bypasses the OS, but because it keeps work and personal apps more separate.

---

## 9. Contact

Questions about privacy or how your company uses Construction Runner:

- **Email:** info@construction-runner.com  
- **Website:** https://www.construction-runner.com  
- **Privacy:** https://www.construction-runner.com/legal/privacy-and-security  

---

*This note explains how the product is designed to protect users on personal devices. It is not a formal certification or insurance document. Independent audits or company IT policies may add further requirements.*
