import { useParams } from 'react-router';
import BuilderPage from '@/features/builder/BuilderPage';

export default function EditForm() {
  const { id = '' } = useParams();
  return <BuilderPage key={id} formId={id} />;
}
