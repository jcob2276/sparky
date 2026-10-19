import { useCoreMemoryHistory } from './useCoreMemoryHistory';
import CoreMemoryHistoryView from './CoreMemoryHistoryView';

export default function CoreMemoryHistory({ userId }: { userId: string }) {
  return <CoreMemoryHistoryView {...useCoreMemoryHistory(userId)} />;
}
