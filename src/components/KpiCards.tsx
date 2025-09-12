/**
 * KPI Cards component showing key metrics
 * Total tasks, completed, completion rate, overdue, avg time
 */

import { AssigneeMetrics } from '@/models/asanaReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, Target, TrendingUp } from 'lucide-react';

interface KpiCardsProps {
  metrics: AssigneeMetrics;
}

export function KpiCards({ metrics }: KpiCardsProps) {
  const formatAvgTime = (days: number): string => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    } else if (days < 7) {
      return `${days.toFixed(1)}d`;
    } else {
      const weeks = Math.round(days / 7);
      return `${weeks}w`;
    }
  };

  const completionRatePercentage = Math.round(metrics.completionRate * 100);

  const kpiData = [
    {
      title: 'Total Tasks',
      value: metrics.total.toString(),
      icon: Target,
      description: 'Total subtasks assigned',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completed',
      value: metrics.completed.toString(),
      icon: CheckCircle,
      description: 'Completed subtasks',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Completion Rate',
      value: `${completionRatePercentage}%`,
      icon: TrendingUp,
      description: 'Percentage completed',
      color: completionRatePercentage >= 80 ? 'text-green-600' : 
             completionRatePercentage >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: completionRatePercentage >= 80 ? 'bg-green-50' : 
               completionRatePercentage >= 60 ? 'bg-yellow-50' : 'bg-red-50',
    },
    {
      title: 'Overdue',
      value: metrics.overdue.toString(),
      icon: AlertTriangle,
      description: 'Overdue subtasks',
      color: metrics.overdue > 0 ? 'text-red-600' : 'text-gray-600',
      bgColor: metrics.overdue > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      title: 'Avg Lead Time',
      value: formatAvgTime(metrics.avgTime),
      icon: Clock,
      description: 'Average completion time',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const IconComponent = kpi.icon;
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <IconComponent className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {kpi.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}