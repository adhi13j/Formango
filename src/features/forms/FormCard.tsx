import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FormSummary } from '@/lib/repo/formsRepo';
import { relativeTime } from '@/lib/relativeTime';
import { FormThumbnail } from './FormThumbnail';

export const CARD_WIDTH = 220;
const THUMB_HEIGHT = 137; // 16:10

interface FormCardProps {
  form: FormSummary;
  responses: number | undefined;
  onCopyLink: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function FormCard({ form, responses, onCopyLink, onDuplicate, onDelete }: FormCardProps) {
  return (
    <li
      className="relative flex-none snap-start overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ width: CARD_WIDTH }}
    >
      <Link
        to={`/forms/${form.id}/edit`}
        aria-label={`Open ${form.title}`}
        className="block focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="border-b border-border bg-workspace">
          {form.doc ? (
            <FormThumbnail doc={form.doc} width={CARD_WIDTH} height={THUMB_HEIGHT} />
          ) : (
            <div
              className="flex items-center justify-center text-sm text-muted-foreground"
              style={{ width: CARD_WIDTH, height: THUMB_HEIGHT }}
            >
              Can not be shown
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="m-0 truncate pr-8 font-medium text-foreground">{form.title}</p>
          <p className="m-0 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={
                form.published
                  ? 'rounded-full bg-success-bg px-2 py-0.5 font-medium text-success'
                  : 'rounded-full bg-muted px-2 py-0.5 font-medium'
              }
            >
              {form.published ? 'Published' : 'Draft'}
            </span>
            {responses !== undefined && (
              <span>
                {responses} {responses === 1 ? 'response' : 'responses'}
              </span>
            )}
          </p>
          <p className="m-0 text-xs text-muted-foreground">Edited {relativeTime(form.updatedAt)}</p>
        </div>
      </Link>
      <div className="absolute bottom-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${form.title}`}>
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/forms/${form.id}/responses`}>Responses</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!form.published} onSelect={onCopyLink}>
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
