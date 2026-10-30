# JobPortal Pro (HTML, CSS, JavaScript only)

The Flask + MySQL job portal rebuilt with **no Python and no database**. Same pages, same flow.

## Pages
Home (search, location, job type, stats) · Login · Register · Employer dashboard · Seeker dashboard · Post job · Edit job · Delete job · Job detail · Apply (resume + cover letter) · Applicants (Accept / Reject) · Profile

## How to run
Open `index.html` in your browser.

## How to try it
1. Register an **Employer** and post a job. Log out.
2. Register a **Job Seeker** (different email) and apply with a resume. Log out.
3. Log in as the employer, open the job's Applicants, view the resume, Accept or Reject.
4. Log in as the seeker and see the status change on the dashboard.

## Note
Data and resumes are stored in the browser (localStorage and IndexedDB), so all accounts share one browser.
A real site with many users needs a backend and database.
