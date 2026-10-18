## Phase 3 handoff

**What works**
- Accounts: sign up, sign in, log out (`/login`). `/forms/*` sends visitors to login and back.
- My forms (`/forms`): live thumbnails, Published or Draft, response counts, Duplicate, Copy link, Delete with confirm and a 5 second Undo, New form (size picker), skeleton and empty states.
- Builder on your account (`/forms/:id/edit`): autosave after 1.5 seconds, conditional saves, "changed in another tab" banner with Reload and Overwrite, images move to Storage, Publish / Share dialog with link, Copy link, Republish when there are unpublished changes, Close the form.
- Guest handoff: after login, a design made as a guest can be saved to the account.
- Public form (`/f/:slug`): no login, reads only the published copy, answers and uploaded files are saved, PDF copy works, closed forms say so.
- Responses (`/forms/:id/responses`): totals, search, sort, 25 per page, side panel with every answer, per-response PDF, delete, Export CSV (BOM, quotes, formula guard).

**How to run**: `npm run dev`. `.env.local` holds your Supabase URL and publishable key. The optional cloud test: `E2E_CLOUD=1 npx playwright test e2e/cloud.spec.ts --project=chromium` (creates throwaway accounts).

**Security verification** (`node scripts/rls-check.mjs`, real project, two throwaway users): see the result printed below.

**One thing you must do**: run `supabase/migrations/002_counts_and_file_policy.sql` in the Supabase SQL editor. Without it, respondents cannot attach files to published forms and the "My forms" response counts are blank.

**Known limits**
- The responses page loads the newest 1000 responses and pages, searches, and sorts them in the browser.
- Files uploaded by respondents are stored in a private bucket and opened with one-hour links.
- The throwaway test accounts stay in your Supabase Auth list (delete them in the dashboard if you like).
- Deleting a form removes its images and uploaded files.
    PASS  logged out cannot list forms                                        
    PASS  logged out cannot list responses                                    
    PASS  anyone can read a published form through the RPC (no draft column)  
    PASS  logged out cannot create forms                                      
    PASS  anon can submit to a published form                                 
    PASS  anon cannot submit to the wrong revision                            
    PASS  anon cannot submit to an unpublished form                           
    PASS  oversized answers are rejected                                      
    PASS  anon cannot read back what it inserted                              
    PASS  owner reads own responses                                           rows 1
    PASS  user B sees none of user A forms                                    
    PASS  user B cannot read user A responses                                 
    PASS  user B cannot edit user A forms                                     
    PASS  user B cannot delete user A forms                                   
    PASS  user B cannot delete user A responses                               
    PASS  logged out cannot edit forms                                        
    PASS  a user cannot create a form owned by someone else                   
    PASS  owner can upload an image into their folder                         
    PASS  user B cannot upload into user A's folder                           
    PASS  logged out cannot upload images                                     
    FAIL  anon can attach a file to a published form                          new row violates row-level security policy
    PASS  anon cannot attach a file to an unpublished form                    
    PASS  anon cannot read response files                                     
    PASS  user B cannot read user A response files                            
    FAIL  the owner can read response files                                   Object not found
    PASS  a closed form is not readable                                       
    PASS  a closed form takes no answers                                      
    
    25 of 27 passed
