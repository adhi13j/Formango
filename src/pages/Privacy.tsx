import { Link } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Privacy() {
  usePageMeta('Privacy · Formango');
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center border-b border-border bg-card px-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-foreground">
        <h1 className="m-0 text-3xl font-bold">Privacy</h1>
        <p className="text-muted-foreground">
          Formango is a small project. Here is, in plain words, what it keeps and who can see it.
        </p>

        <h2 className="mb-0 mt-6 text-xl font-bold">If you fill in a form</h2>
        <ul className="space-y-2 pl-5">
          <li>
            What you type is sent to the person who made the form, and only to them. They can read
            your answers, your signature, and any file you attach.
          </li>
          <li>
            Formango does not use your answers for anything else, does not sell them, and does not
            show ads.
          </li>
          <li>The PDF copy you can download is made in your browser. It is not sent anywhere.</li>
          <li>
            Ask the form’s owner to delete your answers if you want them removed. Owners can delete
            any response.
          </li>
        </ul>

        <h2 className="mb-0 mt-6 text-xl font-bold">If you make forms</h2>
        <ul className="space-y-2 pl-5">
          <li>
            We store your email address, your forms, the pictures you add, and the responses you
            receive. Only you can see them. Forms you publish can be opened by anyone with the link,
            but the link is not listed anywhere and is marked “noindex” so search engines are asked
            to skip it.
          </li>
          <li>
            Without an account, the builder keeps your design only in your own browser. Clearing
            your browser data removes it.
          </li>
          <li>
            Deleting a form deletes its responses, pictures, and uploaded files. You can delete your
            forms at any time from My forms.
          </li>
        </ul>

        <h2 className="mb-0 mt-6 text-xl font-bold">What we do not do</h2>
        <ul className="space-y-2 pl-5">
          <li>No tracking, analytics, or third-party scripts.</li>
          <li>No fonts or files loaded from other companies’ servers.</li>
        </ul>

        <h2 className="mb-0 mt-6 text-xl font-bold">Where data lives</h2>
        <p>
          Accounts and forms are stored with Supabase, a database service. Anything sensitive
          (passwords) is handled by Supabase and never seen by Formango’s own code.
        </p>

        <h2 className="mb-0 mt-6 text-xl font-bold">Questions</h2>
        <p>
          Contact: <em>add your email address here before launch</em>.
        </p>
        <p>
          <Link to="/" className="underline">
            Back to Formango
          </Link>
        </p>
      </main>
    </div>
  );
}
