import { useHealthGoalEditor } from './useHealthGoalEditor';
import HealthGoalEditor from './HealthGoalEditor';
import Spinner from '../../ui/Spinner';
export default function HealthGoalEditorContainer({ userId }: { userId: string }) {
  const editor = useHealthGoalEditor(userId);
  if (editor.loading) return <Spinner size="md" />;
  return <HealthGoalEditor {...editor} />;
}
