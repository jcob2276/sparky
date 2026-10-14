import {useHealthCharts} from './useHealthCharts';
import {HealthChartsView} from './HealthChartsView';
export function HealthChartsContainer({userId}:{userId:string}) {return <HealthChartsView {...useHealthCharts(userId)}/>;}
