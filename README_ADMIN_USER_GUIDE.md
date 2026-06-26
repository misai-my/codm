# CODM Tournament OS Admin User Guide

Use this guide as a quick reference while managing tournaments from `admin.html`.

## 1. Select the tournament first
- Use **Managing Tournament** at the top of the Admin Console.
- All tournament-specific sections save to the selected tournament.
- This includes registration settings, timeline, prize pool, announcements, FAQ, schedule, and result previews.

## 2. Tournament Directory
- Use **Tournament Directory** to add a new tournament.
- Set the tournament to **Active** if admins should manage it.
- Set **Show in Public Selector** if viewers should see it on the public dashboard.
- You can also open or close registration from this list.

## 3. Registration & Timeline
- Set registration status to open or closed.
- Add the Google Form registration URL.
- Add the rulebook URL.
- Timeline dates are saved and displayed as **GMT+8** based on the exact value entered in Admin.

## 4. Prize Pool
- Prize Pool is saved per tournament.
- You can show or hide it publicly.
- You can edit the title, subtitle, total prize pool, table headers, breakdown, and note.
- Breakdown format is one item per line, for example:
  - Champion - ₱25,000
  - 2nd Place - ₱15,000
  - MVP Award - ₱5,000

## 5. Announcements
- Announcements are tournament-specific.
- Line breaks are preserved on the public dashboard.
- Use clear titles and short messages for viewer readability.

## 6. Google Sheet Sync
- Use the sync buttons after updating the Google Sheet.
- Match schedule date/time should be entered as the intended GMT+8 display time.
- Participating Teams supports duplicate team tags when needed.
- Google Drive logo links must be shared as **Anyone with the link can view**.

## 7. Match Schedule and Results
- Schedule times display as GMT+8 without browser timezone shifting.
- Match Schedule and Match Results support filters for mode, stage, Series No / Round No, and Match.
- For MP modes, **Series No** from the sheet maps to the Series/Round filter.
- For BR modes, **Round No** from the sheet maps to the Series/Round filter.

## 8. Match Result Summary
- MP summary is grouped by series and shows **Win / Loss / Tie**.
- BR summary remains table-based.
- The note is intentional: result summary is only for reference and may or may not be used for ranking.

## 9. FAQ and Inquiries
- FAQ answers preserve line breaks.
- FAQ links become clickable when displayed publicly.
- Public Q&A entries can be reviewed, published, or hidden from Admin.

## 10. Recommended admin workflow
- Create or select the tournament.
- Confirm visibility and registration status.
- Add registration URL, rulebook, timeline, and prize pool.
- Sync participating teams, schedule, and results from Google Sheets.
- Check the public dashboard in a separate tab.
- Publish announcements and FAQs after verifying the public view.
