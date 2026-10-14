import {useFoodPlanningAssistant} from './useFoodPlanningAssistant';
import {FoodPlanningAssistantView} from './FoodPlanningAssistantView';
export default function FoodPlanningAssistantContainer({userId}:{userId:string}) {
  const state=useFoodPlanningAssistant(userId);
  return <FoodPlanningAssistantView {...state} />;
}
