# Video 3 — Agency: Run social proof for every client

**Target length:** ~80 seconds · **Audience:** marketing agencies, freelance consultants managing multiple client brands.

**Promise of the video:** By the end, the viewer knows NotiProof gives them a multi-client dashboard, a branded client portal, and one-click client reports.

---

## Scene 1 — Hook (0:00 – 0:10)

| VO | On-screen | Cues |
|----|-----------|------|
| "If you run marketing for more than one brand, you know the pain — five logins, five dashboards, five reports to ship every month. NotiProof gives you one." | A messy desk of five browser windows, each a different client's analytics. They collapse into one clean NotiProof agency dashboard. | Springy collapse animation. |

---

## Scene 2 — Create your agency (0:10 – 0:20)

| VO | On-screen | Cues |
|----|-----------|------|
| "Sign up as an agency, name it, pick your brand colour — that's all the setup you need." | Page `/agency/signup`. Heading: **"Set up your agency"**. Fields: agency name, slug, brand colour picker. Button: **"Create agency"**. | Cursor adjusts the colour swatch from default to the agency's brand. |

---

## Scene 3 — Agency dashboard (0:20 – 0:32)

| VO | On-screen | Cues |
|----|-----------|------|
| "Land on your agency dashboard and you see every client at once — proof collected this month, seats used, and a health league showing who's winning and who needs a call." | Page `/agency`. Heading: **"Agency dashboard"**. Top row: stat cards — **Proof (30d)**, **Seats used**, **Active clients**. Below: a "Client health" league table with client names, health scores, and tiny sparklines. | Bars in the league animate up to their values. |

---

## Scene 4 — Add a client (0:32 – 0:45)

| VO | On-screen | Cues |
|----|-----------|------|
| "Adding a new client takes one click. Hit **Add client**, fill in their details, and NotiProof spins up their workspace and emails them an invite." | From the dashboard, cursor clicks **"Add client"** → route changes to `/agency/clients/new`. Heading: **"Add client"**. Form: client name, industry, contact email. Button: **"Create client & send invite"**. After click → toast *"Invite sent"* and route changes to the new client's workspace. | Quick transition; keep it tight. |

---

## Scene 5 — Work as the client (0:45 – 0:58)

| VO | On-screen | Cues |
|----|-----------|------|
| "Click into any client and you're now working inside their account. Approve their proof, generate their content, design their widgets — everything you can do for yourself, you can do for them. The banner at the top keeps you oriented." | Page `/agency/clients/:client_id`. Persistent banner at the top: **"Active client: Acme Co."** with an **"Exit client"** link. Below it, the familiar Proof Library, Content Hub, and Widgets tabs. | Highlight the banner with a soft glow when the scene loads. |

---

## Scene 6 — Client report (0:58 – 1:12)

| VO | On-screen | Cues |
|----|-----------|------|
| "When it's report day, open the client's **Performance report** — branded in your colours, with AI recommendations baked in. Send it from NotiProof, or print to PDF." | Page `/agency/clients/:client_id/report`. Heading: **"Performance report"**. The page is in the agency's brand colours. Sections: hero stats, trend chart, **"AI recommendations"** list with 3 bullet items. Top-right buttons: **"Print / PDF"** and **"Send to client"**. | Cursor clicks **Send to client** → success toast. |

---

## Scene 7 — White-label portal (1:12 – 1:24)

| VO | On-screen | Cues |
|----|-----------|------|
| "Want your clients self-serving? Each one gets a white-label portal at your own subdomain. They sign in, see their proof, content, and analytics — your brand, top to bottom. NotiProof's name doesn't appear anywhere." | Browser at `portal.youragency.com` showing `/portal/:agency_slug`. Heading: **"Welcome"**. Left nav: **Proof**, **Content**, **Analytics**. Header logo and colours are the agency's, not NotiProof's. | Cursor clicks **Analytics** → simple impressions / clicks chart loads. |

---

## Scene 8 — Outro (1:24 – 1:30)

| VO | On-screen | Cues |
|----|-----------|------|
| "Invite teammates, scope their access per client, and run social proof for every brand you manage — from one place." | `/agency/team` page. Heading: **"Team"**. Table of teammates with roles and per-client access chips. **"Invite member"** button top-right. Agency logo fades up over the closing frame. | Hold 1.5s. |
