import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';

export const metadata = {
  title: 'Overview',
};

/** Overview — composição client sobre a camada de dados (demo/live + estados). */
export default function OverviewPage() {
  return <OverviewDashboard />;
}
