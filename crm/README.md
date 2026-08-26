# FireCRM — a Firebase-native CRM

A lightweight, self-hosted CRM built entirely on Firebase (Firestore, Auth, Cloud
Functions, Hosting). The data model follows the classic Salesforce object model:

```
Lead ──(convert)──▶ Contact + Account + Opportunity
                        │
                    Activities (calls, emails, meetings, notes, tasks)
```

## Features

- **Leads** — capture, qualify, score, and convert. Statuses: New → Working →
  Qualified / Unqualified. Automatic lead scoring via a Cloud Function trigger.
- **Contacts & Accounts** — people and the companies they belong to.
- **Opportunities** — kanban pipeline (Prospecting → Qualification → Proposal →
  Negotiation → Closed Won / Closed Lost) with amounts and close dates.
- **Activities** — log calls, emails, meetings, notes, and tasks against any record.
- **Web-to-Lead** — a public HTTPS endpoint (like Salesforce Web-to-Lead) plus an
  embeddable form (`public/lead-form.html`) you can drop on any landing page.
  Protected by an API key, a honeypot field, and per-IP rate limiting.
- **CSV import** — bulk-import leads from any CSV export, with dedupe by email.
- **Dashboard** — pipeline value, lead funnel, recent activity.

## Lead generation — what this CRM does and doesn't do

This CRM **does not scrape LinkedIn or other websites**, and you should not bolt
a scraper onto it:

- LinkedIn's User Agreement prohibits automated scraping, and LinkedIn actively
  litigates against it. The same is true of most lead-generation sites.
- Google Cloud / Firebase Terms of Service prohibit using the platform to
  collect data in violation of a third party's terms.
- Bulk-collecting personal data without a lawful basis violates GDPR/CCPA and
  similar laws, and poisons your sender reputation for outreach.

Compliant lead sources that plug straight into this CRM instead:

1. **Web-to-Lead** — the built-in capture endpoint for your own landing pages,
   ads, and signup forms (highest-quality leads you can get).
2. **Licensed data providers** — Apollo.io, ZoomInfo, Clearbit, Cognism, etc.
   sell licensed B2B contact data with an API. Export from their platform and
   use the CSV import, or POST to the web-to-lead endpoint from your own
   integration script.
3. **Official APIs** — LinkedIn's official Marketing/Lead Gen Forms APIs,
   Google Ads Lead Form extensions, Meta Lead Ads — all deliver leads you are
   licensed to use, via webhook, straight into the capture endpoint.

## Project layout

```
crm/
├── firebase.json            # Hosting + Functions + Firestore config
├── .firebaserc              # Your Firebase project id (edit this)
├── firestore.rules          # Security rules — authenticated users only
├── firestore.indexes.json   # Composite indexes
├── functions/               # Cloud Functions (Node 20)
│   ├── index.js             # webToLead endpoint + lead scoring trigger
│   └── package.json
└── public/                  # The app (no build step — plain ES modules)
    ├── index.html           # SPA shell
    ├── lead-form.html       # Embeddable web-to-lead example form
    ├── css/app.css
    └── js/
        ├── firebase-config.js   # Your Firebase web config (edit this)
        ├── app.js               # Router + shell
        ├── api.js               # Firestore data layer
        └── views/               # One module per screen
```

## Setup

1. **Create a Firebase project** at <https://console.firebase.google.com>
   (Blaze plan is required for Cloud Functions; the free quotas are generous).

2. **Enable services** in the console:
   - **Authentication** → Sign-in method → enable *Email/Password* (and
     *Google* if you want one-click sign-in).
   - **Firestore Database** → create database in production mode.

3. **Configure the app:**
   - Put your project id in `.firebaserc`.
   - Copy the web-app config object from *Project settings → Your apps → Web
     app* into `public/js/firebase-config.js`.

4. **Deploy:**

   ```bash
   npm install -g firebase-tools
   firebase login
   cd crm
   (cd functions && npm install)
   firebase deploy
   ```

5. **Create your user:** open the hosted URL, and sign up with the email you
   want to use. New sign-ups are allowed only while the `users` collection is
   empty or when an existing user creates them — see `firestore.rules`.

6. **Web-to-Lead:** in the app go to *Settings*, generate a capture API key,
   then embed `lead-form.html` (or POST from any site) to:

   ```
   https://<region>-<project-id>.cloudfunctions.net/webToLead
   ```

## Local development

```bash
cd crm
firebase emulators:start        # Hosting :5000, Firestore :8080, Functions :5001, Auth :9099
```

The app auto-connects to the emulators when served from `localhost`.
